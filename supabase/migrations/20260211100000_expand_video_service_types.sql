-- Expand service_type CHECK constraint to include new video format types
-- New types: video_testimonial, video_unboxing, video_review, video_tutorial,
-- video_before_after, video_problem_solution, video_ad, video_vsl,
-- video_product_demo, video_reel_short, video_stories, video_behind_scenes

-- Drop old constraint
ALTER TABLE public.creator_services DROP CONSTRAINT IF EXISTS creator_services_service_type_check;

-- Add expanded constraint with all video format types
ALTER TABLE public.creator_services ADD CONSTRAINT creator_services_service_type_check
  CHECK (service_type IN (
    -- Content Creation — Videos UGC
    'ugc_video', 'video_testimonial', 'video_unboxing', 'video_review',
    'video_tutorial', 'video_before_after', 'video_problem_solution',
    -- Content Creation — Videos Comerciales
    'video_ad', 'video_vsl', 'video_product_demo',
    -- Content Creation — Videos por Formato
    'video_reel_short', 'video_stories',
    -- Content Creation — Videos Tendencia
    'video_behind_scenes',
    -- Content Creation — Otros
    'ugc_photo', 'ugc_carousel', 'photography', 'live_streaming',
    'voice_over', 'script_writing', 'podcast_production', 'influencer_post', 'graphic_design',
    -- Post-Production
    'video_editing', 'motion_graphics', 'thumbnail_design', 'sound_design',
    'color_grading', 'animation_2d3d', 'creative_direction', 'audiovisual_production',
    -- Strategy & Marketing
    'social_management', 'content_strategy', 'community_management', 'digital_strategy',
    'paid_advertising', 'seo_sem', 'email_marketing', 'growth_hacking',
    'crm_management', 'conversion_optimization',
    -- Technology
    'web_development', 'app_development', 'ai_automation',
    -- Education
    'online_courses', 'workshops',
    -- General
    'consulting', 'custom'
  ));
