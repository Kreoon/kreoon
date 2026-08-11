-- CREATE TABLE de las 135 tablas del set
-- Proyecto Supabase: wjkbqcrxwsmvtxmqgiqc (schema public)
-- Respaldo pre-simplificacion generado 2026-08-11T21:38:58.530Z
-- Set: 135 tablas candidatas a eliminacion. SOLO DDL de respaldo, no ejecutar sin revisar.
-- Solo columnas (tipo, DEFAULT, NOT NULL). Constraints en 02, indices en 03.
-- achievements
CREATE TABLE public.achievements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT 'shield'::text NOT NULL,
  category text DEFAULT 'general'::text NOT NULL,
  points_required integer,
  condition_type text NOT NULL,
  condition_value integer DEFAULT 1 NOT NULL,
  rarity text DEFAULT 'common'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- activation_publications
CREATE TABLE public.activation_publications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  application_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  deliverable_id uuid,
  platform social_platform NOT NULL,
  publication_url text,
  publication_id character varying(100),
  caption text,
  hashtags_used text[],
  mentions_used text[],
  verification_status publication_verification_status DEFAULT 'pending_content'::publication_verification_status,
  verification_method verification_method,
  verified_at timestamp with time zone,
  verified_by uuid,
  verification_notes text,
  publication_screenshot_url text,
  insights_screenshot_url text,
  metrics_captured_at timestamp with time zone,
  followers_at_post integer,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  saves_count integer,
  views_count integer,
  reach_count integer,
  impressions_count integer,
  engagement_rate numeric(5,2),
  metrics_last_updated timestamp with time zone,
  must_stay_until timestamp with time zone,
  is_still_live boolean DEFAULT true,
  removed_detected_at timestamp with time zone,
  base_payment numeric(10,2),
  engagement_bonus numeric(10,2) DEFAULT 0,
  total_payment numeric(10,2),
  bonus_calculated_at timestamp with time zone,
  content_submitted_at timestamp with time zone,
  content_approved_at timestamp with time zone,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- booking_availability
CREATE TABLE public.booking_availability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  timezone text DEFAULT 'America/Bogota'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- booking_branding
CREATE TABLE public.booking_branding (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#8B5CF6'::text,
  accent_color text,
  background_color text DEFAULT '#FFFFFF'::text,
  welcome_text text,
  footer_text text,
  show_kreoon_branding boolean DEFAULT true,
  custom_css text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- booking_custom_questions
CREATE TABLE public.booking_custom_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_type_id uuid NOT NULL,
  question text NOT NULL,
  question_type text DEFAULT 'text'::text,
  options jsonb,
  required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- booking_event_types
CREATE TABLE public.booking_event_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30 NOT NULL,
  buffer_before_minutes integer DEFAULT 0,
  buffer_after_minutes integer DEFAULT 0,
  min_notice_hours integer DEFAULT 24,
  max_days_in_advance integer DEFAULT 60,
  max_bookings_per_day integer,
  location_type booking_location_type DEFAULT 'google_meet'::booking_location_type,
  location_details text,
  color text DEFAULT '#8B5CF6'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancellation_policy jsonb DEFAULT '{"policy_text": null, "allow_reschedule": true, "min_hours_before": 24, "reschedule_limit": 2, "allow_cancellation": true}'::jsonb,
  deleted_at timestamp with time zone,
  deleted_by uuid
);

-- booking_exceptions
CREATE TABLE public.booking_exceptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  exception_date date NOT NULL,
  is_blocked boolean DEFAULT true,
  start_time time without time zone,
  end_time time without time zone,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- booking_question_answers
CREATE TABLE public.booking_question_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  booking_id uuid NOT NULL,
  question_id uuid,
  question_text text NOT NULL,
  answer text,
  created_at timestamp with time zone DEFAULT now()
);

-- booking_reminder_logs
CREATE TABLE public.booking_reminder_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  booking_id uuid NOT NULL,
  reminder_setting_id uuid,
  reminder_type text NOT NULL,
  hours_before integer NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent'::text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- booking_reminder_settings
CREATE TABLE public.booking_reminder_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_type_id uuid NOT NULL,
  reminder_type text DEFAULT 'email'::text,
  hours_before integer NOT NULL,
  enabled boolean DEFAULT true,
  template_subject text,
  template_body text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- booking_webhook_logs
CREATE TABLE public.booking_webhook_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  webhook_id uuid NOT NULL,
  booking_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  response_time_ms integer,
  attempt_number integer DEFAULT 1,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- booking_webhooks
CREATE TABLE public.booking_webhooks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text,
  url text NOT NULL,
  events text[] DEFAULT ARRAY['booking.created'::text, 'booking.confirmed'::text, 'booking.cancelled'::text, 'booking.rescheduled'::text, 'booking.completed'::text],
  secret text,
  headers jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- bookings
CREATE TABLE public.bookings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_type_id uuid NOT NULL,
  host_user_id uuid NOT NULL,
  guest_user_id uuid,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  guest_notes text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  timezone text NOT NULL,
  location_type booking_location_type NOT NULL,
  location_details text,
  meeting_url text,
  status booking_status DEFAULT 'pending'::booking_status,
  confirmation_token uuid DEFAULT gen_random_uuid(),
  cancellation_token uuid DEFAULT gen_random_uuid(),
  reminder_24h_sent boolean DEFAULT false,
  reminder_1h_sent boolean DEFAULT false,
  host_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancelled_at timestamp with time zone,
  cancelled_by text,
  cancellation_reason text,
  reschedule_count integer DEFAULT 0,
  original_start_time timestamp with time zone,
  rescheduled_at timestamp with time zone,
  rescheduled_by text,
  cancel_token text,
  reschedule_token text
);

-- calendar_blocked_events
CREATE TABLE public.calendar_blocked_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  integration_id uuid NOT NULL,
  external_event_id text NOT NULL,
  title text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_all_day boolean DEFAULT false,
  last_synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- calendar_event_mappings
CREATE TABLE public.calendar_event_mappings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  booking_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  external_event_id text NOT NULL,
  external_calendar_id text NOT NULL,
  last_synced_at timestamp with time zone DEFAULT now(),
  sync_status text DEFAULT 'synced'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- calendar_integrations
CREATE TABLE public.calendar_integrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  calendar_id text,
  calendar_name text,
  sync_enabled boolean DEFAULT true,
  check_conflicts boolean DEFAULT true,
  create_events boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  sync_errors jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- campaign_applications
CREATE TABLE public.campaign_applications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  status application_status DEFAULT 'pending'::application_status,
  cover_letter text,
  proposed_price numeric(10,2),
  portfolio_links text[] DEFAULT '{}'::text[],
  availability_date date,
  bid_amount numeric(10,2),
  bid_message text,
  counter_offer_amount numeric(10,2),
  counter_offer_message text,
  counter_offer_response text,
  counter_offer_response_at timestamp with time zone,
  brand_notes text,
  brand_rating integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  includes_editing boolean DEFAULT true,
  estimated_delivery_days integer DEFAULT 7,
  agreed_price numeric(10,2),
  payment_status text DEFAULT 'unpaid'::text,
  escrow_hold_id uuid,
  delivered_at timestamp with time zone,
  completed_at timestamp with time zone,
  rating integer,
  organization_id uuid
);

