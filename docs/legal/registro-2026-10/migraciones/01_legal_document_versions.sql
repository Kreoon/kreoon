-- =============================================================================
-- PROPUESTA (NO APLICAR TODAVÍA) — 01: versiones inmutables de documentos legales
-- Destino futuro: supabase/migrations/<timestamp>_legal_document_versions.sql
-- Revisión jurídica pendiente de los TEXTOS; esta migración solo crea estructura.
--
-- Principios:
--   * Cada versión publicada es inmutable: contenido, texto de la casilla y huellas
--     no se pueden cambiar ni borrar (trigger + sin políticas de escritura).
--   * La huella SHA-256 se calcula en la base de datos sobre el contenido canónico
--     (UTF-8, saltos de línea LF), así cualquiera puede verificarla descargando el texto.
--   * No toca legal_documents ni user_legal_consents (histórico intacto).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key          text NOT NULL CHECK (document_key ~ '^[a-z][a-z0-9_]{2,60}$'),
  version               text NOT NULL CHECK (version ~ '^[0-9]+\.[0-9]+$'),
  title                 text NOT NULL CHECK (length(btrim(title)) > 0),
  language              text NOT NULL DEFAULT 'es',
  -- Contenido canónico en Markdown (lo que se muestra, se descarga y se hashea).
  content_markdown      text NOT NULL CHECK (length(content_markdown) > 200),
  -- Huellas: las calcula el trigger trg_legal_document_versions_hash (convert_to es STABLE,
  -- no se puede usar en columnas generadas; comprobado en producción 2026-10-01).
  content_sha256        text NOT NULL,
  -- Texto exacto de la casilla que acepta esta versión (NULL = no se acepta con casilla).
  acceptance_statement  text,
  statement_sha256      text,
  -- contract | data_processing_authorization | optional_authorization | informative
  acceptance_kind       text NOT NULL CHECK (acceptance_kind IN
                          ('contract','data_processing_authorization','optional_authorization','informative')),
  -- Datos del aviso breve (solo para la política de privacidad).
  notice_controller     text,
  notice_contact        text,
  -- Ciclo de vida
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  effective_at          timestamptz,
  published_at          timestamptz,
  published_by          uuid,
  supersedes_id         uuid REFERENCES public.legal_document_versions(id),
  -- material = afecta derechos/obligaciones/finalidades → pide nueva aceptación (decisión jurídica)
  change_kind           text CHECK (change_kind IN ('initial','material','non_material')),
  requires_reacceptance boolean NOT NULL DEFAULT false,
  change_summary        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  UNIQUE (document_key, version)
);

COMMENT ON TABLE public.legal_document_versions IS
  'Versiones inmutables de documentos legales. Una versión publicada no se modifica ni se borra; los cambios crean otra versión.';

-- Una sola versión vigente (publicada y no retirada) por documento.
CREATE UNIQUE INDEX IF NOT EXISTS legal_document_versions_one_published
  ON public.legal_document_versions (document_key)
  WHERE status = 'published';

-- ─── Huellas SHA-256 (contenido canónico: UTF-8, saltos de línea LF) ───────────
CREATE OR REPLACE FUNCTION public.trg_legal_document_versions_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.content_markdown := replace(NEW.content_markdown, E'\r\n', E'\n');
  NEW.content_sha256   := encode(sha256(convert_to(NEW.content_markdown, 'UTF8')), 'hex');
  NEW.statement_sha256 := CASE WHEN NEW.acceptance_statement IS NULL THEN NULL
                               ELSE encode(sha256(convert_to(NEW.acceptance_statement, 'UTF8')), 'hex') END;
  RETURN NEW;
END;
$$;

-- Se ejecuta DESPUÉS (alfabéticamente) del trigger de inmutabilidad en UPDATE: si la versión ya
-- está publicada, el de inmutabilidad aborta antes de recalcular nada.
DROP TRIGGER IF EXISTS legal_document_versions_zz_hash ON public.legal_document_versions;
CREATE TRIGGER legal_document_versions_zz_hash
  BEFORE INSERT OR UPDATE ON public.legal_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.trg_legal_document_versions_hash();

-- ─── Inmutabilidad ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_legal_document_versions_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'legal_version_immutable: no se puede borrar una versión publicada o retirada';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.status = 'draft' THEN
    RETURN NEW;                       -- los borradores se pueden editar
  END IF;

  IF NEW.content_markdown     IS DISTINCT FROM OLD.content_markdown
  OR NEW.acceptance_statement IS DISTINCT FROM OLD.acceptance_statement
  OR NEW.document_key         IS DISTINCT FROM OLD.document_key
  OR NEW.version              IS DISTINCT FROM OLD.version
  OR NEW.title                IS DISTINCT FROM OLD.title
  OR NEW.acceptance_kind      IS DISTINCT FROM OLD.acceptance_kind
  OR NEW.notice_controller    IS DISTINCT FROM OLD.notice_controller
  OR NEW.notice_contact       IS DISTINCT FROM OLD.notice_contact
  OR NEW.effective_at         IS DISTINCT FROM OLD.effective_at
  OR NEW.published_at         IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'legal_version_immutable: % % ya fue publicada', OLD.document_key, OLD.version;
  END IF;

  -- Única transición permitida tras publicar: published → retired.
  IF NOT (OLD.status = 'published' AND NEW.status = 'retired') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'legal_version_immutable: transición % → % no permitida', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_document_versions_immutable ON public.legal_document_versions;
CREATE TRIGGER legal_document_versions_immutable
  BEFORE UPDATE OR DELETE ON public.legal_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.trg_legal_document_versions_immutable();

-- ─── RLS: lectura pública de lo publicado o retirado; sin escritura directa ────
ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.legal_document_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_document_versions TO anon, authenticated;

DROP POLICY IF EXISTS legal_versions_public_read ON public.legal_document_versions;
CREATE POLICY legal_versions_public_read
  ON public.legal_document_versions FOR SELECT
  TO anon, authenticated
  USING (status IN ('published','retired'));   -- las versiones antiguas siguen siendo legibles

-- La escritura solo ocurre con service_role (carga de borradores) y con la RPC de publicación (05).

COMMIT;
