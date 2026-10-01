-- Material crudo por escena: el creador indica a qué escena del guión pertenece cada archivo,
-- para que el editor sepa dónde va sin preguntar.

ALTER TABLE public.project_raw_assets
  ADD COLUMN IF NOT EXISTS scene_number smallint
  CHECK (scene_number IS NULL OR scene_number BETWEEN 1 AND 50);

COMMENT ON COLUMN public.project_raw_assets.scene_number IS
  'Escena del guión (1..n, según SceneScriptView) a la que pertenece el archivo; NULL = sin asignar';

-- Antes solo admins/configuradores podían actualizar. Quien subió el archivo puede editar el suyo
-- (asignar escena), siempre dentro de una org de la que es miembro.
DROP POLICY IF EXISTS "Uploaders can update own raw assets" ON public.project_raw_assets;
CREATE POLICY "Uploaders can update own raw assets"
  ON public.project_raw_assets
  FOR UPDATE
  USING (uploaded_by = auth.uid() AND public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (uploaded_by = auth.uid() AND public.is_org_member(auth.uid(), organization_id));
