-- Fix: el guard anti-IDOR de content bloqueaba los flujos legítimos del portal de cliente.
--
-- trg_guard_client_content_update() solo permitía que un client user modificara `status`.
-- Pero el portal de cliente escribe también:
--   - aprobar guion  -> status + script_approved_at + script_approved_by + change_request_status
--   - solicitar cambios -> change_request_status + change_requests
--   - editar guion   -> script + script_version
--   - aprobar entrega / reportar novedad -> approved_by + notes
-- Resultado: "Error al aprobar guión" (P0001 forbidden) para todo cliente.
--
-- Se amplía la whitelist a los campos del flujo de revisión y se valida que el cliente
-- no pueda atribuir la aprobación a otro usuario (script_approved_by / approved_by = auth.uid()).

CREATE OR REPLACE FUNCTION public.trg_guard_client_content_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_j jsonb;
  v_old_j jsonb;
BEGIN
  -- Solo se aplica a un PATCH directo de PostgREST como 'authenticated'.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Solo restringe si el caller es client-portal user de este client_id
  -- (no toca updates de creator/editor/strategist/org-member).
  IF NOT EXISTS (
    SELECT 1 FROM client_users
    WHERE client_id = OLD.client_id AND user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  -- El cliente no puede atribuir una aprobación a otro usuario.
  IF NEW.script_approved_by IS DISTINCT FROM OLD.script_approved_by
     AND NEW.script_approved_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden: script_approved_by must be the calling client user';
  END IF;

  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
     AND NEW.approved_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden: approved_by must be the calling client user';
  END IF;

  v_new_j := to_jsonb(NEW)
    - 'status' - 'updated_at'
    - 'script_approved_at' - 'script_approved_by'
    - 'change_request_status' - 'change_requests'
    - 'script' - 'script_version'
    - 'approved_by' - 'approved_at'
    - 'notes';

  v_old_j := to_jsonb(OLD)
    - 'status' - 'updated_at'
    - 'script_approved_at' - 'script_approved_by'
    - 'change_request_status' - 'change_requests'
    - 'script' - 'script_version'
    - 'approved_by' - 'approved_at'
    - 'notes';

  IF v_new_j IS DISTINCT FROM v_old_j THEN
    RAISE EXCEPTION 'forbidden: client users can only update review fields of content';
  END IF;

  RETURN NEW;
END;
$function$;