-- campaign_case_studies
CREATE TABLE public.campaign_case_studies (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  title text NOT NULL,
  summary_html text,
  metrics jsonb DEFAULT '{}'::jsonb,
  creator_highlights jsonb DEFAULT '[]'::jsonb,
  gallery_urls text[] DEFAULT '{}'::text[],
  is_published boolean DEFAULT false NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  slug text,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- campaign_deliverables
CREATE TABLE public.campaign_deliverables (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  application_id uuid,
  title character varying(200),
  description text,
  file_url text NOT NULL,
  file_type text DEFAULT 'video'::text,
  thumbnail_url text,
  duration_seconds integer,
  file_size_mb numeric(10,2),
  revision_number integer DEFAULT 1,
  max_revisions integer DEFAULT 2,
  status text DEFAULT 'submitted'::text NOT NULL,
  feedback text,
  approved_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  organization_id uuid
);

-- campaign_invitations
CREATE TABLE public.campaign_invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  invited_profile_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  message text,
  status text DEFAULT 'pending'::text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  organization_id uuid
);

-- campaign_mappings
CREATE TABLE public.campaign_mappings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  connected_account_id uuid NOT NULL,
  generation_id uuid,
  platform text NOT NULL,
  platform_campaign_id text NOT NULL,
  platform_adset_id text,
  platform_ad_id text,
  campaign_name text NOT NULL,
  status text DEFAULT 'draft'::text,
  objective text,
  budget_amount numeric,
  budget_currency text DEFAULT 'USD'::text,
  last_synced_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  organization_id uuid
);

-- campaign_media
CREATE TABLE public.campaign_media (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid,
  organization_id uuid,
  media_type text DEFAULT 'image'::text NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  title text,
  description text,
  sort_order integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- campaign_metrics
CREATE TABLE public.campaign_metrics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_mapping_id uuid NOT NULL,
  date date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(12,4) DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric(12,4) DEFAULT 0,
  ctr numeric(8,6),
  cpc numeric(10,4),
  cpm numeric(10,4),
  roas numeric(10,4),
  platform_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  organization_id uuid
);

-- campaign_notifications
CREATE TABLE public.campaign_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid,
  user_id uuid,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false NOT NULL,
  sent_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  organization_id uuid
);

-- campaign_redemptions
CREATE TABLE public.campaign_redemptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  referral_code_used text,
  free_months_granted integer DEFAULT 0 NOT NULL,
  bonus_coins_granted integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  organization_id uuid
);

-- campaign_templates
CREATE TABLE public.campaign_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon_emoji text DEFAULT ''::text NOT NULL,
  category text NOT NULL,
  default_budget_min integer DEFAULT 100 NOT NULL,
  default_budget_max integer DEFAULT 2000 NOT NULL,
  default_currency text DEFAULT 'USD'::text NOT NULL,
  default_content_types jsonb DEFAULT '[]'::jsonb NOT NULL,
  default_platforms jsonb DEFAULT '[]'::jsonb NOT NULL,
  default_deliverables jsonb DEFAULT '[]'::jsonb NOT NULL,
  default_timeline_days integer DEFAULT 14 NOT NULL,
  suggested_creator_count integer DEFAULT 5 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- chronometer_pauses
