-- Add USD revenue goal columns to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS revenue_goal_usd numeric DEFAULT 0;

-- Rename existing revenue_goal to revenue_goal_cop for clarity (keep old column for backward compat)
COMMENT ON COLUMN public.goals.revenue_goal IS 'Revenue goal in COP (legacy, now use revenue_goal as COP)';