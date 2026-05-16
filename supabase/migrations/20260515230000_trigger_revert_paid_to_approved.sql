-- Trigger: al revertir content de 'paid' → 'approved'
-- • Si NO hay soporte de pago real: permite la reversión y limpia creator_paid/editor_paid
-- • Si YA existe un talent_payment con status paid/processing que incluye este content: bloquea
CREATE OR REPLACE FUNCTION public.fn_guard_revert_paid_to_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_has_payment boolean;
BEGIN
  -- Solo actúa cuando el cambio es paid → approved
  IF OLD.status = 'paid' AND NEW.status = 'approved' THEN

    -- ¿Existe un pago real (paid o processing) que cubra este contenido?
    SELECT EXISTS (
      SELECT 1 FROM talent_payments tp
      WHERE tp.content_ids @> ARRAY[NEW.id]
        AND tp.status IN ('paid', 'processing')
    ) INTO v_has_payment;

    IF v_has_payment THEN
      RAISE EXCEPTION
        'No se puede revertir el contenido "%" a aprobado: ya existe un soporte de pago registrado.',
        COALESCE(NEW.title, NEW.id::text)
        USING ERRCODE = 'P0001';
    END IF;

    -- Sin soporte de pago: limpiar flags para que vuelva a la cola de pago pendiente
    NEW.creator_paid := false;
    NEW.editor_paid  := false;

  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_revert_paid_to_approved ON public.content;
CREATE TRIGGER trg_guard_revert_paid_to_approved
  BEFORE UPDATE OF status ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_revert_paid_to_approved();

COMMENT ON FUNCTION public.fn_guard_revert_paid_to_approved() IS
  'Al revertir status paid→approved: bloquea si hay soporte de pago, limpia creator_paid/editor_paid si no lo hay.';
