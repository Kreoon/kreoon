// ============================================================
// academy-wa-summarizer
//
// Cron diario (configurado en migration aparte vía pg_cron).
// Para cada space con `academy_space_whatsapp_groups`:
//   1. Lee los mensajes del día (`academy_wa_messages_log` últimas 24h).
//   2. Llama multi-ai con prompt de resumen de comunidad estilo
//      whatsappCloser (top temas, top contribuidores, preguntas sin
//      responder).
//   3. Persiste en `academy_wa_summaries`.
//   4. Envía WA al owner con template `academy_wa_daily_digest`
//      (MARKETING) — el bus + whatsapp-notify se encargan.
//
// Invocado por pg_cron diario 20:00 hora local del owner. En MVP
// usamos hora servidor (UTC); refinamiento por TZ del owner en S6.
//
// Auth: verify_jwt=true en config + check de service_role via JWT
// estándar de Supabase. El cron usa SUPABASE_SERVICE_ROLE_KEY.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface MessageRow {
  sender_phone: string;
  sender_user_id: string | null;
  message_text: string | null;
  message_type: string;
  received_at: string;
}

interface SpaceWithGroup {
  space_id: string;
  space_name: string;
  space_slug: string;
  owner_id: string;
  group_id: string | null;
}

const SYSTEM_PROMPT = `Eres un asistente que crea resúmenes claros y útiles para owners de comunidades en WhatsApp.

Tu trabajo: dado el log de mensajes de un grupo de WhatsApp de las últimas 24h, devuelve un resumen estructurado en markdown con estas secciones:

## Temas principales
3-5 bullets con los temas más conversados (no copies mensajes literales — sintetiza).

## Top contribuidores
Lista de hasta 5 usuarios más activos con count de mensajes (formato: "- @nombre — N mensajes").

## Preguntas sin responder
Lista de preguntas concretas que aparecieron y NO fueron respondidas con claridad por nadie. Si todas tuvieron respuesta, di "Todas las preguntas tuvieron respuesta".

## Pulso
1-2 frases sobre el "vibe" del grupo hoy (energía alta / dudas / motivación / queja recurrente).

## Sugerencia para el owner
1 acción concreta que el owner podría hacer hoy basado en el contenido (post, anuncio, intervención específica).

REGLAS:
- Tono neutro español LATAM, claro.
- No inventes datos. Si no hay info, di "No hubo mensajes" o "Sin actividad relevante".
- Sin emojis innecesarios.
- Máximo 350 palabras totales.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Body opcional: { space_id } para procesar un space específico.
  // Sin space_id, procesa todos los grupos activos.
  let targetSpaceId: string | null = null;
  try {
    const body = await req.json();
    targetSpaceId = body?.space_id ?? null;
  } catch { /* sin body, procesar todos */ }

  // Resuelve la lista de spaces con grupo conectado
  const groupsQuery = supabase
    .from('academy_space_whatsapp_groups')
    .select('space_id, group_id, academy_spaces!inner(name, slug, owner_id)');
  if (targetSpaceId) groupsQuery.eq('space_id', targetSpaceId);

  const { data: groupRows, error: groupsErr } = await groupsQuery;
  if (groupsErr) {
    console.error('[wa-summarizer] groups fetch failed', groupsErr);
    return corsJsonResponse(req, { error: 'groups_fetch_failed' }, 500);
  }

  const spaces: SpaceWithGroup[] = (groupRows ?? []).map((r: any) => ({
    space_id: r.space_id,
    space_name: r.academy_spaces.name,
    space_slug: r.academy_spaces.slug,
    owner_id: r.academy_spaces.owner_id,
    group_id: r.group_id,
  }));

  const results: Array<{ space_id: string; ok: boolean; reason?: string; summary_id?: string }> = [];

  for (const sp of spaces) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const summaryDate = today.toISOString().split('T')[0];

      // Skip si ya generamos resumen para hoy
      const { data: existing } = await supabase
        .from('academy_wa_summaries')
        .select('id')
        .eq('space_id', sp.space_id)
        .eq('summary_date', summaryDate)
        .maybeSingle();
      if (existing) {
        results.push({ space_id: sp.space_id, ok: true, reason: 'already_generated', summary_id: existing.id });
        continue;
      }

      // Lee mensajes de las últimas 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: messages } = await supabase
        .from('academy_wa_messages_log')
        .select('sender_phone, sender_user_id, message_text, message_type, received_at')
        .eq('space_id', sp.space_id)
        .gte('received_at', since)
        .order('received_at', { ascending: true })
        .limit(500);

      const msgs = (messages ?? []) as MessageRow[];

      if (msgs.length === 0) {
        results.push({ space_id: sp.space_id, ok: true, reason: 'no_messages' });
        continue;
      }

      // Top contributors
      const counts = new Map<string, number>();
      for (const m of msgs) {
        const key = m.sender_phone;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const topContributors = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([phone, count]) => ({ phone, message_count: count }));

      // Compactar mensajes (limit 200 últimos para el prompt, evitar token overflow)
      const compactLog = msgs
        .slice(-200)
        .filter((m) => m.message_type === 'text' && m.message_text)
        .map((m) => `[${m.sender_phone.slice(-4)}] ${m.message_text}`)
        .join('\n');

      // Llama multi-ai (Gemini por ser más barato para resúmenes largos)
      const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/multi-ai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Comunidad: ${sp.space_name}\n\nMensajes del día:\n\n${compactLog}` },
          ],
          models: ['gemini'],
          mode: 'first',
        }),
      });

      if (!aiRes.ok) {
        results.push({ space_id: sp.space_id, ok: false, reason: 'ai_failed' });
        continue;
      }

      const aiData = await aiRes.json();
      const summaryMd = aiData?.combined ?? aiData?.responses?.[0]?.content ?? aiData?.content ?? '';

      if (!summaryMd) {
        results.push({ space_id: sp.space_id, ok: false, reason: 'empty_summary' });
        continue;
      }

      // Persiste
      const { data: summary, error: insertErr } = await supabase
        .from('academy_wa_summaries')
        .insert({
          space_id: sp.space_id,
          summary_date: summaryDate,
          summary_md: summaryMd,
          top_contributors: topContributors,
          total_messages: msgs.length,
          active_members: counts.size,
        })
        .select('id')
        .single();

      if (insertErr || !summary) {
        results.push({ space_id: sp.space_id, ok: false, reason: insertErr?.message ?? 'insert_failed' });
        continue;
      }

      // Emit al bus para que owner reciba el digest por WA (template
      // academy_wa_daily_digest — pendiente de creación en S3.3).
      await supabase.rpc('academy_emit_event_safe', {
        p_type: 'academy_wa_daily_digest',
        p_space_id: sp.space_id,
        p_user_id: sp.owner_id,
        p_payload: {
          title: `Resumen del grupo de ${sp.space_name}`,
          body: `${msgs.length} mensajes hoy, ${counts.size} miembros activos.`,
          link: `/academia/${sp.space_slug}/admin?tab=whatsapp`,
          reference_id: summary.id,
          reference_type: 'wa_summary',
          variables: [sp.space_name, msgs.length.toString(), counts.size.toString()],
        },
      });

      await supabase
        .from('academy_wa_summaries')
        .update({ sent_to_owner_at: new Date().toISOString() })
        .eq('id', summary.id);

      results.push({ space_id: sp.space_id, ok: true, summary_id: summary.id });
    } catch (err) {
      console.error(`[wa-summarizer] space ${sp.space_id} failed`, err);
      results.push({ space_id: sp.space_id, ok: false, reason: String(err) });
    }
  }

  return corsJsonResponse(req, { ok: true, processed: results.length, results });
});
