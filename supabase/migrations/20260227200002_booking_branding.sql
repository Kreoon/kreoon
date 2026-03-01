-- Personalización de marca para booking
-- Permite a los usuarios personalizar la apariencia de su página de reservas

CREATE TABLE IF NOT EXISTS booking_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  accent_color TEXT,
  background_color TEXT DEFAULT '#FFFFFF',
  welcome_text TEXT,
  footer_text TEXT,
  show_kreoon_branding BOOLEAN DEFAULT true,
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_booking_branding_user ON booking_branding(user_id);

-- RLS
ALTER TABLE booking_branding ENABLE ROW LEVEL SECURITY;

-- Propietarios pueden gestionar su branding
CREATE POLICY "Users can manage their branding"
  ON booking_branding
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cualquiera puede ver branding (para página pública)
CREATE POLICY "Anyone can view branding"
  ON booking_branding
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Grants
GRANT ALL ON booking_branding TO authenticated;
GRANT SELECT ON booking_branding TO anon;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_booking_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_branding_updated_at
  BEFORE UPDATE ON booking_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_branding_updated_at();

COMMENT ON TABLE booking_branding IS 'Configuración de marca personalizada para páginas de booking';
