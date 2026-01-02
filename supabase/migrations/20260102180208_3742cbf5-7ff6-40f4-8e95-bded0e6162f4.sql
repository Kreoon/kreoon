-- Fix the view to use SECURITY INVOKER (default, but explicit is better)
DROP VIEW IF EXISTS public.marketing_available_content;

CREATE VIEW public.marketing_available_content 
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.title,
  c.description,
  c.video_url,
  c.thumbnail_url,
  c.status,
  c.content_type,
  c.approved_at,
  c.client_id,
  cl.name as client_name,
  cl.logo_url as client_logo,
  c.organization_id,
  c.creator_id,
  c.created_at
FROM public.content c
LEFT JOIN public.clients cl ON c.client_id = cl.id
WHERE c.status IN ('approved', 'paid', 'delivered')
  AND c.video_url IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.marketing_available_content TO authenticated;