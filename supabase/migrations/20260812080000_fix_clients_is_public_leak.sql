-- ============================================================
-- FIX SEGURIDAD: fuga de datos en `clients` vía is_public
-- ============================================================
-- PROBLEMA (verificado con Management API 2026-08-12):
--   - clients.is_public tiene DEFAULT true; 51 de 94 filas activas
--     (deleted_at IS NULL) están en true.
--   - La política "Authenticated can view clients" incluía
--     `OR is_public = true` SIN filtrar por organización: cualquier
--     usuario autenticado de CUALQUIER organización (incluido un
--     `student` recién registrado) leía la fila COMPLETA de esas 51
--     filas: contact_email, contact_phone, document_number/type (NIT),
--     address, whatsapp_phone.
--   - Además existía la política separada "Anyone can view public
--     client profiles" (SELECT USING is_public = true) — mismo hueco,
--     doble puerta de entrada.
--
-- USO LEGÍTIMO ENCONTRADO de is_public:
--   src/pages/portfolio/CompanyProfilePage.tsx, ruta pública
--   `/company/:username` (SIN ProtectedRoute en src/App.tsx) hace
--   `.from('clients').select('*').eq('username',...).eq('is_public',true)`
--   pero SOLO renderiza campos de marketing (name, username, bio,
--   logo_url, category, city, country, website, instagram, tiktok,
--   is_vip). Nunca lee ni muestra contact_email/phone/document_*/
--   address/whatsapp. `anon` NO tiene GRANT sobre `clients`
--   (verificado), así que hoy esa ruta pública en la práctica solo
--   "funciona" para usuarios autenticados de cualquier organización
--   — ese es justo el hueco que se cierra aquí.
--
-- DECISIÓN: sí hay un consumidor legítimo → se crea una vista pública
-- con SOLO columnas de marketing y se retira el `OR is_public` de la
-- tabla base. anon y authenticated quedan con acceso de solo lectura
-- a la vista; nunca a la tabla `clients` completa.
--
-- PENDIENTE PARA OTRO AGENTE (fuera de mi alcance — no toco src/):
--   CompanyProfilePage.tsx debe migrar de
--   `.from('clients').select('*')...` a
--   `.from('public_client_profiles').select('*')...eq('username',...)`.
--   Mientras eso no se haga, la página pública seguirá sin poder leer
--   nada para usuarios sin sesión (anon), igual que hoy.
-- ============================================================

-- 1. Vista pública con columnas de marketing únicamente.
--    Se crea con el owner de la migración (postgres), que bypasea la
--    RLS de `clients` — patrón estándar de Supabase para exponer un
--    subconjunto público de una tabla protegida. El filtro de
--    seguridad real vive en el WHERE de esta vista, no en la tabla.
CREATE OR REPLACE VIEW public.public_client_profiles AS
SELECT
  id,
  name,
  username,
  bio,
  logo_url,
  category,
  city,
  country,
  website,
  instagram,
  tiktok,
  facebook,
  linkedin,
  is_vip,
  created_at
FROM public.clients
WHERE is_public = true
  AND deleted_at IS NULL
  AND username IS NOT NULL;

COMMENT ON VIEW public.public_client_profiles IS
  'Perfil público de marketing de un cliente/marca (usado por /company/:username). '
  'Expone SOLO columnas de marketing — NUNCA contact_email, contact_phone, '
  'document_number/type, address ni whatsapp_phone. Bypasea RLS de clients '
  'a propósito (owner postgres): el filtro de seguridad vive en el WHERE de esta vista.';

GRANT SELECT ON public.public_client_profiles TO anon, authenticated;

-- 2. Quitar la fuga de la tabla base: ya no hay ningún camino para leer
--    la fila completa de un cliente "público" sin pertenecer a su
--    organización o estar asociado como client_users.
DROP POLICY IF EXISTS "Anyone can view public client profiles" ON public.clients;

ALTER POLICY "Authenticated can view clients" ON public.clients
  USING (
    organization_id IN (
      SELECT organization_members.organization_id
      FROM organization_members
      WHERE organization_members.user_id = auth.uid()
    )
    OR id IN (
      SELECT client_users.client_id
      FROM client_users
      WHERE client_users.user_id = auth.uid()
    )
  );

-- 3. Nadie debería quedar público por accidente de aquí en adelante.
ALTER TABLE public.clients ALTER COLUMN is_public SET DEFAULT false;

-- 4. Limpieza de datos: de las 51 filas hoy en is_public=true, 31 NO
--    tienen username → son inalcanzables por /company/:username (esa
--    ruta filtra por username) y por lo tanto no tenían ningún
--    consumidor legítimo, solo eran fuga pura. Se apagan.
--    Las 20 filas restantes SÍ tienen username (perfiles
--    potencialmente ya enlazados/compartidos) — NO se tocan aquí,
--    queda a criterio de negocio del team lead. Ver informe en
--    scratchpad fix_seguridad.md.
UPDATE public.clients
SET is_public = false
WHERE is_public = true
  AND username IS NULL;
