-- =====================================================
-- CREATOR REVIEWS - Sistema de resenas verificadas
-- =====================================================
-- Permite que clientes reales dejen resenas en perfiles de creadores
-- Las resenas pasan por verificacion y moderacion antes de publicarse

-- 1. Tabla principal de resenas
CREATE TABLE IF NOT EXISTS public.creator_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Reviewer (puede ser usuario registrado o anonimo)
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  reviewer_email text,
  reviewer_company text,
  reviewer_avatar_url text,
  reviewer_role text, -- 'Brand Manager', 'Marketing Director', etc.

  -- Contexto de la colaboracion
  project_id uuid REFERENCES marketplace_projects(id) ON DELETE SET NULL,
  service_type text, -- 'ugc_video', 'photo', 'campaign', 'social_media', etc.
  collaboration_date date,

  -- Contenido de la resena
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text NOT NULL CHECK (char_length(content) >= 10),

  -- Aspectos especificos (opcional)
  rating_communication integer CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_quality integer CHECK (rating_quality >= 1 AND rating_quality <= 5),
  rating_timeliness integer CHECK (rating_timeliness >= 1 AND rating_timeliness <= 5),
  rating_professionalism integer CHECK (rating_professionalism >= 1 AND rating_professionalism <= 5),

  -- Verificacion
  is_verified boolean DEFAULT false,
  verification_token text UNIQUE,
  verification_method text, -- 'email', 'project', 'manual'
  verified_at timestamptz,

  -- Moderacion
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  is_featured boolean DEFAULT false,
  moderated_at timestamptz,
  moderated_by uuid REFERENCES profiles(id),
  moderation_notes text,

  -- Respuesta del creador (opcional)
  creator_response text,
  creator_responded_at timestamptz,

  -- Metadata
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Indices para performance
CREATE INDEX IF NOT EXISTS idx_creator_reviews_creator ON creator_reviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_reviews_status ON creator_reviews(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_reviews_verified ON creator_reviews(creator_id, is_verified, status);
CREATE INDEX IF NOT EXISTS idx_creator_reviews_token ON creator_reviews(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_reviews_rating ON creator_reviews(creator_id, rating) WHERE status = 'approved';

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_creator_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_creator_reviews_updated ON creator_reviews;
CREATE TRIGGER trigger_creator_reviews_updated
  BEFORE UPDATE ON creator_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_reviews_timestamp();

-- 4. RLS Policies
ALTER TABLE creator_reviews ENABLE ROW LEVEL SECURITY;

-- Politica: Cualquiera puede ver resenas aprobadas y verificadas
CREATE POLICY "Public can view approved reviews" ON creator_reviews
  FOR SELECT
  USING (status = 'approved' AND is_verified = true);

-- Politica: Creadores pueden ver TODAS sus resenas (incluso pendientes)
CREATE POLICY "Creators can view their own reviews" ON creator_reviews
  FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Politica: Cualquiera puede insertar resenas (con token de verificacion)
CREATE POLICY "Anyone can submit reviews" ON creator_reviews
  FOR INSERT
  WITH CHECK (true);

-- Politica: Solo el creador puede responder a sus resenas
CREATE POLICY "Creators can respond to their reviews" ON creator_reviews
  FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Solo pueden actualizar campos de respuesta
    creator_response IS DISTINCT FROM OLD.creator_response OR
    creator_responded_at IS DISTINCT FROM OLD.creator_responded_at
  );

-- 5. Tabla de solicitudes de resena (para tracking)
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

  -- Datos del destinatario
  recipient_name text NOT NULL,
  recipient_email text,
  recipient_phone text,

  -- Token unico para el link
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Estado
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'completed', 'expired')),
  sent_via text, -- 'email', 'whatsapp', 'manual'
  sent_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,

  -- Review resultante (si se completo)
  review_id uuid REFERENCES creator_reviews(id),

  -- Expiracion
  expires_at timestamptz DEFAULT (now() + interval '30 days'),

  -- Metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_requests_creator ON review_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON review_requests(token);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);

-- RLS para review_requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Creadores pueden ver y crear sus solicitudes
CREATE POLICY "Creators can manage their review requests" ON review_requests
  FOR ALL
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Cualquiera puede ver una solicitud por token (para completarla)
CREATE POLICY "Anyone can view request by token" ON review_requests
  FOR SELECT
  USING (true);

-- 6. Funcion para obtener estadisticas de resenas
CREATE OR REPLACE FUNCTION get_creator_review_stats(p_creator_id uuid)
RETURNS TABLE (
  total_reviews bigint,
  average_rating numeric,
  rating_distribution jsonb,
  verified_reviews bigint,
  recent_reviews bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_reviews,
    ROUND(AVG(cr.rating)::numeric, 2) as average_rating,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE cr.rating = 5),
      '4', COUNT(*) FILTER (WHERE cr.rating = 4),
      '3', COUNT(*) FILTER (WHERE cr.rating = 3),
      '2', COUNT(*) FILTER (WHERE cr.rating = 2),
      '1', COUNT(*) FILTER (WHERE cr.rating = 1)
    ) as rating_distribution,
    COUNT(*) FILTER (WHERE cr.is_verified = true)::bigint as verified_reviews,
    COUNT(*) FILTER (WHERE cr.created_at > now() - interval '30 days')::bigint as recent_reviews
  FROM creator_reviews cr
  WHERE cr.creator_id = p_creator_id
    AND cr.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funcion para validar y completar una solicitud de resena
CREATE OR REPLACE FUNCTION complete_review_request(
  p_token text,
  p_reviewer_name text,
  p_reviewer_email text,
  p_reviewer_company text,
  p_rating integer,
  p_content text,
  p_title text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_request review_requests%ROWTYPE;
  v_review_id uuid;
BEGIN
  -- Buscar solicitud valida
  SELECT * INTO v_request
  FROM review_requests
  WHERE token = p_token
    AND status IN ('pending', 'sent', 'opened')
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired review request';
  END IF;

  -- Crear la resena
  INSERT INTO creator_reviews (
    creator_id,
    reviewer_name,
    reviewer_email,
    reviewer_company,
    rating,
    title,
    content,
    verification_token,
    verification_method,
    is_verified,
    verified_at,
    status
  ) VALUES (
    v_request.creator_id,
    p_reviewer_name,
    p_reviewer_email,
    p_reviewer_company,
    p_rating,
    p_title,
    p_content,
    p_token,
    'request',
    true, -- Auto-verificado porque viene de una solicitud
    now(),
    'pending' -- Aun requiere moderacion
  )
  RETURNING id INTO v_review_id;

  -- Actualizar la solicitud
  UPDATE review_requests
  SET
    status = 'completed',
    completed_at = now(),
    review_id = v_review_id
  WHERE id = v_request.id;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Comentarios
COMMENT ON TABLE creator_reviews IS 'Resenas verificadas de clientes para creadores';
COMMENT ON TABLE review_requests IS 'Solicitudes de resena enviadas por creadores a clientes';
COMMENT ON FUNCTION get_creator_review_stats IS 'Obtiene estadisticas de resenas de un creador';
COMMENT ON FUNCTION complete_review_request IS 'Completa una solicitud de resena y crea la resena';
