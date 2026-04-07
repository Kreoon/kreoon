-- Parte 1: Agregar columnas a user_reputation_totals
-- Ejecutar primero, es seguro y rapido

ALTER TABLE public.user_reputation_totals
ADD COLUMN IF NOT EXISTS avg_engagement_rate DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_volume INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_deliveries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_deliveries_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_approvals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS issues_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER DEFAULT 0;
