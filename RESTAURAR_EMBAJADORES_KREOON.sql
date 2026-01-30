-- ============================================================
-- SCRIPT DE RESTAURACIÓN DE EMBAJADORES - UGC Colombia
-- Origen: Lovable Cloud (hfooshsteglylhvrpuka)
-- Destino: Kreoon (wjkbqcrxwsmvtxmqgiqc)
-- Fecha: 2026-01-30
-- ============================================================
-- IMPORTANTE: Ejecutar en el SQL Editor de Kreoon

-- ============================================================
-- PASO 1: MARCAR PROFILES COMO EMBAJADORES
-- (17 usuarios con is_ambassador = true)
-- ============================================================

UPDATE public.profiles SET is_ambassador = true, updated_at = now()
WHERE id IN (
  '15ed42a0-62fc-401b-8db0-f7464aa863ef',  -- Stefany aguirre diaz
  'efb01b27-1100-488d-aa59-34aee64767e7',  -- katherine Acevedo Sánchez
  '8569be04-9e86-49d8-9714-3d81423e836e',  -- Alexander
  '9fc916cc-cfce-4189-a274-c041eb05fb38',  -- Jorge enrique Garnica C
  '06aa55b0-61ea-41f0-9708-7a3d322b6795',  -- Alexander Cast
  '2f848aa7-56ae-4b51-982d-ff5e8d45637b',  -- Carolina Osorio
  '5e212d1b-9ca5-4b11-b16a-be8225475cd0',  -- Ricardo Bedoya Traslaviña
  '61bdffb0-c704-4fae-ac3b-59420242fc5a',  -- Maria Camila Restrepo
  'ed6d109a-c72d-4e3c-9f61-c8d7d5ff30a6',  -- Camila Hoyos Ramírez
  'cf4ba26d-888e-4df4-934e-7d720f7dc8d1',  -- Sebastian Romero
  '3b20499e-3d16-496b-bbd3-b3cc4b163fdf',  -- Natalia Andrea Moncada Benjumea
  '10842b38-4a80-490d-ada3-b3fc35d91822',  -- Alejandra Giraldo Alzate
  '76d69db1-2532-4319-a55d-f07e1e91a950',  -- Daniela Jiménez Mejía
  '45f51c68-6c95-40c8-a5c3-4fdd792edd0d',  -- Diana milena torres lopez
  'b44b5148-b3e4-452e-8b11-5e3ba59a336a',  -- Valentina Giraldo
  '9669d059-8098-45ce-b273-ac834a303a98',  -- Valeria Osorno
  'e326d174-58a6-4d37-a603-c91a6131826d'   -- Susana
);


-- ============================================================
-- PASO 2: AGREGAR ROL 'ambassador' EN ORGANIZATION_MEMBER_ROLES
-- (Solo para los 3 que tienen el rol explícito)
-- ============================================================

INSERT INTO public.organization_member_roles (id, organization_id, user_id, role)
VALUES
  ('1802df3b-3355-48e0-b59f-12d63c685fd2', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '5e212d1b-9ca5-4b11-b16a-be8225475cd0', 'ambassador'),
  ('1a69c873-ea4e-4ea4-a7c8-ff4a777de268', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '9669d059-8098-45ce-b273-ac834a303a98', 'ambassador'),
  ('amb-alexander-cast-001', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '06aa55b0-61ea-41f0-9708-7a3d322b6795', 'ambassador')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PASO 3: ACTUALIZAR AMBASSADOR_LEVEL EN ORGANIZATION_MEMBERS
-- (16 usuarios con ambassador_level = 'bronze')
-- ============================================================

