-- Constraints (PK, UNIQUE, CHECK, FK) de las 135 tablas del set
-- Proyecto Supabase: wjkbqcrxwsmvtxmqgiqc (schema public)
-- Respaldo pre-simplificacion generado 2026-08-11T21:38:58.955Z
-- Set: 135 tablas candidatas a eliminacion. SOLO DDL de respaldo, no ejecutar sin revisar.
-- Orden dentro de cada tabla: PK, UNIQUE, CHECK, FK.
-- achievements [p]
ALTER TABLE public.achievements ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);
-- achievements [u]
ALTER TABLE public.achievements ADD CONSTRAINT achievements_key_key UNIQUE (key);
-- activation_publications [p]
ALTER TABLE public.activation_publications ADD CONSTRAINT activation_publications_pkey PRIMARY KEY (id);
-- activation_publications [f]
ALTER TABLE public.activation_publications ADD CONSTRAINT activation_publications_application_id_fkey FOREIGN KEY (application_id) REFERENCES campaign_applications(id) ON DELETE CASCADE;
-- activation_publications [f]
ALTER TABLE public.activation_publications ADD CONSTRAINT activation_publications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- activation_publications [f]
ALTER TABLE public.activation_publications ADD CONSTRAINT activation_publications_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE;
-- activation_publications [f]
ALTER TABLE public.activation_publications ADD CONSTRAINT activation_publications_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES campaign_deliverables(id) ON DELETE SET NULL;
-- activation_publications [f]
ALTER TABLE public.activation_publications ADD CONSTRAINT activation_publications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
-- booking_availability [p]
ALTER TABLE public.booking_availability ADD CONSTRAINT booking_availability_pkey PRIMARY KEY (id);
-- booking_availability [c]
ALTER TABLE public.booking_availability ADD CONSTRAINT booking_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
-- booking_availability [c]
ALTER TABLE public.booking_availability ADD CONSTRAINT booking_availability_time_range CHECK ((start_time < end_time));
-- booking_availability [f]
ALTER TABLE public.booking_availability ADD CONSTRAINT booking_availability_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- booking_branding [p]
ALTER TABLE public.booking_branding ADD CONSTRAINT booking_branding_pkey PRIMARY KEY (id);
-- booking_branding [u]
ALTER TABLE public.booking_branding ADD CONSTRAINT booking_branding_user_id_key UNIQUE (user_id);
-- booking_branding [f]
ALTER TABLE public.booking_branding ADD CONSTRAINT booking_branding_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- booking_custom_questions [p]
ALTER TABLE public.booking_custom_questions ADD CONSTRAINT booking_custom_questions_pkey PRIMARY KEY (id);
-- booking_custom_questions [c]
ALTER TABLE public.booking_custom_questions ADD CONSTRAINT booking_custom_questions_question_type_check CHECK ((question_type = ANY (ARRAY['text'::text, 'textarea'::text, 'select'::text, 'checkbox'::text, 'radio'::text])));
-- booking_custom_questions [f]
ALTER TABLE public.booking_custom_questions ADD CONSTRAINT booking_custom_questions_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES booking_event_types(id) ON DELETE CASCADE;
-- booking_event_types [p]
ALTER TABLE public.booking_event_types ADD CONSTRAINT booking_event_types_pkey PRIMARY KEY (id);
-- booking_event_types [u]
ALTER TABLE public.booking_event_types ADD CONSTRAINT booking_event_types_unique_slug UNIQUE (user_id, slug);
-- booking_event_types [c]
ALTER TABLE public.booking_event_types ADD CONSTRAINT booking_event_types_buffer_positive CHECK (((buffer_before_minutes >= 0) AND (buffer_after_minutes >= 0)));
-- booking_event_types [c]
ALTER TABLE public.booking_event_types ADD CONSTRAINT booking_event_types_duration_positive CHECK ((duration_minutes > 0));
-- booking_event_types [f]
ALTER TABLE public.booking_event_types ADD CONSTRAINT booking_event_types_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES profiles(id);
-- booking_event_types [f]
ALTER TABLE public.booking_event_types ADD CONSTRAINT booking_event_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- booking_exceptions [p]
ALTER TABLE public.booking_exceptions ADD CONSTRAINT booking_exceptions_pkey PRIMARY KEY (id);
-- booking_exceptions [c]
ALTER TABLE public.booking_exceptions ADD CONSTRAINT booking_exceptions_special_hours CHECK (((is_blocked = true) OR ((start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (start_time < end_time))));
-- booking_exceptions [f]
ALTER TABLE public.booking_exceptions ADD CONSTRAINT booking_exceptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- booking_question_answers [p]
ALTER TABLE public.booking_question_answers ADD CONSTRAINT booking_question_answers_pkey PRIMARY KEY (id);
-- booking_question_answers [f]
ALTER TABLE public.booking_question_answers ADD CONSTRAINT booking_question_answers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
-- booking_question_answers [f]
ALTER TABLE public.booking_question_answers ADD CONSTRAINT booking_question_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES booking_custom_questions(id) ON DELETE SET NULL;
-- booking_reminder_logs [p]
ALTER TABLE public.booking_reminder_logs ADD CONSTRAINT booking_reminder_logs_pkey PRIMARY KEY (id);
-- booking_reminder_logs [c]
ALTER TABLE public.booking_reminder_logs ADD CONSTRAINT booking_reminder_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'pending'::text])));
-- booking_reminder_logs [f]
ALTER TABLE public.booking_reminder_logs ADD CONSTRAINT booking_reminder_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
-- booking_reminder_logs [f]
ALTER TABLE public.booking_reminder_logs ADD CONSTRAINT booking_reminder_logs_reminder_setting_id_fkey FOREIGN KEY (reminder_setting_id) REFERENCES booking_reminder_settings(id) ON DELETE SET NULL;
-- booking_reminder_settings [p]
ALTER TABLE public.booking_reminder_settings ADD CONSTRAINT booking_reminder_settings_pkey PRIMARY KEY (id);
-- booking_reminder_settings [c]
ALTER TABLE public.booking_reminder_settings ADD CONSTRAINT booking_reminder_settings_hours_before_check CHECK (((hours_before > 0) AND (hours_before <= 168)));
-- booking_reminder_settings [c]
ALTER TABLE public.booking_reminder_settings ADD CONSTRAINT booking_reminder_settings_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['email'::text, 'sms'::text])));
-- booking_reminder_settings [f]
ALTER TABLE public.booking_reminder_settings ADD CONSTRAINT booking_reminder_settings_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES booking_event_types(id) ON DELETE CASCADE;
-- booking_webhook_logs [p]
ALTER TABLE public.booking_webhook_logs ADD CONSTRAINT booking_webhook_logs_pkey PRIMARY KEY (id);
-- booking_webhook_logs [f]
ALTER TABLE public.booking_webhook_logs ADD CONSTRAINT booking_webhook_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
-- booking_webhook_logs [f]
ALTER TABLE public.booking_webhook_logs ADD CONSTRAINT booking_webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES booking_webhooks(id) ON DELETE CASCADE;
-- booking_webhooks [p]
ALTER TABLE public.booking_webhooks ADD CONSTRAINT booking_webhooks_pkey PRIMARY KEY (id);
-- booking_webhooks [f]
ALTER TABLE public.booking_webhooks ADD CONSTRAINT booking_webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- bookings [p]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);
-- bookings [u]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_cancel_token_key UNIQUE (cancel_token);
-- bookings [u]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_reschedule_token_key UNIQUE (reschedule_token);
-- bookings [c]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_rescheduled_by_check CHECK ((rescheduled_by = ANY (ARRAY['host'::text, 'guest'::text])));
-- bookings [c]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_time_range CHECK ((start_time < end_time));
-- bookings [f]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES booking_event_types(id) ON DELETE CASCADE;
-- bookings [f]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_guest_user_id_fkey FOREIGN KEY (guest_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- bookings [f]
ALTER TABLE public.bookings ADD CONSTRAINT bookings_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- calendar_blocked_events [p]
ALTER TABLE public.calendar_blocked_events ADD CONSTRAINT calendar_blocked_events_pkey PRIMARY KEY (id);
-- calendar_blocked_events [u]
ALTER TABLE public.calendar_blocked_events ADD CONSTRAINT calendar_blocked_events_integration_id_external_event_id_key UNIQUE (integration_id, external_event_id);
-- calendar_blocked_events [f]
ALTER TABLE public.calendar_blocked_events ADD CONSTRAINT calendar_blocked_events_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE;
-- calendar_event_mappings [p]
ALTER TABLE public.calendar_event_mappings ADD CONSTRAINT calendar_event_mappings_pkey PRIMARY KEY (id);
-- calendar_event_mappings [u]
ALTER TABLE public.calendar_event_mappings ADD CONSTRAINT calendar_event_mappings_booking_id_integration_id_key UNIQUE (booking_id, integration_id);
-- calendar_event_mappings [c]
ALTER TABLE public.calendar_event_mappings ADD CONSTRAINT calendar_event_mappings_sync_status_check CHECK ((sync_status = ANY (ARRAY['synced'::text, 'pending'::text, 'error'::text])));
-- calendar_event_mappings [f]
ALTER TABLE public.calendar_event_mappings ADD CONSTRAINT calendar_event_mappings_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
-- calendar_event_mappings [f]
ALTER TABLE public.calendar_event_mappings ADD CONSTRAINT calendar_event_mappings_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE;
-- calendar_integrations [p]
ALTER TABLE public.calendar_integrations ADD CONSTRAINT calendar_integrations_pkey PRIMARY KEY (id);
-- calendar_integrations [u]
ALTER TABLE public.calendar_integrations ADD CONSTRAINT calendar_integrations_user_id_provider_key UNIQUE (user_id, provider);
-- calendar_integrations [c]
ALTER TABLE public.calendar_integrations ADD CONSTRAINT calendar_integrations_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'outlook'::text, 'apple'::text])));
-- calendar_integrations [f]
ALTER TABLE public.calendar_integrations ADD CONSTRAINT calendar_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- campaign_applications [p]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_pkey PRIMARY KEY (id);
-- campaign_applications [u]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_unique UNIQUE (campaign_id, creator_id);
-- campaign_applications [c]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_brand_rating_check CHECK (((brand_rating >= 1) AND (brand_rating <= 5)));
-- campaign_applications [c]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_counter_offer_response_check CHECK ((counter_offer_response = ANY (ARRAY['accepted'::text, 'rejected'::text])));
-- campaign_applications [c]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
-- campaign_applications [f]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- campaign_applications [f]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE;
-- campaign_applications [f]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_escrow_hold_id_fkey FOREIGN KEY (escrow_hold_id) REFERENCES escrow_holds(id) ON DELETE SET NULL;
-- campaign_applications [f]
ALTER TABLE public.campaign_applications ADD CONSTRAINT campaign_applications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_case_studies [p]
ALTER TABLE public.campaign_case_studies ADD CONSTRAINT campaign_case_studies_pkey PRIMARY KEY (id);
-- campaign_case_studies [u]
ALTER TABLE public.campaign_case_studies ADD CONSTRAINT campaign_case_studies_campaign_id_key UNIQUE (campaign_id);
-- campaign_case_studies [u]
ALTER TABLE public.campaign_case_studies ADD CONSTRAINT campaign_case_studies_slug_key UNIQUE (slug);
-- campaign_case_studies [f]
ALTER TABLE public.campaign_case_studies ADD CONSTRAINT campaign_case_studies_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;
-- campaign_case_studies [f]
ALTER TABLE public.campaign_case_studies ADD CONSTRAINT campaign_case_studies_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- campaign_deliverables [p]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_pkey PRIMARY KEY (id);
-- campaign_deliverables [c]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_file_type_check CHECK ((file_type = ANY (ARRAY['video'::text, 'image'::text, 'document'::text])));
-- campaign_deliverables [c]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'revision_requested'::text, 'approved'::text, 'rejected'::text])));
-- campaign_deliverables [f]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_application_id_fkey FOREIGN KEY (application_id) REFERENCES campaign_applications(id) ON DELETE SET NULL;
-- campaign_deliverables [f]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
-- campaign_deliverables [f]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- campaign_deliverables [f]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- campaign_deliverables [f]
ALTER TABLE public.campaign_deliverables ADD CONSTRAINT campaign_deliverables_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_invitations [p]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_pkey PRIMARY KEY (id);
-- campaign_invitations [u]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_unique UNIQUE (campaign_id, invited_profile_id);
-- campaign_invitations [c]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])));
-- campaign_invitations [f]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- campaign_invitations [f]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);
-- campaign_invitations [f]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_invited_profile_id_fkey FOREIGN KEY (invited_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- campaign_invitations [f]
ALTER TABLE public.campaign_invitations ADD CONSTRAINT campaign_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_mappings [p]
ALTER TABLE public.campaign_mappings ADD CONSTRAINT campaign_mappings_pkey PRIMARY KEY (id);
-- campaign_mappings [f]
ALTER TABLE public.campaign_mappings ADD CONSTRAINT campaign_mappings_connected_account_id_fkey FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE;
-- campaign_mappings [f]
ALTER TABLE public.campaign_mappings ADD CONSTRAINT campaign_mappings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_media [p]
ALTER TABLE public.campaign_media ADD CONSTRAINT campaign_media_pkey PRIMARY KEY (id);
-- campaign_media [c]
ALTER TABLE public.campaign_media ADD CONSTRAINT campaign_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text])));
-- campaign_media [f]
ALTER TABLE public.campaign_media ADD CONSTRAINT campaign_media_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- campaign_media [f]
ALTER TABLE public.campaign_media ADD CONSTRAINT campaign_media_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_metrics [p]
ALTER TABLE public.campaign_metrics ADD CONSTRAINT campaign_metrics_pkey PRIMARY KEY (id);
-- campaign_metrics [u]
ALTER TABLE public.campaign_metrics ADD CONSTRAINT campaign_metrics_campaign_mapping_id_date_key UNIQUE (campaign_mapping_id, date);
-- campaign_metrics [f]
ALTER TABLE public.campaign_metrics ADD CONSTRAINT campaign_metrics_campaign_mapping_id_fkey FOREIGN KEY (campaign_mapping_id) REFERENCES campaign_mappings(id) ON DELETE CASCADE;
-- campaign_metrics [f]
ALTER TABLE public.campaign_metrics ADD CONSTRAINT campaign_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_notifications [p]
ALTER TABLE public.campaign_notifications ADD CONSTRAINT campaign_notifications_pkey PRIMARY KEY (id);
-- campaign_notifications [f]
ALTER TABLE public.campaign_notifications ADD CONSTRAINT campaign_notifications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id) ON DELETE CASCADE;
-- campaign_notifications [f]
ALTER TABLE public.campaign_notifications ADD CONSTRAINT campaign_notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_notifications [f]
ALTER TABLE public.campaign_notifications ADD CONSTRAINT campaign_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- campaign_redemptions [p]
ALTER TABLE public.campaign_redemptions ADD CONSTRAINT campaign_redemptions_pkey PRIMARY KEY (id);
-- campaign_redemptions [u]
ALTER TABLE public.campaign_redemptions ADD CONSTRAINT campaign_redemptions_campaign_id_user_id_key UNIQUE (campaign_id, user_id);
-- campaign_redemptions [f]
ALTER TABLE public.campaign_redemptions ADD CONSTRAINT campaign_redemptions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES promotional_campaigns(id) ON DELETE CASCADE;
-- campaign_redemptions [f]
ALTER TABLE public.campaign_redemptions ADD CONSTRAINT campaign_redemptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- campaign_redemptions [f]
ALTER TABLE public.campaign_redemptions ADD CONSTRAINT campaign_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- campaign_templates [p]
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_pkey PRIMARY KEY (id);
-- campaign_templates [u]
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_slug_key UNIQUE (slug);
-- campaign_templates [c]
ALTER TABLE public.campaign_templates ADD CONSTRAINT campaign_templates_category_check CHECK ((category = ANY (ARRAY['ugc'::text, 'social'::text, 'review'::text, 'event'::text, 'collab'::text])));
-- chronometer_pauses [p]
ALTER TABLE public.chronometer_pauses ADD CONSTRAINT chronometer_pauses_pkey PRIMARY KEY (id);
-- chronometer_pauses [f]
ALTER TABLE public.chronometer_pauses ADD CONSTRAINT chronometer_pauses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- company_followers [p]
ALTER TABLE public.company_followers ADD CONSTRAINT company_followers_pkey PRIMARY KEY (id);
-- company_followers [u]
ALTER TABLE public.company_followers ADD CONSTRAINT company_followers_company_id_follower_id_key UNIQUE (company_id, follower_id);
-- content_likes [p]
ALTER TABLE public.content_likes ADD CONSTRAINT content_likes_pkey PRIMARY KEY (id);
-- content_likes [u]
ALTER TABLE public.content_likes ADD CONSTRAINT content_likes_content_id_viewer_id_key UNIQUE (content_id, viewer_id);
-- creator_availability [p]
ALTER TABLE public.creator_availability ADD CONSTRAINT creator_availability_pkey PRIMARY KEY (user_id);
-- creator_availability [c]
ALTER TABLE public.creator_availability ADD CONSTRAINT creator_availability_preferred_project_size_check CHECK (((preferred_project_size)::text = ANY ((ARRAY['small'::character varying, 'medium'::character varying, 'large'::character varying, 'enterprise'::character varying, 'any'::character varying])::text[])));
-- creator_availability [c]
ALTER TABLE public.creator_availability ADD CONSTRAINT creator_availability_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'busy'::character varying, 'limited'::character varying, 'unavailable'::character varying, 'vacation'::character varying])::text[])));
-- creator_availability [f]
ALTER TABLE public.creator_availability ADD CONSTRAINT creator_availability_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- creator_live_streams [p]
ALTER TABLE public.creator_live_streams ADD CONSTRAINT creator_live_streams_pkey PRIMARY KEY (id);
-- creator_live_streams [f]
ALTER TABLE public.creator_live_streams ADD CONSTRAINT creator_live_streams_creator_profile_id_fkey FOREIGN KEY (creator_profile_id) REFERENCES creator_profiles(id) ON DELETE CASCADE;
-- creator_live_streams [f]
ALTER TABLE public.creator_live_streams ADD CONSTRAINT creator_live_streams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
-- creator_live_streams [f]
ALTER TABLE public.creator_live_streams ADD CONSTRAINT creator_live_streams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- favorites [p]
ALTER TABLE public.favorites ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);
-- favorites [f]
ALTER TABLE public.favorites ADD CONSTRAINT favorites_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE;
-- feed_reactions [p]
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_pkey PRIMARY KEY (id);
-- feed_reactions [u]
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_post_id_user_id_key UNIQUE (post_id, user_id);
-- feed_reactions [c]
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['love'::text, 'fire'::text, 'clap'::text, 'wow'::text, 'sad'::text])));
-- feed_reactions [f]
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES portfolio_items(id) ON DELETE CASCADE;
-- feed_reactions [f]
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- followers [p]
ALTER TABLE public.followers ADD CONSTRAINT followers_pkey PRIMARY KEY (id);
-- followers [u]
ALTER TABLE public.followers ADD CONSTRAINT followers_follower_id_following_id_key UNIQUE (follower_id, following_id);
-- followers [c]
ALTER TABLE public.followers ADD CONSTRAINT no_self_follow CHECK ((follower_id <> following_id));
-- global_badges [p]
ALTER TABLE public.global_badges ADD CONSTRAINT global_badges_pkey PRIMARY KEY (id);
-- global_badges [u]
ALTER TABLE public.global_badges ADD CONSTRAINT global_badges_key_key UNIQUE (key);
-- global_badges [c]
ALTER TABLE public.global_badges ADD CONSTRAINT global_badges_condition_type_check CHECK ((condition_type = ANY (ARRAY['threshold'::text, 'milestone'::text, 'streak'::text, 'time_based'::text, 'cumulative'::text, 'compound'::text])));
-- global_badges [c]
ALTER TABLE public.global_badges ADD CONSTRAINT global_badges_tier_check CHECK (((tier >= 1) AND (tier <= 4)));
-- global_badges [f]
ALTER TABLE public.global_badges ADD CONSTRAINT global_badges_parent_badge_id_fkey FOREIGN KEY (parent_badge_id) REFERENCES global_badges(id) ON DELETE SET NULL;
-- hashtags [p]
ALTER TABLE public.hashtags ADD CONSTRAINT hashtags_pkey PRIMARY KEY (id);
-- hashtags [u]
ALTER TABLE public.hashtags ADD CONSTRAINT hashtags_tag_key UNIQUE (tag);
-- kreadores_content_likes [p]
ALTER TABLE public.kreadores_content_likes ADD CONSTRAINT kreadores_content_likes_pkey PRIMARY KEY (id);
-- kreadores_content_likes [u]
ALTER TABLE public.kreadores_content_likes ADD CONSTRAINT kreadores_content_likes_user_id_portfolio_item_id_key UNIQUE (user_id, portfolio_item_id);
-- kreadores_content_likes [f]
ALTER TABLE public.kreadores_content_likes ADD CONSTRAINT kreadores_content_likes_portfolio_item_id_fkey FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_items(id) ON DELETE CASCADE;
-- kreadores_content_likes [f]
ALTER TABLE public.kreadores_content_likes ADD CONSTRAINT kreadores_content_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- link_previews [p]
ALTER TABLE public.link_previews ADD CONSTRAINT link_previews_pkey PRIMARY KEY (id);
-- link_previews [u]
ALTER TABLE public.link_previews ADD CONSTRAINT link_previews_url_key UNIQUE (url);
-- live_client_settings [p]
ALTER TABLE public.live_client_settings ADD CONSTRAINT live_client_settings_pkey PRIMARY KEY (id);
-- live_client_settings [u]
ALTER TABLE public.live_client_settings ADD CONSTRAINT live_client_settings_client_id_key UNIQUE (client_id);
-- live_event_creators [p]
ALTER TABLE public.live_event_creators ADD CONSTRAINT live_event_creators_pkey PRIMARY KEY (id);
-- live_event_creators [u]
ALTER TABLE public.live_event_creators ADD CONSTRAINT live_event_creators_event_id_creator_id_key UNIQUE (event_id, creator_id);
-- live_event_creators [c]
ALTER TABLE public.live_event_creators ADD CONSTRAINT live_event_creators_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])));
-- live_event_monitoring [p]
ALTER TABLE public.live_event_monitoring ADD CONSTRAINT live_event_monitoring_pkey PRIMARY KEY (id);
-- live_feature_flags [p]
ALTER TABLE public.live_feature_flags ADD CONSTRAINT live_feature_flags_pkey PRIMARY KEY (id);
-- live_feature_flags [u]
ALTER TABLE public.live_feature_flags ADD CONSTRAINT live_feature_flags_flag_type_flag_id_key UNIQUE (flag_type, flag_id);
-- live_feature_flags [c]
ALTER TABLE public.live_feature_flags ADD CONSTRAINT live_feature_flags_flag_type_check CHECK ((flag_type = ANY (ARRAY['platform'::text, 'organization'::text, 'client'::text])));
-- live_hosting_hosts [p]
ALTER TABLE public.live_hosting_hosts ADD CONSTRAINT live_hosting_hosts_pkey PRIMARY KEY (id);
-- live_hosting_hosts [u]
ALTER TABLE public.live_hosting_hosts ADD CONSTRAINT live_hosting_hosts_request_id_user_id_key UNIQUE (request_id, user_id);
-- live_hosting_hosts [f]
ALTER TABLE public.live_hosting_hosts ADD CONSTRAINT live_hosting_hosts_creator_profile_id_fkey FOREIGN KEY (creator_profile_id) REFERENCES creator_profiles(id);
-- live_hosting_hosts [f]
ALTER TABLE public.live_hosting_hosts ADD CONSTRAINT live_hosting_hosts_request_id_fkey FOREIGN KEY (request_id) REFERENCES live_hosting_requests(id) ON DELETE CASCADE;
-- live_hosting_hosts [f]
ALTER TABLE public.live_hosting_hosts ADD CONSTRAINT live_hosting_hosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
-- live_hosting_requests [p]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_pkey PRIMARY KEY (id);
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES brands(id);
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id);
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_escrow_hold_id_fkey FOREIGN KEY (escrow_hold_id) REFERENCES escrow_holds(id);
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- live_hosting_requests [f]
ALTER TABLE public.live_hosting_requests ADD CONSTRAINT live_hosting_requests_streaming_session_id_fkey FOREIGN KEY (streaming_session_id) REFERENCES streaming_sessions_v2(id);
-- live_hosting_status_history [p]
ALTER TABLE public.live_hosting_status_history ADD CONSTRAINT live_hosting_status_history_pkey PRIMARY KEY (id);
-- live_hosting_status_history [f]
ALTER TABLE public.live_hosting_status_history ADD CONSTRAINT live_hosting_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);
-- live_hosting_status_history [f]
ALTER TABLE public.live_hosting_status_history ADD CONSTRAINT live_hosting_status_history_host_id_fkey FOREIGN KEY (host_id) REFERENCES live_hosting_hosts(id) ON DELETE CASCADE;
-- live_hosting_status_history [f]
ALTER TABLE public.live_hosting_status_history ADD CONSTRAINT live_hosting_status_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES live_hosting_requests(id) ON DELETE CASCADE;
-- live_hosting_templates [p]
ALTER TABLE public.live_hosting_templates ADD CONSTRAINT live_hosting_templates_pkey PRIMARY KEY (id);
-- live_hosting_templates [f]
ALTER TABLE public.live_hosting_templates ADD CONSTRAINT live_hosting_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- live_hosting_templates [f]
ALTER TABLE public.live_hosting_templates ADD CONSTRAINT live_hosting_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- live_hour_assignments [p]
ALTER TABLE public.live_hour_assignments ADD CONSTRAINT live_hour_assignments_pkey PRIMARY KEY (id);
-- live_hour_purchases [p]
ALTER TABLE public.live_hour_purchases ADD CONSTRAINT live_hour_purchases_pkey PRIMARY KEY (id);
-- live_hour_wallets [p]
ALTER TABLE public.live_hour_wallets ADD CONSTRAINT live_hour_wallets_pkey PRIMARY KEY (id);
-- live_hour_wallets [u]
ALTER TABLE public.live_hour_wallets ADD CONSTRAINT live_hour_wallets_owner_type_owner_id_key UNIQUE (owner_type, owner_id);
-- live_hour_wallets [c]
ALTER TABLE public.live_hour_wallets ADD CONSTRAINT live_hour_wallets_owner_type_check CHECK ((owner_type = ANY (ARRAY['platform'::text, 'organization'::text, 'client'::text])));
-- live_org_oauth_tokens [p]
ALTER TABLE public.live_org_oauth_tokens ADD CONSTRAINT live_org_oauth_tokens_pkey PRIMARY KEY (id);
-- live_org_oauth_tokens [u]
ALTER TABLE public.live_org_oauth_tokens ADD CONSTRAINT live_org_oauth_tokens_organization_id_provider_key UNIQUE (organization_id, provider);
-- live_org_oauth_tokens [c]
ALTER TABLE public.live_org_oauth_tokens ADD CONSTRAINT live_org_oauth_tokens_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'disconnected'::text, 'expired'::text, 'error'::text])));
-- live_packages [p]
ALTER TABLE public.live_packages ADD CONSTRAINT live_packages_pkey PRIMARY KEY (id);
-- live_platform_config [p]
ALTER TABLE public.live_platform_config ADD CONSTRAINT live_platform_config_pkey PRIMARY KEY (id);
-- live_stream_comments [p]
ALTER TABLE public.live_stream_comments ADD CONSTRAINT live_stream_comments_pkey PRIMARY KEY (id);
-- live_stream_comments [f]
ALTER TABLE public.live_stream_comments ADD CONSTRAINT live_stream_comments_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES creator_live_streams(id) ON DELETE CASCADE;
-- live_stream_comments [f]
ALTER TABLE public.live_stream_comments ADD CONSTRAINT live_stream_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- live_stream_history [p]
ALTER TABLE public.live_stream_history ADD CONSTRAINT live_stream_history_pkey PRIMARY KEY (id);
-- live_stream_products [p]
ALTER TABLE public.live_stream_products ADD CONSTRAINT live_stream_products_pkey PRIMARY KEY (id);
-- live_stream_products [f]
ALTER TABLE public.live_stream_products ADD CONSTRAINT live_stream_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
-- live_stream_products [f]
ALTER TABLE public.live_stream_products ADD CONSTRAINT live_stream_products_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES creator_live_streams(id) ON DELETE CASCADE;
-- live_stream_reactions [p]
ALTER TABLE public.live_stream_reactions ADD CONSTRAINT live_stream_reactions_pkey PRIMARY KEY (id);
-- live_stream_reactions [f]
ALTER TABLE public.live_stream_reactions ADD CONSTRAINT live_stream_reactions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES creator_live_streams(id) ON DELETE CASCADE;
-- live_stream_reactions [f]
ALTER TABLE public.live_stream_reactions ADD CONSTRAINT live_stream_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- live_stream_viewers [p]
ALTER TABLE public.live_stream_viewers ADD CONSTRAINT live_stream_viewers_pkey PRIMARY KEY (id);
-- live_stream_viewers [u]
ALTER TABLE public.live_stream_viewers ADD CONSTRAINT live_stream_viewers_stream_id_session_id_key UNIQUE (stream_id, session_id);
-- live_stream_viewers [f]
ALTER TABLE public.live_stream_viewers ADD CONSTRAINT live_stream_viewers_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES creator_live_streams(id) ON DELETE CASCADE;
-- live_stream_viewers [f]
ALTER TABLE public.live_stream_viewers ADD CONSTRAINT live_stream_viewers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- live_streaming_channels [p]
ALTER TABLE public.live_streaming_channels ADD CONSTRAINT live_streaming_channels_pkey PRIMARY KEY (id);
-- live_usage_logs [p]
ALTER TABLE public.live_usage_logs ADD CONSTRAINT live_usage_logs_pkey PRIMARY KEY (id);
-- managed_campaign_subscriptions [p]
ALTER TABLE public.managed_campaign_subscriptions ADD CONSTRAINT managed_campaign_subscriptions_pkey PRIMARY KEY (id);
-- managed_campaign_subscriptions [c]
ALTER TABLE public.managed_campaign_subscriptions ADD CONSTRAINT managed_campaign_subscriptions_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'COP'::text])));
-- managed_campaign_subscriptions [c]
ALTER TABLE public.managed_campaign_subscriptions ADD CONSTRAINT managed_campaign_subscriptions_duration_months_check CHECK ((duration_months = ANY (ARRAY[1, 3, 6, 12])));
-- managed_campaign_subscriptions [c]
ALTER TABLE public.managed_campaign_subscriptions ADD CONSTRAINT managed_campaign_subscriptions_plan_check CHECK ((plan = ANY (ARRAY['inicio'::text, 'crecimiento'::text, 'escala'::text])));
-- managed_campaign_subscriptions [c]
ALTER TABLE public.managed_campaign_subscriptions ADD CONSTRAINT managed_campaign_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text])));
-- managed_campaign_subscriptions [c]
ALTER TABLE public.managed_campaign_subscriptions ADD CONSTRAINT managed_campaign_subscriptions_total_paid_check CHECK ((total_paid >= (0)::numeric));
-- marketplace_campaigns [p]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_pkey PRIMARY KEY (id);
-- marketplace_campaigns [u]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_slug_key UNIQUE (slug);
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_bid_visibility_check CHECK ((bid_visibility = ANY (ARRAY['public'::text, 'sealed'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_budget_mode_check CHECK ((budget_mode = ANY (ARRAY['per_video'::text, 'total_budget'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_campaign_purpose_check CHECK ((campaign_purpose = ANY (ARRAY['content'::text, 'activation'::text, 'talent'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['paid'::text, 'exchange'::text, 'hybrid'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_collaboration_type_check CHECK ((collaboration_type = ANY (ARRAY['ugc_only'::text, 'post_required'::text, 'post_optional'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_compensation_type_check CHECK (((compensation_type)::text = ANY ((ARRAY['paid'::character varying, 'product_exchange'::character varying, 'hybrid'::character varying, 'credits'::character varying])::text[])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_content_management_type_check CHECK ((content_management_type = ANY (ARRAY['kreoon'::text, 'self'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_pricing_mode_check CHECK ((pricing_mode = ANY (ARRAY['fixed'::text, 'auction'::text, 'range'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_usage_rights_check CHECK ((usage_rights = ANY (ARRAY['platform_only'::text, 'social_media'::text, 'all_channels'::text, 'exclusive'::text, 'custom'::text])));
-- marketplace_campaigns [c]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'internal'::text, 'selective'::text])));
-- marketplace_campaigns [f]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;
-- marketplace_campaigns [f]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
-- marketplace_campaigns [f]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- marketplace_campaigns [f]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_escrow_hold_id_fkey FOREIGN KEY (escrow_hold_id) REFERENCES escrow_holds(id) ON DELETE SET NULL;
-- marketplace_campaigns [f]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
-- marketplace_campaigns [f]
ALTER TABLE public.marketplace_campaigns ADD CONSTRAINT marketplace_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES campaign_templates(id);
-- mission_templates [p]
ALTER TABLE public.mission_templates ADD CONSTRAINT mission_templates_pkey PRIMARY KEY (id);
-- mission_templates [u]
ALTER TABLE public.mission_templates ADD CONSTRAINT mission_templates_code_key UNIQUE (code);
-- organization_streaming_config [p]
ALTER TABLE public.organization_streaming_config ADD CONSTRAINT organization_streaming_config_pkey PRIMARY KEY (id);
-- organization_streaming_config [u]
ALTER TABLE public.organization_streaming_config ADD CONSTRAINT organization_streaming_config_organization_id_key UNIQUE (organization_id);
-- point_transactions [p]
ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);
-- portfolio_post_comments [p]
ALTER TABLE public.portfolio_post_comments ADD CONSTRAINT portfolio_post_comments_pkey PRIMARY KEY (id);
-- portfolio_post_likes [p]
ALTER TABLE public.portfolio_post_likes ADD CONSTRAINT portfolio_post_likes_pkey PRIMARY KEY (id);
-- portfolio_post_likes [u]
ALTER TABLE public.portfolio_post_likes ADD CONSTRAINT portfolio_post_likes_unique UNIQUE (post_id, viewer_id);
-- portfolio_posts [p]
ALTER TABLE public.portfolio_posts ADD CONSTRAINT portfolio_posts_pkey PRIMARY KEY (id);
-- portfolio_posts [c]
ALTER TABLE public.portfolio_posts ADD CONSTRAINT portfolio_posts_post_type_check CHECK ((post_type = ANY (ARRAY['portfolio'::text, 'personal'::text])));
-- portfolio_posts [f]
ALTER TABLE public.portfolio_posts ADD CONSTRAINT portfolio_posts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES profiles(id);
-- portfolio_stories [p]
ALTER TABLE public.portfolio_stories ADD CONSTRAINT portfolio_stories_pkey PRIMARY KEY (id);
-- post_hashtags [p]
ALTER TABLE public.post_hashtags ADD CONSTRAINT post_hashtags_pkey PRIMARY KEY (post_id, hashtag_id);
-- post_hashtags [f]
ALTER TABLE public.post_hashtags ADD CONSTRAINT post_hashtags_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE;
-- post_hashtags [f]
ALTER TABLE public.post_hashtags ADD CONSTRAINT post_hashtags_post_id_fkey FOREIGN KEY (post_id) REFERENCES portfolio_posts(id) ON DELETE CASCADE;
-- post_metrics [p]
ALTER TABLE public.post_metrics ADD CONSTRAINT post_metrics_pkey PRIMARY KEY (id);
-- post_metrics [f]
ALTER TABLE public.post_metrics ADD CONSTRAINT post_metrics_scheduled_post_id_fkey FOREIGN KEY (scheduled_post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE;
-- post_metrics [f]
ALTER TABLE public.post_metrics ADD CONSTRAINT post_metrics_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE CASCADE;
-- profile_views [p]
ALTER TABLE public.profile_views ADD CONSTRAINT profile_views_pkey PRIMARY KEY (id);
-- profile_views [f]
ALTER TABLE public.profile_views ADD CONSTRAINT profile_views_profile_user_id_fkey FOREIGN KEY (profile_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- profile_views [f]
ALTER TABLE public.profile_views ADD CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- promotional_campaigns [p]
ALTER TABLE public.promotional_campaigns ADD CONSTRAINT promotional_campaigns_pkey PRIMARY KEY (id);
-- promotional_campaigns [u]
ALTER TABLE public.promotional_campaigns ADD CONSTRAINT promotional_campaigns_slug_key UNIQUE (slug);
-- publication_verification_queue [p]
ALTER TABLE public.publication_verification_queue ADD CONSTRAINT publication_verification_queue_pkey PRIMARY KEY (id);
-- publication_verification_queue [f]
ALTER TABLE public.publication_verification_queue ADD CONSTRAINT publication_verification_queue_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES activation_publications(id) ON DELETE CASCADE;
-- reputation_configs [p]
ALTER TABLE public.reputation_configs ADD CONSTRAINT reputation_configs_pkey PRIMARY KEY (id);
-- reputation_configs [u]
ALTER TABLE public.reputation_configs ADD CONSTRAINT reputation_configs_role_event_key_key UNIQUE (role, event_key);
-- reputation_events [p]
ALTER TABLE public.reputation_events ADD CONSTRAINT reputation_events_pkey PRIMARY KEY (id);
-- reputation_events [u]
ALTER TABLE public.reputation_events ADD CONSTRAINT reputation_events_organization_id_user_id_reference_type_re_key UNIQUE (organization_id, user_id, reference_type, reference_id, event_type);
-- reputation_events [f]
ALTER TABLE public.reputation_events ADD CONSTRAINT reputation_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- reputation_events [f]
ALTER TABLE public.reputation_events ADD CONSTRAINT reputation_events_season_id_fkey FOREIGN KEY (season_id) REFERENCES reputation_seasons(id) ON DELETE SET NULL;
-- reputation_global [p]
ALTER TABLE public.reputation_global ADD CONSTRAINT reputation_global_pkey PRIMARY KEY (id);
-- reputation_global [u]
ALTER TABLE public.reputation_global ADD CONSTRAINT reputation_global_user_id_key UNIQUE (user_id);
-- reputation_global [f]
ALTER TABLE public.reputation_global ADD CONSTRAINT reputation_global_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- reputation_seasons [p]
ALTER TABLE public.reputation_seasons ADD CONSTRAINT reputation_seasons_pkey PRIMARY KEY (id);
-- reputation_seasons [f]
ALTER TABLE public.reputation_seasons ADD CONSTRAINT reputation_seasons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- role_multipliers [p]
ALTER TABLE public.role_multipliers ADD CONSTRAINT role_multipliers_pkey PRIMARY KEY (id);
-- role_multipliers [u]
ALTER TABLE public.role_multipliers ADD CONSTRAINT role_multipliers_organization_id_multiplier_type_multiplier_key UNIQUE (organization_id, multiplier_type, multiplier_key, role_key);
-- role_multipliers [c]
ALTER TABLE public.role_multipliers ADD CONSTRAINT role_multipliers_multiplier_type_check CHECK ((multiplier_type = ANY (ARRAY['level'::text, 'complexity'::text, 'client_tier'::text])));
-- role_multipliers [f]
ALTER TABLE public.role_multipliers ADD CONSTRAINT role_multipliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- role_points_config [p]
ALTER TABLE public.role_points_config ADD CONSTRAINT role_points_config_pkey PRIMARY KEY (id);
-- role_points_config [u]
ALTER TABLE public.role_points_config ADD CONSTRAINT role_points_config_organization_id_role_key_key UNIQUE (organization_id, role_key);
-- role_points_config [f]
ALTER TABLE public.role_points_config ADD CONSTRAINT role_points_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- role_weight_config [p]
ALTER TABLE public.role_weight_config ADD CONSTRAINT role_weight_config_pkey PRIMARY KEY (id);
-- role_weight_config [f]
ALTER TABLE public.role_weight_config ADD CONSTRAINT role_weight_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- saved_collections [p]
ALTER TABLE public.saved_collections ADD CONSTRAINT saved_collections_pkey PRIMARY KEY (id);
-- saved_creators [p]
ALTER TABLE public.saved_creators ADD CONSTRAINT saved_creators_pkey PRIMARY KEY (id);
-- saved_creators [u]
ALTER TABLE public.saved_creators ADD CONSTRAINT saved_creators_unique UNIQUE (user_id, creator_id);
-- saved_creators [f]
ALTER TABLE public.saved_creators ADD CONSTRAINT saved_creators_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE;
-- saved_creators [f]
ALTER TABLE public.saved_creators ADD CONSTRAINT saved_creators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- saved_items [p]
ALTER TABLE public.saved_items ADD CONSTRAINT saved_items_pkey PRIMARY KEY (id);
-- saved_items [u]
ALTER TABLE public.saved_items ADD CONSTRAINT saved_items_user_id_item_type_item_id_key UNIQUE (user_id, item_type, item_id);
-- saved_searches [p]
ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);
-- saved_searches [f]
ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- season_goals [p]
ALTER TABLE public.season_goals ADD CONSTRAINT season_goals_pkey PRIMARY KEY (id);
-- season_goals [f]
ALTER TABLE public.season_goals ADD CONSTRAINT season_goals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- season_reward_claims [p]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_pkey PRIMARY KEY (id);
-- season_reward_claims [u]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_season_id_reward_id_user_id_key UNIQUE (season_id, reward_id, user_id);
-- season_reward_claims [c]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'claimed'::text, 'delivered'::text, 'expired'::text, 'cancelled'::text])));
-- season_reward_claims [f]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES auth.users(id);
-- season_reward_claims [f]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- season_reward_claims [f]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES season_rewards(id) ON DELETE CASCADE;
-- season_reward_claims [f]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_season_id_fkey FOREIGN KEY (season_id) REFERENCES reputation_seasons(id) ON DELETE CASCADE;
-- season_reward_claims [f]
ALTER TABLE public.season_reward_claims ADD CONSTRAINT season_reward_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- season_rewards [p]
ALTER TABLE public.season_rewards ADD CONSTRAINT season_rewards_pkey PRIMARY KEY (id);
-- season_rewards [c]
ALTER TABLE public.season_rewards ADD CONSTRAINT season_rewards_position_type_check CHECK ((position_type = ANY (ARRAY['rank'::text, 'percentile'::text, 'threshold'::text])));
-- season_rewards [c]
ALTER TABLE public.season_rewards ADD CONSTRAINT season_rewards_reward_type_check CHECK ((reward_type = ANY (ARRAY['points_bonus'::text, 'badge'::text, 'monetary'::text, 'custom'::text])));
-- season_rewards [f]
ALTER TABLE public.season_rewards ADD CONSTRAINT season_rewards_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES achievements(id) ON DELETE SET NULL;
-- season_rewards [f]
ALTER TABLE public.season_rewards ADD CONSTRAINT season_rewards_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- season_rewards [f]
ALTER TABLE public.season_rewards ADD CONSTRAINT season_rewards_season_id_fkey FOREIGN KEY (season_id) REFERENCES reputation_seasons(id) ON DELETE CASCADE;
-- social_notifications [p]
ALTER TABLE public.social_notifications ADD CONSTRAINT social_notifications_pkey PRIMARY KEY (id);
-- social_notifications [c]
ALTER TABLE public.social_notifications ADD CONSTRAINT social_notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['follow'::text, 'like'::text, 'comment'::text, 'reveal'::text, 'mention'::text])));
-- story_views [p]
ALTER TABLE public.story_views ADD CONSTRAINT story_views_pkey PRIMARY KEY (id);
-- story_views [u]
ALTER TABLE public.story_views ADD CONSTRAINT unique_story_view UNIQUE (story_id, viewer_id);
-- streaming_accounts [p]
ALTER TABLE public.streaming_accounts ADD CONSTRAINT streaming_accounts_pkey PRIMARY KEY (id);
-- streaming_accounts [c]
ALTER TABLE public.streaming_accounts ADD CONSTRAINT streaming_accounts_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'expired'::text, 'error'::text, 'disconnected'::text])));
-- streaming_analytics_v2 [p]
ALTER TABLE public.streaming_analytics_v2 ADD CONSTRAINT streaming_analytics_v2_pkey PRIMARY KEY (id);
-- streaming_analytics_v2 [f]
ALTER TABLE public.streaming_analytics_v2 ADD CONSTRAINT streaming_analytics_v2_featured_product_id_fkey FOREIGN KEY (featured_product_id) REFERENCES streaming_products_v2(id);
-- streaming_analytics_v2 [f]
ALTER TABLE public.streaming_analytics_v2 ADD CONSTRAINT streaming_analytics_v2_session_id_fkey FOREIGN KEY (session_id) REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE;
-- streaming_channels_v2 [p]
ALTER TABLE public.streaming_channels_v2 ADD CONSTRAINT streaming_channels_v2_pkey PRIMARY KEY (id);
-- streaming_channels_v2 [f]
ALTER TABLE public.streaming_channels_v2 ADD CONSTRAINT streaming_channels_v2_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- streaming_channels_v2 [f]
ALTER TABLE public.streaming_channels_v2 ADD CONSTRAINT streaming_channels_v2_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- streaming_chat_messages_v2 [p]
ALTER TABLE public.streaming_chat_messages_v2 ADD CONSTRAINT streaming_chat_messages_v2_pkey PRIMARY KEY (id);
-- streaming_chat_messages_v2 [f]
ALTER TABLE public.streaming_chat_messages_v2 ADD CONSTRAINT streaming_chat_messages_v2_session_id_fkey FOREIGN KEY (session_id) REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE;
-- streaming_chat_messages_v2 [f]
ALTER TABLE public.streaming_chat_messages_v2 ADD CONSTRAINT streaming_chat_messages_v2_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
-- streaming_event_products [p]
ALTER TABLE public.streaming_event_products ADD CONSTRAINT streaming_event_products_pkey PRIMARY KEY (id);
-- streaming_events [p]
ALTER TABLE public.streaming_events ADD CONSTRAINT streaming_events_pkey PRIMARY KEY (id);
-- streaming_guests_v2 [p]
ALTER TABLE public.streaming_guests_v2 ADD CONSTRAINT streaming_guests_v2_pkey PRIMARY KEY (id);
-- streaming_guests_v2 [u]
ALTER TABLE public.streaming_guests_v2 ADD CONSTRAINT streaming_guests_v2_join_token_key UNIQUE (join_token);
-- streaming_guests_v2 [f]
ALTER TABLE public.streaming_guests_v2 ADD CONSTRAINT streaming_guests_v2_session_id_fkey FOREIGN KEY (session_id) REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE;
-- streaming_guests_v2 [f]
ALTER TABLE public.streaming_guests_v2 ADD CONSTRAINT streaming_guests_v2_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
-- streaming_logs [p]
ALTER TABLE public.streaming_logs ADD CONSTRAINT streaming_logs_pkey PRIMARY KEY (id);
-- streaming_logs [c]
ALTER TABLE public.streaming_logs ADD CONSTRAINT streaming_logs_log_type_check CHECK ((log_type = ANY (ARRAY['channel_connected'::text, 'channel_disconnected'::text, 'token_expired'::text, 'live_started'::text, 'live_ended'::text, 'error'::text, 'warning'::text, 'info'::text])));
-- streaming_logs [c]
ALTER TABLE public.streaming_logs ADD CONSTRAINT streaming_logs_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])));
-- streaming_overlays_v2 [p]
ALTER TABLE public.streaming_overlays_v2 ADD CONSTRAINT streaming_overlays_v2_pkey PRIMARY KEY (id);
-- streaming_overlays_v2 [f]
ALTER TABLE public.streaming_overlays_v2 ADD CONSTRAINT streaming_overlays_v2_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- streaming_products_v2 [p]
ALTER TABLE public.streaming_products_v2 ADD CONSTRAINT streaming_products_v2_pkey PRIMARY KEY (id);
-- streaming_products_v2 [f]
ALTER TABLE public.streaming_products_v2 ADD CONSTRAINT streaming_products_v2_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
-- streaming_products_v2 [f]
ALTER TABLE public.streaming_products_v2 ADD CONSTRAINT streaming_products_v2_session_id_fkey FOREIGN KEY (session_id) REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE;
-- streaming_providers_config [p]
ALTER TABLE public.streaming_providers_config ADD CONSTRAINT streaming_providers_config_pkey PRIMARY KEY (id);
-- streaming_providers_config [u]
ALTER TABLE public.streaming_providers_config ADD CONSTRAINT streaming_providers_config_owner_type_owner_id_provider_key UNIQUE (owner_type, owner_id, provider);
-- streaming_providers_config [c]
ALTER TABLE public.streaming_providers_config ADD CONSTRAINT streaming_providers_config_mode_check CHECK ((mode = ANY (ARRAY['test'::text, 'production'::text])));
-- streaming_sales [p]
ALTER TABLE public.streaming_sales ADD CONSTRAINT streaming_sales_pkey PRIMARY KEY (id);
-- streaming_sales [c]
ALTER TABLE public.streaming_sales ADD CONSTRAINT streaming_sales_sale_type_check CHECK ((sale_type = ANY (ARRAY['live_service'::text, 'subscription'::text, 'per_event'::text, 'channel_rental'::text])));
-- streaming_session_channels_v2 [p]
ALTER TABLE public.streaming_session_channels_v2 ADD CONSTRAINT streaming_session_channels_v2_pkey PRIMARY KEY (id);
-- streaming_session_channels_v2 [u]
ALTER TABLE public.streaming_session_channels_v2 ADD CONSTRAINT streaming_session_channels_v2_session_id_channel_id_key UNIQUE (session_id, channel_id);
-- streaming_session_channels_v2 [f]
ALTER TABLE public.streaming_session_channels_v2 ADD CONSTRAINT streaming_session_channels_v2_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES streaming_channels_v2(id) ON DELETE CASCADE;
-- streaming_session_channels_v2 [f]
ALTER TABLE public.streaming_session_channels_v2 ADD CONSTRAINT streaming_session_channels_v2_session_id_fkey FOREIGN KEY (session_id) REFERENCES streaming_sessions_v2(id) ON DELETE CASCADE;
-- streaming_sessions_v2 [p]
ALTER TABLE public.streaming_sessions_v2 ADD CONSTRAINT streaming_sessions_v2_pkey PRIMARY KEY (id);
-- streaming_sessions_v2 [f]
ALTER TABLE public.streaming_sessions_v2 ADD CONSTRAINT streaming_sessions_v2_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES marketplace_campaigns(id);
-- streaming_sessions_v2 [f]
ALTER TABLE public.streaming_sessions_v2 ADD CONSTRAINT streaming_sessions_v2_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);
-- streaming_sessions_v2 [f]
ALTER TABLE public.streaming_sessions_v2 ADD CONSTRAINT streaming_sessions_v2_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES auth.users(id);
-- streaming_sessions_v2 [f]
ALTER TABLE public.streaming_sessions_v2 ADD CONSTRAINT streaming_sessions_v2_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- streaming_sessions_v2 [f]
ALTER TABLE public.streaming_sessions_v2 ADD CONSTRAINT streaming_sessions_v2_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
-- suggested_profiles_cache [p]
ALTER TABLE public.suggested_profiles_cache ADD CONSTRAINT suggested_profiles_cache_pkey PRIMARY KEY (id);
-- suggested_profiles_cache [u]
ALTER TABLE public.suggested_profiles_cache ADD CONSTRAINT unique_suggestion UNIQUE (user_id, suggested_user_id);
-- unified_reputation_config [p]
ALTER TABLE public.unified_reputation_config ADD CONSTRAINT unified_reputation_config_pkey PRIMARY KEY (id);
-- unified_reputation_config [u]
ALTER TABLE public.unified_reputation_config ADD CONSTRAINT unified_reputation_config_organization_id_key UNIQUE (organization_id);
-- unified_reputation_config [f]
ALTER TABLE public.unified_reputation_config ADD CONSTRAINT unified_reputation_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_ai_config [p]
ALTER TABLE public.up_ai_config ADD CONSTRAINT up_ai_config_pkey PRIMARY KEY (id);
-- up_ai_config [u]
ALTER TABLE public.up_ai_config ADD CONSTRAINT up_ai_config_organization_id_key UNIQUE (organization_id);
-- up_arbiter_log [p]
ALTER TABLE public.up_arbiter_log ADD CONSTRAINT up_arbiter_log_pkey PRIMARY KEY (id);
-- up_arbiter_log [f]
ALTER TABLE public.up_arbiter_log ADD CONSTRAINT up_arbiter_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_chronometer_pauses [p]
ALTER TABLE public.up_chronometer_pauses ADD CONSTRAINT up_chronometer_pauses_pkey PRIMARY KEY (id);
-- up_chronometer_pauses [f]
ALTER TABLE public.up_chronometer_pauses ADD CONSTRAINT up_chronometer_pauses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_client_trust_scores [p]
ALTER TABLE public.up_client_trust_scores ADD CONSTRAINT up_client_trust_scores_pkey PRIMARY KEY (id);
-- up_client_trust_scores [u]
ALTER TABLE public.up_client_trust_scores ADD CONSTRAINT up_client_trust_scores_organization_id_client_id_key UNIQUE (organization_id, client_id);
-- up_client_trust_scores [f]
ALTER TABLE public.up_client_trust_scores ADD CONSTRAINT up_client_trust_scores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_creadores [p]
ALTER TABLE public.up_creadores ADD CONSTRAINT up_creadores_pkey PRIMARY KEY (id);
-- up_creadores [f]
ALTER TABLE public.up_creadores ADD CONSTRAINT up_creadores_content_id_fkey FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE SET NULL;
-- up_creadores [f]
ALTER TABLE public.up_creadores ADD CONSTRAINT up_creadores_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- up_creadores [f]
ALTER TABLE public.up_creadores ADD CONSTRAINT up_creadores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_creadores [f]
ALTER TABLE public.up_creadores ADD CONSTRAINT up_creadores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- up_creadores_totals [p]
ALTER TABLE public.up_creadores_totals ADD CONSTRAINT up_creadores_totals_pkey PRIMARY KEY (id);
-- up_creadores_totals [u]
ALTER TABLE public.up_creadores_totals ADD CONSTRAINT up_creadores_totals_user_id_organization_id_season_id_key UNIQUE (user_id, organization_id, season_id);
-- up_creadores_totals [f]
ALTER TABLE public.up_creadores_totals ADD CONSTRAINT up_creadores_totals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_creadores_totals [f]
ALTER TABLE public.up_creadores_totals ADD CONSTRAINT up_creadores_totals_season_id_fkey FOREIGN KEY (season_id) REFERENCES up_seasons(id) ON DELETE SET NULL;
-- up_creadores_totals [f]
ALTER TABLE public.up_creadores_totals ADD CONSTRAINT up_creadores_totals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- up_currency_conversions [p]
ALTER TABLE public.up_currency_conversions ADD CONSTRAINT up_currency_conversions_pkey PRIMARY KEY (id);
-- up_currency_conversions [c]
ALTER TABLE public.up_currency_conversions ADD CONSTRAINT up_currency_conversions_from_currency_check CHECK ((from_currency = ANY (ARRAY['UP'::text, 'secondary'::text])));
-- up_currency_conversions [c]
ALTER TABLE public.up_currency_conversions ADD CONSTRAINT up_currency_conversions_to_currency_check CHECK ((to_currency = ANY (ARRAY['UP'::text, 'secondary'::text])));
-- up_editores [p]
ALTER TABLE public.up_editores ADD CONSTRAINT up_editores_pkey PRIMARY KEY (id);
-- up_editores [f]
ALTER TABLE public.up_editores ADD CONSTRAINT up_editores_content_id_fkey FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE SET NULL;
-- up_editores [f]
ALTER TABLE public.up_editores ADD CONSTRAINT up_editores_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
-- up_editores [f]
ALTER TABLE public.up_editores ADD CONSTRAINT up_editores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_editores [f]
ALTER TABLE public.up_editores ADD CONSTRAINT up_editores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- up_editores_totals [p]
ALTER TABLE public.up_editores_totals ADD CONSTRAINT up_editores_totals_pkey PRIMARY KEY (id);
-- up_editores_totals [u]
ALTER TABLE public.up_editores_totals ADD CONSTRAINT up_editores_totals_user_id_organization_id_season_id_key UNIQUE (user_id, organization_id, season_id);
-- up_editores_totals [f]
ALTER TABLE public.up_editores_totals ADD CONSTRAINT up_editores_totals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_editores_totals [f]
ALTER TABLE public.up_editores_totals ADD CONSTRAINT up_editores_totals_season_id_fkey FOREIGN KEY (season_id) REFERENCES up_seasons(id) ON DELETE SET NULL;
-- up_editores_totals [f]
ALTER TABLE public.up_editores_totals ADD CONSTRAINT up_editores_totals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- up_event_types [p]
ALTER TABLE public.up_event_types ADD CONSTRAINT up_event_types_pkey PRIMARY KEY (id);
-- up_event_types [u]
ALTER TABLE public.up_event_types ADD CONSTRAINT up_event_types_organization_id_event_key_key UNIQUE (organization_id, event_key);
-- up_events [p]
ALTER TABLE public.up_events ADD CONSTRAINT up_events_pkey PRIMARY KEY (id);
-- up_fraud_alerts [p]
ALTER TABLE public.up_fraud_alerts ADD CONSTRAINT up_fraud_alerts_pkey PRIMARY KEY (id);
-- up_fraud_alerts [c]
ALTER TABLE public.up_fraud_alerts ADD CONSTRAINT up_fraud_alerts_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
-- up_permissions [p]
ALTER TABLE public.up_permissions ADD CONSTRAINT up_permissions_pkey PRIMARY KEY (id);
-- up_permissions [u]
ALTER TABLE public.up_permissions ADD CONSTRAINT up_permissions_organization_id_role_key UNIQUE (organization_id, role);
-- up_quality_scores [p]
ALTER TABLE public.up_quality_scores ADD CONSTRAINT up_quality_scores_pkey PRIMARY KEY (id);
-- up_quality_scores [u]
ALTER TABLE public.up_quality_scores ADD CONSTRAINT up_quality_scores_content_id_key UNIQUE (content_id);
-- up_quality_scores [c]
ALTER TABLE public.up_quality_scores ADD CONSTRAINT up_quality_scores_score_check CHECK (((score >= 0) AND (score <= 100)));
-- up_quest_progress [p]
ALTER TABLE public.up_quest_progress ADD CONSTRAINT up_quest_progress_pkey PRIMARY KEY (id);
-- up_quest_progress [u]
ALTER TABLE public.up_quest_progress ADD CONSTRAINT up_quest_progress_quest_id_user_id_key UNIQUE (quest_id, user_id);
-- up_quests [p]
ALTER TABLE public.up_quests ADD CONSTRAINT up_quests_pkey PRIMARY KEY (id);
-- up_rules [p]
ALTER TABLE public.up_rules ADD CONSTRAINT up_rules_pkey PRIMARY KEY (id);
-- up_season_snapshots [p]
ALTER TABLE public.up_season_snapshots ADD CONSTRAINT up_season_snapshots_pkey PRIMARY KEY (id);
-- up_season_snapshots [c]
ALTER TABLE public.up_season_snapshots ADD CONSTRAINT up_season_snapshots_user_type_check CHECK ((user_type = ANY (ARRAY['creator'::text, 'editor'::text])));
-- up_season_snapshots [f]
ALTER TABLE public.up_season_snapshots ADD CONSTRAINT up_season_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- up_seasons [p]
ALTER TABLE public.up_seasons ADD CONSTRAINT up_seasons_pkey PRIMARY KEY (id);
-- up_seasons [u]
ALTER TABLE public.up_seasons ADD CONSTRAINT up_seasons_organization_id_name_key UNIQUE (organization_id, name);
-- up_settings [p]
ALTER TABLE public.up_settings ADD CONSTRAINT up_settings_pkey PRIMARY KEY (id);
-- up_settings [u]
ALTER TABLE public.up_settings ADD CONSTRAINT up_settings_key_key UNIQUE (key);
-- up_user_scores [p]
ALTER TABLE public.up_user_scores ADD CONSTRAINT up_user_scores_pkey PRIMARY KEY (id);
-- up_user_scores [f]
ALTER TABLE public.up_user_scores ADD CONSTRAINT up_user_scores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- up_user_scores [f]
ALTER TABLE public.up_user_scores ADD CONSTRAINT up_user_scores_season_id_fkey FOREIGN KEY (season_id) REFERENCES up_seasons(id) ON DELETE SET NULL;
-- up_user_scores [f]
ALTER TABLE public.up_user_scores ADD CONSTRAINT up_user_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- user_achievements [p]
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);
-- user_achievements [u]
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);
-- user_daily_missions [p]
ALTER TABLE public.user_daily_missions ADD CONSTRAINT user_daily_missions_pkey PRIMARY KEY (id);
-- user_daily_missions [u]
ALTER TABLE public.user_daily_missions ADD CONSTRAINT user_daily_missions_user_id_assigned_date_mission_template__key UNIQUE (user_id, assigned_date, mission_template_id);
-- user_daily_missions [f]
ALTER TABLE public.user_daily_missions ADD CONSTRAINT user_daily_missions_mission_template_id_fkey FOREIGN KEY (mission_template_id) REFERENCES mission_templates(id) ON DELETE CASCADE;
-- user_daily_missions [f]
ALTER TABLE public.user_daily_missions ADD CONSTRAINT user_daily_missions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- user_feed_events [p]
ALTER TABLE public.user_feed_events ADD CONSTRAINT user_feed_events_pkey PRIMARY KEY (id);
-- user_global_badges [p]
ALTER TABLE public.user_global_badges ADD CONSTRAINT user_global_badges_pkey PRIMARY KEY (id);
-- user_global_badges [u]
ALTER TABLE public.user_global_badges ADD CONSTRAINT user_global_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);
-- user_global_badges [f]
ALTER TABLE public.user_global_badges ADD CONSTRAINT user_global_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES global_badges(id) ON DELETE CASCADE;
-- user_global_badges [f]
ALTER TABLE public.user_global_badges ADD CONSTRAINT user_global_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- user_global_stats [p]
ALTER TABLE public.user_global_stats ADD CONSTRAINT user_global_stats_pkey PRIMARY KEY (user_id);
-- user_global_stats [f]
ALTER TABLE public.user_global_stats ADD CONSTRAINT user_global_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- user_interest_profile [p]
ALTER TABLE public.user_interest_profile ADD CONSTRAINT user_interest_profile_pkey PRIMARY KEY (id);
-- user_interest_profile [u]
ALTER TABLE public.user_interest_profile ADD CONSTRAINT unique_user_interest UNIQUE (user_id);
-- user_interest_profile [u]
ALTER TABLE public.user_interest_profile ADD CONSTRAINT unique_viewer_interest UNIQUE (viewer_id);
-- user_points [p]
ALTER TABLE public.user_points ADD CONSTRAINT user_points_pkey PRIMARY KEY (id);
-- user_points [u]
ALTER TABLE public.user_points ADD CONSTRAINT user_points_user_id_key UNIQUE (user_id);
-- user_reputation_totals [p]
ALTER TABLE public.user_reputation_totals ADD CONSTRAINT user_reputation_totals_pkey PRIMARY KEY (id);
-- user_reputation_totals [u]
ALTER TABLE public.user_reputation_totals ADD CONSTRAINT user_reputation_totals_organization_id_user_id_role_key_key UNIQUE (organization_id, user_id, role_key);
-- user_reputation_totals [f]
ALTER TABLE public.user_reputation_totals ADD CONSTRAINT user_reputation_totals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- user_streaks [p]
ALTER TABLE public.user_streaks ADD CONSTRAINT user_streaks_pkey PRIMARY KEY (user_id);
-- user_streaks [f]
ALTER TABLE public.user_streaks ADD CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
