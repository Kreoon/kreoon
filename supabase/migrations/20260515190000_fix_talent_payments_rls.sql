-- Migration: Fix RLS policies del sistema financiero de talento
-- Date: 2026-05-15
-- Problema: Las políticas anteriores usaban organization_id, permitiendo que
--   cualquier miembro de la org vea salarios y cuentas bancarias de otros.
-- Solución: El talento solo ve sus propios datos. Solo admins ven todo.

-- =====================================================
-- 1. talent_payment_accounts
-- =====================================================

ALTER TABLE public.talent_payment_accounts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_member_access_payment_accounts" ON public.talent_payment_accounts;
ALTER TABLE public.talent_payment_accounts ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve y gestiona sus propias cuentas
CREATE POLICY "accounts_own_select" ON public.talent_payment_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "accounts_own_insert" ON public.talent_payment_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_own_update" ON public.talent_payment_accounts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_own_delete" ON public.talent_payment_accounts
  FOR DELETE USING (user_id = auth.uid());

-- Admins ven todas las cuentas de su org
CREATE POLICY "accounts_admin_select" ON public.talent_payment_accounts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 2. talent_payments
-- =====================================================

ALTER TABLE public.talent_payments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_member_access_payments" ON public.talent_payments;
ALTER TABLE public.talent_payments ENABLE ROW LEVEL SECURITY;

-- El talento solo ve sus propios pagos
CREATE POLICY "payments_own_select" ON public.talent_payments
  FOR SELECT USING (user_id = auth.uid());

-- Admins ven todos los pagos de su org
CREATE POLICY "payments_admin_select" ON public.talent_payments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admins pueden crear, modificar y eliminar pagos
CREATE POLICY "payments_admin_insert" ON public.talent_payments
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "payments_admin_update" ON public.talent_payments
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "payments_admin_delete" ON public.talent_payments
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 3. talent_payment_notifications
-- =====================================================

ALTER TABLE public.talent_payment_notifications DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_member_notifications" ON public.talent_payment_notifications;
ALTER TABLE public.talent_payment_notifications ENABLE ROW LEVEL SECURITY;

-- El talento ve solo sus propias notificaciones
CREATE POLICY "notifications_own_select" ON public.talent_payment_notifications
  FOR SELECT USING (user_id = auth.uid());

-- Admins ven todas las notificaciones de su org
CREATE POLICY "notifications_admin_all" ON public.talent_payment_notifications
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 4. Storage: payment-receipts
-- =====================================================
-- Path esperado: {organization_id}/{user_id}/{filename}

DROP POLICY IF EXISTS "org_member_receipts_access" ON storage.objects;

-- Lectura: el talento accede a su subcarpeta; admins a toda la org
CREATE POLICY "receipts_own_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-receipts'
    AND (
      -- El usuario accede a su propia carpeta: /{org_id}/{user_id}/
      auth.uid()::text = (storage.foldername(name))[2]
      OR
      -- Admin accede a toda la org
      auth.uid() IN (
        SELECT user_id FROM public.organization_members
        WHERE organization_id::text = (storage.foldername(name))[1]
          AND role = 'admin'
      )
    )
  );

-- Escritura de comprobantes: solo admins
CREATE POLICY "receipts_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-receipts'
    AND auth.uid() IN (
      SELECT user_id FROM public.organization_members
      WHERE organization_id::text = (storage.foldername(name))[1]
        AND role = 'admin'
    )
  );

-- Eliminación: solo admins
CREATE POLICY "receipts_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'payment-receipts'
    AND auth.uid() IN (
      SELECT user_id FROM public.organization_members
      WHERE organization_id::text = (storage.foldername(name))[1]
        AND role = 'admin'
    )
  );

-- =====================================================
-- 5. Guarda de idempotencia en notificaciones
-- =====================================================
-- Previene notificaciones duplicadas si el trigger se ejecuta dos veces

CREATE OR REPLACE FUNCTION public.auto_create_payment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.talent_payment_notifications
      WHERE payment_id = NEW.id
        AND status != 'failed'
    ) THEN
      INSERT INTO public.talent_payment_notifications (
        payment_id, user_id, organization_id
      ) VALUES (
        NEW.id, NEW.user_id, NEW.organization_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- 6. Índice GIN para búsquedas por content_ids (performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_talent_payments_content_ids_gin
  ON public.talent_payments USING GIN(content_ids);

CREATE INDEX IF NOT EXISTS idx_talent_payments_idempotency
  ON public.talent_payments(organization_id, user_id, status)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_talent_payment_notifications_pending_org
  ON public.talent_payment_notifications(organization_id, user_id)
  WHERE status = 'pending';