UPDATE public.organization_members 
SET ambassador_level = 'bronze', updated_at = now()
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND user_id IN (
    '3b20499e-3d16-496b-bbd3-b3cc4b163fdf',  -- Natalia Andrea Moncada Benjumea
    '61bdffb0-c704-4fae-ac3b-59420242fc5a',  -- Maria Camila Restrepo
    '76d69db1-2532-4319-a55d-f07e1e91a950',  -- Daniela Jiménez Mejía
    'b44b5148-b3e4-452e-8b11-5e3ba59a336a',  -- Valentina Giraldo
    'ed6d109a-c72d-4e3c-9f61-c8d7d5ff30a6',  -- Camila Hoyos Ramírez
    '2f848aa7-56ae-4b51-982d-ff5e8d45637b',  -- Carolina Osorio
    '15ed42a0-62fc-401b-8db0-f7464aa863ef',  -- Stefany aguirre diaz
    '9fc916cc-cfce-4189-a274-c041eb05fb38',  -- Jorge enrique Garnica C
    '45f51c68-6c95-40c8-a5c3-4fdd792edd0d',  -- Diana milena torres lopez
    '10842b38-4a80-490d-ada3-b3fc35d91822',  -- Alejandra Giraldo Alzate
    'cf4ba26d-888e-4df4-934e-7d720f7dc8d1',  -- Sebastian Romero
    'efb01b27-1100-488d-aa59-34aee64767e7',  -- katherine Acevedo Sánchez
    '5e212d1b-9ca5-4b11-b16a-be8225475cd0',  -- Ricardo Bedoya Traslaviña
    '9669d059-8098-45ce-b273-ac834a303a98',  -- Valeria Osorno
    'e326d174-58a6-4d37-a603-c91a6131826d',  -- Susana
    '06aa55b0-61ea-41f0-9708-7a3d322b6795'   -- Alexander Cast
  );


-- ============================================================
-- PASO 4: CONFIGURACIÓN UP PARA EMBAJADORES
-- ============================================================

INSERT INTO public.ambassador_up_config (id, organization_id, event_key, event_name, description, base_points, conditions, multipliers, is_active, created_at, updated_at)
VALUES
  ('962866e2-5dca-4824-b795-b2eb337a046a', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ambassador_content_created', 'Contenido Embajador Creado', 'Puntos otorgados cuando un embajador crea contenido para la organización', 100, '{"client_is_organization": true, "content_approved": true}'::jsonb, '{}'::jsonb, true, '2025-12-27 11:04:29.755327+00', '2025-12-27 11:04:29.755327+00'),
  ('5c04e07a-94d2-446e-9f1b-1ec8d70b4c63', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ambassador_content_approved', 'Contenido Embajador Aprobado', 'Puntos adicionales cuando el contenido embajador es aprobado', 50, '{"status": "approved"}'::jsonb, '{}'::jsonb, true, '2025-12-27 11:04:29.755327+00', '2025-12-27 11:04:29.755327+00'),
  ('98d47e05-a84d-4efb-abd7-1893961ab8a2', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ambassador_content_published', 'Contenido Embajador Publicado', 'Bonus de puntos cuando el contenido embajador se publica', 75, '{"is_published": true}'::jsonb, '{}'::jsonb, true, '2025-12-27 11:04:29.755327+00', '2025-12-27 11:04:29.755327+00'),
  ('aba8bb8c-3757-4145-9a67-d9bc140adbd7', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'internal_content_by_ambassador', 'Contenido Interno de Marca', 'Puntos otorgados cuando un embajador crea contenido interno para la organización', 100, '{"client_is_organization": true, "approved": true}'::jsonb, '{"bronze": 1, "silver": 1.25, "gold": 1.5}'::jsonb, true, '2025-12-27 18:14:20.580217+00', '2025-12-27 18:14:20.580217+00')
ON CONFLICT (id) DO UPDATE SET
  event_name = EXCLUDED.event_name,
  description = EXCLUDED.description,
  base_points = EXCLUDED.base_points,
  conditions = EXCLUDED.conditions,
  multipliers = EXCLUDED.multipliers,
  is_active = EXCLUDED.is_active,
  updated_at = now();


-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

SELECT 'profiles_is_ambassador' AS check_type, COUNT(*)::int AS count
FROM public.profiles WHERE is_ambassador = true
UNION ALL
SELECT 'org_member_roles_ambassador', COUNT(*)::int
FROM public.organization_member_roles 
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e' AND role = 'ambassador'
UNION ALL
SELECT 'org_members_with_ambassador_level', COUNT(*)::int
FROM public.organization_members 
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e' AND ambassador_level IS NOT NULL AND ambassador_level != 'none'
UNION ALL
SELECT 'ambassador_up_config', COUNT(*)::int
FROM public.ambassador_up_config 
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';