CREATE TABLE public.chronometer_pauses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  content_id uuid NOT NULL,
  role character varying(50) NOT NULL,
  user_id uuid NOT NULL,
  paused_at timestamp with time zone DEFAULT now() NOT NULL,
  resumed_at timestamp with time zone,
  pause_reason text NOT NULL,
  pause_source text DEFAULT 'auto'::text,
  paused_hours numeric(8,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- company_followers
CREATE TABLE public.company_followers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  follower_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- content_likes
CREATE TABLE public.content_likes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  content_id uuid NOT NULL,
  viewer_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- creator_availability
CREATE TABLE public.creator_availability (
  user_id uuid NOT NULL,
  status character varying(20) DEFAULT 'available'::character varying,
  status_message text,
  vacation_start timestamp with time zone,
  vacation_end timestamp with time zone,
  vacation_auto_reply text,
  max_concurrent_projects integer DEFAULT 3,
  current_projects_count integer DEFAULT 0,
  accepting_waitlist boolean DEFAULT false,
  waitlist_count integer DEFAULT 0,
  estimated_availability_date timestamp with time zone,
  typical_response_hours integer DEFAULT 24,
  last_response_at timestamp with time zone,
  preferred_project_size character varying(20) DEFAULT 'any'::character varying,
  minimum_budget numeric(10,2),
  minimum_budget_currency character varying(3) DEFAULT 'USD'::character varying,
  preferred_industries text[] DEFAULT '{}'::text[],
  excluded_industries text[] DEFAULT '{}'::text[],
  excluded_industries_reason text,
  preferred_service_types text[] DEFAULT '{}'::text[],
  timezone character varying(50) DEFAULT 'America/Bogota'::character varying,
  preferred_meeting_hours jsonb DEFAULT '{"end": "18:00", "start": "09:00"}'::jsonb,
  languages text[] DEFAULT ARRAY['es'::text],
  auto_busy_enabled boolean DEFAULT true,
  auto_busy_threshold integer DEFAULT 3,
  auto_available_enabled boolean DEFAULT true,
  notify_on_proposal boolean DEFAULT true,
  notify_on_waitlist boolean DEFAULT true,
  status_changed_at timestamp with time zone DEFAULT now(),
  status_changed_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- creator_live_streams
CREATE TABLE public.creator_live_streams (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  creator_profile_id uuid,
  user_id uuid NOT NULL,
  organization_id uuid,
  cf_live_input_id text,
  cf_stream_key text,
  cf_whip_url text,
  cf_playback_url text,
  cf_playback_url_webrtc text,
  cf_thumbnail_url text,
  cf_recording_uid text,
  status live_stream_status DEFAULT 'idle'::live_stream_status NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  title text DEFAULT 'En Vivo'::text NOT NULL,
  description text,
  thumbnail_url text,
  category text,
  tags text[] DEFAULT '{}'::text[],
  is_shopping_enabled boolean DEFAULT false,
  max_duration_minutes integer DEFAULT 240,
  allow_comments boolean DEFAULT true,
  allow_reactions boolean DEFAULT true,
  is_unlisted boolean DEFAULT false,
  is_mature_content boolean DEFAULT false,
  current_viewers integer DEFAULT 0,
  peak_viewers integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_unique_viewers integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- favorites
CREATE TABLE public.favorites (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  generation_id uuid,
  variation_index integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- feed_reactions
CREATE TABLE public.feed_reactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- followers
CREATE TABLE public.followers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- global_badges
CREATE TABLE public.global_badges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT 'award'::text NOT NULL,
  category badge_category NOT NULL,
  subcategory text,
  condition_type text NOT NULL,
  condition_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  rarity badge_rarity DEFAULT 'common'::badge_rarity NOT NULL,
  ranking_points integer DEFAULT 0 NOT NULL,
  tier integer DEFAULT 1,
  parent_badge_id uuid,
  display_order integer DEFAULT 0,
  is_secret boolean DEFAULT false,
  is_seasonal boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- hashtags
CREATE TABLE public.hashtags (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tag text NOT NULL,
  use_count integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- kreadores_content_likes
CREATE TABLE public.kreadores_content_likes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  portfolio_item_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- link_previews
CREATE TABLE public.link_previews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  url text NOT NULL,
  title text,
  description text,
  image_url text,
  site_name text,
  fetched_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL
);

-- live_client_settings
CREATE TABLE public.live_client_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  can_create_events boolean DEFAULT false,
  can_view_events boolean DEFAULT true,
  can_connect_own_channels boolean DEFAULT false,
  max_hours_per_event numeric,
  max_events_per_month integer,
  internal_price_per_hour numeric,
  internal_currency text DEFAULT 'USD'::text,
  default_event_type text DEFAULT 'informative'::text,
  require_approval boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_event_creators
CREATE TABLE public.live_event_creators (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  role text DEFAULT 'host'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  can_see_stream_key boolean DEFAULT false,
  can_manage_products boolean DEFAULT false,
  participation_minutes integer DEFAULT 0
);

-- live_event_monitoring
CREATE TABLE public.live_event_monitoring (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  current_viewers integer DEFAULT 0,
  peak_viewers integer DEFAULT 0,
  total_unique_viewers integer DEFAULT 0,
  bitrate_kbps integer,
  fps numeric,
  resolution text,
  destination_statuses jsonb DEFAULT '[]'::jsonb,
  last_heartbeat_at timestamp with time zone,
  stream_started_at timestamp with time zone,
  stream_ended_at timestamp with time zone,
  total_duration_seconds integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_feature_flags
CREATE TABLE public.live_feature_flags (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  is_enabled boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  disabled_at timestamp with time zone,
  flag_type text NOT NULL,
  flag_id text NOT NULL,
  enabled_by uuid,
  enabled_at timestamp with time zone
);

-- live_hosting_hosts
CREATE TABLE public.live_hosting_hosts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  creator_profile_id uuid,
  status hosting_host_status DEFAULT 'applied'::hosting_host_status NOT NULL,
  proposed_rate_usd numeric(10,2),
  agreed_rate_usd numeric(10,2),
  commission_on_sales_pct numeric(5,2),
  counter_offer_usd numeric(10,2),
  counter_offer_message text,
  counter_offer_at timestamp with time zone,
  application_message text,
  portfolio_links text[] DEFAULT '{}'::text[],
  experience_description text,
  fit_score integer DEFAULT 0,
  shortlist_notes text,
  rejection_reason text,
  actual_performance_score numeric(3,2),
  host_feedback text,
  client_feedback text,
  payment_status text DEFAULT 'pending'::text,
  payment_released_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- live_hosting_requests
CREATE TABLE public.live_hosting_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  channel hosting_channel_type DEFAULT 'marketplace'::hosting_channel_type NOT NULL,
  organization_id uuid NOT NULL,
  client_id uuid,
  brand_id uuid,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  requirements jsonb DEFAULT '[]'::jsonb,
  preferred_niches text[] DEFAULT '{}'::text[],
  preferred_languages text[] DEFAULT '{es}'::text[],
  scheduled_date date NOT NULL,
  scheduled_time_start time without time zone NOT NULL,
  scheduled_time_end time without time zone,
  timezone text DEFAULT 'America/Bogota'::text,
  estimated_duration_minutes integer DEFAULT 60,
  live_type streaming_session_type DEFAULT 'live_shopping'::streaming_session_type,
  products_to_showcase jsonb DEFAULT '[]'::jsonb,
  target_audience text,
  content_guidelines text,
  budget_min_usd numeric(10,2),
  budget_max_usd numeric(10,2),
  fixed_rate_usd numeric(10,2),
  commission_on_sales_pct numeric(5,2),
  platform_commission_rate numeric(5,4) DEFAULT 0.20,
  org_markup_rate numeric(5,4) DEFAULT 0,
  org_markup_amount_usd numeric(10,2) DEFAULT 0,
  status hosting_request_status DEFAULT 'draft'::hosting_request_status NOT NULL,
  streaming_session_id uuid,
  escrow_hold_id uuid,
  campaign_id uuid,
  template_id uuid,
  actual_duration_minutes integer,
  actual_revenue_usd numeric(12,2),
  actual_orders integer,
  host_rating numeric(3,2),
  client_rating numeric(3,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- live_hosting_status_history
CREATE TABLE public.live_hosting_status_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid NOT NULL,
  host_id uuid,
  entity_type text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  change_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- live_hosting_templates
CREATE TABLE public.live_hosting_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  default_channel hosting_channel_type DEFAULT 'marketplace'::hosting_channel_type,
  default_requirements jsonb DEFAULT '[]'::jsonb,
  default_niches text[] DEFAULT '{}'::text[],
  default_duration_minutes integer DEFAULT 60,
  default_budget_min_usd numeric(10,2),
  default_budget_max_usd numeric(10,2),
  default_live_type streaming_session_type DEFAULT 'live_shopping'::streaming_session_type,
  default_content_guidelines text,
  times_used integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- live_hour_assignments
CREATE TABLE public.live_hour_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  client_id uuid NOT NULL,
  package_id uuid,
  hours_assigned numeric NOT NULL,
  assigned_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  wallet_id uuid,
  hours_remaining numeric,
  expires_at timestamp with time zone,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_hour_purchases
CREATE TABLE public.live_hour_purchases (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  hours_purchased numeric NOT NULL,
  price_paid numeric DEFAULT 0 NOT NULL,
  currency text DEFAULT 'USD'::text NOT NULL,
  purchased_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_hour_wallets
CREATE TABLE public.live_hour_wallets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  total_hours numeric DEFAULT 0 NOT NULL,
  used_hours numeric DEFAULT 0 NOT NULL,
  reserved_hours numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  available_hours numeric DEFAULT 0
);

-- live_org_oauth_tokens
CREATE TABLE public.live_org_oauth_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  provider text DEFAULT 'restream'::text NOT NULL,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  scopes text[],
  oauth_state text,
  connected_at timestamp with time zone,
  last_refresh_at timestamp with time zone,
  error_message text,
  status text DEFAULT 'disconnected'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_packages
CREATE TABLE public.live_packages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  hours_included numeric DEFAULT 1 NOT NULL,
  price numeric DEFAULT 0 NOT NULL,
  currency text DEFAULT 'COP'::text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  validity_days integer DEFAULT 30 NOT NULL
);

-- live_platform_config
CREATE TABLE public.live_platform_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  restream_client_id text,
  restream_client_secret_encrypted text,
  restream_scopes text[] DEFAULT ARRAY['profile.read'::text, 'channel.read'::text, 'channel.write'::text, 'stream.read'::text, 'chat.read'::text],
  default_price_per_hour numeric DEFAULT 50,
  default_currency text DEFAULT 'USD'::text,
  hour_packages jsonb DEFAULT '[{"name": "Starter", "hours": 10, "price": 450}, {"name": "Growth", "hours": 25, "price": 1000}, {"name": "Pro", "hours": 50, "price": 1750}, {"name": "Enterprise", "hours": 100, "price": 3000}]'::jsonb,
  chat_enabled boolean DEFAULT true,
  multi_creator_enabled boolean DEFAULT true,
  srt_streaming_enabled boolean DEFAULT false,
  live_shopping_enabled boolean DEFAULT true,
  max_hours_per_event numeric DEFAULT 8,
  max_simultaneous_events_per_org integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_stream_comments
CREATE TABLE public.live_stream_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  stream_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_highlighted boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  donation_amount_usd numeric(10,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- live_stream_history
CREATE TABLE public.live_stream_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid,
  organization_id uuid NOT NULL,
  session_id text,
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  duration_seconds integer,
  avg_bitrate_kbps integer,
  avg_fps numeric,
  disconnection_count integer DEFAULT 0,
  peak_viewers integer DEFAULT 0,
  avg_viewers numeric DEFAULT 0,
  total_views integer DEFAULT 0,
  hours_billed numeric DEFAULT 0,
  end_reason text,
  error_details text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_stream_products
CREATE TABLE public.live_stream_products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  stream_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  product_image_url text,
  product_price_usd numeric(10,2),
  product_url text,
  is_featured boolean DEFAULT false,
  featured_at timestamp with time zone,
  display_order integer DEFAULT 0,
  clicks integer DEFAULT 0,
  purchases integer DEFAULT 0,
  revenue_usd numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- live_stream_reactions
CREATE TABLE public.live_stream_reactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  stream_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  reaction_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- live_stream_viewers
CREATE TABLE public.live_stream_viewers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  stream_id uuid NOT NULL,
  user_id uuid,
  session_id text NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  last_ping_at timestamp with time zone DEFAULT now(),
  watch_duration_seconds integer DEFAULT 0,
  ip_country text,
  device_type text
);

-- live_streaming_channels
CREATE TABLE public.live_streaming_channels (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  oauth_token_id uuid,
  external_channel_id text,
  platform text NOT NULL,
  channel_name text,
  channel_url text,
  thumbnail_url text,
  is_enabled boolean DEFAULT true,
  is_connected boolean DEFAULT false,
  last_sync_at timestamp with time zone,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- live_usage_logs
CREATE TABLE public.live_usage_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  client_id uuid,
  event_id uuid,
  action text NOT NULL,
  hours_consumed numeric DEFAULT 0,
  details jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- managed_campaign_subscriptions
CREATE TABLE public.managed_campaign_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id text,
  user_email text NOT NULL,
  user_name text,
  plan text NOT NULL,
  currency text DEFAULT 'USD'::text NOT NULL,
  duration_months integer NOT NULL,
  total_paid numeric(14,2) NOT NULL,
  stripe_session_id text NOT NULL,
  stripe_payment_intent text,
  status text DEFAULT 'active'::text NOT NULL,
  starts_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- marketplace_campaigns
CREATE TABLE public.marketplace_campaigns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  brand_id uuid,
  created_by uuid NOT NULL,
  title text NOT NULL,
  slug text,
  description text NOT NULL,
  category text NOT NULL,
  campaign_type text DEFAULT 'paid'::text NOT NULL,
  budget_mode text DEFAULT 'per_video'::text,
  budget_per_video numeric(10,2),
  total_budget numeric(10,2),
  currency text DEFAULT 'USD'::text,
  platform_fee_pct numeric(5,2) DEFAULT 10,
  content_requirements jsonb DEFAULT '[]'::jsonb,
  creator_requirements jsonb DEFAULT '{}'::jsonb,
  max_creators integer DEFAULT 5,
  applications_count integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  status campaign_status DEFAULT 'draft'::campaign_status,
  deadline timestamp with time zone,
  tags text[] DEFAULT '{}'::text[],
  pricing_mode text DEFAULT 'fixed'::text,
  min_bid numeric(10,2),
  max_bid numeric(10,2),
  bid_deadline timestamp with time zone,
  bid_visibility text DEFAULT 'public'::text,
  desired_roles text[] DEFAULT '{}'::text[],
  exchange_product_name text,
  exchange_product_value numeric(10,2),
  exchange_product_description text,
  cover_image_url text,
  gallery_urls text[] DEFAULT '{}'::text[],
  is_featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  visibility text DEFAULT 'public'::text NOT NULL,
  organization_id uuid,
  brief text,
  brand_name_override character varying(200),
  brand_logo_override text,
  compensation_type character varying(30) DEFAULT 'paid'::character varying,
  compensation_description text,
  product_value numeric(10,2),
  application_deadline timestamp with time zone,
  content_deadline timestamp with time zone,
  campaign_start_date timestamp with time zone,
  campaign_end_date timestamp with time zone,
  max_applications integer,
  current_applications integer DEFAULT 0,
  auto_approve_applications boolean DEFAULT false,
  requires_portfolio boolean DEFAULT true,
  allow_counter_offers boolean DEFAULT false,
  nda_required boolean DEFAULT false,
  usage_rights text DEFAULT 'platform_only'::text,
  usage_rights_description text,
  is_urgent boolean DEFAULT false,
  published_at timestamp with time zone,
  content_guidelines text,
  reference_urls text[] DEFAULT '{}'::text[],
  is_brand_activation boolean DEFAULT false,
  activation_config jsonb DEFAULT '{}'::jsonb,
  campaign_purpose text DEFAULT 'content'::text NOT NULL,
  requires_agency_support boolean DEFAULT false,
  commission_rate numeric(5,2) DEFAULT 30,
  payment_status text DEFAULT 'unpaid'::text,
  escrow_hold_id uuid,
  total_paid numeric(12,2) DEFAULT 0,
  stripe_payment_intent_id text,
  activated_at timestamp with time zone,
  completed_at timestamp with time zone,
  template_id uuid,
  is_quick_campaign boolean DEFAULT false NOT NULL,
  smart_match_score jsonb,
  client_id uuid,
  collaboration_type text DEFAULT 'ugc_only'::text,
  content_management_type text DEFAULT 'kreoon'::text
);

-- mission_templates
CREATE TABLE public.mission_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  action_type text NOT NULL,
  target_count integer DEFAULT 1 NOT NULL,
  up_reward integer DEFAULT 5 NOT NULL,
  audience text DEFAULT 'all'::text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  weight integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- organization_streaming_config
CREATE TABLE public.organization_streaming_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  is_enabled boolean DEFAULT false NOT NULL,
  allowed_providers streaming_provider[] DEFAULT '{}'::streaming_provider[],
  can_transmit boolean DEFAULT false,
  can_resell boolean DEFAULT false,
  can_live_shopping boolean DEFAULT false,
  max_channels integer DEFAULT 3,
  max_concurrent_streams integer DEFAULT 1,
  monthly_minutes_limit integer,
  used_minutes_this_month integer DEFAULT 0,
  billing_day integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- point_transactions
CREATE TABLE public.point_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  content_id uuid,
  transaction_type point_transaction_type NOT NULL,
  points integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  secondary_points integer DEFAULT 0
);

-- portfolio_post_comments
CREATE TABLE public.portfolio_post_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- portfolio_post_likes
CREATE TABLE public.portfolio_post_likes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL,
  viewer_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- portfolio_posts
CREATE TABLE public.portfolio_posts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text DEFAULT 'image'::text NOT NULL,
  thumbnail_url text,
  caption text,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  is_pinned boolean DEFAULT false,
  pinned_at timestamp with time zone,
  comments_count integer DEFAULT 0,
  post_type text DEFAULT 'portfolio'::text,
  deleted_at timestamp with time zone,
  deleted_by uuid
);

-- portfolio_stories
CREATE TABLE public.portfolio_stories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text DEFAULT 'image'::text NOT NULL,
  views_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
  music_url text,
  music_name text,
  mute_video_audio boolean DEFAULT false,
  music_volume numeric DEFAULT 0.5,
  video_volume numeric DEFAULT 1.0
);

-- post_hashtags
CREATE TABLE public.post_hashtags (
  post_id uuid NOT NULL,
  hashtag_id uuid NOT NULL
);

-- post_metrics
CREATE TABLE public.post_metrics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  scheduled_post_id uuid NOT NULL,
  social_account_id uuid NOT NULL,
  platform_post_id text,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  clicks integer DEFAULT 0,
  video_views integer DEFAULT 0,
  watch_time_seconds integer DEFAULT 0,
  replies integer DEFAULT 0,
  retweets integer DEFAULT 0,
  quotes integer DEFAULT 0,
  profile_clicks integer DEFAULT 0,
  link_clicks integer DEFAULT 0,
  engagement_rate numeric(6,4) DEFAULT 0,
  platform_data jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  raw_response jsonb DEFAULT '{}'::jsonb
);

-- profile_views
CREATE TABLE public.profile_views (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_user_id uuid NOT NULL,
  viewer_id uuid,
  viewer_ip text,
  source text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- promotional_campaigns
CREATE TABLE public.promotional_campaigns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamp with time zone DEFAULT now() NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  referred_discount_percent integer DEFAULT 30 NOT NULL,
  referred_bonus_coins integer DEFAULT 25 NOT NULL,
  referrer_bonus_coins integer DEFAULT 50 NOT NULL,
  referral_extra_free_months integer DEFAULT 0 NOT NULL,
  max_redemptions integer,
  current_redemptions integer DEFAULT 0 NOT NULL,
  promo_badge_text text,
  promo_badge_color text DEFAULT '#9333ea'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- publication_verification_queue
CREATE TABLE public.publication_verification_queue (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  publication_id uuid NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  verification_type character varying(50) NOT NULL,
  status character varying(50) DEFAULT 'pending'::character varying,
  processed_at timestamp with time zone,
  result jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- reputation_configs
CREATE TABLE public.reputation_configs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  role text NOT NULL,
  event_key text NOT NULL,
  base_points integer DEFAULT 0 NOT NULL,
  day_range_min integer,
  day_range_max integer,
  label text NOT NULL,
  description text,
  is_bonus boolean DEFAULT false,
  is_penalty boolean DEFAULT false,
  is_active boolean DEFAULT true
);

-- reputation_events
CREATE TABLE public.reputation_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid,
  user_id uuid NOT NULL,
  role_key character varying(50),
  reference_type character varying(30),
  reference_id uuid,
  event_type character varying(50) NOT NULL,
  event_subtype character varying(50),
  base_points integer NOT NULL,
  multiplier numeric(3,2) DEFAULT 1.0,
  final_points integer DEFAULT (((base_points)::numeric * multiplier))::integer,
  calculation_breakdown jsonb,
  ai_decision_id uuid,
  season_id uuid,
  event_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- reputation_global
CREATE TABLE public.reputation_global (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  global_points integer DEFAULT 0 NOT NULL,
  global_level text DEFAULT 'pro'::text NOT NULL,
  avg_quality numeric(5,2) DEFAULT 0,
  avg_reliability numeric(5,2) DEFAULT 0,
  avg_velocity numeric(5,2) DEFAULT 0,
  composite_score numeric(5,2) DEFAULT 0,
  total_projects_completed integer DEFAULT 0,
  total_on_time_pct numeric(5,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  avg_review_rating numeric(3,2) DEFAULT 0,
  badges text[] DEFAULT '{}'::text[],
  is_visible boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  normalized_composite numeric(10,2) DEFAULT 0
);

-- reputation_seasons
CREATE TABLE public.reputation_seasons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name character varying(100) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  rewards_config jsonb DEFAULT '{"top_1": {"type": "fund_percentage", "value": 50}, "top_3": {"type": "fund_percentage", "value": 30}, "top_10": {"type": "badge", "value": "season_top_10"}}'::jsonb,
  compliance_fund_total numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- role_multipliers
CREATE TABLE public.role_multipliers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  multiplier_type text NOT NULL,
  multiplier_key text NOT NULL,
  multiplier_value numeric(4,2) DEFAULT 1.0 NOT NULL,
  role_key text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- role_points_config
CREATE TABLE public.role_points_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  role_key text NOT NULL,
  delivery_days integer DEFAULT 3 NOT NULL,
  early_delivery_points integer DEFAULT 70 NOT NULL,
  on_time_delivery_points integer DEFAULT 50 NOT NULL,
  late_delivery_points integer DEFAULT 0 NOT NULL,
  clean_approval_bonus integer DEFAULT 10 NOT NULL,
  issue_penalty integer DEFAULT 10 NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- role_weight_config
CREATE TABLE public.role_weight_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid,
  role_key text NOT NULL,
  label text NOT NULL,
  archetype effort_archetype DEFAULT 'medium_volume'::effort_archetype NOT NULL,
  base_weight numeric(8,4) DEFAULT 1.0 NOT NULL,
  complexity_multiplier numeric(6,3) DEFAULT 1.0 NOT NULL,
  expected_monthly_tasks integer DEFAULT 10,
  is_marketplace_role boolean DEFAULT false,
  category text,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- saved_collections
CREATE TABLE public.saved_collections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  cover_url text,
  is_private boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- saved_creators
CREATE TABLE public.saved_creators (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  notes text,
  list_name text DEFAULT 'Favoritos'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- saved_items
CREATE TABLE public.saved_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  collection_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- saved_searches
CREATE TABLE public.saved_searches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  search_type text DEFAULT 'creator'::text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_alert_enabled boolean DEFAULT false NOT NULL,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- season_goals
CREATE TABLE public.season_goals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  temporada text NOT NULL,
  nombre text NOT NULL,
  tipo text DEFAULT 'custom'::text NOT NULL,
  objetivo bigint DEFAULT 0 NOT NULL,
  actual bigint DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- season_reward_claims
CREATE TABLE public.season_reward_claims (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  season_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  final_rank integer NOT NULL,
  final_points integer NOT NULL,
  final_level text,
  role_key text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  claimed_at timestamp with time zone,
  delivered_at timestamp with time zone,
  delivered_by uuid,
  delivery_notes text,
  payment_reference text,
  payment_method text,
  claim_data jsonb DEFAULT '{}'::jsonb,
  notification_sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- season_rewards
CREATE TABLE public.season_rewards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  season_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  reward_type text NOT NULL,
  position_type text NOT NULL,
  position_min integer NOT NULL,
  position_max integer,
  role_key text,
  points_amount integer DEFAULT 0,
  badge_id uuid,
  monetary_amount numeric(10,2) DEFAULT 0,
  monetary_currency text DEFAULT 'USD'::text,
  custom_data jsonb DEFAULT '{}'::jsonb,
  display_name text NOT NULL,
  display_icon text DEFAULT 'trophy'::text,
  display_color text DEFAULT '#FFD700'::text,
  description text,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- social_notifications
CREATE TABLE public.social_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  actor_id uuid,
  notification_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  message text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- story_views
CREATE TABLE public.story_views (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  story_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now() NOT NULL
);

-- streaming_accounts
CREATE TABLE public.streaming_accounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_type streaming_owner_type DEFAULT 'platform'::streaming_owner_type NOT NULL,
  owner_id uuid,
  provider streaming_provider NOT NULL,
  platform_type streaming_platform NOT NULL,
  account_name text NOT NULL,
  account_external_id text,
  account_url text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  status text DEFAULT 'connected'::text NOT NULL,
  last_sync_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  connected_by uuid,
  client_id uuid
);

-- streaming_analytics_v2
CREATE TABLE public.streaming_analytics_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  concurrent_viewers integer DEFAULT 0,
  new_viewers integer DEFAULT 0,
  messages_count integer DEFAULT 0,
  reactions_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  product_clicks integer DEFAULT 0,
  add_to_cart integer DEFAULT 0,
  purchases integer DEFAULT 0,
  revenue_usd numeric(10,2) DEFAULT 0,
  platform_breakdown jsonb DEFAULT '{}'::jsonb,
  featured_product_id uuid
);

-- streaming_channels_v2
CREATE TABLE public.streaming_channels_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  platform streaming_platform_type NOT NULL,
  platform_display_name text NOT NULL,
  rtmp_url text,
  rtmp_key_encrypted text,
  backup_rtmp_url text,
  oauth_token_encrypted text,
  oauth_refresh_token_encrypted text,
  oauth_expires_at timestamp with time zone,
  platform_user_id text,
  platform_username text,
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false,
  max_resolution text DEFAULT '1080p'::text,
  max_bitrate integer DEFAULT 6000,
  custom_overlay_url text,
  channel_logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- streaming_chat_messages_v2
CREATE TABLE public.streaming_chat_messages_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  source_platform text DEFAULT 'kreoon'::text NOT NULL,
  source_message_id text,
  user_id uuid,
  author_name text NOT NULL,
  author_avatar_url text,
  author_platform_id text,
  is_moderator boolean DEFAULT false,
  is_host boolean DEFAULT false,
  message_type streaming_chat_message_type DEFAULT 'text'::streaming_chat_message_type,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_hidden boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  pinned_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- streaming_event_products
CREATE TABLE public.streaming_event_products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  product_description text,
  product_image_url text,
  price numeric(12,2),
  currency text DEFAULT 'COP'::text,
  cta_text text DEFAULT 'Comprar ahora'::text,
  cta_url text,
  display_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  clicks_count integer DEFAULT 0,
  conversions_count integer DEFAULT 0,
  revenue_generated numeric(12,2) DEFAULT 0,
  ai_suggested_cta text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- streaming_events
CREATE TABLE public.streaming_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_type streaming_owner_type DEFAULT 'platform'::streaming_owner_type NOT NULL,
  owner_id uuid,
  client_id uuid,
  title text NOT NULL,
  description text,
  event_type streaming_event_type DEFAULT 'informative'::streaming_event_type NOT NULL,
  status streaming_event_status DEFAULT 'draft'::streaming_event_status NOT NULL,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_minutes integer,
  target_channels uuid[] DEFAULT '{}'::uuid[],
  stream_key text,
  rtmp_url text,
  thumbnail_url text,
  is_shopping_enabled boolean DEFAULT false,
  ai_generated_title text,
  ai_generated_description text,
  ai_suggested_time timestamp with time zone,
  ai_analysis jsonb,
  peak_viewers integer DEFAULT 0,
  total_views integer DEFAULT 0,
  engagement_score numeric(5,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  organization_id uuid,
  estimated_duration_hours numeric DEFAULT 1,
  actual_duration_hours numeric,
  hours_reserved numeric DEFAULT 0,
  hours_consumed numeric DEFAULT 0,
  reservation_status text DEFAULT 'pending'::text,
  external_event_id text,
  playback_url text,
  recording_url text
);

-- streaming_guests_v2
CREATE TABLE public.streaming_guests_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  user_id uuid,
  guest_name text NOT NULL,
  guest_email text,
  guest_avatar_url text,
  status streaming_guest_status DEFAULT 'invited'::streaming_guest_status,
  can_share_screen boolean DEFAULT false,
  can_share_audio boolean DEFAULT true,
  can_share_video boolean DEFAULT true,
  can_manage_products boolean DEFAULT false,
  join_token text DEFAULT encode(gen_random_bytes(32), 'hex'::text),
  joined_at timestamp with time zone,
  left_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- streaming_logs
CREATE TABLE public.streaming_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_type streaming_owner_type DEFAULT 'platform'::streaming_owner_type NOT NULL,
  owner_id uuid,
  event_id uuid,
  account_id uuid,
  log_type text NOT NULL,
  message text NOT NULL,
  details jsonb,
  provider streaming_provider,
  platform_type streaming_platform,
  severity text DEFAULT 'info'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- streaming_overlays_v2
CREATE TABLE public.streaming_overlays_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  overlay_type streaming_overlay_type NOT NULL,
  content jsonb DEFAULT '{}'::jsonb NOT NULL,
  width integer,
  height integer,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  z_index integer DEFAULT 1,
  is_template boolean DEFAULT false,
  is_active boolean DEFAULT false,
  enter_animation text DEFAULT 'fadeIn'::text,
  exit_animation text DEFAULT 'fadeOut'::text,
  auto_hide_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- streaming_products_v2
CREATE TABLE public.streaming_products_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  product_id uuid,
  external_product_url text,
  title text NOT NULL,
  description text,
  image_url text,
  original_price_usd numeric(10,2) NOT NULL,
  live_price_usd numeric(10,2),
  discount_percentage integer,
  total_stock integer,
  reserved_stock integer DEFAULT 0,
  sold_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  featured_at timestamp with time zone,
  display_order integer DEFAULT 0,
  flash_offer_active boolean DEFAULT false,
  flash_offer_price_usd numeric(10,2),
  flash_offer_ends_at timestamp with time zone,
  flash_offer_stock integer,
  cta_text text DEFAULT 'Comprar ahora'::text,
  cta_url text,
  clicks integer DEFAULT 0,
  add_to_cart_count integer DEFAULT 0,
  purchase_count integer DEFAULT 0,
  revenue_usd numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- streaming_providers_config
CREATE TABLE public.streaming_providers_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_type streaming_owner_type DEFAULT 'platform'::streaming_owner_type NOT NULL,
  owner_id uuid,
  provider streaming_provider NOT NULL,
  is_enabled boolean DEFAULT false NOT NULL,
  mode text DEFAULT 'test'::text NOT NULL,
  api_key_encrypted text,
  client_id text,
  client_secret_encrypted text,
  webhook_url text,
  extra_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid
);

-- streaming_sales
CREATE TABLE public.streaming_sales (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_type streaming_owner_type DEFAULT 'platform'::streaming_owner_type NOT NULL,
  owner_id uuid,
  client_id uuid,
  event_id uuid,
  sale_type text DEFAULT 'live_service'::text NOT NULL,
  status streaming_sale_status DEFAULT 'quoted'::streaming_sale_status NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'COP'::text,
  description text,
  notes text,
  quoted_at timestamp with time zone DEFAULT now(),
  sold_at timestamp with time zone,
  executed_at timestamp with time zone,
  paid_at timestamp with time zone,
  payment_reference text,
  invoice_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid
);

-- streaming_session_channels_v2
CREATE TABLE public.streaming_session_channels_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  channel_id uuid NOT NULL,
  status streaming_channel_status DEFAULT 'pending'::streaming_channel_status,
  error_message text,
  viewers_current integer DEFAULT 0,
  viewers_peak integer DEFAULT 0,
  messages_count integer DEFAULT 0,
  platform_stream_id text,
  platform_broadcast_url text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone
);

-- streaming_sessions_v2
CREATE TABLE public.streaming_sessions_v2 (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  session_type streaming_session_type DEFAULT 'standard'::streaming_session_type NOT NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  status streaming_session_status DEFAULT 'draft'::streaming_session_status NOT NULL,
  stream_settings jsonb DEFAULT '{"fps": 30, "bitrate": 6000, "encoder": "browser", "resolution": "1080p", "latency_mode": "normal", "audio_bitrate": 128}'::jsonb,
  obs_connected boolean DEFAULT false,
  obs_websocket_url text,
  obs_current_scene text,
  peak_viewers integer DEFAULT 0,
  total_viewers integer DEFAULT 0,
  avg_watch_time_seconds integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  total_reactions integer DEFAULT 0,
  is_shopping_enabled boolean DEFAULT false,
  total_revenue_usd numeric(12,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  conversion_rate numeric(5,4) DEFAULT 0,
  ai_script_id uuid,
  ai_suggestions jsonb DEFAULT '[]'::jsonb,
  recording_url text,
  recording_bunny_id text,
  recording_duration_seconds integer,
  host_user_id uuid NOT NULL,
  client_id uuid,
  product_id uuid,
  campaign_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- suggested_profiles_cache
CREATE TABLE public.suggested_profiles_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  suggested_user_id uuid NOT NULL,
  score numeric DEFAULT 0,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '1 day'::interval) NOT NULL
);

-- unified_reputation_config
CREATE TABLE public.unified_reputation_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  config_version integer DEFAULT 1,
  levels jsonb DEFAULT '[{"name": "Novato", "perks": [], "min_score": 0, "badge_color": "#94a3b8"}, {"name": "Pro", "perks": ["priority_matching"], "min_score": 500, "badge_color": "#60a5fa"}, {"name": "Elite", "perks": ["featured_profile"], "min_score": 2000, "badge_color": "#a78bfa"}, {"name": "Master", "perks": ["commission_bonus"], "min_score": 5000, "badge_color": "#fbbf24"}, {"name": "Legend", "perks": ["legend_fund_access"], "min_score": 15000, "badge_color": "#f472b6"}]'::jsonb,
  speed_multiplier numeric(3,2) DEFAULT 1.0,
  quality_multiplier numeric(3,2) DEFAULT 1.0,
  volume_multiplier numeric(3,2) DEFAULT 1.0,
  compliance_fund_enabled boolean DEFAULT true,
  compliance_fund_penalty_rate numeric(3,2) DEFAULT 0.10,
  season_duration_days integer DEFAULT 30,
  current_season_start timestamp with time zone,
  ai_auto_adjust boolean DEFAULT false,
  ai_fraud_detection boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  streak_multiplier_7d numeric DEFAULT 1.10 NOT NULL,
  streak_multiplier_30d numeric DEFAULT 1.25 NOT NULL
);

