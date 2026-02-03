-- Extender ai_usage_logs para monitoreo avanzado y vista agregada diaria

-- Columnas adicionales (la tabla ya existe con: id, organization_id, user_id, provider, model, module, action, tokens_input, tokens_output, estimated_cost, success, error_message, created_at)
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS edge_function TEXT,
  ADD COLUMN IF NOT EXISTS request_payload JSONB,
  ADD COLUMN IF NOT EXISTS variables_used TEXT[],
  ADD COLUMN IF NOT EXISTS response_status TEXT,
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
  ADD COLUMN IF NOT EXISTS was_regenerated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS was_edited BOOLEAN DEFAULT FALSE;

-- Backfill response_status desde success/error_message
UPDATE public.ai_usage_logs
SET response_status = CASE
  WHEN success THEN 'success'
  WHEN error_message IS NOT NULL AND error_message != '' THEN 'error'
  ELSE 'unknown'
END
WHERE response_status IS NULL;

COMMENT ON COLUMN public.ai_usage_logs.edge_function IS 'Nombre de la Edge Function invocada';
COMMENT ON COLUMN public.ai_usage_logs.request_payload IS 'Payload de la solicitud (sanitizado)';
COMMENT ON COLUMN public.ai_usage_logs.response_status IS 'success, error, timeout';
COMMENT ON COLUMN public.ai_usage_logs.response_time_ms IS 'Tiempo de respuesta en ms';
COMMENT ON COLUMN public.ai_usage_logs.user_rating IS 'Rating 1-5 del usuario';
COMMENT ON COLUMN public.ai_usage_logs.was_regenerated IS 'Si el usuario regeneró la respuesta';
COMMENT ON COLUMN public.ai_usage_logs.was_edited IS 'Si el usuario editó la respuesta';

-- Índice por módulo para dashboards
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_module_created
  ON public.ai_usage_logs(module, created_at DESC);

-- Vista agregada por día (usa columnas existentes + nuevas)
CREATE OR REPLACE VIEW public.ai_usage_daily AS
SELECT
  organization_id,
  module AS module_key,
  DATE(created_at) AS date,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE COALESCE(response_status, CASE WHEN success THEN 'success' ELSE 'error' END) = 'success') AS successful_calls,
  ROUND(AVG(response_time_ms)::numeric, 0)::INTEGER AS avg_response_time,
  COALESCE(SUM(tokens_input), 0)::BIGINT AS total_input_tokens,
  COALESCE(SUM(tokens_output), 0)::BIGINT AS total_output_tokens,
  COALESCE(SUM(estimated_cost), 0)::NUMERIC(12, 6) AS total_cost,
  ROUND(AVG(user_rating) FILTER (WHERE user_rating IS NOT NULL)::numeric, 2) AS avg_rating
FROM public.ai_usage_logs
GROUP BY organization_id, module, DATE(created_at);

COMMENT ON VIEW public.ai_usage_daily IS 'Uso de IA agregado por organización, módulo y día para dashboards';

GRANT SELECT ON public.ai_usage_daily TO authenticated;
GRANT SELECT ON public.ai_usage_daily TO service_role;
