-- ============================================================
-- CRION Academy v2 — Seed de templates WhatsApp académicos
--
-- Inserta 10 nuevos event_types en whatsapp_notification_templates
-- con template_id='PENDING' e is_active=false. Alexander deberá:
--   1. Crear cada template en Meta Business Manager → WhatsApp → Templates.
--   2. Esperar aprobación (≤24h normalmente).
--   3. Conectar el template a Botcake (sync).
--   4. UPDATE whatsapp_notification_templates SET template_id='<botcake_id>',
--      is_active=true WHERE event_type='<event>';
--
-- IMPORTANTE: templates UTILITY no llevan emojis, negrita ni lenguaje
-- promocional (memoria feedback_meta_template_rules.md). Las plantillas
-- de categoría MARKETING requieren opt-in explícito del usuario.
--
-- Copy sugerido va en el comentario de cada inserción (header del
-- mensaje + body + button label). Variables se referencian como
-- {{1}}, {{2}}, ... siguiendo posiciones en variables_schema.
--
-- Rollback manual:
--   DELETE FROM whatsapp_notification_templates
--   WHERE event_type LIKE 'academy_%' OR event_type IN (
--     'welcome_to_space','lesson_unlocked', ...
--   );
-- ============================================================

INSERT INTO public.whatsapp_notification_templates
  (event_type, template_id, template_name, language, category, variables_schema, is_active)
VALUES

  -- ─── welcome_to_space ────────────────────────────────────────
  -- Copy sugerido (Meta UTILITY, es):
  --   Body: "Hola {{1}}, ya eres parte de {{2}}. Tu acceso está listo: {{3}}"
  --   Button (URL dinámico): "Entrar al espacio" → {{1}} en URL = link al space
  -- variables: 1=nombre, 2=space, 3=link in-app
  (
    'welcome_to_space',
    'PENDING',
    'crion_academy_welcome',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"space_name","example":"Marketing con IA"},
      {"pos":3,"name":"space_link","example":"https://kreoon.com/academia/mkt-ia"}]'::jsonb,
    false
  ),

  -- ─── lesson_unlocked ─────────────────────────────────────────
  -- Body: "Hola {{1}}, se desbloqueó la lección {{2}} en {{3}}. Puedes verla ahora."
  -- Button URL → lección
  (
    'lesson_unlocked',
    'PENDING',
    'crion_academy_lesson_unlocked',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"lesson_title","example":"Lección 3: prompts efectivos"},
      {"pos":3,"name":"course_name","example":"Curso de Marketing con IA"}]'::jsonb,
    false
  ),

  -- ─── event_reminder_24h (academy) ────────────────────────────
  -- Body: "Hola {{1}}, recuerda que mañana es {{2}} a las {{3}}. Te esperamos."
  -- Button URL → calendario/space/event
  (
    'academy_event_reminder_24h',
    'PENDING',
    'crion_academy_event_24h',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"event_title","example":"Sesión en vivo: caso real"},
      {"pos":3,"name":"event_datetime","example":"Mar 14 jun, 7:00 PM"}]'::jsonb,
    false
  ),

  -- ─── badge_earned ────────────────────────────────────────────
  -- Body: "Hola {{1}}, ganaste la insignia {{2}} en {{3}}. Sigue así."
  (
    'badge_earned',
    'PENDING',
    'crion_academy_badge_earned',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"badge_name","example":"Primera Publicación"},
      {"pos":3,"name":"space_name","example":"Marketing con IA"}]'::jsonb,
    false
  ),

  -- ─── level_up ────────────────────────────────────────────────
  -- Body: "Hola {{1}}, subiste al nivel {{2}} en {{3}}. Llevas {{4}} XP."
  (
    'level_up',
    'PENDING',
    'crion_academy_level_up',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"new_level","example":"4"},
      {"pos":3,"name":"space_name","example":"Marketing con IA"},
      {"pos":4,"name":"total_xp","example":"1240"}]'::jsonb,
    false
  ),

  -- ─── cohort_starting ─────────────────────────────────────────
  -- Body: "Hola {{1}}, tu cohorte {{2}} comienza mañana. Prepárate para {{3}}."
  -- Button URL → curso
  (
    'cohort_starting',
    'PENDING',
    'crion_academy_cohort_starting',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"cohort_name","example":"Cohorte Junio 2026"},
      {"pos":3,"name":"course_name","example":"Marketing con IA"}]'::jsonb,
    false
  ),

  -- ─── checkpoint_due ──────────────────────────────────────────
  -- Body: "Hola {{1}}, tienes pendiente el checkpoint {{2}} del reto {{3}}."
  (
    'checkpoint_due',
    'PENDING',
    'crion_academy_checkpoint_due',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"checkpoint_title","example":"Sube tu primer video"},
      {"pos":3,"name":"challenge_name","example":"Reto 7 días de contenido"}]'::jsonb,
    false
  ),

  -- ─── certificate_ready ───────────────────────────────────────
  -- Body: "Hola {{1}}, tu certificado de {{2}} ya está disponible para descargar."
  -- Button URL → certificado
  (
    'certificate_ready',
    'PENDING',
    'crion_academy_certificate_ready',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"course_name","example":"Marketing con IA"}]'::jsonb,
    false
  ),

  -- ─── cart_abandoned ─────────────────────────────────────────
  -- ⚠️ MARKETING — requiere opt-in del usuario (checkbox en checkout)
  -- Body: "{{1}}, te quedó {{2}} en el carrito. ¿Lo terminamos juntos?"
  -- Button URL → checkout
  (
    'cart_abandoned',
    'PENDING',
    'crion_academy_cart_abandoned',
    'es',
    'MARKETING',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"product_name","example":"Curso Marketing con IA"}]'::jsonb,
    false
  ),

  -- ─── upsell_offer ───────────────────────────────────────────
  -- ⚠️ MARKETING — requiere opt-in
  -- Body: "Hola {{1}}, como completaste {{2}}, tenemos una oferta para ti: {{3}}"
  (
    'upsell_offer',
    'PENDING',
    'crion_academy_upsell_offer',
    'es',
    'MARKETING',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"completed_product","example":"Curso de IA Básico"},
      {"pos":3,"name":"upsell_headline","example":"30% off en el curso avanzado"}]'::jsonb,
    false
  )

ON CONFLICT (event_type) DO NOTHING;
