-- Migración: Corregir filtrado de documentos legales por tipo de usuario
-- Fecha: 2026-04-10
-- Problema: Usuarios de tipo 'talent' veían documentos de clientes como 'brand_agreement'

-- 1. Agregar brand_agreement a legal_consent_requirements con account_type='client'
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  is_required,
  required_at,
  trigger_event,
  display_order,
  account_type
) VALUES
  ('brand_agreement', 'all', true, 'registration', 'registration', 6, 'client')
ON CONFLICT (document_type, user_role) DO UPDATE SET
  account_type = 'client',
  trigger_event = 'registration';

-- 2. Mejorar función get_pending_consents para verificar applies_to de legal_documents
CREATE OR REPLACE FUNCTION public.get_pending_consents(p_user_id uuid)
RETURNS TABLE(
  document_id uuid,
  document_type text,
  title text,
  version text,
  summary text,
  is_required boolean,
  trigger_event text,
  display_order integer,
  user_role text,
  account_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_type TEXT;
BEGIN
  -- Obtener el user_type del perfil del usuario
  SELECT p.user_type INTO v_user_type
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    COALESCE(lcr.is_required, ld.is_required) AS is_required,
    lcr.trigger_event,
    COALESCE(lcr.display_order, 999) AS display_order,
    lcr.user_role,
    lcr.account_type
  FROM legal_documents ld
  LEFT JOIN legal_consent_requirements lcr
    ON ld.document_type = lcr.document_type
  WHERE
    ld.is_current = true
    AND ld.is_required = true
    -- Verificar que el usuario no haya aceptado ya este tipo de documento
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_type = ld.document_type
        AND ulc.accepted = true
        AND ulc.revoked = false
    )
    AND (
      lcr.trigger_event = 'registration'
      OR lcr.trigger_event IS NULL
    )
    -- FILTRO POR ACCOUNT_TYPE (de legal_consent_requirements)
    AND (
      lcr.account_type IS NULL
      OR lcr.account_type = v_user_type
    )
    -- FILTRO POR APPLIES_TO (de legal_documents)
    -- Solo mostrar documentos que aplican a 'all' o al user_type del usuario
    AND (
      'all' = ANY(ld.applies_to)
      OR v_user_type = ANY(ld.applies_to)
      -- Mapeo de user_type a applies_to values
      OR (v_user_type = 'talent' AND 'creator' = ANY(ld.applies_to))
      OR (v_user_type = 'client' AND ('client' = ANY(ld.applies_to) OR 'brand' = ANY(ld.applies_to)))
      OR (v_user_type = 'organization' AND 'organization' = ANY(ld.applies_to))
    )
  ORDER BY COALESCE(lcr.display_order, 999), ld.created_at;
END;
$function$;
