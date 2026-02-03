-- Columnas para feedback loop en ai_usage_logs

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS user_feedback TEXT,
  ADD COLUMN IF NOT EXISTS feedback_tags TEXT[],
  ADD COLUMN IF NOT EXISTS regeneration_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edit_distance INTEGER,
  ADD COLUMN IF NOT EXISTS edited_content TEXT,
  ADD COLUMN IF NOT EXISTS was_used BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.ai_usage_logs.user_feedback IS 'Comentario libre del usuario sobre el resultado';
COMMENT ON COLUMN public.ai_usage_logs.feedback_tags IS 'Tags de feedback: too_long, off_topic, great_hooks, etc.';
COMMENT ON COLUMN public.ai_usage_logs.regeneration_count IS 'Veces que el usuario regeneró la respuesta';
COMMENT ON COLUMN public.ai_usage_logs.edit_distance IS 'Distancia de edición (Levenshtein o %) entre original y editado';
COMMENT ON COLUMN public.ai_usage_logs.edited_content IS 'Contenido final después de edición del usuario';
COMMENT ON COLUMN public.ai_usage_logs.was_used IS 'Si el output se usó realmente (publicó, asignó, etc.)';
