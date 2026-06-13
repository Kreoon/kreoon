-- ============================================================
-- Auto-sync de Stripe Product+Price para academias y cursos.
--
-- Cuando el owner de una academia/curso setea o cambia el precio,
-- un trigger DB llama a la edge function `stripe-sync-product` via
-- pg_net. La edge function crea/actualiza el Product+Price en la
-- cuenta central de KREOON y escribe stripe_product_id/stripe_price_id
-- de vuelta en la fila.
--
-- Esto evita que el owner tenga que entrar al dashboard de Stripe.
-- ============================================================

-- ─── Helper para llamar la edge function ─────────────────────────────

CREATE OR REPLACE FUNCTION public.invoke_stripe_sync_product(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mismo patrón que los crons existentes del proyecto
  -- (ver social-scheduler-process): URL hardcodeada al endpoint público
  -- de la edge function. La edge function corre con verify_jwt=false
  -- y no requiere Authorization. Es fire-and-forget.
  PERFORM net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/stripe-sync-product',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'entity_type', p_entity_type,
      'entity_id',   p_entity_id
    ),
    timeout_milliseconds := 30000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_stripe_sync_product failed for % %: %', p_entity_type, p_entity_id, SQLERRM;
END;
$$;

-- ─── Trigger sobre academy_spaces ────────────────────────────────────
-- Dispara cuando cambia membership_price_usd o el alta tiene precio > 0.

CREATE OR REPLACE FUNCTION public.trg_academy_space_stripe_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.membership_price_usd, 0) > 0 THEN
      PERFORM invoke_stripe_sync_product('academy_space', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.membership_price_usd, 0) IS DISTINCT FROM COALESCE(OLD.membership_price_usd, 0)
       OR (NEW.name IS DISTINCT FROM OLD.name AND NEW.stripe_product_id IS NOT NULL)
    THEN
      PERFORM invoke_stripe_sync_product('academy_space', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_space_stripe_sync_t ON public.academy_spaces;
CREATE TRIGGER trg_academy_space_stripe_sync_t
  AFTER INSERT OR UPDATE ON public.academy_spaces
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_space_stripe_sync();

-- ─── Trigger sobre academy_courses ────────────────────────────────────
-- Dispara cuando cambia price_usd o is_free.

CREATE OR REPLACE FUNCTION public.trg_academy_course_stripe_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_free, false) = false AND COALESCE(NEW.price_usd, 0) > 0 THEN
      PERFORM invoke_stripe_sync_product('academy_course', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.price_usd, 0) IS DISTINCT FROM COALESCE(OLD.price_usd, 0)
       OR COALESCE(NEW.is_free, false) IS DISTINCT FROM COALESCE(OLD.is_free, false)
       OR (NEW.title IS DISTINCT FROM OLD.title AND NEW.stripe_product_id IS NOT NULL)
    THEN
      PERFORM invoke_stripe_sync_product('academy_course', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_course_stripe_sync_t ON public.academy_courses;
CREATE TRIGGER trg_academy_course_stripe_sync_t
  AFTER INSERT OR UPDATE ON public.academy_courses
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_course_stripe_sync();

GRANT EXECUTE ON FUNCTION public.invoke_stripe_sync_product(TEXT, UUID) TO authenticated;
