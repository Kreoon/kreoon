/**
 * streaming-webhook-v2 - Webhooks de todas las plataformas de streaming
 * Recibe eventos, normaliza y actualiza métricas
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-platform',
};

interface NormalizedEvent {
  event_type: string;
  session_id?: string;
  channel_id?: string;
  platform: string;
  data: Record<string, unknown>;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get platform from header or body
    const platform = req.headers.get('x-platform') || 'unknown';
    const body = await req.json();

    console.log(`[streaming-webhook-v2] Platform: ${platform}`, JSON.stringify(body).slice(0, 500));

    // Normalize event based on platform
    const normalizedEvent = normalizeEvent(platform, body);

    if (!normalizedEvent) {
      return jsonResponse({ success: true, message: 'Event ignored' });
    }

    // Process event
    await processEvent(supabase, normalizedEvent);

    return jsonResponse({ success: true, event_type: normalizedEvent.event_type });
  } catch (error) {
    console.error('[streaming-webhook-v2] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function normalizeEvent(platform: string, body: Record<string, unknown>): NormalizedEvent | null {
  const timestamp = new Date().toISOString();

  switch (platform) {
    case 'youtube': {
      // YouTube Data API webhook format
      const eventType = body.type as string;
      if (eventType === 'video.live.start') {
        return {
          event_type: 'stream_started',
          session_id: body.session_id as string,
          channel_id: body.channel_id as string,
          platform: 'youtube',
          data: { broadcast_id: body.broadcast_id },
          timestamp,
        };
      }
      if (eventType === 'video.live.end') {
        return {
          event_type: 'stream_ended',
          session_id: body.session_id as string,
          channel_id: body.channel_id as string,
          platform: 'youtube',
          data: {},
          timestamp,
        };
      }
      break;
    }

    case 'twitch': {
      // Twitch EventSub format
      const subscription = body.subscription as Record<string, unknown>;
      const event = body.event as Record<string, unknown>;

      if (subscription?.type === 'stream.online') {
        return {
          event_type: 'stream_started',
          session_id: event?.broadcaster_user_id as string,
          platform: 'twitch',
          data: { stream_type: event?.type },
          timestamp,
        };
      }
      if (subscription?.type === 'stream.offline') {
        return {
          event_type: 'stream_ended',
          session_id: event?.broadcaster_user_id as string,
          platform: 'twitch',
          data: {},
          timestamp,
        };
      }
      break;
    }

    case 'tiktok': {
      // TikTok Live webhook format
      const eventType = body.event as string;
      if (eventType === 'live_start') {
        return {
          event_type: 'stream_started',
          session_id: body.room_id as string,
          platform: 'tiktok',
          data: { room_id: body.room_id },
          timestamp,
        };
      }
      if (eventType === 'live_end') {
        return {
          event_type: 'stream_ended',
          session_id: body.room_id as string,
          platform: 'tiktok',
          data: {},
          timestamp,
        };
      }
      if (eventType === 'viewer_count') {
        return {
          event_type: 'viewer_update',
          session_id: body.room_id as string,
          platform: 'tiktok',
          data: { viewers: body.viewer_count },
          timestamp,
        };
      }
      break;
    }

    case 'facebook': {
      // Facebook Live Video webhook
      const changes = (body.entry as Array<{ changes: Array<{ field: string; value: unknown }> }>)?.[0]?.changes;
      if (changes) {
        for (const change of changes) {
          if (change.field === 'live_videos') {
            const value = change.value as Record<string, unknown>;
            if (value.status === 'LIVE') {
              return {
                event_type: 'stream_started',
                session_id: value.video_id as string,
                platform: 'facebook',
                data: { video_id: value.video_id },
                timestamp,
              };
            }
            if (value.status === 'VOD') {
              return {
                event_type: 'stream_ended',
                session_id: value.video_id as string,
                platform: 'facebook',
                data: {},
                timestamp,
              };
            }
          }
        }
      }
      break;
    }

    case 'restream': {
      // Restream webhook format
      const eventType = body.event_type as string;
      return {
        event_type: eventType,
        session_id: body.session_id as string,
        channel_id: body.channel_id as string,
        platform: 'restream',
        data: body.data as Record<string, unknown> || {},
        timestamp,
      };
    }

    case 'kreoon': {
      // Internal Kreoon events
      return {
        event_type: body.event_type as string,
        session_id: body.session_id as string,
        channel_id: body.channel_id as string,
        platform: 'kreoon',
        data: body.data as Record<string, unknown> || {},
        timestamp,
      };
    }

    default:
      // Generic format
      if (body.event_type && body.session_id) {
        return {
          event_type: body.event_type as string,
          session_id: body.session_id as string,
          channel_id: body.channel_id as string,
          platform,
          data: body.data as Record<string, unknown> || {},
          timestamp,
        };
      }
  }

  return null;
}

async function processEvent(
  supabase: ReturnType<typeof createClient>,
  event: NormalizedEvent
) {
  console.log(`[streaming-webhook-v2] Processing: ${event.event_type}`);

  switch (event.event_type) {
    case 'stream_started': {
      // Update session channel status
      if (event.channel_id) {
        await supabase
          .from('streaming_session_channels_v2')
          .update({
            status: 'live',
            platform_stream_id: event.data.broadcast_id as string || event.data.video_id as string,
            started_at: event.timestamp,
          })
          .eq('channel_id', event.channel_id);
      }

      // Log event
      await logEvent(supabase, event, 'info', 'Stream iniciado');
      break;
    }

    case 'stream_ended': {
      // Update session channel status
      if (event.channel_id) {
        await supabase
          .from('streaming_session_channels_v2')
          .update({
            status: 'ended',
            ended_at: event.timestamp,
          })
          .eq('channel_id', event.channel_id);
      }

      // Check if all channels ended, then end session
      if (event.session_id) {
        const { data: channels } = await supabase
          .from('streaming_session_channels_v2')
          .select('status')
          .eq('session_id', event.session_id);

        const allEnded = channels?.every((c) => c.status === 'ended');
        if (allEnded) {
          await supabase
            .from('streaming_sessions_v2')
            .update({
              status: 'ended',
              ended_at: event.timestamp,
              updated_at: event.timestamp,
            })
            .eq('id', event.session_id);
        }
      }

      await logEvent(supabase, event, 'info', 'Stream finalizado');
      break;
    }

    case 'viewer_update': {
      const viewers = event.data.viewers as number || 0;

      // Update channel viewers
      if (event.channel_id) {
        const { data: channel } = await supabase
          .from('streaming_session_channels_v2')
          .select('viewers_peak')
          .eq('channel_id', event.channel_id)
          .single();

        await supabase
          .from('streaming_session_channels_v2')
          .update({
            viewers_current: viewers,
            viewers_peak: Math.max(channel?.viewers_peak || 0, viewers),
          })
          .eq('channel_id', event.channel_id);
      }

      // Update session peak viewers
      if (event.session_id) {
        const { data: session } = await supabase
          .from('streaming_sessions_v2')
          .select('peak_viewers')
          .eq('id', event.session_id)
          .single();

        // Sum all channel viewers
        const { data: channels } = await supabase
          .from('streaming_session_channels_v2')
          .select('viewers_current')
          .eq('session_id', event.session_id);

        const totalViewers = channels?.reduce((sum, c) => sum + (c.viewers_current || 0), 0) || 0;

        await supabase
          .from('streaming_sessions_v2')
          .update({
            total_viewers: totalViewers,
            peak_viewers: Math.max(session?.peak_viewers || 0, totalViewers),
            updated_at: event.timestamp,
          })
          .eq('id', event.session_id);

        // Insert analytics point
        await supabase.from('streaming_analytics_v2').insert({
          session_id: event.session_id,
          timestamp: event.timestamp,
          concurrent_viewers: totalViewers,
          platform_breakdown: { [event.platform]: viewers },
        });
      }
      break;
    }

    case 'chat_message': {
      // Insert chat message
      if (event.session_id) {
        await supabase.from('streaming_chat_messages_v2').insert({
          session_id: event.session_id,
          source_platform: event.platform,
          source_message_id: event.data.message_id as string,
          author_name: event.data.author_name as string || 'Anonymous',
          author_avatar_url: event.data.author_avatar as string,
          author_platform_id: event.data.author_id as string,
          content: event.data.content as string || '',
          message_type: 'text',
          created_at: event.timestamp,
        });

        // Update message count
        await supabase
          .from('streaming_sessions_v2')
          .update({
            total_messages: supabase.rpc('increment_by_one', { row_id: event.session_id, column_name: 'total_messages' }),
          })
          .eq('id', event.session_id);
      }
      break;
    }

    case 'purchase': {
      // Live shopping purchase
      if (event.session_id && event.data.product_id) {
        const productId = event.data.product_id as string;
        const amount = event.data.amount as number || 0;
        const quantity = event.data.quantity as number || 1;

        // Use RPC for atomic update
        await supabase.rpc('record_live_shopping_purchase', {
          p_session_id: event.session_id,
          p_product_id: productId,
          p_quantity: quantity,
          p_amount_usd: amount,
        });

        // Insert purchase notification in chat
        await supabase.from('streaming_chat_messages_v2').insert({
          session_id: event.session_id,
          source_platform: 'kreoon',
          author_name: event.data.buyer_name as string || 'Cliente',
          content: `¡Compró ${event.data.product_title}!`,
          message_type: 'purchase_notification',
          metadata: {
            product_id: productId,
            amount,
            quantity,
          },
          created_at: event.timestamp,
        });

        await logEvent(supabase, event, 'info', `Compra: ${event.data.product_title}`);
      }
      break;
    }

    case 'error': {
      // Channel error
      if (event.channel_id) {
        await supabase
          .from('streaming_session_channels_v2')
          .update({
            status: 'error',
            error_message: event.data.error as string || 'Unknown error',
          })
          .eq('channel_id', event.channel_id);
      }

      await logEvent(supabase, event, 'error', event.data.error as string || 'Error en stream');
      break;
    }

    default:
      await logEvent(supabase, event, 'info', `Evento: ${event.event_type}`);
  }
}

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  event: NormalizedEvent,
  severity: string,
  message: string
) {
  try {
    await supabase.from('streaming_logs').insert({
      owner_type: 'platform',
      log_type: event.event_type,
      message,
      severity,
      event_id: event.session_id,
      platform_type: event.platform,
      metadata: event.data,
    });
  } catch (err) {
    console.error('[streaming-webhook-v2] Log error:', err);
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
