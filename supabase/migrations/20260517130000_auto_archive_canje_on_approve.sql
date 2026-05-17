-- Migration: Auto-archivo de contenido canje al aprobar
-- Date: 2026-05-17
--
-- El contenido canje (is_ambassador_content=true / reward_type='UP') no tiene
-- pago monetario, por lo que el trigger de pagos no lo archiva.
-- Este trigger lo mueve a 'archived' en el mismo momento en que pasa a 'approved'.

CREATE OR REPLACE FUNCTION public.fn_auto_archive_canje_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.is_ambassador_content = true OR NEW.reward_type = 'UP' THEN
      NEW.status := 'archived';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_archive_canje_on_approve ON public.content;
CREATE TRIGGER trigger_auto_archive_canje_on_approve
  BEFORE UPDATE OF status ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_archive_canje_on_approve();

-- Retroactivo: los canjes que ya estaban en 'approved' pasan a 'archived'
UPDATE public.content
SET status = 'archived'
WHERE status = 'approved'
  AND (is_ambassador_content = true OR reward_type = 'UP');
