-- Campos de origen/comunidad para clientes y perfiles
-- Permiten registrar cómo llegó cada persona o empresa a la plataforma

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lead_source  TEXT,       -- 'instagram' | 'tiktok' | 'referral' | 'whatsapp' | 'website' | 'event'
  ADD COLUMN IF NOT EXISTS community_name TEXT,     -- comunidad de origen (ej: "Los Reyes del Contenido")
  ADD COLUMN IF NOT EXISTS referred_by  TEXT;       -- nombre del referidor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lead_source  TEXT,
  ADD COLUMN IF NOT EXISTS community_name TEXT,
  ADD COLUMN IF NOT EXISTS referred_by  TEXT;
