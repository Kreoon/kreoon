-- =====================================================================
-- Documentos de contexto del cliente (client_documents)
-- =====================================================================
--
-- El cliente sube documentos (PDF, Word, Excel, texto) ANTES de que se
-- genere el ADN de marca: sirven de contexto adicional para que la marca
-- se entienda mejor. Se procesan al subirlos (`process-client-document`):
-- se extrae el texto y se genera un resumen corto, y ese resumen es lo
-- que después consume `componerTextoParaAdn` en `pipeline-orchestrator`.
--
-- Decisiones de diseño:
--
--  · `alcance` decide en qué etapa del pipeline se inyecta el resumen
--    ('marca' | 'estrategia' | 'guiones' | 'todo'). Hoy solo el ADN
--    (pipeline-orchestrator) lo consume, pero se deja listo para que
--    estrategia/guiones lo usen sin otra migración.
--
--  · `texto_extraido` y `resumen` son columnas separadas: el texto crudo
--    puede ser larguísimo (un Excel completo) y no queremos meterlo en
--    cada prompt; el resumen (~400 palabras) es lo que se inyecta.
--
--  · RLS calcado del patrón de `client_pipeline_runs`: staff de la
--    organización con `FOR ALL`, y el cliente dueño (vía `client_users`)
--    con SELECT/INSERT/DELETE — sí puede borrar, es su documento.
--
--  · El cliente TAMBIÉN puede UPDATE, pero acotado a la columna `alcance`
--    (el selector "para qué sirve" del portal). NO puede tocar `resumen`,
--    `texto_extraido`, `estado`, `error_detalle` ni `storage_path` — esos
--    los escribe SOLO `process-client-document` con service role. La
--    restricción es un GRANT UPDATE por COLUMNA (no un CHECK ni un trigger):
--    es el mecanismo nativo de Postgres para esto, se aplica a nivel de
--    ejecutor de SQL (no se puede rodear armando el UPDATE distinto desde
--    PostgREST) y no depende de que nadie recuerde mantener un trigger en
--    sync. Si el cliente intenta enviar `resumen` u otro campo protegido en
--    el UPDATE, Postgres rechaza el statement COMPLETO con "permission
--    denied for column" — no se aplica parcialmente. Importa porque
--    `resumen` entra literal en el prompt que arma el ADN de marca.
--
--  · Bucket `client-documents` PRIVADO (a diferencia de `product-documents`,
--    que es público): son documentos internos del cliente, no assets de
--    producto para mostrar en un portafolio.
--
-- ---------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  storage_path text NOT NULL,
  file_name    text NOT NULL,
  mime_type    text NOT NULL,
  file_size    bigint NOT NULL,

  alcance text NOT NULL DEFAULT 'todo'
    CHECK (alcance IN ('marca', 'estrategia', 'guiones', 'todo')),

  resumen         text,
  texto_extraido  text,

  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesando', 'listo', 'error')),
  error_detalle text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_org     ON public.client_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client   ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_estado   ON public.client_documents(estado);
CREATE INDEX IF NOT EXISTS idx_client_documents_alcance  ON public.client_documents(alcance);

COMMENT ON TABLE public.client_documents IS
  'Documentos que sube el cliente como contexto (PDF/Word/Excel/texto). Se resumen al subirlos y ese resumen alimenta el ADN de marca / estrategia / guiones según `alcance`.';

-- ---------------------------------------------------------------------
-- 2. updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_client_documents()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_client_documents ON public.client_documents;
CREATE TRIGGER trg_touch_client_documents
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_documents();

-- ---------------------------------------------------------------------
-- 3. RLS — mismo patrón que client_pipeline_runs
-- ---------------------------------------------------------------------
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org staff can manage client documents" ON public.client_documents;
CREATE POLICY "Org staff can manage client documents"
ON public.client_documents FOR ALL TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
        'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
        'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
  )
);

