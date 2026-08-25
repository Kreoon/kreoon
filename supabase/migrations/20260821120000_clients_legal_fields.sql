-- ============================================================================
-- clients: columnas legales que el onboarding ya captura y no tenían dónde ir
-- ============================================================================
-- El wizard público de onboarding (client_onboarding_forms.form_data.legal)
-- pide razón social, representante legal y correo de facturación, pero
-- `clients` no tenía columnas para eso, así que esos datos quedaban solo
-- dentro del JSON del formulario y la pestaña Info de la empresa los mostraba
-- vacíos. Con estas tres columnas, `client-onboarding-process` puede volcar
-- TODO el paso legal a la ficha de la empresa.
--
-- ¿Por qué ahora sí es seguro copiar datos fiscales a `clients`?
-- La migración 20260812080000_fix_clients_is_public_leak.sql eliminó la
-- política anon "Anyone can view public client profiles" y sacó el
-- `OR is_public = true` de la política de authenticated. Lo único público hoy
-- es la vista `public_client_profiles`, que expone solo columnas de marketing
-- (name, username, bio, logo_url, category, city, country, website, redes,
-- is_vip). Estas tres columnas NO se agregan a esa vista, así que quedan
-- visibles únicamente para la organización dueña y los client_users asociados,
-- igual que document_number y address.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS legal_representative text,
  ADD COLUMN IF NOT EXISTS billing_email text;

COMMENT ON COLUMN public.clients.legal_name IS
  'Razón social (nombre legal) de la empresa. NO es el nombre comercial: ese '
  'sigue viviendo en clients.name. Lo llena el onboarding (legal.razon_social).';

COMMENT ON COLUMN public.clients.legal_representative IS
  'Representante legal que firma el contrato. Lo llena el onboarding '
  '(legal.representante).';

COMMENT ON COLUMN public.clients.billing_email IS
  'Correo al que se envían las facturas, cuando es distinto del de contacto. '
  'Lo llena el onboarding (legal.correo_facturacion, con fallback al correo '
  'del representante).';
