-- ============================================================================
-- Onboarding de Clientes — formulario publico por token
-- ============================================================================
-- Fecha: 2026-08-11
--
-- Contexto (ver docs/AUDITORIA_ONBOARDING_CLIENTES.md):
-- El cliente recibe un link con token y llena un formulario largo (legal,
-- equipo, marca, producto, contenido, logistica) SIN tener cuenta ni sesion.
-- El acceso publico ocurre EXCLUSIVAMENTE via las edge functions
-- client-onboarding-get / client-onboarding-submit, que corren con service
-- role. Esta tabla NO tiene ninguna politica para el rol anon.
--
-- DECISION DE DISENO — por que los datos legales NO se copian a `clients`:
-- `clients.is_public` tiene DEFAULT true y existe la politica
-- "Anyone can view public client profiles" (TO anon, USING is_public = true).
-- Copiar NIT / direccion fiscal / representante legal a `clients` los
-- expondria a cualquiera con la anon key. Esos datos viven SOLO aqui.
--
-- DECISION DE DISENO — RLS minima:
-- `clients` acumulo 13 politicas PERMISSIVE superpuestas (4 rutas distintas
-- para el mismo SELECT). Esta tabla lleva UNA sola politica ALL, para que
-- "quien puede ver esto" sea una sola linea de SQL auditable.
--
-- Rollback:
--   DROP TABLE public.client_onboarding_forms CASCADE;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_onboarding_forms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- 64 chars hex: dos UUIDv4 concatenados sin guiones (~256 bits de entropia).
  -- Es la unica credencial del formulario publico, por eso no se usa un id corto.
  token           text UNIQUE NOT NULL
                    DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'submitted', 'processed')),
  form_data       jsonb NOT NULL DEFAULT '{}',
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '14 days',
  submitted_at    timestamptz,
  processed_at    timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- El lookup por token es el hot path de las dos edge functions publicas.
-- UNIQUE ya crea su indice, asi que aqui solo van los accesos del panel admin.
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_org
  ON public.client_onboarding_forms (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_client
  ON public.client_onboarding_forms (client_id);

-- ============================================================
-- Trigger updated_at (funcion compartida ya existente)
-- ============================================================
CREATE OR REPLACE TRIGGER set_updated_at_client_onboarding_forms
  BEFORE UPDATE ON public.client_onboarding_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RLS — una sola politica, cero acceso anon
-- ============================================================
ALTER TABLE public.client_onboarding_forms ENABLE ROW LEVEL SECURITY;

-- Predicado tomado de la politica "Org members can manage clients" de `clients`
-- (misma forma: subquery a organization_members, sin helper nuevo).
--
-- OJO — DESVIACION DELIBERADA respecto al original, con evidencia:
-- la politica de `clients` filtra por role IN ('admin','team_leader','strategist').
-- En produccion (2026-08-11) `organization_members` NO tiene NI UNA fila con
-- 'team_leader' ni 'strategist'; los estrategas reales son 'digital_strategist'
-- (4 filas) y 'creative_strategist' (5 filas). Copiar la lista literal dejaria
-- la tabla accesible solo para los 4 admins y romperia el acceso de los
-- estrategas, que es justamente a quienes esta feature debe servir.
-- En `clients` ese bug queda tapado por las otras 12 politicas; aqui, con una
-- sola politica, quedaria expuesto. Por eso se incluyen ambos sets.
-- (Mismo patron de deuda que el bug de rol legacy 'creator' vs 'content_creator'.)
DROP POLICY IF EXISTS "Org staff can manage client onboarding forms" ON public.client_onboarding_forms;
CREATE POLICY "Org staff can manage client onboarding forms"
  ON public.client_onboarding_forms
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY[
          'admin'::app_role,
          'team_leader'::app_role,
          'strategist'::app_role,
          'digital_strategist'::app_role,
          'creative_strategist'::app_role
        ])
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY[
          'admin'::app_role,
          'team_leader'::app_role,
          'strategist'::app_role,
          'digital_strategist'::app_role,
          'creative_strategist'::app_role
        ])
    )
  );

-- ============================================================
-- GRANTS
-- Existe ALTER DEFAULT PRIVILEGES para service_role desde 2026-06-13, pero se
-- deja explicito igual: el incidente de las 30 tablas academy_* (edge functions
-- con service_role recibiendo "permission denied" -> 500 silencioso) salio de
-- confiar en el default.
-- ============================================================
GRANT ALL ON public.client_onboarding_forms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_onboarding_forms TO authenticated;

-- ============================================================
-- Documentacion de la estructura de form_data
-- ============================================================
COMMENT ON TABLE public.client_onboarding_forms IS
  'Formulario de onboarding que el cliente llena sin sesion, vía token. Acceso publico SOLO por las edge functions client-onboarding-get / client-onboarding-submit (service role); esta tabla no tiene politicas para anon. Los datos legales/fiscales viven aqui y NO se copian a `clients` (clients.is_public default true + politica SELECT para anon los expondria).

Estructura de form_data (jsonb, todas las secciones opcionales hasta el submit final):
  legal:      { razon_social, nit, representante, correo_representante, direccion_fiscal, ciudad, pais, correo_facturacion }
  equipo:     { aprobador: { nombre, cargo, correo, celular }, correo_portal, miembros_whatsapp }
  marca:      { instagram, tiktok, website, historia, tono_deseado, tono_evitar, competidores[], referentes[], restricciones_legales }
  producto:   { nombre, presentaciones, componentes, beneficios, diferenciales, precio, promociones, garantias, link_tienda, audiencia: { edad, genero, pais, dolor }, objeciones[], testimonios }
  contenido:  { objetivo: ''organico''|''pauta''|''ambos'', plataformas[], historial_contenido }
  logistica:  { unidades_disponibles, direccion_despacho, responsable_despacho }

Ciclo de status: pending -> in_progress (primer guardado por seccion) -> submitted (envio final del cliente) -> processed (el admin ya volco los datos a clients/products manualmente).';

COMMENT ON COLUMN public.client_onboarding_forms.token IS
  'Credencial unica del formulario publico. 64 chars hex (2 UUIDv4 sin guiones). No se rota; para revocar, vencer expires_at o pasar status a processed.';
COMMENT ON COLUMN public.client_onboarding_forms.expires_at IS
  'Vencimiento del link publico. Las edge functions rechazan tokens vencidos. Default 14 dias.';

NOTIFY pgrst, 'reload schema';
