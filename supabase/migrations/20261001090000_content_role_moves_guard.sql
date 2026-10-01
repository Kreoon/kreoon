-- Mapa de movimientos de estado por rol (aprobado por Alexander, 2026-10-01), aplicado en la base
-- para que no se pueda saltar desde fuera de la app. Espejo de src/lib/contentBoardPermissions.ts.
--
--   creador (solo sus videos): assigned→recording, recording→recorded, issue→corrected
--   editor  (solo sus videos): recorded→editing, editing→delivered, issue→corrected
--   gestión (admin, estrategas, team_leader, trafficker, configuradores): cualquiera
--   cliente: lo gobierna trg_content_guard_client_update (no se toca aquí)
--
-- Se llama trg_content_role_moves para ejecutarse ANTES (orden alfabético) que los triggers que cambian
-- el estado solos (trigger_auto_status_*): así valida solo el cambio pedido por el usuario.
-- Sin auth.uid() (service role / funciones automáticas) no aplica.

CREATE OR REPLACE FUNCTION public.fn_content_role_moves()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_roles text[];
  v_move  text;
BEGIN
  IF v_uid IS NULL OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(role::text) INTO v_roles
  FROM public.organization_member_roles
  WHERE user_id = v_uid AND organization_id = NEW.organization_id;

  -- Solo se gobierna a creadores y editores
  IF v_roles IS NULL OR NOT (v_roles && ARRAY['creator', 'content_creator', 'editor']) THEN
    RETURN NEW;
  END IF;

  IF v_roles && ARRAY['admin', 'strategist', 'digital_strategist', 'creative_strategist', 'team_leader', 'trafficker']
     OR public.is_org_configurer(v_uid, NEW.organization_id) THEN
    RETURN NEW;
  END IF;

  v_move := OLD.status || '>' || NEW.status;

  IF v_roles && ARRAY['creator', 'content_creator']
     AND NEW.creator_id = v_uid
     AND v_move IN ('assigned>recording', 'recording>recorded', 'issue>corrected') THEN
    RETURN NEW;
  END IF;

  IF 'editor' = ANY (v_roles)
     AND NEW.editor_id = v_uid
     AND v_move IN ('recorded>editing', 'editing>delivered', 'issue>corrected') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Tu rol no puede mover este video de «%» a «%»', OLD.status, NEW.status
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_content_role_moves ON public.content;
CREATE TRIGGER trg_content_role_moves
  BEFORE UPDATE OF status ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_content_role_moves();
