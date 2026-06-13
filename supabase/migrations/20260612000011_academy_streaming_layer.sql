-- ============================================================================
-- KREOON ACADEMY — STREAMING LAYER
-- Eventos en tiempo real para academia: presencia, notificaciones, gamificación,
-- finanzas. Reusa academy_notifications (ya existente) como canal central.
-- Agrega triggers que pueblan automáticamente el feed live cuando algo pasa.
-- ============================================================================

-- 1. Extender academy_notification_settings con preferencias del streaming layer.
ALTER TABLE public.academy_notification_settings
  ADD COLUMN IF NOT EXISTS notify_new_member       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_level_up         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payment_received BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sound_enabled           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS desktop_push_enabled    BOOLEAN NOT NULL DEFAULT false;

-- 2. Asegurar columnas mínimas en academy_notifications. Si la tabla ya tenía
--    payload jsonb opcional, no hacemos nada; si no, lo agregamos para extras.
ALTER TABLE public.academy_notifications
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE INDEX IF NOT EXISTS idx_academy_notif_recipient_unread
  ON public.academy_notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_notif_space_recent
  ON public.academy_notifications(space_id, created_at DESC);

-- ============================================================================
-- HELPER: ¿el usuario quiere recibir esta categoría de notif?
-- ============================================================================
CREATE OR REPLACE FUNCTION public._academy_wants_notification(
  p_user_id UUID, p_space_id UUID, p_category TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v RECORD;
BEGIN
  SELECT * INTO v FROM academy_notification_settings
   WHERE user_id = p_user_id AND space_id = p_space_id;
  IF NOT FOUND THEN RETURN TRUE; END IF;
  RETURN CASE p_category
    WHEN 'new_member'       THEN v.notify_new_member
    WHEN 'new_post'         THEN v.notify_new_post
    WHEN 'new_comment'      THEN v.notify_new_comment_on_my_post
    WHEN 'level_up'         THEN v.notify_level_up
    WHEN 'payment_received' THEN v.notify_payment_received
    ELSE TRUE END;
END; $$;

-- ============================================================================
-- TRIGGER 1 — Nuevo miembro: notif al owner + a todos los miembros activos
-- que tengan notify_new_member = true.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_academy_notify_new_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_space_name TEXT;
  v_member_name TEXT;
BEGIN
  IF NOT NEW.is_active OR NEW.role = 'owner' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active = TRUE THEN RETURN NEW; END IF;

  SELECT owner_id, name INTO v_owner_id, v_space_name
    FROM academy_spaces WHERE id = NEW.space_id;
  SELECT COALESCE(full_name, 'Alguien') INTO v_member_name
    FROM profiles WHERE id = NEW.user_id;

  INSERT INTO academy_notifications
    (space_id, recipient_id, sender_id, type, title, body, link,
     reference_id, reference_type, payload)
  SELECT
    NEW.space_id, am.user_id, NEW.user_id, 'new_member',
    v_member_name || ' se unió a ' || COALESCE(v_space_name, 'la academia'),
    NULL,
    '/academia/' || (SELECT slug FROM academy_spaces WHERE id = NEW.space_id),
    NEW.user_id, 'academy_membership',
    jsonb_build_object('member_name', v_member_name, 'space_name', v_space_name)
  FROM academy_memberships am
  WHERE am.space_id = NEW.space_id
    AND am.is_active = true
    AND am.user_id <> NEW.user_id
    AND _academy_wants_notification(am.user_id, NEW.space_id, 'new_member');

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_member ON public.academy_memberships;
CREATE TRIGGER trg_notify_new_member
  AFTER INSERT OR UPDATE OF is_active ON public.academy_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_notify_new_member();

-- ============================================================================
-- TRIGGER 2 — Nuevo post: notif a todos los miembros activos
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_academy_notify_new_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_author_name TEXT;
  v_space_slug TEXT;
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Alguien') INTO v_author_name
    FROM profiles WHERE id = NEW.author_id;
  SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = NEW.space_id;

  INSERT INTO academy_notifications
    (space_id, recipient_id, sender_id, type, title, body, link,
     reference_id, reference_type, payload)
  SELECT
    NEW.space_id, am.user_id, NEW.author_id, 'new_post',
    v_author_name || ' publicó: ' || COALESCE(NEW.title, ''),
    LEFT(COALESCE(NEW.body, ''), 140),
    '/academia/' || v_space_slug || '/post/' || NEW.id,
    NEW.id, 'academy_post',
    jsonb_build_object('author_name', v_author_name, 'post_type', NEW.type)
  FROM academy_memberships am
  WHERE am.space_id = NEW.space_id
    AND am.is_active = true
    AND am.user_id <> NEW.author_id
    AND _academy_wants_notification(am.user_id, NEW.space_id, 'new_post');

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_post ON public.academy_posts;
CREATE TRIGGER trg_notify_new_post
  AFTER INSERT OR UPDATE OF status ON public.academy_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_notify_new_post();

-- ============================================================================
-- TRIGGER 3 — Subió de nivel: notif al miembro afectado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_academy_notify_level_up()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_space_slug TEXT;
BEGIN
  IF NEW.level IS NULL OR NEW.level <= COALESCE(OLD.level, 0) THEN RETURN NEW; END IF;
  IF NOT _academy_wants_notification(NEW.user_id, NEW.space_id, 'level_up') THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = NEW.space_id;

  INSERT INTO academy_notifications
    (space_id, recipient_id, sender_id, type, title, body, link,
     reference_id, reference_type, payload)
  VALUES (
    NEW.space_id, NEW.user_id, NEW.user_id, 'level_up',
    '¡Subiste a nivel ' || NEW.level || '!',
    'Ahora tienes ' || COALESCE(NEW.total_points, 0) || ' puntos',
    '/academia/' || v_space_slug || '/perfil',
    NEW.user_id, 'level_up',
    jsonb_build_object('new_level', NEW.level, 'total_points', NEW.total_points)
  );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_level_up ON public.academy_space_points;
CREATE TRIGGER trg_notify_level_up
  AFTER UPDATE OF level ON public.academy_space_points
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_notify_level_up();

-- ============================================================================
-- TRIGGER 4 — Ingreso financiero (pending_owner_payouts): notif al owner
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_academy_notify_payment_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_space_slug TEXT;
  v_space_name TEXT;
BEGIN
  IF NOT _academy_wants_notification(NEW.owner_user_id, NEW.space_id, 'payment_received') THEN
    RETURN NEW;
  END IF;

  SELECT slug, name INTO v_space_slug, v_space_name
    FROM academy_spaces WHERE id = NEW.space_id;

  INSERT INTO academy_notifications
    (space_id, recipient_id, sender_id, type, title, body, link,
     reference_id, reference_type, payload)
  VALUES (
    NEW.space_id, NEW.owner_user_id, NULL, 'payment_received',
    'Nuevo ingreso de $' || NEW.gross_amount_usd || ' USD',
    'Comisión KREOON: $' || NEW.platform_fee_amount_usd
      || ' · Tu neto: $' || NEW.net_owner_amount_usd,
    '/academia/' || v_space_slug || '/admin?tab=pagos',
    NEW.id, 'pending_owner_payout',
    jsonb_build_object(
      'gross_usd', NEW.gross_amount_usd,
      'net_usd',   NEW.net_owner_amount_usd,
      'source',    NEW.source_type
    )
  );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_payment_received ON public.pending_owner_payouts;
CREATE TRIGGER trg_notify_payment_received
  AFTER INSERT ON public.pending_owner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_notify_payment_received();

-- ============================================================================
-- RPC — Métricas financieras REALES para /admin/payouts.
-- Distingue MRR bruto (precio lista) vs MRR efectivo (después de cupones).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_academy_financial_health(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_mrr_gross NUMERIC := 0;
  v_mrr_effective NUMERIC := 0;
  v_active_members INT := 0;
  v_new_30d INT := 0;
  v_churned_30d INT := 0;
  v_collected_30d NUMERIC := 0;
  v_commission_30d NUMERIC := 0;
  v_active_coupons INT := 0;
  v_total_redemptions INT := 0;
  v_fee_percent NUMERIC := 10;
BEGIN
  SELECT * INTO v_space FROM academy_spaces WHERE id = p_space_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'space_not_found');
  END IF;

  v_fee_percent := CASE WHEN v_space.plan_slug = 'pro' THEN 2.9 ELSE 10 END;

  SELECT COUNT(*) INTO v_active_members
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = true AND role <> 'owner';

  v_mrr_gross := v_active_members * COALESCE(v_space.membership_price_usd, 0);

  -- MRR efectivo: por cada membresía activa, descontar el cupón aplicado (si vive)
  SELECT COALESCE(SUM(
    CASE
      WHEN c.id IS NULL THEN COALESCE(v_space.membership_price_usd, 0)
      WHEN c.duration = 'once' THEN COALESCE(v_space.membership_price_usd, 0)
      WHEN c.discount_type = 'percentage'
        THEN GREATEST(0, COALESCE(v_space.membership_price_usd, 0)
                         * (100 - c.discount_value) / 100)
      ELSE GREATEST(0, COALESCE(v_space.membership_price_usd, 0) - c.discount_value)
    END
  ), 0) INTO v_mrr_effective
  FROM academy_memberships am
  LEFT JOIN LATERAL (
    SELECT cr.coupon_id FROM academy_coupon_redemptions cr
     WHERE cr.user_id = am.user_id AND cr.space_id = p_space_id
     ORDER BY cr.redeemed_at DESC LIMIT 1
  ) r ON true
  LEFT JOIN academy_coupons c ON c.id = r.coupon_id
  WHERE am.space_id = p_space_id AND am.is_active = true AND am.role <> 'owner';

  SELECT COUNT(*) INTO v_new_30d
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = true
     AND joined_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_churned_30d
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = false
     AND joined_at > NOW() - INTERVAL '30 days';

  SELECT COALESCE(SUM(gross_amount_usd), 0),
         COALESCE(SUM(platform_fee_amount_usd), 0)
    INTO v_collected_30d, v_commission_30d
   FROM pending_owner_payouts
  WHERE space_id = p_space_id
    AND collected_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_active_coupons
    FROM academy_coupons
   WHERE space_id = p_space_id AND is_active = true;

  SELECT COALESCE(SUM(redemptions_count), 0) INTO v_total_redemptions
    FROM academy_coupons WHERE space_id = p_space_id;

  RETURN jsonb_build_object(
    'mrr_gross',           ROUND(v_mrr_gross, 2),
    'mrr_effective',       ROUND(v_mrr_effective, 2),
    'mrr_lost_to_coupons', ROUND(v_mrr_gross - v_mrr_effective, 2),
    'dilution_percent',    CASE WHEN v_mrr_gross > 0
                                THEN ROUND((v_mrr_gross - v_mrr_effective) / v_mrr_gross * 100, 1)
                                ELSE 0 END,
    'active_members',      v_active_members,
    'new_members_30d',     v_new_30d,
    'churned_30d',         v_churned_30d,
    'collected_30d_usd',   ROUND(v_collected_30d, 2),
    'commission_30d_usd',  ROUND(v_commission_30d, 2),
    'arr_effective_usd',   ROUND(v_mrr_effective * 12, 2),
    'platform_fee_percent', v_fee_percent,
    'projected_commission_mrr', ROUND(v_mrr_effective * v_fee_percent / 100, 2),
    'active_coupons',      v_active_coupons,
    'total_redemptions',   v_total_redemptions
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_academy_financial_health(UUID)
  TO authenticated;

-- ============================================================================
-- RPC — Conteo de presencia (cuántos miembros marcaron last_seen reciente)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_academy_presence_count(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_online INT;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_online
    FROM academy_member_presence
   WHERE space_id = p_space_id
     AND last_seen_at > NOW() - INTERVAL '5 minutes';
  RETURN jsonb_build_object('online', v_online);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_academy_presence_count(UUID)
  TO authenticated, anon;

-- ============================================================================
-- RPC — Heartbeat de presencia (lo llama el cliente cada minuto)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_academy_presence(
  p_space_id UUID, p_current_page TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO academy_member_presence (space_id, user_id, last_seen_at, current_page)
  VALUES (p_space_id, auth.uid(), NOW(), p_current_page)
  ON CONFLICT (space_id, user_id) DO UPDATE
     SET last_seen_at = NOW(),
         current_page = COALESCE(EXCLUDED.current_page, academy_member_presence.current_page);
END; $$;

GRANT EXECUTE ON FUNCTION public.touch_academy_presence(UUID, TEXT)
  TO authenticated;

-- Unique constraint para el upsert (solo si falta)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'academy_member_presence_space_user_uniq'
  ) THEN
    BEGIN
      ALTER TABLE academy_member_presence
        ADD CONSTRAINT academy_member_presence_space_user_uniq
        UNIQUE (space_id, user_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

-- RLS de notif si falta (defensa)
ALTER TABLE public.academy_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.academy_notifications;
CREATE POLICY "users_read_own_notifications"
  ON public.academy_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "users_mark_own_notifications_read" ON public.academy_notifications;
CREATE POLICY "users_mark_own_notifications_read"
  ON public.academy_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

GRANT SELECT, UPDATE ON public.academy_notifications TO authenticated;
