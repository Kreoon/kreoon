-- FASE checklist seccion 3: comprobante de pago no se exigia server-side.
--
-- Hallazgo: handleConfirmPaid (TalentPaymentsTab.tsx) exige comprobante
-- solo en el cliente (if (!confirmReceipt) return). useUpdatePayment hace
-- UPDATE directo a talent_payments sin RPC. La RLS de UPDATE solo valida
-- role='admin', no valida receipt_url. Cualquier admin (o su sesion
-- comprometida) puede marcar status='paid' via API directa sin
-- comprobante real -- rompe la garantia de auditoria interna que el
-- checklist de produccion daba por sentada.
--
-- NOT VALID: hay 26 pagos historicos con status='paid' sin receipt_url
-- (de antes de que el flujo de comprobante existiera / posiblemente pagos
-- en efectivo). No se tocan -- el constraint NOT VALID no valida filas
-- existentes, solo bloquea INSERT/UPDATE nuevos que violen la regla.

ALTER TABLE public.talent_payments
  ADD CONSTRAINT talent_payments_paid_requires_receipt
  CHECK (status <> 'paid' OR receipt_url IS NOT NULL)
  NOT VALID;