-- up_ai_config
CREATE TABLE public.up_ai_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  quality_score_enabled boolean DEFAULT true,
  event_detection_enabled boolean DEFAULT true,
  anti_fraud_enabled boolean DEFAULT true,
  quest_generation_enabled boolean DEFAULT true,
  rule_recommendations_enabled boolean DEFAULT true,
  min_quality_for_approval integer DEFAULT 60,
  auto_approve_quality_threshold integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  arbiter_wizard_enabled boolean DEFAULT false,
  arbiter_judge_enabled boolean DEFAULT false,
  arbiter_auditor_enabled boolean DEFAULT false,
  auto_pause_review_hours integer DEFAULT 24,
  client_trust_enabled boolean DEFAULT false
);

-- up_arbiter_log
CREATE TABLE public.up_arbiter_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  action_type text NOT NULL,
  actor text DEFAULT 'arbiter'::text NOT NULL,
  summary text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'applied'::text,
  created_at timestamp with time zone DEFAULT now()
);

-- up_chronometer_pauses
CREATE TABLE public.up_chronometer_pauses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  content_id uuid NOT NULL,
  role text NOT NULL,
  user_id uuid NOT NULL,
  paused_at timestamp with time zone DEFAULT now() NOT NULL,
  resumed_at timestamp with time zone,
  pause_reason text NOT NULL,
  pause_source text DEFAULT 'auto'::text,
  paused_hours numeric(8,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- up_client_trust_scores
CREATE TABLE public.up_client_trust_scores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  client_id uuid NOT NULL,
  total_reviews integer DEFAULT 0,
  avg_review_hours numeric(8,2) DEFAULT 0,
  rejection_rate numeric(5,2) DEFAULT 0,
  revision_rounds_avg numeric(5,2) DEFAULT 0,
  brief_clarity_score numeric(5,2) DEFAULT 0,
  trust_level text DEFAULT 'neutral'::text,
  last_calculated_at timestamp with time zone DEFAULT now()
);

