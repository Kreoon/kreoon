-- Add can_view_roles column to board_status_rules for visibility control per role
ALTER TABLE public.board_status_rules
ADD COLUMN IF NOT EXISTS can_view_roles text[] DEFAULT '{}'::text[];

-- Update existing rules to allow all roles to view by default
UPDATE public.board_status_rules 
SET can_view_roles = ARRAY['admin', 'strategist', 'creator', 'editor', 'trafficker', 'designer', 'client']
WHERE can_view_roles IS NULL OR can_view_roles = '{}';