-- El cliente ve, sube, borra y (solo el campo `alcance`) actualiza SUS
-- propios documentos. Para corregir cualquier otro dato (nombre, resumen...)
-- no hay edición: sube uno nuevo y borra el viejo.
DROP POLICY IF EXISTS "Client can view own documents" ON public.client_documents;
CREATE POLICY "Client can view own documents"
ON public.client_documents FOR SELECT TO authenticated
USING (
  client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Client can upload own documents" ON public.client_documents;
CREATE POLICY "Client can upload own documents"
ON public.client_documents FOR INSERT TO authenticated
WITH CHECK (
  client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Client can delete own documents" ON public.client_documents;
CREATE POLICY "Client can delete own documents"
ON public.client_documents FOR DELETE TO authenticated
USING (
  client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
);

-- UPDATE: la fila debe seguir siendo del mismo cliente (no puede reasignar
-- el documento a otro client_id) tanto antes como después del cambio. Qué
-- COLUMNAS puede tocar no lo decide esta policy — lo decide el GRANT UPDATE
-- por columna de la sección 4 (ver comentario ahí).
DROP POLICY IF EXISTS "Client can update own documents scope" ON public.client_documents;
CREATE POLICY "Client can update own documents scope"
ON public.client_documents FOR UPDATE TO authenticated
USING (
  client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
)
WITH CHECK (
  client_id IN (SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- 4. GRANTs — sin esto, las edge functions con service_role dan
--    "permission denied" y devuelven 500 en silencio (incidente real del
--    proyecto con las tablas academy_*).
-- ---------------------------------------------------------------------
GRANT ALL ON public.client_documents TO service_role;
GRANT SELECT, INSERT, DELETE ON public.client_documents TO authenticated;

-- UPDATE acotado por COLUMNA (no por tabla completa): `authenticated` solo
-- puede escribir `alcance`. `resumen`/`texto_extraido`/`estado`/
-- `error_detalle`/`storage_path` quedan fuera de este GRANT a propósito —
-- solo `service_role` (la edge function `process-client-document`) puede
-- escribirlos, vía el `GRANT ALL` de arriba. Cualquier UPDATE desde
-- PostgREST/authenticated que incluya una de esas columnas falla completo
-- con "permission denied for column", nunca se aplica parcial.
GRANT UPDATE (alcance) ON public.client_documents TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Storage — bucket privado `client-documents`
--    Misma config (límite y mime types) que `product-documents`, pero
--    `public = false`: son documentos internos, no assets de portafolio.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Acotadas POR RUTA, a diferencia de las de `product-documents`.
--
-- Aquel bucket deja leer y borrar cualquier objeto a cualquier usuario
-- autenticado, apoyándose en que "el control real vive en la tabla". Eso no
-- vale para Storage: al bucket se entra directo con
-- `storage.from(...).download(ruta)`, sin pasar por `client_documents`. Copiar
-- ese patrón aquí dejaría los documentos de un cliente al alcance de cualquier
-- otro que conociera la ruta — la misma fuga que se acaba de cerrar en
-- `clients`.
--
-- La ruta que escribe el portal es `{organization_id}/{client_id}/{uuid}.{ext}`,
-- así que el primer segmento identifica la organización y el segundo al cliente.
--
-- El check de organización usa los MISMOS roles de staff que la policy de
-- tabla ("Org staff can manage client documents"), no "cualquier miembro de
-- la org": Storage se accede directo (`storage.from(...).download(ruta)`,
-- sin pasar por RLS de `client_documents`), así que dejar pasar a cualquier
-- rol acá abriría a un content_creator/editor la lectura de documentos de
-- CUALQUIER cliente de su organización — el mismo problema que
-- 20260515190000_fix_talent_payments_rls.sql ya tuvo que cerrar para
-- `payment-receipts` (ahí se restringió de "cualquier miembro" a admin).
CREATE POLICY "Client documents: staff de la org y dueño"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
          'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
    )
    OR (storage.foldername(name))[2] IN (
      SELECT cu.client_id::text FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Client documents: subir en el propio prefijo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
          'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
    )
    OR (storage.foldername(name))[2] IN (
      SELECT cu.client_id::text FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Client documents: borrar lo propio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT om.organization_id::text FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role,
          'strategist'::app_role, 'digital_strategist'::app_role, 'creative_strategist'::app_role])
    )
    OR (storage.foldername(name))[2] IN (
      SELECT cu.client_id::text FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------
-- 6. Reload schema
-- ---------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