-- up_creadores
CREATE TABLE public.up_creadores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  content_id uuid,
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  description text,
  recording_started_at timestamp with time zone,
  recorded_at timestamp with time zone,
  issue_at timestamp with time zone,
  approved_at timestamp with time zone,
  days_to_deliver integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  related_issue_id uuid,
  is_recovered boolean DEFAULT false NOT NULL
);

-- up_creadores_totals
CREATE TABLE public.up_creadores_totals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  season_id uuid,
  total_points integer DEFAULT 0 NOT NULL,
  total_deliveries integer DEFAULT 0 NOT NULL,
  on_time_deliveries integer DEFAULT 0 NOT NULL,
  late_deliveries integer DEFAULT 0 NOT NULL,
  total_issues integer DEFAULT 0 NOT NULL,
  clean_approvals integer DEFAULT 0 NOT NULL,
  reassignments integer DEFAULT 0 NOT NULL,
  current_level text DEFAULT 'bronze'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- up_currency_conversions
CREATE TABLE public.up_currency_conversions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  from_amount integer NOT NULL,
  to_amount integer NOT NULL,
  conversion_rate numeric(10,4) DEFAULT 1.0 NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- up_editores
CREATE TABLE public.up_editores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  content_id uuid,
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  description text,
  editing_started_at timestamp with time zone,
  delivered_at timestamp with time zone,
  issue_at timestamp with time zone,
  approved_at timestamp with time zone,
  days_to_deliver integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  related_issue_id uuid,
  is_recovered boolean DEFAULT false NOT NULL
);

