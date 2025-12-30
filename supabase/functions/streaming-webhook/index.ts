import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface WebhookPayload {
  provider: 'restream' | 'watchity' | 'custom';
  event_type: string;
  event_id?: string;
  account_id?: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook secret if provided
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('STREAMING_WEBHOOK_SECRET');
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: WebhookPayload = await req.json();
    console.log('Received webhook:', JSON.stringify(payload, null, 2));

    const { provider, event_type, event_id, account_id, data } = payload;

    // Process different event types
    switch (event_type) {
      case 'stream.started':
        console.log('Stream started event');
        if (event_id) {
          await supabase
            .from('streaming_events')
            .update({
              status: 'live',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', event_id);
        }
        
        await logEvent(supabase, {
          log_type: 'stream_started',
          message: `Stream iniciado via ${provider}`,
          severity: 'info',
          provider,
          event_id,
          account_id,
          metadata: data,
        });
        break;

      case 'stream.ended':
        console.log('Stream ended event');
        if (event_id) {
          await supabase
            .from('streaming_events')
            .update({
              status: 'ended',
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', event_id);
        }
        
        await logEvent(supabase, {
          log_type: 'stream_ended',
          message: `Stream finalizado via ${provider}`,
          severity: 'info',
          provider,
          event_id,
          account_id,
          metadata: data,
        });
        break;

      case 'stream.error':
        console.log('Stream error event');
        await logEvent(supabase, {
          log_type: 'stream_error',
          message: `Error en stream: ${data.error || 'Unknown error'}`,
          severity: 'error',
          provider,
          event_id,
          account_id,
          metadata: data,
        });
        break;

      case 'viewer.count':
        console.log('Viewer count update');
        if (event_id && typeof data.viewers === 'number') {
          const { data: event } = await supabase
            .from('streaming_events')
            .select('peak_viewers, total_views')
            .eq('id', event_id)
            .single();

          if (event) {
            await supabase
              .from('streaming_events')
              .update({
                peak_viewers: Math.max(event.peak_viewers || 0, data.viewers as number),
                total_views: (event.total_views || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event_id);
          }
        }
        break;

      case 'account.connected':
        console.log('Account connected event');
        if (account_id) {
          await supabase
            .from('streaming_accounts')
            .update({
              status: 'connected',
              last_sync_at: new Date().toISOString(),
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account_id);
        }
        
        await logEvent(supabase, {
          log_type: 'account_connected',
          message: `Cuenta conectada via ${provider}`,
          severity: 'info',
          provider,
          account_id,
          metadata: data,
        });
        break;

      case 'account.disconnected':
        console.log('Account disconnected event');
        if (account_id) {
          await supabase
            .from('streaming_accounts')
            .update({
              status: 'disconnected',
              error_message: data.reason as string || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account_id);
        }
        
        await logEvent(supabase, {
          log_type: 'account_disconnected',
          message: `Cuenta desconectada: ${data.reason || 'Sin razón especificada'}`,
          severity: 'warning',
          provider,
          account_id,
          metadata: data,
        });
        break;

      case 'account.error':
        console.log('Account error event');
        if (account_id) {
          await supabase
            .from('streaming_accounts')
            .update({
              status: 'error',
              error_message: data.error as string || 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', account_id);
        }
        
        await logEvent(supabase, {
          log_type: 'account_error',
          message: `Error en cuenta: ${data.error || 'Error desconocido'}`,
          severity: 'error',
          provider,
          account_id,
          metadata: data,
        });
        break;

      case 'product.clicked':
        console.log('Product clicked event');
        if (data.product_id) {
          const { data: product } = await supabase
            .from('streaming_event_products')
            .select('clicks_count')
            .eq('id', data.product_id)
            .single();

          if (product) {
            await supabase
              .from('streaming_event_products')
              .update({
                clicks_count: (product.clicks_count || 0) + 1,
              })
              .eq('id', data.product_id);
          }
        }
        break;

      case 'product.conversion':
        console.log('Product conversion event');
        if (data.product_id) {
          const { data: product } = await supabase
            .from('streaming_event_products')
            .select('conversions_count')
            .eq('id', data.product_id)
            .single();

          if (product) {
            await supabase
              .from('streaming_event_products')
              .update({
                conversions_count: (product.conversions_count || 0) + 1,
              })
              .eq('id', data.product_id);
          }
        }
        
        await logEvent(supabase, {
          log_type: 'product_conversion',
          message: `Conversión registrada para producto`,
          severity: 'info',
          provider,
          event_id,
          metadata: data,
        });
        break;

      default:
        console.log('Unknown event type:', event_type);
        await logEvent(supabase, {
          log_type: 'webhook_received',
          message: `Webhook recibido: ${event_type}`,
          severity: 'info',
          provider,
          event_id,
          account_id,
          metadata: data,
        });
    }

    return new Response(JSON.stringify({ success: true, event_type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logEvent(supabase: any, log: {
  log_type: string;
  message: string;
  severity: string;
  provider?: string;
  event_id?: string;
  account_id?: string;
  platform_type?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from('streaming_logs').insert({
      owner_type: 'platform',
      log_type: log.log_type,
      message: log.message,
      severity: log.severity,
      provider: log.provider,
      event_id: log.event_id,
      account_id: log.account_id,
      platform_type: log.platform_type,
      metadata: log.metadata,
    });
  } catch (error) {
    console.error('Error logging event:', error);
  }
}
