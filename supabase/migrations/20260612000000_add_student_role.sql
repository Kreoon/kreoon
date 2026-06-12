-- Add 'student' to app_role enum
-- Students are users who only want to consume the educational module (Academia)
-- They have a global role 'student' and no organization membership.
-- They can later upgrade to creator or brand from their profile.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