-- up_editores_totals
CREATE TABLE public.up_editores_totals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  season_id uuid,
  total_points integer DEFAULT 0 NOT NULL,
  total_deliveries integer DEFAULT 0 NOT NULL,
  on_time_deliveries integer DEFAULT 0 NOT NULL,
  late_deliveries integer DEFAULT 0 NOT NULL,
  total_issues integer DEFAULT 0 NOT NULL,
  clean_approvals integer DEFAULT 0 NOT NULL,
  reassignments integer DEFAULT 0 NOT NULL,
  current_level text DEFAULT 'bronze'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- up_event_types
CREATE TABLE public.up_event_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  event_key text NOT NULL,
  label text NOT NULL,
  description text,
  icon text DEFAULT 'zap'::text,
  color text DEFAULT '#FFD700'::text,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- up_events
CREATE TABLE public.up_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content_id uuid,
  event_type_key text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  points_awarded integer DEFAULT 0,
  rule_id uuid,
  ai_inferred boolean DEFAULT false,
  ai_confidence numeric(3,2),
  ai_evidence jsonb,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  secondary_points_awarded integer DEFAULT 0
);

-- up_fraud_alerts
CREATE TABLE public.up_fraud_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid,
  severity text NOT NULL,
  alert_type text NOT NULL,
  reason text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- up_permissions
