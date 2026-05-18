-- Add whatsapp_notify flag to client_users
-- Allows selecting which members of a company receive WhatsApp notifications.
-- Auto-enable for existing 'owner' roles so current notifications keep working.

ALTER TABLE public.client_users
  ADD COLUMN IF NOT EXISTS whatsapp_notify BOOLEAN NOT NULL DEFAULT false;

UPDATE public.client_users
  SET whatsapp_notify = true
  WHERE role = 'owner';

COMMENT ON COLUMN public.client_users.whatsapp_notify IS
  'When true, this user receives WhatsApp notifications for events related to this client (script_pending, content_delivered, content_corrected).';
