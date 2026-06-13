import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'https://kreoon.com';
// Secreto para firmar el state OAuth (HMAC anti-CSRF). Fallback a SERVICE_ROLE_KEY,
// pero recomendamos configurar OAUTH_STATE_SECRET dedicado.
const STATE_SECRET =
  Deno.env.get('OAUTH_STATE_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// El state expira en 10 minutos
const STATE_TTL_MS = 10 * 60 * 1000;

type Action =
  | 'get_auth_url'
  | 'exchange_code'
  | 'create_event'
  | 'update_event'
  | 'cancel_event'
  | 'get_member_auth_url'
  | 'member_exchange_code'
  | 'add_to_member_cal';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Auth: JWT obligatorio para todo excepto los exchange (que vienen con code) ──
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    }
    const callerId = userData.user.id;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return corsJsonResponse(req, { error: 'google_credentials_not_configured' }, 500);
    }

    const body = await req.json();
    const action = body?.action as Action;
    if (!action) {
      return corsJsonResponse(req, { error: 'action_required' }, 400);
    }

    // ─────────────── GET_AUTH_URL (owner) ───────────────
    if (action === 'get_auth_url') {
      const { space_id } = body;
      if (!space_id) return corsJsonResponse(req, { error: 'space_id requerido' }, 400);

      // Verificar que el caller es el owner del space
      const { data: space } = await supabase
        .from('academy_spaces')
        .select('id, owner_id')
        .eq('id', space_id)
        .single();
      if (!space || space.owner_id !== callerId) {
        return corsJsonResponse(req, { error: 'forbidden' }, 403);
      }

      const redirectUri = `${FRONTEND_URL}/academia/calendar/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
      const state = await signState({ space_id, type: 'owner', uid: callerId });

      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', scope);
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('state', state);

      return corsJsonResponse(req, { auth_url: url.toString() });
    }

    // ─────────────── EXCHANGE_CODE (owner) ───────────────
    if (action === 'exchange_code') {
      const { code, space_id, state: stateParam } = body;
      if (!code || !space_id) {
        return corsJsonResponse(req, { error: 'code y space_id requeridos' }, 400);
      }

      // Anti-CSRF: state es obligatorio
      if (!stateParam) return corsJsonResponse(req, { error: 'state_required' }, 400);
      const verified = await verifyState(stateParam);
      if (!verified.ok) {
        return corsJsonResponse(req, { error: 'invalid_state', reason: verified.reason }, 400);
      }
      if (
        verified.payload.type !== 'owner' ||
        verified.payload.space_id !== space_id ||
        verified.payload.uid !== callerId
      ) {
        return corsJsonResponse(req, { error: 'state_mismatch' }, 400);
      }

      const { data: space } = await supabase
        .from('academy_spaces')
        .select('id, owner_id')
        .eq('id', space_id)
        .single();
      if (!space || space.owner_id !== callerId) {
        return corsJsonResponse(req, { error: 'forbidden' }, 403);
      }

      const redirectUri = `${FRONTEND_URL}/academia/calendar/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.error) {
        return corsJsonResponse(req, { error: tokens.error_description ?? tokens.error }, 400);
      }

      await supabase.from('academy_google_calendar_tokens').upsert(
        {
          space_id,
          owner_id: callerId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
          is_active: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'space_id' }
      );

      return corsJsonResponse(req, { success: true });
    }

    // ─────────────── CREATE_EVENT ───────────────
    if (action === 'create_event') {
      const { event_id, space_id } = body;
      if (!event_id || !space_id) {
        return corsJsonResponse(req, { error: 'event_id y space_id requeridos' }, 400);
      }

      // Verificar ownership
      const { data: space } = await supabase
        .from('academy_spaces')
        .select('id, owner_id')
        .eq('id', space_id)
        .single();
      if (!space || space.owner_id !== callerId) {
        return corsJsonResponse(req, { error: 'forbidden' }, 403);
      }

      const accessToken = await getValidAccessToken(supabase, space_id);
      if (!accessToken) {
        return corsJsonResponse(req, { error: 'google_calendar_not_connected' }, 400);
      }

      const { data: event } = await supabase
        .from('academy_space_events')
        .select('*')
        .eq('id', event_id)
        .single();
      if (!event) return corsJsonResponse(req, { error: 'event_not_found' }, 404);

      const { data: tokenData } = await supabase
        .from('academy_google_calendar_tokens')
        .select('calendar_id')
        .eq('space_id', space_id)
        .single();
      const calendarId = tokenData?.calendar_id ?? 'primary';

      const { data: invitations } = await supabase
        .from('academy_event_invitations')
        .select('email')
        .eq('event_id', event_id);

      const attendees = (invitations ?? [])
        .filter((i: any) => i.email && /\S+@\S+\.\S+/.test(i.email))
        .map((i: any) => ({ email: i.email }));

      const googleEvent = {
        summary: event.title,
        description: event.description ?? '',
        start: { dateTime: event.starts_at, timeZone: event.timezone },
        end: { dateTime: event.ends_at, timeZone: event.timezone },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: event_id,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      };

      const createRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        }
      );
      const createdEvent = await createRes.json();
      if (createdEvent.error) {
        return corsJsonResponse(req, { error: createdEvent.error.message ?? 'google_create_failed' }, 400);
      }

      const meetLink = createdEvent.conferenceData?.entryPoints?.[0]?.uri ?? null;
      await supabase
        .from('academy_space_events')
        .update({
          google_event_id: createdEvent.id,
          google_calendar_id: calendarId,
          google_meet_link: meetLink,
          meeting_url: meetLink ?? event.meeting_url,
        })
        .eq('id', event_id);

      await supabase
        .from('academy_google_calendar_tokens')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('space_id', space_id);

      return corsJsonResponse(req, {
        success: true,
        google_event_id: createdEvent.id,
        meet_link: meetLink,
      });
    }

    // ─────────────── UPDATE_EVENT ───────────────
    if (action === 'update_event') {
      const { event_id, space_id } = body;
      const { data: space } = await supabase
        .from('academy_spaces')
        .select('owner_id')
        .eq('id', space_id)
        .single();
      if (!space || space.owner_id !== callerId) {
        return corsJsonResponse(req, { error: 'forbidden' }, 403);
      }

      const accessToken = await getValidAccessToken(supabase, space_id);
      const { data: event } = await supabase
        .from('academy_space_events')
        .select('*')
        .eq('id', event_id)
        .single();
      if (!event?.google_event_id || !accessToken) {
        return corsJsonResponse(req, { error: 'not_synced_yet' }, 400);
      }

      const patchRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.google_calendar_id ?? 'primary')}/events/${event.google_event_id}?sendUpdates=all`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: event.title,
            description: event.description ?? '',
            start: { dateTime: event.starts_at, timeZone: event.timezone },
            end: { dateTime: event.ends_at, timeZone: event.timezone },
          }),
        }
      );
      const updated = await patchRes.json();
      if (updated.error) {
        return corsJsonResponse(req, { error: updated.error.message }, 400);
      }
      return corsJsonResponse(req, { success: true });
    }

    // ─────────────── CANCEL_EVENT ───────────────
    if (action === 'cancel_event') {
      const { event_id, space_id, reason } = body;

      const { data: space } = await supabase
        .from('academy_spaces')
        .select('owner_id, slug')
        .eq('id', space_id)
        .single();
      if (!space || space.owner_id !== callerId) {
        return corsJsonResponse(req, { error: 'forbidden' }, 403);
      }

      const { data: event } = await supabase
        .from('academy_space_events')
        .select('google_event_id, google_calendar_id, title, space_id')
        .eq('id', event_id)
        .single();
      if (!event) return corsJsonResponse(req, { error: 'event_not_found' }, 404);

      const accessToken = await getValidAccessToken(supabase, space_id);
      if (event.google_event_id && accessToken) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(event.google_calendar_id ?? 'primary')}/events/${event.google_event_id}?sendUpdates=all`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      }

      await supabase
        .from('academy_space_events')
        .update({
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason ?? null,
          is_published: false,
        })
        .eq('id', event_id);

      // Notificar a invitados
      const { data: invitations } = await supabase
        .from('academy_event_invitations')
        .select('user_id')
        .eq('event_id', event_id);
      const notifications = (invitations ?? []).map((inv: any) => ({
        space_id: event.space_id,
        recipient_id: inv.user_id,
        type: 'event_cancelled',
        title: 'Evento cancelado: ' + event.title,
        body: reason ?? 'El evento fue cancelado por el organizador.',
        link: `/academia/${space.slug}/calendar`,
        reference_id: event_id,
        reference_type: 'event',
      }));
      if (notifications.length > 0) {
        await supabase.from('academy_notifications').insert(notifications);
      }

      return corsJsonResponse(req, { success: true });
    }

    // ─────────────── GET_MEMBER_AUTH_URL ───────────────
    if (action === 'get_member_auth_url') {
      const redirectUri = `${FRONTEND_URL}/academia/calendar/member-callback`;
      const scope = 'https://www.googleapis.com/auth/calendar.events';
      const state = await signState({ user_id: callerId, type: 'member' });

      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', scope);
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('state', state);

      return corsJsonResponse(req, { auth_url: url.toString() });
    }

    // ─────────────── MEMBER_EXCHANGE_CODE ───────────────
    if (action === 'member_exchange_code') {
      const { code, state: stateParam } = body;
      if (!code) return corsJsonResponse(req, { error: 'code_required' }, 400);

      // Anti-CSRF state validation (obligatorio)
      if (!stateParam) return corsJsonResponse(req, { error: 'state_required' }, 400);
      const verified = await verifyState(stateParam);
      if (!verified.ok) {
        return corsJsonResponse(req, { error: 'invalid_state', reason: verified.reason }, 400);
      }
      if (verified.payload.type !== 'member' || verified.payload.user_id !== callerId) {
        return corsJsonResponse(req, { error: 'state_mismatch' }, 400);
      }

      const redirectUri = `${FRONTEND_URL}/academia/calendar/member-callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.error) {
        return corsJsonResponse(req, { error: tokens.error_description ?? tokens.error }, 400);
      }

      await supabase.from('academy_member_calendar_tokens').upsert(
        {
          user_id: callerId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
          is_active: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      return corsJsonResponse(req, { success: true });
    }

    // ─────────────── ADD_TO_MEMBER_CAL ───────────────
    if (action === 'add_to_member_cal') {
      const { event_id } = body;
      if (!event_id) return corsJsonResponse(req, { error: 'event_id_required' }, 400);

      const { data: memberToken } = await supabase
        .from('academy_member_calendar_tokens')
        .select('*')
        .eq('user_id', callerId)
        .single();
      if (!memberToken) {
        return corsJsonResponse(req, { error: 'member_calendar_not_connected' }, 400);
      }

      const memberAccessToken = await refreshMemberTokenIfNeeded(supabase, memberToken);

      const { data: event } = await supabase
        .from('academy_space_events')
        .select('*')
        .eq('id', event_id)
        .single();
      if (!event) return corsJsonResponse(req, { error: 'event_not_found' }, 404);

      // Verificar que el caller fue invitado
      const { data: invitation } = await supabase
        .from('academy_event_invitations')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', callerId)
        .single();
      if (!invitation) {
        return corsJsonResponse(req, { error: 'not_invited' }, 403);
      }

      const googleEvent = {
        summary: event.title,
        description: event.description ?? '',
        start: { dateTime: event.starts_at, timeZone: event.timezone },
        end: { dateTime: event.ends_at, timeZone: event.timezone },
        location: event.meeting_url ?? event.google_meet_link ?? '',
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });
      const created = await res.json();
      if (created.error) {
        return corsJsonResponse(req, { error: created.error.message }, 400);
      }

      await supabase
        .from('academy_event_invitations')
        .update({
          google_calendar_added: true,
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('event_id', event_id)
        .eq('user_id', callerId);

      return corsJsonResponse(req, { success: true, google_event_id: created.id });
    }

    return corsJsonResponse(req, { error: `unknown_action:${action}` }, 400);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? 'internal_error' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});

// ─── Helpers ───
async function getValidAccessToken(supabase: any, spaceId: string): Promise<string | null> {
  const { data } = await supabase
    .from('academy_google_calendar_tokens')
    .select('*')
    .eq('space_id', spaceId)
    .single();
  if (!data) return null;

  // Si el token vence en menos de 60s, refrescar
  if (data.token_expiry && new Date(data.token_expiry) < new Date(Date.now() + 60_000)) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: data.refresh_token,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });
    const refreshed = await refreshRes.json();
    if (refreshed.error || !refreshed.access_token) return null;

    await supabase
      .from('academy_google_calendar_tokens')
      .update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
      })
      .eq('space_id', spaceId);

    return refreshed.access_token;
  }
  return data.access_token;
}

// ─── OAuth state HMAC helpers (anti-CSRF) ───
function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

/**
 * Firma el payload del state OAuth con HMAC-SHA256.
 * Estructura: base64url(payload).base64url(timestamp_ms).base64url(nonce).base64url(hmac)
 */
async function signState(payload: Record<string, unknown>): Promise<string> {
  if (!STATE_SECRET) {
    throw new Error('OAUTH_STATE_SECRET no configurado');
  }
  const ts = Date.now().toString();
  const nonce = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const data = `${payloadB64}.${ts}.${nonce}`;
  const mac = await hmacSha256(STATE_SECRET, data);
  return `${data}.${mac}`;
}

async function verifyState(state: string): Promise<
  | { ok: true; payload: any }
  | { ok: false; reason: string }
> {
  if (!STATE_SECRET) return { ok: false, reason: 'no_secret' };
  const parts = state.split('.');
  if (parts.length !== 4) return { ok: false, reason: 'malformed' };
  const [payloadB64, ts, nonce, sig] = parts;
  const data = `${payloadB64}.${ts}.${nonce}`;
  const expected = await hmacSha256(STATE_SECRET, data);
  // Comparación constante: usamos longitud + XOR acumulado
  if (expected.length !== sig.length) return { ok: false, reason: 'sig_length' };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, reason: 'sig_mismatch' };

  const ageMs = Date.now() - Number(ts);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > STATE_TTL_MS) {
    return { ok: false, reason: 'expired' };
  }
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'payload_decode' };
  }
}

async function refreshMemberTokenIfNeeded(supabase: any, tokenData: any): Promise<string> {
  if (tokenData.token_expiry && new Date(tokenData.token_expiry) < new Date(Date.now() + 60_000)) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokenData.refresh_token,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });
    const refreshed = await refreshRes.json();
    if (refreshed.access_token) {
      await supabase
        .from('academy_member_calendar_tokens')
        .update({
          access_token: refreshed.access_token,
          token_expiry: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
        })
        .eq('user_id', tokenData.user_id);
      return refreshed.access_token;
    }
  }
  return tokenData.access_token;
}