CREATE TABLE public.up_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  role text NOT NULL,
  can_view_own_up boolean DEFAULT true,
  can_view_ranking boolean DEFAULT true,
  can_view_others_up boolean DEFAULT false,
  can_create_rules boolean DEFAULT false,
  can_edit_rules boolean DEFAULT false,
  can_toggle_ai boolean DEFAULT false,
  can_approve_ai_events boolean DEFAULT false,
  can_manual_adjust boolean DEFAULT false,
  can_view_fraud_alerts boolean DEFAULT false,
  can_view_quality_scores boolean DEFAULT true,
  can_manage_quests boolean DEFAULT false,
  can_manage_seasons boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- up_quality_scores
CREATE TABLE public.up_quality_scores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  content_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  score integer NOT NULL,
  breakdown jsonb DEFAULT '{}'::jsonb,
  reasons text[] DEFAULT '{}'::text[],
  suggestions text[] DEFAULT '{}'::text[],
  ai_model text,
  evaluated_at timestamp with time zone DEFAULT now()
);

-- up_quest_progress
CREATE TABLE public.up_quest_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quest_id uuid NOT NULL,
  user_id uuid NOT NULL,
  current_value integer DEFAULT 0,
  completed_at timestamp with time zone,
  reward_claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- up_quests
CREATE TABLE public.up_quests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  goal_metric text NOT NULL,
  goal_value integer DEFAULT 1 NOT NULL,
  reward_points integer DEFAULT 0 NOT NULL,
  reward_badge_id uuid,
  applies_to_roles text[] DEFAULT '{}'::text[],
  starts_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  is_ai_generated boolean DEFAULT false,
  ai_reasoning text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  reward_secondary_points integer DEFAULT 0
);

