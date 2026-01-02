-- Add new roles: trafficker and team_leader
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'trafficker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_leader';