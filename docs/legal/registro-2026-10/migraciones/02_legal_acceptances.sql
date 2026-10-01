-- =============================================================================
-- PROPUESTA (NO APLICAR TODAVÍA) — 02: registro de aceptaciones de solo inserción
-- Destino futuro: supabase/migrations/<timestamp>_legal_acceptances.sql
-- Depende de: 01_legal_document_versions.sql
--
-- Principios:
--   * Append-only: ninguna fila se actualiza ni se borra (trigger). Revocar = nueva fila 'revoke'.
--   * Solo el servidor escribe (RPC SECURITY DEFINER). Sin políticas de INSERT/UPDATE/DELETE.
--   * Fecha = now() del servidor; método derivado del token, no del cliente.
--   * Idempotente ante reintentos: UNIQUE (user_id, client_request_id, document_version_id).
--   * user_id SIN FK con ON DELETE CASCADE: borrar la cuenta no debe borrar la prueba
--     (Ley 1581, art. 17 b). El plazo de conservación lo fija la revisión jurídica.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,                       -- sin FK a propósito (ver cabecera)
  organization_id       uuid REFERENCES public.organizations(id) ON DELETE SET NULL, -- contexto del registro
  document_version_id   uuid NOT NULL REFERENCES public.legal_document_versions(id) ON DELETE RESTRICT,
  -- Copias desnormalizadas para que la fila sea legible sola (y verificable contra la versión):
  document_key          text NOT NULL,
  document_version      text NOT NULL,
  content_sha256        text NOT NULL,
  statement_sha256      text,
  acceptance_kind       text NOT NULL CHECK (acceptance_kind IN
                          ('contract','data_processing_authorization','optional_authorization')),
  action                text NOT NULL DEFAULT 'accept' CHECK (action IN ('accept','revoke')),
  method                text NOT NULL CHECK (method IN
                          ('email_password','google_oauth','session_reacceptance','unknown')),
  flow                  text NOT NULL CHECK (flow IN
                          ('creator_signup','creator_signup_continue','reacceptance_prompt','account_settings','legacy_import')),
  client_request_id     uuid NOT NULL,
  ip_address            inet,
  user_agent            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_request_id, document_version_id)
);

COMMENT ON TABLE public.legal_acceptances IS
  'Evidencia de aceptaciones/autorizaciones legales. Solo inserción, escrita por RPC del servidor. Una casilla no es una firma digital certificada.';

CREATE INDEX IF NOT EXISTS legal_acceptances_user_doc
  ON public.legal_acceptances (user_id, document_key, created_at DESC);

-- ─── Solo inserción ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_legal_acceptances_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Excepción única: ON DELETE SET NULL de organization_id (la organización se borró).
  IF TG_OP = 'UPDATE'
     AND NEW.organization_id IS NULL AND OLD.organization_id IS NOT NULL
     AND (to_jsonb(NEW) - 'organization_id') = (to_jsonb(OLD) - 'organization_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'legal_acceptances_append_only: las aceptaciones no se modifican ni se borran';
END;
$$;

DROP TRIGGER IF EXISTS legal_acceptances_append_only ON public.legal_acceptances;
CREATE TRIGGER legal_acceptances_append_only
  BEFORE UPDATE OR DELETE ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.trg_legal_acceptances_append_only();

-- Coherencia con la versión (evita copias falsas incluso desde service_role).
CREATE OR REPLACE FUNCTION public.trg_legal_acceptances_check_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v public.legal_document_versions%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.legal_document_versions WHERE id = NEW.document_version_id;
  IF v.id IS NULL OR v.status = 'draft' THEN
    RAISE EXCEPTION 'legal_acceptance_invalid_version';
  END IF;
  IF NEW.document_key <> v.document_key OR NEW.document_version <> v.version
     OR NEW.content_sha256 <> v.content_sha256
     OR NEW.statement_sha256 IS DISTINCT FROM v.statement_sha256
     OR NEW.acceptance_kind <> v.acceptance_kind THEN
    RAISE EXCEPTION 'legal_acceptance_mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_acceptances_check_version ON public.legal_acceptances;
CREATE TRIGGER legal_acceptances_check_version
  BEFORE INSERT ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.trg_legal_acceptances_check_version();

-- ─── RLS: cada persona lee las suyas; administración de plataforma lee todo ──
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;

DROP POLICY IF EXISTS legal_acceptances_own_read ON public.legal_acceptances;
CREATE POLICY legal_acceptances_own_read
  ON public.legal_acceptances FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS legal_acceptances_platform_admin_read ON public.legal_acceptances;
CREATE POLICY legal_acceptances_platform_admin_read
  ON public.legal_acceptances FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true));

-- Sin políticas de INSERT/UPDATE/DELETE: solo las RPC SECURITY DEFINER escriben.

-- ─── Estado vigente por usuario y documento (vista auxiliar) ─────────────────
CREATE OR REPLACE VIEW public.legal_acceptance_current
WITH (security_invoker = true) AS
SELECT DISTINCT ON (a.user_id, a.document_key)
       a.user_id, a.document_key, a.document_version, a.document_version_id,
       a.action, a.created_at, a.organization_id
FROM public.legal_acceptances a
ORDER BY a.user_id, a.document_key, a.created_at DESC, a.id DESC;

GRANT SELECT ON public.legal_acceptance_current TO authenticated;

COMMIT;
