import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESTREAM_API_BASE = 'https://api.restream.io/v2';
const RESTREAM_AUTH_URL = 'https://api.restream.io/oauth';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`[restream-api] Action: ${action}`, params);

    switch (action) {
      // ============================================
      // OAuth Flow
      // ============================================
      case 'get_auth_url': {
        const { organization_id, redirect_uri } = params;
        const clientId = Deno.env.get('RESTREAM_CLIENT_ID');
        
        if (!clientId) {
          throw new Error('RESTREAM_CLIENT_ID not configured');
        }

        const state = btoa(JSON.stringify({ organization_id }));
        const authUrl = `${RESTREAM_AUTH_URL}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&state=${state}`;
        
        return new Response(JSON.stringify({ auth_url: authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'exchange_code': {
        const { code, redirect_uri, organization_id } = params;
        const clientId = Deno.env.get('RESTREAM_CLIENT_ID');
        const clientSecret = Deno.env.get('RESTREAM_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
          throw new Error('Restream credentials not configured');
        }

        const tokenResponse = await fetch(`${RESTREAM_AUTH_URL}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('[restream-api] Token exchange failed:', error);
          throw new Error('Failed to exchange code for tokens');
        }

        const tokens = await tokenResponse.json();
        
        // Store tokens in database
        const { error: upsertError } = await supabase
          .from('live_org_oauth_tokens')
          .upsert({
            organization_id,
            provider: 'restream',
            access_token_encrypted: tokens.access_token,
            refresh_token_encrypted: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            scopes: tokens.scope?.split(' ') || [],
          }, { onConflict: 'organization_id,provider' });

        if (upsertError) {
          console.error('[restream-api] Error storing tokens:', upsertError);
          throw upsertError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // Channel Management
      // ============================================
      case 'get_channels': {
        const { organization_id } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        const response = await fetch(`${RESTREAM_API_BASE}/user/channel-set`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch channels');
        }

        const channels = await response.json();
        return new Response(JSON.stringify({ channels }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // Event/Stream Management
      // ============================================
      case 'create_event': {
        const { organization_id, title, scheduled_at, destinations } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        // Create scheduled event in Restream
        const eventPayload = {
          title,
          scheduledFor: scheduled_at,
          destinations: destinations || [],
        };

        const response = await fetch(`${RESTREAM_API_BASE}/user/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('[restream-api] Create event failed:', error);
          throw new Error('Failed to create event in Restream');
        }

        const event = await response.json();
        return new Response(JSON.stringify({ event }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_stream_key': {
        const { organization_id } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        const response = await fetch(`${RESTREAM_API_BASE}/user/stream-key`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stream key');
        }

        const data = await response.json();
        return new Response(JSON.stringify({ 
          stream_key: data.streamKey,
          rtmp_url: 'rtmp://live.restream.io/live',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_stream_status': {
        const { organization_id } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        const response = await fetch(`${RESTREAM_API_BASE}/user/stream/status`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stream status');
        }

        const status = await response.json();
        return new Response(JSON.stringify({ status }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_stream': {
        const { organization_id, event_id } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        const response = await fetch(`${RESTREAM_API_BASE}/user/events/${event_id}/go-live`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to start stream');
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'stop_stream': {
        const { organization_id, event_id } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        const response = await fetch(`${RESTREAM_API_BASE}/user/events/${event_id}/end`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to stop stream');
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ============================================
      // Analytics
      // ============================================
      case 'get_analytics': {
        const { organization_id, event_id } = params;
        const accessToken = await getAccessToken(supabase, organization_id);

        const response = await fetch(`${RESTREAM_API_BASE}/user/events/${event_id}/analytics`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const analytics = await response.json();
        return new Response(JSON.stringify({ analytics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_connection': {
        const { organization_id } = params;
        
        const { data: tokenData } = await supabase
          .from('live_org_oauth_tokens')
          .select('*')
          .eq('organization_id', organization_id)
          .eq('provider', 'restream')
          .maybeSingle();

        return new Response(JSON.stringify({ 
          connected: !!tokenData,
          expires_at: tokenData?.expires_at,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        const { organization_id } = params;
        
        const { error } = await supabase
          .from('live_org_oauth_tokens')
          .delete()
          .eq('organization_id', organization_id)
          .eq('provider', 'restream');

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[restream-api] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper to get and refresh access token
async function getAccessToken(supabase: any, organizationId: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from('live_org_oauth_tokens')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', 'restream')
    .single();

  if (error || !tokenData) {
    throw new Error('Restream not connected for this organization');
  }

  // Check if token is expired
  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt <= new Date()) {
    // Refresh the token
    const clientId = Deno.env.get('RESTREAM_CLIENT_ID');
    const clientSecret = Deno.env.get('RESTREAM_CLIENT_SECRET');

    const refreshResponse = await fetch(`${RESTREAM_AUTH_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token_encrypted,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Restream token');
    }

    const newTokens = await refreshResponse.json();

    // Update tokens in database
    await supabase
      .from('live_org_oauth_tokens')
      .update({
        access_token_encrypted: newTokens.access_token,
        refresh_token_encrypted: newTokens.refresh_token || tokenData.refresh_token_encrypted,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      })
      .eq('id', tokenData.id);

    return newTokens.access_token;
  }

  return tokenData.access_token_encrypted;
}
