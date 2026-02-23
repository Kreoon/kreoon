-- Fix missing service_role GRANTs on marketplace tables
-- These tables only had GRANT TO authenticated, causing "permission denied"
-- errors when edge functions (using service_role) query them.

GRANT ALL ON public.creator_profiles TO service_role;
GRANT ALL ON public.portfolio_items TO service_role;
GRANT ALL ON public.marketplace_campaigns TO service_role;
GRANT ALL ON public.campaign_applications TO service_role;
GRANT ALL ON public.marketplace_projects TO service_role;
GRANT ALL ON public.project_deliveries TO service_role;
GRANT ALL ON public.creator_reviews TO service_role;
GRANT ALL ON public.saved_creators TO service_role;
GRANT ALL ON public.marketplace_media TO service_role;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
