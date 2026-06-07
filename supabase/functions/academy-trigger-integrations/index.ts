// ============================================================
// ACADEMY TRIGGER INTEGRATIONS
// Recibe un evento del frontend y dispara los plugins del space:
//   - Webhook Zapier
//   - Webhook propio (Kreoon)
//   - Auto-DM al unirse (notificación con variables resueltas)
//
// Diferenciación vs Skool: Auto-DM con variables {nombre} {space}
// {curso_destacado} {link_comunidad} resueltas server-side.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsOptions, corsJsonResponse, getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const callerId = userData.user.id;

    const { event, space_id, payload = {} } = await req.json();
    if (!event || !space_id) {
      return corsJsonResponse(req, { error: 'event_and_space_required' }, 400);
    }

    const { data: plugins } = await supabase
      .from('academy_space_plugins')
      .select('*')
      .eq('space_id', space_id)
      .maybeSingle();
    if (!plugins) {
      return corsJsonResponse(req, { ok: true, fired: [], reason: 'no_plugins_configured' });
    }

    const { data: space } = await supabase
      .from('academy_spaces')
      .select('id, name, slug, owner_id')
      .eq('id', space_id)
      .single();
    if (!space) return corsJsonResponse(req, { error: 'space_not_found' }, 404);

    const fired: string[] = [];
    const errors: Array<{ plugin: string; error: string }> = [];

    // Zapier
    if (plugins.zapier_enabled && plugins.zapier_webhook_url) {
      try {
        await fetch(plugins.zapier_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event, space_id, space_slug: space.slug, space_name: space.name,
            triggered_by: callerId, payload, timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(10_000),
        });
        fired.push('zapier');
      } catch (e: any) {
        errors.push({ plugin: 'zapier', error: e?.message ?? 'unknown' });
      }
    }

    // Kreoon webhook propio
    if (plugins.kreoon_webhook_enabled && plugins.kreoon_webhook_url) {
      try {
        const body = JSON.stringify({
          event, space_id, space_slug: space.slug, space_name: space.name,
          triggered_by: callerId, payload, timestamp: new Date().toISOString(),
        });
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (plugins.kreoon_webhook_secret) {
          headers['X-Kreoon-Signature'] = await hmacSha256(plugins.kreoon_webhook_secret, body);
        }
        await fetch(plugins.kreoon_webhook_url, {
          method: 'POST', headers, body,
          signal: AbortSignal.timeout(10_000),
        });
        fired.push('kreoon_webhook');
      } catch (e: any) {
        errors.push({ plugin: 'kreoon_webhook', error: e?.message ?? 'unknown' });
      }
    }

    // Auto-DM
    if (event === 'member_joined' && plugins.auto_dm_enabled && plugins.auto_dm_message) {
      const newMemberId = payload.user_id ?? callerId;

      const { data: newMemberProfile } = await supabase
        .from('profiles').select('full_name').eq('id', newMemberId).maybeSingle();

      const { data: featuredCourse } = await supabase
        .from('academy_courses')
        .select('title, slug')
        .eq('space_id', space_id)
        .eq('status', 'published')
        .order('enrolled_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      const message = (plugins.auto_dm_message as string)
        .replaceAll('{nombre}', newMemberProfile?.full_name ?? 'creador')
        .replaceAll('{space}', space.name)
        .replaceAll('{curso_destacado}', featuredCourse?.title ?? 'nuestros cursos')
        .replaceAll('{link_comunidad}', `https://kreoon.com/academia/${space.slug}/feed`);

      await supabase.from('academy_notifications').insert({
        space_id,
        recipient_id: newMemberId,
        sender_id: space.owner_id,
        type: 'auto_dm',
        title: `Mensaje de bienvenida de ${space.name}`,
        body: message,
        link: `/academia/${space.slug}/feed`,
        reference_id: space_id,
        reference_type: 'space',
      });
      fired.push('auto_dm');
    }

    return corsJsonResponse(req, { ok: true, fired, errors });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}
