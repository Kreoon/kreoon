-- Fix RLS permissions for talent_dna table
-- Asegurar que RLS está habilitado
ALTER TABLE public.talent_dna ENABLE ROW LEVEL SECURITY;

-- Dar permisos base a authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_dna TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Recrear políticas con TO authenticated explícito
DROP POLICY IF EXISTS "talent_dna_select_own" ON public.talent_dna;
CREATE POLICY "talent_dna_select_own" ON public.talent_dna
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "talent_dna_insert_own" ON public.talent_dna;
CREATE POLICY "talent_dna_insert_own" ON public.talent_dna
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "talent_dna_update_own" ON public.talent_dna;
CREATE POLICY "talent_dna_update_own" ON public.talent_dna
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "talent_dna_delete_own" ON public.talent_dna;
CREATE POLICY "talent_dna_delete_own" ON public.talent_dna
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
