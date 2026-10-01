-- =============================================================================
-- PROPUESTA (NO APLICAR TODAVÍA) — 05: publicación controlada y transición
-- Depende de: 01, 02, 03.
-- La PARTE B solo se ejecuta cuando el abogado haya aprobado los textos y el frontend nuevo
-- esté en producción. La PARTE C (carga de borradores) usa service_role y NO publica nada.
-- =============================================================================

-- ─── PARTE A: función de publicación (solo administración de plataforma) ─────
BEGIN;

CREATE OR REPLACE FUNCTION public.publish_legal_document_version(
  p_version_id uuid,
  p_effective_at timestamptz,
  p_change_kind text,               -- initial | material | non_material
  p_requires_reacceptance boolean,
  p_change_summary text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.legal_document_versions%ROWTYPE;
  v_prev uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_admin = true) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT * INTO v FROM legal_document_versions WHERE id = p_version_id FOR UPDATE;
  IF v.id IS NULL OR v.status <> 'draft' THEN RAISE EXCEPTION 'not_a_draft'; END IF;
  IF p_change_kind NOT IN ('initial','material','non_material') THEN RAISE EXCEPTION 'invalid_change_kind'; END IF;
  -- Guardas mínimas contra publicar placeholders.
  IF v.content_markdown ~* '\[(PENDIENTE|VERIFICAR)' OR v.content_markdown ~* 'Borrador' THEN
    RAISE EXCEPTION 'content_has_placeholders';
  END IF;
  IF v.acceptance_kind IN ('contract','data_processing_authorization','optional_authorization')
     AND v.acceptance_statement IS NULL THEN
    RAISE EXCEPTION 'statement_required';
  END IF;
  IF v.document_key = 'privacy_policy' AND (v.notice_controller IS NULL OR v.notice_contact IS NULL) THEN
    RAISE EXCEPTION 'privacy_notice_incomplete';
  END IF;

  SELECT id INTO v_prev FROM legal_document_versions
   WHERE document_key = v.document_key AND status = 'published' FOR UPDATE;
  IF v_prev IS NOT NULL THEN
    UPDATE legal_document_versions SET status = 'retired' WHERE id = v_prev;
  END IF;

  UPDATE legal_document_versions
     SET status = 'published', published_at = now(), published_by = auth.uid(),
         effective_at = COALESCE(p_effective_at, now()), supersedes_id = v_prev,
         change_kind = p_change_kind, requires_reacceptance = COALESCE(p_requires_reacceptance, false),
         change_summary = p_change_summary
   WHERE id = v.id;

  RETURN jsonb_build_object('published', v.id, 'retired', v_prev);
END;
$$;
REVOKE ALL ON FUNCTION public.publish_legal_document_version(uuid, timestamptz, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_legal_document_version(uuid, timestamptz, text, boolean, text) TO authenticated;

COMMIT;

-- Nota: el trigger de inmutabilidad (01) permite este UPDATE porque la fila aún es 'draft'
-- en el momento del UPDATE (los campos de publicación cambian junto con el estado).

-- ─── PARTE B: transición (NO ejecutar hasta aprobación jurídica + frontend v2 en producción) ──
-- BEGIN;
-- -- B.1 Los requisitos legados del registro de creador dejan de exigirse a cuentas NUEVAS.
-- --     No se borra nada: se marcan 'deprecated' como ya se hizo con privacy_policy/terms_of_service.
-- UPDATE public.legal_consent_requirements
--    SET trigger_event = 'deprecated', is_required = false
--  WHERE trigger_event = 'registration'
--    AND document_type IN ('age_declaration','general_terms','talent_agreement','dmca_policy','content_moderation_policy')
--    AND (account_type = 'talent' OR user_role IN ('creator','all'));
-- --     OJO: age_declaration y general_terms tienen user_role='all' y también los usa el flujo de
-- --     clientes (client-onboarding-claim / list_registration_documents('client')). Antes de ejecutar,
-- --     separar las filas por account_type para no romper el onboarding de empresas.
--
-- -- B.2 El gate de rol 'creator' (creator_agreement con cesión perpetua) deja de abrirse.
-- UPDATE public.role_legal_gates SET is_active = false WHERE target_role IN ('creator');
-- --     'editor' queda fuera del alcance de este cambio (decisión de producto).
--
-- -- B.3 complete_creator_signup (v1) deja de aceptar altas nuevas cuando el frontend v2 esté arriba:
-- REVOKE EXECUTE ON FUNCTION public.complete_creator_signup(text, uuid[], jsonb, boolean) FROM authenticated;
-- COMMIT;

-- ─── PARTE C: carga de BORRADORES (service_role; no publica) ──────────────────
-- El contenido se carga desde los .md aprobados, sin placeholders, con un script que lee el
-- archivo y hace INSERT con status='draft'. Ejemplo de forma (no ejecutar con el borrador actual):
--
-- INSERT INTO public.legal_document_versions
--   (document_key, version, title, content_markdown, acceptance_statement, acceptance_kind)
-- VALUES
--   ('creator_terms', '1.0', 'Acuerdo del creador y términos de servicio', :'contenido_aprobado',
--    'Declaro que soy mayor de edad y acepto el Acuerdo del creador y los términos de servicio.',
--    'contract'),
--   ('privacy_policy', '2.0', 'Política de privacidad y tratamiento de datos', :'contenido_aprobado',
--    'Autorizo el tratamiento de mis datos para crear y gestionar mi cuenta de creador, según la Política de privacidad.',
--    'data_processing_authorization');
--
-- Las versiones legadas (legal_documents) NO se migran a esta tabla: siguen en su sitio, con sus
-- aceptaciones, y se sirven en /legal/:tipo como históricas.
