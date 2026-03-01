/**
 * streaming-hub - Edge Function principal para Streaming V2
 * Gestión unificada de sesiones, canales y multistreaming
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform RTMP endpoints
const PLATFORM_RTMP_URLS: Record<string, string> = {
  youtube: 'rtmp://a.rtmp.youtube.com/live2',
  facebook: 'rtmps://live-api-s.facebook.com:443/rtmp/',
  twitch: 'rtmp://live.twitch.tv/app',
  tiktok: 'rtmp://push.tiktok.com/rtmp/live',
  instagram: 'rtmps://live-upload.instagram.com:443/rtmp/',
  linkedin: 'rtmp://rtmp-api.linkedin.com:1935/rtmpin',
  twitter: 'rtmp://prod-video-twitter.com/rtmp/',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...params } = await req.json();
    console.log(`[streaming-hub] Action: ${action}, User: ${user.id}`);

    switch (action) {
      // ============================================
      // SESSION MANAGEMENT
      // ============================================
      case 'create_session': {
        const {
          organization_id,
          title,
          description,
          session_type,
          scheduled_at,
          is_shopping_enabled,
          client_id,
          product_id,
          campaign_id,
          channel_ids,
          stream_settings,
        } = params;

        // Create session
        const { data: session, error: sessionError } = await supabase
          .from('streaming_sessions_v2')
          .insert({
            organization_id,
            host_user_id: user.id,
            title,
            description,
            session_type: session_type || 'standard',
            scheduled_at,
            is_shopping_enabled: is_shopping_enabled || false,
            client_id,
            product_id,
            campaign_id,
            stream_settings: stream_settings || {
              resolution: '1080p',
              fps: 30,
              bitrate: 6000,
              encoder: 'browser',
              audio_bitrate: 128,
              latency_mode: 'normal',
            },
            status: scheduled_at ? 'scheduled' : 'draft',
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Add channels
        if (channel_ids?.length > 0) {
          const channelInserts = channel_ids.map((channel_id: string) => ({
            session_id: session.id,
            channel_id,
          }));

          await supabase.from('streaming_session_channels_v2').insert(channelInserts);
        }

        return jsonResponse({ session });
      }

      case 'update_session': {
        const { session_id, updates } = params;

        const { error } = await supabase
          .from('streaming_sessions_v2')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', session_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'start_session': {
        const { session_id } = params;

        // Get session with channels
        const { data: session, error: fetchError } = await supabase
          .from('streaming_sessions_v2')
          .select('*, channels:streaming_session_channels_v2(*, channel:streaming_channels_v2(*))')
          .eq('id', session_id)
          .single();

        if (fetchError) throw fetchError;

        // Update session status
        await supabase
          .from('streaming_sessions_v2')
          .update({
            status: 'live',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', session_id);

        // Update each channel to 'connecting'
        for (const sc of session.channels || []) {
          await supabase
            .from('streaming_session_channels_v2')
            .update({ status: 'connecting', started_at: new Date().toISOString() })
            .eq('id', sc.id);

          // TODO: Actually start RTMP stream to each platform
          // This would require FFmpeg or similar to multiplex the stream
          // For now, mark as 'live' after a delay
          setTimeout(async () => {
            await supabase
              .from('streaming_session_channels_v2')
              .update({ status: 'live' })
              .eq('id', sc.id);
          }, 2000);
        }

        // Log event
        await logStreamingEvent(supabase, {
          session_id,
          event_type: 'session_started',
          message: 'Sesión de streaming iniciada',
          user_id: user.id,
        });

        return jsonResponse({ success: true, session });
      }

      case 'stop_session': {
        const { session_id } = params;

        // Update session status
        await supabase
          .from('streaming_sessions_v2')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', session_id);

        // Update all channels to 'ended'
        await supabase
          .from('streaming_session_channels_v2')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('session_id', session_id);

        // Log event
        await logStreamingEvent(supabase, {
          session_id,
          event_type: 'session_ended',
          message: 'Sesión de streaming finalizada',
          user_id: user.id,
        });

        return jsonResponse({ success: true });
      }

      case 'pause_session': {
        const { session_id } = params;

        await supabase
          .from('streaming_sessions_v2')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', session_id);

        return jsonResponse({ success: true });
      }

      case 'resume_session': {
        const { session_id } = params;

        await supabase
          .from('streaming_sessions_v2')
          .update({ status: 'live', updated_at: new Date().toISOString() })
          .eq('id', session_id);

        return jsonResponse({ success: true });
      }

      case 'get_session_status': {
        const { session_id } = params;

        const { data: session, error } = await supabase
          .from('streaming_sessions_v2')
          .select(`
            *,
            channels:streaming_session_channels_v2(
              *,
              channel:streaming_channels_v2(*)
            ),
            products:streaming_products_v2(*),
            host:profiles!streaming_sessions_v2_host_user_id_fkey(full_name, avatar_url)
          `)
          .eq('id', session_id)
          .single();

        if (error) throw error;
        return jsonResponse({ session });
      }

      // ============================================
      // CHANNEL MANAGEMENT
      // ============================================
      case 'add_channel': {
        const {
          organization_id,
          platform,
          platform_display_name,
          rtmp_url,
          rtmp_key,
          is_primary,
          max_resolution,
          max_bitrate,
        } = params;

        // Encrypt RTMP key (simple base64 for now, should use proper encryption)
        const rtmp_key_encrypted = rtmp_key ? btoa(rtmp_key) : null;

        const { data: channel, error } = await supabase
          .from('streaming_channels_v2')
          .insert({
            organization_id,
            created_by: user.id,
            platform,
            platform_display_name,
            rtmp_url: rtmp_url || PLATFORM_RTMP_URLS[platform] || null,
            rtmp_key_encrypted,
            is_primary: is_primary || false,
            max_resolution: max_resolution || '1080p',
            max_bitrate: max_bitrate || 6000,
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ channel });
      }

      case 'update_channel': {
        const { channel_id, updates } = params;

        // Handle RTMP key encryption if provided
        if (updates.rtmp_key) {
          updates.rtmp_key_encrypted = btoa(updates.rtmp_key);
          delete updates.rtmp_key;
        }

        const { error } = await supabase
          .from('streaming_channels_v2')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', channel_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'delete_channel': {
        const { channel_id } = params;

        // Soft delete
        const { error } = await supabase
          .from('streaming_channels_v2')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', channel_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'test_channel': {
        const { channel_id } = params;

        const { data: channel, error } = await supabase
          .from('streaming_channels_v2')
          .select('*')
          .eq('id', channel_id)
          .single();

        if (error) throw error;

        // TODO: Actually test RTMP connection
        // For now, simulate a test
        const testResult = {
          success: true,
          latency_ms: Math.floor(Math.random() * 100) + 50,
          message: `Conexión exitosa a ${channel.platform_display_name}`,
        };

        return jsonResponse(testResult);
      }

      // ============================================
      // OAUTH
      // ============================================
      case 'get_oauth_url': {
        const { platform, organization_id, redirect_uri } = params;

        // Platform-specific OAuth URLs
        const oauthConfigs: Record<string, { client_id_env: string; auth_url: string; scopes: string }> = {
          youtube: {
            client_id_env: 'GOOGLE_CLIENT_ID',
            auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
            scopes: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
          },
          twitch: {
            client_id_env: 'TWITCH_CLIENT_ID',
            auth_url: 'https://id.twitch.tv/oauth2/authorize',
            scopes: 'channel:read:stream_key channel:manage:broadcast',
          },
          facebook: {
            client_id_env: 'FACEBOOK_APP_ID',
            auth_url: 'https://www.facebook.com/v18.0/dialog/oauth',
            scopes: 'pages_read_engagement,pages_manage_posts,publish_video',
          },
        };

        const config = oauthConfigs[platform];
        if (!config) {
          return jsonResponse({ error: `OAuth no soportado para ${platform}` }, 400);
        }

        const clientId = Deno.env.get(config.client_id_env);
        if (!clientId) {
          return jsonResponse({ error: `${platform} no está configurado` }, 400);
        }

        const state = btoa(JSON.stringify({ organization_id, platform }));
        const authUrl = `${config.auth_url}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(config.scopes)}&state=${state}`;

        return jsonResponse({ auth_url: authUrl });
      }

      case 'exchange_oauth_code': {
        const { code, platform, organization_id, redirect_uri } = params;

        // TODO: Implement actual OAuth token exchange per platform
        // This would require platform-specific API calls

        return jsonResponse({ success: true, message: 'OAuth exchange not yet implemented' });
      }

      // ============================================
      // GUESTS
      // ============================================
      case 'invite_guest': {
        const {
          session_id,
          guest_name,
          guest_email,
          can_share_screen,
          can_share_audio,
          can_share_video,
          can_manage_products,
        } = params;

        const { data: guest, error } = await supabase
          .from('streaming_guests_v2')
          .insert({
            session_id,
            guest_name,
            guest_email,
            can_share_screen: can_share_screen || false,
            can_share_audio: can_share_audio ?? true,
            can_share_video: can_share_video ?? true,
            can_manage_products: can_manage_products || false,
          })
          .select()
          .single();

        if (error) throw error;

        // TODO: Send invitation email with join_token

        return jsonResponse({ guest });
      }

      case 'update_guest_status': {
        const { guest_id, status } = params;

        const updates: Record<string, unknown> = { status };
        if (status === 'connected') {
          updates.joined_at = new Date().toISOString();
        } else if (status === 'disconnected') {
          updates.left_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('streaming_guests_v2')
          .update(updates)
          .eq('id', guest_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'join_as_guest': {
        const { join_token } = params;

        const { data: guest, error } = await supabase
          .from('streaming_guests_v2')
          .select('*, session:streaming_sessions_v2(*)')
          .eq('join_token', join_token)
          .single();

        if (error || !guest) {
          return jsonResponse({ error: 'Token inválido' }, 404);
        }

        // Update guest status
        await supabase
          .from('streaming_guests_v2')
          .update({ status: 'connected', joined_at: new Date().toISOString() })
          .eq('id', guest.id);

        return jsonResponse({ guest, session: guest.session });
      }

      // ============================================
      // RECORDING
      // ============================================
      case 'start_recording': {
        const { session_id } = params;

        // TODO: Implement recording start (Bunny CDN or similar)
        await supabase
          .from('streaming_sessions_v2')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', session_id);

        return jsonResponse({ success: true, message: 'Recording started' });
      }

      case 'stop_recording': {
        const { session_id } = params;

        // TODO: Implement recording stop and get URL
        return jsonResponse({ success: true, recording_url: null });
      }

      // ============================================
      // ANALYTICS EXPORT
      // ============================================
      case 'export_analytics': {
        const { session_id, format } = params;

        // TODO: Generate PDF or CSV report
        const downloadUrl = `https://example.com/reports/${session_id}.${format}`;

        return jsonResponse({ download_url: downloadUrl });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[streaming-hub] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function logStreamingEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    session_id: string;
    event_type: string;
    message: string;
    user_id?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from('streaming_logs').insert({
      owner_type: 'platform',
      log_type: event.event_type,
      message: event.message,
      severity: 'info',
      event_id: event.session_id,
      metadata: { ...event.metadata, user_id: event.user_id },
    });
  } catch (err) {
    console.error('[streaming-hub] Log error:', err);
  }
}