-- up_rules
CREATE TABLE public.up_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  event_type_key text NOT NULL,
  conditions jsonb DEFAULT '[]'::jsonb,
  points integer DEFAULT 0 NOT NULL,
  is_bonus boolean DEFAULT false,
  is_penalty boolean DEFAULT false,
  applies_to_roles text[] DEFAULT '{}'::text[],
  max_per_day integer,
  max_per_week integer,
  max_per_content integer DEFAULT 1,
  cooldown_minutes integer,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  secondary_points integer DEFAULT 0
);

-- up_season_snapshots
CREATE TABLE public.up_season_snapshots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  season_id uuid NOT NULL,
  user_id uuid NOT NULL,
  final_points integer DEFAULT 0,
  final_level text,
  final_rank integer,
  total_events integer DEFAULT 0,
  achievements_unlocked integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  user_type text DEFAULT 'creator'::text,
  organization_id uuid
);

-- up_seasons
CREATE TABLE public.up_seasons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  mode up_season_mode DEFAULT 'permanent'::up_season_mode NOT NULL,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  ends_at timestamp with time zone,
  reset_points boolean DEFAULT false,
  reset_streaks boolean DEFAULT false,
  reset_ranking boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- up_settings
CREATE TABLE public.up_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  value jsonb DEFAULT '{}'::jsonb NOT NULL,
  label text NOT NULL,
  description text,
  category text DEFAULT 'general'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid,
  secondary_currency_enabled boolean DEFAULT false,
  secondary_currency_name text DEFAULT 'XP'::text,
  secondary_currency_icon text DEFAULT '⭐'::text
);

-- up_user_scores
CREATE TABLE public.up_user_scores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role text DEFAULT 'other'::text NOT NULL,
  season_id uuid,
  total_points integer DEFAULT 0 NOT NULL,
  current_level text DEFAULT 'bronze'::text NOT NULL,
  total_deliveries integer DEFAULT 0 NOT NULL,
  on_time_deliveries integer DEFAULT 0 NOT NULL,
  late_deliveries integer DEFAULT 0 NOT NULL,
  total_issues integer DEFAULT 0 NOT NULL,
  clean_approvals integer DEFAULT 0 NOT NULL,
  reassignments integer DEFAULT 0 NOT NULL,
  avg_rating numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  quality_score numeric(5,2) DEFAULT 0,
  reliability_score numeric(5,2) DEFAULT 0,
  velocity_score numeric(5,2) DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  normalized_score numeric(10,2) DEFAULT 0,
  role_metrics jsonb DEFAULT '{}'::jsonb,
  marketplace_role text
);

-- user_achievements
CREATE TABLE public.user_achievements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_daily_missions
CREATE TABLE public.user_daily_missions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  mission_template_id uuid NOT NULL,
  assigned_date date NOT NULL,
  progress integer DEFAULT 0 NOT NULL,
  completed_at timestamp with time zone,
  reward_claimed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_feed_events
CREATE TABLE public.user_feed_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  viewer_id text,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  event_type text NOT NULL,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_global_badges
CREATE TABLE public.user_global_badges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  current_progress integer DEFAULT 0,
  progress_max integer DEFAULT 1,
  is_completed boolean DEFAULT false,
  unlocked_at timestamp with time zone,
  progress_updated_at timestamp with time zone DEFAULT now(),
  unlock_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- user_global_stats
CREATE TABLE public.user_global_stats (
  user_id uuid NOT NULL,
  profile_created_at timestamp with time zone DEFAULT now() NOT NULL,
  first_content_at timestamp with time zone,
  last_active_at timestamp with time zone DEFAULT now(),
  profile_completeness integer DEFAULT 0,
  has_avatar boolean DEFAULT false,
  has_banner boolean DEFAULT false,
  has_bio boolean DEFAULT false,
  bio_length integer DEFAULT 0,
  social_networks_count integer DEFAULT 0,
  portfolio_posts_count integer DEFAULT 0,
  portfolio_videos_count integer DEFAULT 0,
  portfolio_images_count integer DEFAULT 0,
  portfolio_hd_count integer DEFAULT 0,
  portfolio_views_total bigint DEFAULT 0,
  portfolio_likes_total bigint DEFAULT 0,
  featured_works_count integer DEFAULT 0,
  total_projects_completed integer DEFAULT 0,
  total_clients_served integer DEFAULT 0,
  unique_clients_count integer DEFAULT 0,
  repeat_clients_count integer DEFAULT 0,
  total_revenue_usd numeric(12,2) DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0,
  ratings_count integer DEFAULT 0,
  five_star_count integer DEFAULT 0,
  revisions_count integer DEFAULT 0,
  no_revision_streak integer DEFAULT 0,
  early_deliveries_count integer DEFAULT 0,
  on_time_deliveries_count integer DEFAULT 0,
  late_deliveries_count integer DEFAULT 0,
  delivery_streak integer DEFAULT 0,
  avg_delivery_hours numeric(10,2) DEFAULT 0,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  referrals_count integer DEFAULT 0,
  successful_referrals integer DEFAULT 0,
  collaborations_count integer DEFAULT 0,
  comments_given integer DEFAULT 0,
  likes_given integer DEFAULT 0,
  days_since_signup integer DEFAULT 0,
  consecutive_active_days integer DEFAULT 0,
  total_active_months integer DEFAULT 0,
  seasons_participated integer DEFAULT 0,
  total_badge_points integer DEFAULT 0,
  badges_completed_count integer DEFAULT 0,
  global_rank integer,
  percentile numeric(5,2) DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- user_interest_profile
CREATE TABLE public.user_interest_profile (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  viewer_id text,
  top_tags jsonb DEFAULT '[]'::jsonb,
  top_categories jsonb DEFAULT '[]'::jsonb,
  top_creators jsonb DEFAULT '[]'::jsonb,
  engagement_stats jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_points
CREATE TABLE public.user_points (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  total_points integer DEFAULT 0 NOT NULL,
  current_level text DEFAULT 'bronze'::text NOT NULL,
  consecutive_on_time integer DEFAULT 0 NOT NULL,
  total_completions integer DEFAULT 0 NOT NULL,
  total_on_time integer DEFAULT 0 NOT NULL,
  total_late integer DEFAULT 0 NOT NULL,
  total_corrections integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  secondary_points integer DEFAULT 0
);

-- user_reputation_totals
CREATE TABLE public.user_reputation_totals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_key character varying(50) NOT NULL,
  lifetime_points integer DEFAULT 0,
  lifetime_tasks integer DEFAULT 0,
  season_points integer DEFAULT 0,
  season_tasks integer DEFAULT 0,
  rolling_30d_points integer DEFAULT 0,
  rolling_30d_tasks integer DEFAULT 0,
  rolling_30d_average numeric(5,2) DEFAULT 0,
  current_level character varying(50) DEFAULT 'Novato'::character varying,
  current_level_progress numeric(5,2) DEFAULT 0,
  on_time_rate numeric(5,4) DEFAULT 0,
  approval_rate numeric(5,4) DEFAULT 0,
  revision_rate numeric(5,4) DEFAULT 0,
  current_streak_days integer DEFAULT 0,
  best_streak_days integer DEFAULT 0,
  last_activity_date date,
  normalized_score numeric(10,2) DEFAULT 0,
  last_calculated_at timestamp with time zone DEFAULT now(),
  avg_engagement_rate numeric(5,4) DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0,
  weekly_volume integer DEFAULT 0,
  early_deliveries_count integer DEFAULT 0,
  late_deliveries_count integer DEFAULT 0,
  clean_approvals_count integer DEFAULT 0,
  issues_count integer DEFAULT 0,
  ai_quality_score integer DEFAULT 0
);

-- user_streaks
CREATE TABLE public.user_streaks (
  user_id uuid NOT NULL,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_activity_date date,
  streak_started_at date,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
