-- Preguntas personalizadas por tipo de evento
-- Permite a los usuarios configurar preguntas que los invitados deben responder al reservar

-- Tabla de preguntas personalizadas
CREATE TABLE IF NOT EXISTS booking_custom_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID REFERENCES booking_event_types(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'textarea', 'select', 'checkbox', 'radio')),
  options JSONB, -- Para select/radio: ["opción1", "opción2"]
  required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de respuestas a las preguntas
CREATE TABLE IF NOT EXISTS booking_question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES booking_custom_questions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL, -- Snapshot del texto de la pregunta
  answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_booking_questions_event_type ON booking_custom_questions(event_type_id);
CREATE INDEX IF NOT EXISTS idx_booking_questions_sort ON booking_custom_questions(event_type_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_booking_answers_booking ON booking_question_answers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_answers_question ON booking_question_answers(question_id);

-- RLS Policies
ALTER TABLE booking_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_question_answers ENABLE ROW LEVEL SECURITY;

-- Propietarios de event_types pueden gestionar preguntas
CREATE POLICY "Owners can manage custom questions"
  ON booking_custom_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_event_types et
      WHERE et.id = booking_custom_questions.event_type_id
      AND et.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_event_types et
      WHERE et.id = booking_custom_questions.event_type_id
      AND et.user_id = auth.uid()
    )
  );

-- Cualquiera puede ver preguntas de eventos activos (para el formulario público)
CREATE POLICY "Anyone can view questions of active events"
  ON booking_custom_questions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_event_types et
      WHERE et.id = booking_custom_questions.event_type_id
      AND et.is_active = true
    )
  );

-- Propietarios de booking pueden ver respuestas
CREATE POLICY "Hosts can view booking answers"
  ON booking_question_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_question_answers.booking_id
      AND b.host_user_id = auth.uid()
    )
  );

-- Se pueden crear respuestas al hacer una reserva (anon o authenticated)
CREATE POLICY "Anyone can create answers when booking"
  ON booking_question_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Grants
GRANT ALL ON booking_custom_questions TO authenticated;
GRANT SELECT ON booking_custom_questions TO anon;
GRANT ALL ON booking_question_answers TO authenticated;
GRANT INSERT, SELECT ON booking_question_answers TO anon;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_booking_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_questions_updated_at
  BEFORE UPDATE ON booking_custom_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_questions_updated_at();

COMMENT ON TABLE booking_custom_questions IS 'Preguntas personalizadas que el host puede agregar a cada tipo de evento';
COMMENT ON TABLE booking_question_answers IS 'Respuestas de los invitados a las preguntas personalizadas';
