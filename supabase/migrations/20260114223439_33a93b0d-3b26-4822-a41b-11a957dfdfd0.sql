-- Allow content_id to be nullable for manual adjustments in UP tables
ALTER TABLE public.up_creadores ALTER COLUMN content_id DROP NOT NULL;
ALTER TABLE public.up_editores ALTER COLUMN content_id DROP NOT NULL;