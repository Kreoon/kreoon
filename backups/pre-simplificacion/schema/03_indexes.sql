-- Indices de las 135 tablas del set
-- Proyecto Supabase: wjkbqcrxwsmvtxmqgiqc (schema public)
-- Respaldo pre-simplificacion generado 2026-08-11T21:38:59.462Z
-- Set: 135 tablas candidatas a eliminacion. SOLO DDL de respaldo, no ejecutar sin revisar.
-- Los indices respaldados por una constraint (PK/UNIQUE) van comentados al final:
-- se recrean solos al aplicar 02_constraints.sql. Indices propios: 253; respaldados por constraint: 201.
-- activation_publications
CREATE INDEX idx_activation_pub_campaign ON public.activation_publications USING btree (campaign_id);
-- activation_publications
CREATE INDEX idx_activation_pub_creator ON public.activation_publications USING btree (creator_id);
-- activation_publications
CREATE INDEX idx_activation_pub_must_stay ON public.activation_publications USING btree (must_stay_until) WHERE (is_still_live = true);
-- activation_publications
CREATE INDEX idx_activation_pub_platform ON public.activation_publications USING btree (platform);
-- activation_publications
CREATE INDEX idx_activation_pub_status ON public.activation_publications USING btree (verification_status);
-- activation_publications
CREATE UNIQUE INDEX idx_activation_pub_unique_platform ON public.activation_publications USING btree (application_id, platform);
-- booking_availability
CREATE INDEX idx_booking_availability_day ON public.booking_availability USING btree (user_id, day_of_week);
-- booking_availability
CREATE INDEX idx_booking_availability_user_id ON public.booking_availability USING btree (user_id);
-- booking_branding
CREATE INDEX idx_booking_branding_user ON public.booking_branding USING btree (user_id);
-- booking_custom_questions
CREATE INDEX idx_booking_questions_event_type ON public.booking_custom_questions USING btree (event_type_id);
-- booking_custom_questions
CREATE INDEX idx_booking_questions_sort ON public.booking_custom_questions USING btree (event_type_id, sort_order);
-- booking_event_types
CREATE INDEX idx_booking_event_types_active ON public.booking_event_types USING btree (user_id, is_active) WHERE (is_active = true);
-- booking_event_types
CREATE INDEX idx_booking_event_types_slug ON public.booking_event_types USING btree (user_id, slug);
-- booking_event_types
CREATE INDEX idx_booking_event_types_user_id ON public.booking_event_types USING btree (user_id);
-- booking_exceptions
CREATE INDEX idx_booking_exceptions_date ON public.booking_exceptions USING btree (user_id, exception_date);
-- booking_exceptions
CREATE INDEX idx_booking_exceptions_user_id ON public.booking_exceptions USING btree (user_id);
-- booking_question_answers
CREATE INDEX idx_booking_answers_booking ON public.booking_question_answers USING btree (booking_id);
-- booking_question_answers
CREATE INDEX idx_booking_answers_question ON public.booking_question_answers USING btree (question_id);
-- booking_reminder_logs
CREATE INDEX idx_reminder_logs_booking ON public.booking_reminder_logs USING btree (booking_id);
-- booking_reminder_logs
CREATE INDEX idx_reminder_logs_sent_at ON public.booking_reminder_logs USING btree (sent_at);
-- booking_reminder_settings
CREATE INDEX idx_reminder_settings_enabled ON public.booking_reminder_settings USING btree (event_type_id, enabled);
-- booking_reminder_settings
CREATE INDEX idx_reminder_settings_event_type ON public.booking_reminder_settings USING btree (event_type_id);
-- booking_webhook_logs
CREATE INDEX idx_webhook_logs_booking ON public.booking_webhook_logs USING btree (booking_id);
-- booking_webhook_logs
CREATE INDEX idx_webhook_logs_sent_at ON public.booking_webhook_logs USING btree (sent_at);
-- booking_webhook_logs
CREATE INDEX idx_webhook_logs_webhook ON public.booking_webhook_logs USING btree (webhook_id);
-- booking_webhooks
CREATE INDEX idx_webhooks_active ON public.booking_webhooks USING btree (user_id, active);
-- booking_webhooks
CREATE INDEX idx_webhooks_user ON public.booking_webhooks USING btree (user_id);
-- bookings
CREATE INDEX idx_bookings_cancel_token ON public.bookings USING btree (cancel_token);
-- bookings
CREATE INDEX idx_bookings_cancellation_token ON public.bookings USING btree (cancellation_token);
-- bookings
CREATE INDEX idx_bookings_confirmation_token ON public.bookings USING btree (confirmation_token);
-- bookings
CREATE INDEX idx_bookings_event_type ON public.bookings USING btree (event_type_id);
-- bookings
CREATE INDEX idx_bookings_guest ON public.bookings USING btree (guest_user_id);
-- bookings
CREATE INDEX idx_bookings_host ON public.bookings USING btree (host_user_id);
-- bookings
CREATE INDEX idx_bookings_host_upcoming ON public.bookings USING btree (host_user_id, start_time) WHERE (status = ANY (ARRAY['pending'::booking_status, 'confirmed'::booking_status]));
-- bookings
CREATE INDEX idx_bookings_reschedule_token ON public.bookings USING btree (reschedule_token);
-- bookings
CREATE INDEX idx_bookings_start_time ON public.bookings USING btree (start_time);
-- bookings
CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);
-- calendar_blocked_events
CREATE INDEX idx_calendar_blocked_times ON public.calendar_blocked_events USING btree (integration_id, start_time, end_time);
-- calendar_event_mappings
CREATE INDEX idx_calendar_mappings_booking ON public.calendar_event_mappings USING btree (booking_id);
-- calendar_event_mappings
CREATE INDEX idx_calendar_mappings_external ON public.calendar_event_mappings USING btree (external_event_id);
-- calendar_integrations
CREATE INDEX idx_calendar_integrations_provider ON public.calendar_integrations USING btree (user_id, provider);
-- calendar_integrations
CREATE INDEX idx_calendar_integrations_user ON public.calendar_integrations USING btree (user_id);
-- campaign_applications
CREATE INDEX idx_applications_campaign ON public.campaign_applications USING btree (campaign_id);
-- campaign_applications
CREATE INDEX idx_applications_creator ON public.campaign_applications USING btree (creator_id);
-- campaign_applications
CREATE INDEX idx_applications_payment_status ON public.campaign_applications USING btree (payment_status) WHERE (payment_status <> 'unpaid'::text);
-- campaign_applications
CREATE INDEX idx_applications_status ON public.campaign_applications USING btree (status);
-- campaign_applications
CREATE INDEX idx_campaign_applications_org ON public.campaign_applications USING btree (organization_id);
-- campaign_deliverables
CREATE INDEX idx_campaign_deliverables_org ON public.campaign_deliverables USING btree (organization_id);
-- campaign_deliverables
CREATE INDEX idx_deliverables_application ON public.campaign_deliverables USING btree (application_id);
-- campaign_deliverables
CREATE INDEX idx_deliverables_campaign ON public.campaign_deliverables USING btree (campaign_id);
-- campaign_deliverables
CREATE INDEX idx_deliverables_creator ON public.campaign_deliverables USING btree (creator_id);
-- campaign_deliverables
CREATE INDEX idx_deliverables_status ON public.campaign_deliverables USING btree (status);
-- campaign_invitations
CREATE INDEX idx_campaign_invitations_org ON public.campaign_invitations USING btree (organization_id);
-- campaign_invitations
CREATE INDEX idx_invitations_campaign ON public.campaign_invitations USING btree (campaign_id);
-- campaign_invitations
CREATE INDEX idx_invitations_profile ON public.campaign_invitations USING btree (invited_profile_id);
-- campaign_invitations
CREATE INDEX idx_invitations_status ON public.campaign_invitations USING btree (status);
-- campaign_mappings
CREATE INDEX idx_campaign_mappings_account ON public.campaign_mappings USING btree (connected_account_id);
-- campaign_mappings
CREATE INDEX idx_campaign_mappings_org ON public.campaign_mappings USING btree (organization_id);
-- campaign_mappings
CREATE INDEX idx_campaign_mappings_user ON public.campaign_mappings USING btree (user_id, platform);
-- campaign_media
CREATE INDEX idx_campaign_media_campaign ON public.campaign_media USING btree (campaign_id);
-- campaign_media
CREATE INDEX idx_campaign_media_org ON public.campaign_media USING btree (organization_id);
-- campaign_metrics
CREATE INDEX idx_campaign_metrics_mapping ON public.campaign_metrics USING btree (campaign_mapping_id, date DESC);
-- campaign_metrics
CREATE INDEX idx_campaign_metrics_org ON public.campaign_metrics USING btree (organization_id);
-- campaign_notifications
CREATE INDEX idx_campaign_notifications_campaign ON public.campaign_notifications USING btree (campaign_id);
-- campaign_notifications
CREATE INDEX idx_campaign_notifications_org ON public.campaign_notifications USING btree (organization_id);
-- campaign_notifications
CREATE INDEX idx_campaign_notifications_user ON public.campaign_notifications USING btree (user_id, is_read);
-- campaign_redemptions
CREATE INDEX idx_campaign_redemptions_org ON public.campaign_redemptions USING btree (organization_id);
-- content_likes
CREATE INDEX idx_content_likes_content_id ON public.content_likes USING btree (content_id);
-- creator_availability
CREATE INDEX idx_creator_availability_available ON public.creator_availability USING btree (user_id) WHERE ((status)::text = ANY ((ARRAY['available'::character varying, 'busy'::character varying, 'limited'::character varying])::text[]));
-- creator_availability
CREATE INDEX idx_creator_availability_status ON public.creator_availability USING btree (status);
-- creator_availability
CREATE INDEX idx_creator_availability_vacation ON public.creator_availability USING btree (vacation_end) WHERE ((status)::text = 'vacation'::text);
-- creator_live_streams
CREATE INDEX idx_live_streams_cf_input ON public.creator_live_streams USING btree (cf_live_input_id);
-- creator_live_streams
CREATE INDEX idx_live_streams_creator ON public.creator_live_streams USING btree (creator_profile_id);
-- creator_live_streams
CREATE INDEX idx_live_streams_live ON public.creator_live_streams USING btree (status) WHERE (status = 'live'::live_stream_status);
-- creator_live_streams
CREATE INDEX idx_live_streams_status ON public.creator_live_streams USING btree (status);
-- creator_live_streams
CREATE INDEX idx_live_streams_user ON public.creator_live_streams USING btree (user_id);
-- feed_reactions
CREATE INDEX idx_feed_reactions_post ON public.feed_reactions USING btree (post_id);
-- feed_reactions
CREATE INDEX idx_feed_reactions_user ON public.feed_reactions USING btree (user_id);
-- followers
CREATE INDEX idx_followers_follower_id ON public.followers USING btree (follower_id);
-- followers
CREATE INDEX idx_followers_following_id ON public.followers USING btree (following_id);
-- global_badges
CREATE INDEX idx_global_badges_category ON public.global_badges USING btree (category, rarity);
-- global_badges
CREATE INDEX idx_global_badges_key ON public.global_badges USING btree (key);
-- kreadores_content_likes
CREATE INDEX kreadores_content_likes_portfolio_item_id_idx ON public.kreadores_content_likes USING btree (portfolio_item_id);
-- kreadores_content_likes
CREATE INDEX kreadores_content_likes_user_id_idx ON public.kreadores_content_likes USING btree (user_id);
-- link_previews
CREATE INDEX idx_link_previews_url ON public.link_previews USING btree (url);
-- live_client_settings
CREATE INDEX idx_live_client_settings_client ON public.live_client_settings USING btree (client_id);
-- live_event_monitoring
CREATE INDEX idx_live_monitoring_event ON public.live_event_monitoring USING btree (event_id);
-- live_hosting_hosts
CREATE INDEX idx_live_hosting_hosts_creator_profile ON public.live_hosting_hosts USING btree (creator_profile_id);
-- live_hosting_hosts
CREATE INDEX idx_live_hosting_hosts_request ON public.live_hosting_hosts USING btree (request_id);
-- live_hosting_hosts
CREATE INDEX idx_live_hosting_hosts_status ON public.live_hosting_hosts USING btree (status);
-- live_hosting_hosts
CREATE INDEX idx_live_hosting_hosts_user ON public.live_hosting_hosts USING btree (user_id);
-- live_hosting_requests
CREATE INDEX idx_live_hosting_requests_brand ON public.live_hosting_requests USING btree (brand_id);
-- live_hosting_requests
CREATE INDEX idx_live_hosting_requests_channel ON public.live_hosting_requests USING btree (channel);
-- live_hosting_requests
CREATE INDEX idx_live_hosting_requests_client ON public.live_hosting_requests USING btree (client_id);
-- live_hosting_requests
CREATE INDEX idx_live_hosting_requests_date ON public.live_hosting_requests USING btree (scheduled_date);
-- live_hosting_requests
CREATE INDEX idx_live_hosting_requests_org ON public.live_hosting_requests USING btree (organization_id);
-- live_hosting_requests
CREATE INDEX idx_live_hosting_requests_status ON public.live_hosting_requests USING btree (status);
-- live_hosting_status_history
CREATE INDEX idx_live_hosting_history_request ON public.live_hosting_status_history USING btree (request_id);
-- live_hosting_templates
CREATE INDEX idx_live_hosting_templates_org ON public.live_hosting_templates USING btree (organization_id);
-- live_hour_assignments
CREATE INDEX idx_live_assignments_org_client ON public.live_hour_assignments USING btree (organization_id, client_id);
-- live_hour_assignments
CREATE INDEX idx_live_assignments_wallet ON public.live_hour_assignments USING btree (wallet_id);
-- live_packages
CREATE INDEX idx_live_packages_org ON public.live_packages USING btree (organization_id);
-- live_platform_config
CREATE UNIQUE INDEX live_platform_config_singleton ON public.live_platform_config USING btree ((true));
-- live_stream_comments
CREATE INDEX idx_live_comments_pinned ON public.live_stream_comments USING btree (stream_id) WHERE (is_pinned = true);
-- live_stream_comments
CREATE INDEX idx_live_comments_stream ON public.live_stream_comments USING btree (stream_id);
-- live_stream_comments
CREATE INDEX idx_live_comments_stream_time ON public.live_stream_comments USING btree (stream_id, created_at DESC);
-- live_stream_history
CREATE INDEX idx_live_history_event ON public.live_stream_history USING btree (event_id);
-- live_stream_history
CREATE INDEX idx_live_history_org ON public.live_stream_history USING btree (organization_id);
-- live_stream_products
CREATE INDEX idx_live_products_stream ON public.live_stream_products USING btree (stream_id);
-- live_stream_reactions
CREATE INDEX idx_live_reactions_stream ON public.live_stream_reactions USING btree (stream_id);
-- live_stream_viewers
CREATE INDEX idx_live_viewers_active ON public.live_stream_viewers USING btree (stream_id, left_at) WHERE (left_at IS NULL);
-- live_stream_viewers
CREATE INDEX idx_live_viewers_stream ON public.live_stream_viewers USING btree (stream_id);
-- live_streaming_channels
CREATE INDEX idx_live_channels_org ON public.live_streaming_channels USING btree (organization_id);
-- managed_campaign_subscriptions
CREATE INDEX idx_mcs_status_plan ON public.managed_campaign_subscriptions USING btree (status, plan);
-- managed_campaign_subscriptions
CREATE UNIQUE INDEX idx_mcs_stripe_session_id ON public.managed_campaign_subscriptions USING btree (stripe_session_id);
-- managed_campaign_subscriptions
CREATE INDEX idx_mcs_user_email ON public.managed_campaign_subscriptions USING btree (user_email);
-- managed_campaign_subscriptions
CREATE INDEX idx_mcs_user_id ON public.managed_campaign_subscriptions USING btree (user_id);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_brand ON public.marketplace_campaigns USING btree (brand_id);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_brand_activation ON public.marketplace_campaigns USING btree (is_brand_activation) WHERE (is_brand_activation = true);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_category ON public.marketplace_campaigns USING btree (category);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_client_id ON public.marketplace_campaigns USING btree (client_id) WHERE (client_id IS NOT NULL);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_content_management ON public.marketplace_campaigns USING btree (content_management_type);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_deadline ON public.marketplace_campaigns USING btree (deadline);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_org_id ON public.marketplace_campaigns USING btree (organization_id);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_organization_id ON public.marketplace_campaigns USING btree (organization_id) WHERE (organization_id IS NOT NULL);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_payment_status ON public.marketplace_campaigns USING btree (payment_status) WHERE (payment_status <> 'unpaid'::text);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_slug ON public.marketplace_campaigns USING btree (slug);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_status ON public.marketplace_campaigns USING btree (status);
-- marketplace_campaigns
CREATE INDEX idx_campaigns_visibility ON public.marketplace_campaigns USING btree (visibility);
-- point_transactions
CREATE INDEX idx_point_transactions_content_id ON public.point_transactions USING btree (content_id);
-- point_transactions
CREATE INDEX idx_point_transactions_created_at ON public.point_transactions USING btree (created_at DESC);
-- point_transactions
CREATE INDEX idx_point_transactions_user_id ON public.point_transactions USING btree (user_id);
-- portfolio_post_likes
CREATE INDEX idx_portfolio_post_likes_post ON public.portfolio_post_likes USING btree (post_id);
-- portfolio_post_likes
CREATE INDEX idx_portfolio_post_likes_viewer ON public.portfolio_post_likes USING btree (viewer_id);
-- portfolio_posts
CREATE INDEX idx_portfolio_posts_created ON public.portfolio_posts USING btree (created_at DESC) WHERE (deleted_at IS NULL);
-- portfolio_posts
CREATE INDEX idx_portfolio_posts_pinned ON public.portfolio_posts USING btree (user_id, is_pinned, pinned_at DESC);
-- portfolio_posts
CREATE INDEX idx_portfolio_posts_user_id ON public.portfolio_posts USING btree (user_id);
-- post_metrics
CREATE INDEX idx_post_metrics_account ON public.post_metrics USING btree (social_account_id, fetched_at DESC);
-- post_metrics
CREATE INDEX idx_post_metrics_post ON public.post_metrics USING btree (scheduled_post_id);
-- post_metrics
CREATE UNIQUE INDEX idx_post_metrics_unique ON public.post_metrics USING btree (scheduled_post_id, social_account_id);
-- profile_views
CREATE INDEX idx_profile_views_date ON public.profile_views USING btree (created_at DESC);
-- profile_views
CREATE INDEX idx_profile_views_profile ON public.profile_views USING btree (profile_user_id);
-- publication_verification_queue
CREATE INDEX idx_verification_queue_publication ON public.publication_verification_queue USING btree (publication_id);
-- publication_verification_queue
CREATE INDEX idx_verification_queue_scheduled ON public.publication_verification_queue USING btree (scheduled_for) WHERE ((status)::text = 'pending'::text);
-- reputation_events
CREATE INDEX idx_rep_events_date ON public.reputation_events USING btree (event_date);
-- reputation_events
CREATE INDEX idx_rep_events_org_user ON public.reputation_events USING btree (organization_id, user_id);
-- reputation_events
CREATE INDEX idx_rep_events_ref ON public.reputation_events USING btree (reference_type, reference_id);
-- reputation_events
CREATE INDEX idx_rep_events_season ON public.reputation_events USING btree (season_id);
-- reputation_global
CREATE INDEX idx_reputation_global_level ON public.reputation_global USING btree (global_level);
-- reputation_global
CREATE INDEX idx_reputation_global_score ON public.reputation_global USING btree (composite_score DESC);
-- reputation_seasons
CREATE INDEX idx_rep_seasons_org ON public.reputation_seasons USING btree (organization_id, is_active);
-- role_multipliers
CREATE INDEX idx_role_multipliers_org ON public.role_multipliers USING btree (organization_id, multiplier_type);
-- role_points_config
CREATE INDEX idx_role_points_config_org ON public.role_points_config USING btree (organization_id);
-- role_weight_config
CREATE INDEX idx_rwc_org ON public.role_weight_config USING btree (organization_id);
-- role_weight_config
CREATE INDEX idx_rwc_role ON public.role_weight_config USING btree (role_key);
-- role_weight_config
CREATE UNIQUE INDEX idx_rwc_unique_global ON public.role_weight_config USING btree (role_key) WHERE (organization_id IS NULL);
-- role_weight_config
CREATE UNIQUE INDEX idx_rwc_unique_org ON public.role_weight_config USING btree (organization_id, role_key) WHERE (organization_id IS NOT NULL);
-- saved_collections
CREATE INDEX idx_saved_collections_user ON public.saved_collections USING btree (user_id);
-- saved_creators
CREATE INDEX idx_saved_creators_creator ON public.saved_creators USING btree (creator_id);
-- saved_creators
CREATE INDEX idx_saved_creators_user ON public.saved_creators USING btree (user_id);
-- saved_items
CREATE INDEX idx_saved_items_collection ON public.saved_items USING btree (collection_id);
-- saved_items
CREATE INDEX idx_saved_items_item ON public.saved_items USING btree (item_type, item_id);
-- saved_items
CREATE INDEX idx_saved_items_user ON public.saved_items USING btree (user_id);
-- saved_searches
CREATE INDEX idx_saved_searches_user ON public.saved_searches USING btree (user_id);
-- season_goals
CREATE INDEX idx_season_goals_org_temporada ON public.season_goals USING btree (organization_id, temporada);
-- season_reward_claims
CREATE INDEX idx_reward_claims_season ON public.season_reward_claims USING btree (season_id, status);
-- season_reward_claims
CREATE INDEX idx_reward_claims_user ON public.season_reward_claims USING btree (user_id, status);
-- season_rewards
CREATE INDEX idx_season_rewards_org ON public.season_rewards USING btree (organization_id);
-- season_rewards
CREATE INDEX idx_season_rewards_season ON public.season_rewards USING btree (season_id, is_active);
-- social_notifications
CREATE INDEX idx_social_notifications_created_at ON public.social_notifications USING btree (created_at DESC);
-- social_notifications
CREATE INDEX idx_social_notifications_user_id ON public.social_notifications USING btree (user_id);
-- story_views
CREATE INDEX idx_story_views_story ON public.story_views USING btree (story_id);
-- streaming_accounts
CREATE INDEX idx_streaming_accounts_client_id ON public.streaming_accounts USING btree (client_id);
-- streaming_accounts
CREATE INDEX idx_streaming_accounts_owner ON public.streaming_accounts USING btree (owner_type, owner_id);
-- streaming_accounts
CREATE INDEX idx_streaming_accounts_status ON public.streaming_accounts USING btree (status);
-- streaming_analytics_v2
CREATE INDEX idx_streaming_analytics_v2_session ON public.streaming_analytics_v2 USING btree (session_id, "timestamp" DESC);
-- streaming_channels_v2
CREATE INDEX idx_streaming_channels_v2_active ON public.streaming_channels_v2 USING btree (organization_id) WHERE (is_active = true);
-- streaming_channels_v2
CREATE INDEX idx_streaming_channels_v2_org ON public.streaming_channels_v2 USING btree (organization_id);
-- streaming_channels_v2
CREATE INDEX idx_streaming_channels_v2_platform ON public.streaming_channels_v2 USING btree (platform);
-- streaming_chat_messages_v2
CREATE INDEX idx_streaming_chat_v2_pinned ON public.streaming_chat_messages_v2 USING btree (session_id) WHERE (is_pinned = true);
-- streaming_chat_messages_v2
CREATE INDEX idx_streaming_chat_v2_session ON public.streaming_chat_messages_v2 USING btree (session_id, created_at DESC);
-- streaming_event_products
CREATE INDEX idx_streaming_event_products_event ON public.streaming_event_products USING btree (event_id);
-- streaming_events
CREATE INDEX idx_streaming_events_client ON public.streaming_events USING btree (client_id);
-- streaming_events
CREATE INDEX idx_streaming_events_org ON public.streaming_events USING btree (organization_id);
-- streaming_events
CREATE INDEX idx_streaming_events_owner ON public.streaming_events USING btree (owner_type, owner_id);
-- streaming_events
CREATE INDEX idx_streaming_events_scheduled ON public.streaming_events USING btree (scheduled_at);
-- streaming_events
CREATE INDEX idx_streaming_events_status ON public.streaming_events USING btree (status);
-- streaming_guests_v2
CREATE INDEX idx_streaming_guests_v2_session ON public.streaming_guests_v2 USING btree (session_id);
-- streaming_guests_v2
CREATE INDEX idx_streaming_guests_v2_token ON public.streaming_guests_v2 USING btree (join_token);
-- streaming_guests_v2
CREATE INDEX idx_streaming_guests_v2_user ON public.streaming_guests_v2 USING btree (user_id);
-- streaming_logs
CREATE INDEX idx_streaming_logs_created ON public.streaming_logs USING btree (created_at DESC);
-- streaming_logs
CREATE INDEX idx_streaming_logs_event ON public.streaming_logs USING btree (event_id);
-- streaming_logs
CREATE INDEX idx_streaming_logs_owner ON public.streaming_logs USING btree (owner_type, owner_id);
-- streaming_logs
CREATE INDEX idx_streaming_logs_type ON public.streaming_logs USING btree (log_type);
-- streaming_overlays_v2
CREATE INDEX idx_streaming_overlays_v2_active ON public.streaming_overlays_v2 USING btree (organization_id) WHERE (is_active = true);
-- streaming_overlays_v2
CREATE INDEX idx_streaming_overlays_v2_org ON public.streaming_overlays_v2 USING btree (organization_id);
-- streaming_overlays_v2
CREATE INDEX idx_streaming_overlays_v2_template ON public.streaming_overlays_v2 USING btree (organization_id) WHERE (is_template = true);
-- streaming_products_v2
CREATE INDEX idx_streaming_products_v2_featured ON public.streaming_products_v2 USING btree (session_id) WHERE (is_featured = true);
-- streaming_products_v2
CREATE INDEX idx_streaming_products_v2_flash ON public.streaming_products_v2 USING btree (session_id) WHERE (flash_offer_active = true);
-- streaming_products_v2
CREATE INDEX idx_streaming_products_v2_session ON public.streaming_products_v2 USING btree (session_id);
-- streaming_sales
CREATE INDEX idx_streaming_sales_client ON public.streaming_sales USING btree (client_id);
-- streaming_sales
CREATE INDEX idx_streaming_sales_owner ON public.streaming_sales USING btree (owner_type, owner_id);
-- streaming_sales
CREATE INDEX idx_streaming_sales_status ON public.streaming_sales USING btree (status);
-- streaming_session_channels_v2
CREATE INDEX idx_session_channels_v2_channel ON public.streaming_session_channels_v2 USING btree (channel_id);
-- streaming_session_channels_v2
CREATE INDEX idx_session_channels_v2_session ON public.streaming_session_channels_v2 USING btree (session_id);
-- streaming_sessions_v2
CREATE INDEX idx_streaming_sessions_v2_client ON public.streaming_sessions_v2 USING btree (client_id);
-- streaming_sessions_v2
CREATE INDEX idx_streaming_sessions_v2_host ON public.streaming_sessions_v2 USING btree (host_user_id);
-- streaming_sessions_v2
CREATE INDEX idx_streaming_sessions_v2_live ON public.streaming_sessions_v2 USING btree (organization_id) WHERE (status = 'live'::streaming_session_status);
-- streaming_sessions_v2
CREATE INDEX idx_streaming_sessions_v2_org ON public.streaming_sessions_v2 USING btree (organization_id);
-- streaming_sessions_v2
CREATE INDEX idx_streaming_sessions_v2_scheduled ON public.streaming_sessions_v2 USING btree (scheduled_at) WHERE (status = 'scheduled'::streaming_session_status);
-- streaming_sessions_v2
CREATE INDEX idx_streaming_sessions_v2_status ON public.streaming_sessions_v2 USING btree (status);
-- suggested_profiles_cache
CREATE INDEX idx_suggested_profiles_user ON public.suggested_profiles_cache USING btree (user_id);
-- up_arbiter_log
CREATE INDEX idx_arbiter_log_org ON public.up_arbiter_log USING btree (organization_id, created_at DESC);
-- up_chronometer_pauses
CREATE INDEX idx_chrono_active ON public.up_chronometer_pauses USING btree (content_id) WHERE (resumed_at IS NULL);
-- up_chronometer_pauses
CREATE INDEX idx_chrono_content ON public.up_chronometer_pauses USING btree (content_id, role);
-- up_chronometer_pauses
CREATE INDEX idx_chrono_org ON public.up_chronometer_pauses USING btree (organization_id);
-- up_client_trust_scores
CREATE INDEX idx_client_trust_org ON public.up_client_trust_scores USING btree (organization_id);
-- up_creadores
CREATE INDEX idx_up_creadores_user_org ON public.up_creadores USING btree (user_id, organization_id);
-- up_creadores_totals
CREATE INDEX idx_up_creadores_totals_org ON public.up_creadores_totals USING btree (organization_id, total_points DESC);
-- up_currency_conversions
CREATE INDEX idx_up_currency_conversions_org ON public.up_currency_conversions USING btree (organization_id);
-- up_currency_conversions
CREATE INDEX idx_up_currency_conversions_user ON public.up_currency_conversions USING btree (user_id);
-- up_editores
CREATE INDEX idx_up_editores_user_org ON public.up_editores USING btree (user_id, organization_id);
-- up_editores_totals
CREATE INDEX idx_up_editores_totals_org ON public.up_editores_totals USING btree (organization_id, total_points DESC);
-- up_events
CREATE INDEX idx_up_events_content ON public.up_events USING btree (content_id);
-- up_events
CREATE INDEX idx_up_events_created ON public.up_events USING btree (created_at DESC);
-- up_events
CREATE UNIQUE INDEX idx_up_events_dedup ON public.up_events USING btree (user_id, content_id, event_type_key) WHERE (content_id IS NOT NULL);
-- up_events
CREATE INDEX idx_up_events_org ON public.up_events USING btree (organization_id);
-- up_events
CREATE INDEX idx_up_events_user ON public.up_events USING btree (user_id);
-- up_fraud_alerts
CREATE INDEX idx_up_fraud_org ON public.up_fraud_alerts USING btree (organization_id);
-- up_quality_scores
CREATE INDEX idx_up_quality_content ON public.up_quality_scores USING btree (content_id);
-- up_quests
CREATE INDEX idx_up_quests_org ON public.up_quests USING btree (organization_id);
-- up_rules
CREATE INDEX idx_up_rules_org ON public.up_rules USING btree (organization_id);
-- up_season_snapshots
CREATE INDEX idx_up_season_snapshots_org ON public.up_season_snapshots USING btree (organization_id);
-- up_season_snapshots
CREATE INDEX idx_up_season_snapshots_season ON public.up_season_snapshots USING btree (season_id);
-- up_user_scores
CREATE INDEX idx_up_user_scores_org_normalized ON public.up_user_scores USING btree (organization_id, normalized_score DESC);
-- up_user_scores
CREATE INDEX idx_up_user_scores_org_points ON public.up_user_scores USING btree (organization_id, total_points DESC);
-- up_user_scores
CREATE INDEX idx_up_user_scores_role ON public.up_user_scores USING btree (role);
-- up_user_scores
CREATE UNIQUE INDEX idx_up_user_scores_unique_no_season ON public.up_user_scores USING btree (user_id, organization_id, role) WHERE (season_id IS NULL);
-- up_user_scores
CREATE UNIQUE INDEX idx_up_user_scores_unique_with_season ON public.up_user_scores USING btree (user_id, organization_id, role, season_id) WHERE (season_id IS NOT NULL);
-- up_user_scores
CREATE INDEX idx_up_user_scores_user ON public.up_user_scores USING btree (user_id);
-- user_achievements
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements USING btree (user_id);
-- user_daily_missions
CREATE INDEX idx_user_daily_missions_user_date ON public.user_daily_missions USING btree (user_id, assigned_date);
-- user_feed_events
CREATE INDEX idx_feed_events_created ON public.user_feed_events USING btree (created_at DESC);
-- user_feed_events
CREATE INDEX idx_feed_events_item ON public.user_feed_events USING btree (item_type, item_id);
-- user_feed_events
CREATE INDEX idx_feed_events_user ON public.user_feed_events USING btree (user_id);
-- user_global_badges
CREATE INDEX idx_user_global_badges_badge ON public.user_global_badges USING btree (badge_id);
-- user_global_badges
CREATE INDEX idx_user_global_badges_user ON public.user_global_badges USING btree (user_id, is_completed);
-- user_global_stats
CREATE INDEX idx_user_global_stats_rank ON public.user_global_stats USING btree (total_badge_points DESC);
-- user_points
CREATE INDEX idx_user_points_total_points ON public.user_points USING btree (total_points DESC);
-- user_points
CREATE INDEX idx_user_points_user_id ON public.user_points USING btree (user_id);
-- user_reputation_totals
CREATE INDEX idx_rep_totals_org_normalized ON public.user_reputation_totals USING btree (organization_id, normalized_score DESC);
-- user_reputation_totals
CREATE INDEX idx_rep_totals_org_points ON public.user_reputation_totals USING btree (organization_id, lifetime_points DESC);
-- user_reputation_totals
CREATE INDEX idx_rep_totals_user ON public.user_reputation_totals USING btree (user_id);

-- ============================================================
-- Indices creados implicitamente por constraints (NO ejecutar: duplican 02_constraints.sql)
-- ============================================================
-- achievements: CREATE UNIQUE INDEX achievements_key_key ON public.achievements USING btree (key);
-- achievements: CREATE UNIQUE INDEX achievements_pkey ON public.achievements USING btree (id);
-- activation_publications: CREATE UNIQUE INDEX activation_publications_pkey ON public.activation_publications USING btree (id);
-- booking_availability: CREATE UNIQUE INDEX booking_availability_pkey ON public.booking_availability USING btree (id);
-- booking_branding: CREATE UNIQUE INDEX booking_branding_pkey ON public.booking_branding USING btree (id);
-- booking_branding: CREATE UNIQUE INDEX booking_branding_user_id_key ON public.booking_branding USING btree (user_id);
-- booking_custom_questions: CREATE UNIQUE INDEX booking_custom_questions_pkey ON public.booking_custom_questions USING btree (id);
-- booking_event_types: CREATE UNIQUE INDEX booking_event_types_pkey ON public.booking_event_types USING btree (id);
-- booking_event_types: CREATE UNIQUE INDEX booking_event_types_unique_slug ON public.booking_event_types USING btree (user_id, slug);
-- booking_exceptions: CREATE UNIQUE INDEX booking_exceptions_pkey ON public.booking_exceptions USING btree (id);
-- booking_question_answers: CREATE UNIQUE INDEX booking_question_answers_pkey ON public.booking_question_answers USING btree (id);
-- booking_reminder_logs: CREATE UNIQUE INDEX booking_reminder_logs_pkey ON public.booking_reminder_logs USING btree (id);
-- booking_reminder_settings: CREATE UNIQUE INDEX booking_reminder_settings_pkey ON public.booking_reminder_settings USING btree (id);
-- booking_webhook_logs: CREATE UNIQUE INDEX booking_webhook_logs_pkey ON public.booking_webhook_logs USING btree (id);
-- booking_webhooks: CREATE UNIQUE INDEX booking_webhooks_pkey ON public.booking_webhooks USING btree (id);
-- bookings: CREATE UNIQUE INDEX bookings_cancel_token_key ON public.bookings USING btree (cancel_token);
-- bookings: CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id);
-- bookings: CREATE UNIQUE INDEX bookings_reschedule_token_key ON public.bookings USING btree (reschedule_token);
-- calendar_blocked_events: CREATE UNIQUE INDEX calendar_blocked_events_integration_id_external_event_id_key ON public.calendar_blocked_events USING btree (integration_id, external_event_id);
-- calendar_blocked_events: CREATE UNIQUE INDEX calendar_blocked_events_pkey ON public.calendar_blocked_events USING btree (id);
-- calendar_event_mappings: CREATE UNIQUE INDEX calendar_event_mappings_booking_id_integration_id_key ON public.calendar_event_mappings USING btree (booking_id, integration_id);
-- calendar_event_mappings: CREATE UNIQUE INDEX calendar_event_mappings_pkey ON public.calendar_event_mappings USING btree (id);
-- calendar_integrations: CREATE UNIQUE INDEX calendar_integrations_pkey ON public.calendar_integrations USING btree (id);
-- calendar_integrations: CREATE UNIQUE INDEX calendar_integrations_user_id_provider_key ON public.calendar_integrations USING btree (user_id, provider);
-- campaign_applications: CREATE UNIQUE INDEX campaign_applications_pkey ON public.campaign_applications USING btree (id);
-- campaign_applications: CREATE UNIQUE INDEX campaign_applications_unique ON public.campaign_applications USING btree (campaign_id, creator_id);
-- campaign_case_studies: CREATE UNIQUE INDEX campaign_case_studies_campaign_id_key ON public.campaign_case_studies USING btree (campaign_id);
-- campaign_case_studies: CREATE UNIQUE INDEX campaign_case_studies_pkey ON public.campaign_case_studies USING btree (id);
-- campaign_case_studies: CREATE UNIQUE INDEX campaign_case_studies_slug_key ON public.campaign_case_studies USING btree (slug);
-- campaign_deliverables: CREATE UNIQUE INDEX campaign_deliverables_pkey ON public.campaign_deliverables USING btree (id);
-- campaign_invitations: CREATE UNIQUE INDEX campaign_invitations_pkey ON public.campaign_invitations USING btree (id);
-- campaign_invitations: CREATE UNIQUE INDEX campaign_invitations_unique ON public.campaign_invitations USING btree (campaign_id, invited_profile_id);
-- campaign_mappings: CREATE UNIQUE INDEX campaign_mappings_pkey ON public.campaign_mappings USING btree (id);
-- campaign_media: CREATE UNIQUE INDEX campaign_media_pkey ON public.campaign_media USING btree (id);
-- campaign_metrics: CREATE UNIQUE INDEX campaign_metrics_campaign_mapping_id_date_key ON public.campaign_metrics USING btree (campaign_mapping_id, date);
-- campaign_metrics: CREATE UNIQUE INDEX campaign_metrics_pkey ON public.campaign_metrics USING btree (id);
-- campaign_notifications: CREATE UNIQUE INDEX campaign_notifications_pkey ON public.campaign_notifications USING btree (id);
-- campaign_redemptions: CREATE UNIQUE INDEX campaign_redemptions_campaign_id_user_id_key ON public.campaign_redemptions USING btree (campaign_id, user_id);
-- campaign_redemptions: CREATE UNIQUE INDEX campaign_redemptions_pkey ON public.campaign_redemptions USING btree (id);
-- campaign_templates: CREATE UNIQUE INDEX campaign_templates_pkey ON public.campaign_templates USING btree (id);
-- campaign_templates: CREATE UNIQUE INDEX campaign_templates_slug_key ON public.campaign_templates USING btree (slug);
-- chronometer_pauses: CREATE UNIQUE INDEX chronometer_pauses_pkey ON public.chronometer_pauses USING btree (id);
-- company_followers: CREATE UNIQUE INDEX company_followers_company_id_follower_id_key ON public.company_followers USING btree (company_id, follower_id);
-- company_followers: CREATE UNIQUE INDEX company_followers_pkey ON public.company_followers USING btree (id);
-- content_likes: CREATE UNIQUE INDEX content_likes_content_id_viewer_id_key ON public.content_likes USING btree (content_id, viewer_id);
-- content_likes: CREATE UNIQUE INDEX content_likes_pkey ON public.content_likes USING btree (id);
-- creator_availability: CREATE UNIQUE INDEX creator_availability_pkey ON public.creator_availability USING btree (user_id);
-- creator_live_streams: CREATE UNIQUE INDEX creator_live_streams_pkey ON public.creator_live_streams USING btree (id);
-- favorites: CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (id);
-- feed_reactions: CREATE UNIQUE INDEX feed_reactions_pkey ON public.feed_reactions USING btree (id);
-- feed_reactions: CREATE UNIQUE INDEX feed_reactions_post_id_user_id_key ON public.feed_reactions USING btree (post_id, user_id);
-- followers: CREATE UNIQUE INDEX followers_follower_id_following_id_key ON public.followers USING btree (follower_id, following_id);
-- followers: CREATE UNIQUE INDEX followers_pkey ON public.followers USING btree (id);
-- global_badges: CREATE UNIQUE INDEX global_badges_key_key ON public.global_badges USING btree (key);
-- global_badges: CREATE UNIQUE INDEX global_badges_pkey ON public.global_badges USING btree (id);
-- hashtags: CREATE UNIQUE INDEX hashtags_pkey ON public.hashtags USING btree (id);
-- hashtags: CREATE UNIQUE INDEX hashtags_tag_key ON public.hashtags USING btree (tag);
-- kreadores_content_likes: CREATE UNIQUE INDEX kreadores_content_likes_pkey ON public.kreadores_content_likes USING btree (id);
-- kreadores_content_likes: CREATE UNIQUE INDEX kreadores_content_likes_user_id_portfolio_item_id_key ON public.kreadores_content_likes USING btree (user_id, portfolio_item_id);
-- link_previews: CREATE UNIQUE INDEX link_previews_pkey ON public.link_previews USING btree (id);
-- link_previews: CREATE UNIQUE INDEX link_previews_url_key ON public.link_previews USING btree (url);
-- live_client_settings: CREATE UNIQUE INDEX live_client_settings_client_id_key ON public.live_client_settings USING btree (client_id);
-- live_client_settings: CREATE UNIQUE INDEX live_client_settings_pkey ON public.live_client_settings USING btree (id);
-- live_event_creators: CREATE UNIQUE INDEX live_event_creators_event_id_creator_id_key ON public.live_event_creators USING btree (event_id, creator_id);
-- live_event_creators: CREATE UNIQUE INDEX live_event_creators_pkey ON public.live_event_creators USING btree (id);
-- live_event_monitoring: CREATE UNIQUE INDEX live_event_monitoring_pkey ON public.live_event_monitoring USING btree (id);
-- live_feature_flags: CREATE UNIQUE INDEX live_feature_flags_flag_type_flag_id_key ON public.live_feature_flags USING btree (flag_type, flag_id);
-- live_feature_flags: CREATE UNIQUE INDEX live_feature_flags_pkey ON public.live_feature_flags USING btree (id);
-- live_hosting_hosts: CREATE UNIQUE INDEX live_hosting_hosts_pkey ON public.live_hosting_hosts USING btree (id);
-- live_hosting_hosts: CREATE UNIQUE INDEX live_hosting_hosts_request_id_user_id_key ON public.live_hosting_hosts USING btree (request_id, user_id);
-- live_hosting_requests: CREATE UNIQUE INDEX live_hosting_requests_pkey ON public.live_hosting_requests USING btree (id);
-- live_hosting_status_history: CREATE UNIQUE INDEX live_hosting_status_history_pkey ON public.live_hosting_status_history USING btree (id);
-- live_hosting_templates: CREATE UNIQUE INDEX live_hosting_templates_pkey ON public.live_hosting_templates USING btree (id);
-- live_hour_assignments: CREATE UNIQUE INDEX live_hour_assignments_pkey ON public.live_hour_assignments USING btree (id);
-- live_hour_purchases: CREATE UNIQUE INDEX live_hour_purchases_pkey ON public.live_hour_purchases USING btree (id);
-- live_hour_wallets: CREATE UNIQUE INDEX live_hour_wallets_owner_type_owner_id_key ON public.live_hour_wallets USING btree (owner_type, owner_id);
-- live_hour_wallets: CREATE UNIQUE INDEX live_hour_wallets_pkey ON public.live_hour_wallets USING btree (id);
-- live_org_oauth_tokens: CREATE UNIQUE INDEX live_org_oauth_tokens_organization_id_provider_key ON public.live_org_oauth_tokens USING btree (organization_id, provider);
-- live_org_oauth_tokens: CREATE UNIQUE INDEX live_org_oauth_tokens_pkey ON public.live_org_oauth_tokens USING btree (id);
-- live_packages: CREATE UNIQUE INDEX live_packages_pkey ON public.live_packages USING btree (id);
-- live_platform_config: CREATE UNIQUE INDEX live_platform_config_pkey ON public.live_platform_config USING btree (id);
-- live_stream_comments: CREATE UNIQUE INDEX live_stream_comments_pkey ON public.live_stream_comments USING btree (id);
-- live_stream_history: CREATE UNIQUE INDEX live_stream_history_pkey ON public.live_stream_history USING btree (id);
-- live_stream_products: CREATE UNIQUE INDEX live_stream_products_pkey ON public.live_stream_products USING btree (id);
-- live_stream_reactions: CREATE UNIQUE INDEX live_stream_reactions_pkey ON public.live_stream_reactions USING btree (id);
-- live_stream_viewers: CREATE UNIQUE INDEX live_stream_viewers_pkey ON public.live_stream_viewers USING btree (id);
-- live_stream_viewers: CREATE UNIQUE INDEX live_stream_viewers_stream_id_session_id_key ON public.live_stream_viewers USING btree (stream_id, session_id);
-- live_streaming_channels: CREATE UNIQUE INDEX live_streaming_channels_pkey ON public.live_streaming_channels USING btree (id);
-- live_usage_logs: CREATE UNIQUE INDEX live_usage_logs_pkey ON public.live_usage_logs USING btree (id);
-- managed_campaign_subscriptions: CREATE UNIQUE INDEX managed_campaign_subscriptions_pkey ON public.managed_campaign_subscriptions USING btree (id);
-- marketplace_campaigns: CREATE UNIQUE INDEX marketplace_campaigns_pkey ON public.marketplace_campaigns USING btree (id);
-- marketplace_campaigns: CREATE UNIQUE INDEX marketplace_campaigns_slug_key ON public.marketplace_campaigns USING btree (slug);
-- mission_templates: CREATE UNIQUE INDEX mission_templates_code_key ON public.mission_templates USING btree (code);
-- mission_templates: CREATE UNIQUE INDEX mission_templates_pkey ON public.mission_templates USING btree (id);
-- organization_streaming_config: CREATE UNIQUE INDEX organization_streaming_config_organization_id_key ON public.organization_streaming_config USING btree (organization_id);
-- organization_streaming_config: CREATE UNIQUE INDEX organization_streaming_config_pkey ON public.organization_streaming_config USING btree (id);
-- point_transactions: CREATE UNIQUE INDEX point_transactions_pkey ON public.point_transactions USING btree (id);
-- portfolio_post_comments: CREATE UNIQUE INDEX portfolio_post_comments_pkey ON public.portfolio_post_comments USING btree (id);
-- portfolio_post_likes: CREATE UNIQUE INDEX portfolio_post_likes_pkey ON public.portfolio_post_likes USING btree (id);
-- portfolio_post_likes: CREATE UNIQUE INDEX portfolio_post_likes_unique ON public.portfolio_post_likes USING btree (post_id, viewer_id);
-- portfolio_posts: CREATE UNIQUE INDEX portfolio_posts_pkey ON public.portfolio_posts USING btree (id);
-- portfolio_stories: CREATE UNIQUE INDEX portfolio_stories_pkey ON public.portfolio_stories USING btree (id);
-- post_hashtags: CREATE UNIQUE INDEX post_hashtags_pkey ON public.post_hashtags USING btree (post_id, hashtag_id);
-- post_metrics: CREATE UNIQUE INDEX post_metrics_pkey ON public.post_metrics USING btree (id);
-- profile_views: CREATE UNIQUE INDEX profile_views_pkey ON public.profile_views USING btree (id);
-- promotional_campaigns: CREATE UNIQUE INDEX promotional_campaigns_pkey ON public.promotional_campaigns USING btree (id);
-- promotional_campaigns: CREATE UNIQUE INDEX promotional_campaigns_slug_key ON public.promotional_campaigns USING btree (slug);
-- publication_verification_queue: CREATE UNIQUE INDEX publication_verification_queue_pkey ON public.publication_verification_queue USING btree (id);
-- reputation_configs: CREATE UNIQUE INDEX reputation_configs_pkey ON public.reputation_configs USING btree (id);
-- reputation_configs: CREATE UNIQUE INDEX reputation_configs_role_event_key_key ON public.reputation_configs USING btree (role, event_key);
-- reputation_events: CREATE UNIQUE INDEX reputation_events_organization_id_user_id_reference_type_re_key ON public.reputation_events USING btree (organization_id, user_id, reference_type, reference_id, event_type);
-- reputation_events: CREATE UNIQUE INDEX reputation_events_pkey ON public.reputation_events USING btree (id);
-- reputation_global: CREATE UNIQUE INDEX reputation_global_pkey ON public.reputation_global USING btree (id);
-- reputation_global: CREATE UNIQUE INDEX reputation_global_user_id_key ON public.reputation_global USING btree (user_id);
-- reputation_seasons: CREATE UNIQUE INDEX reputation_seasons_pkey ON public.reputation_seasons USING btree (id);
-- role_multipliers: CREATE UNIQUE INDEX role_multipliers_organization_id_multiplier_type_multiplier_key ON public.role_multipliers USING btree (organization_id, multiplier_type, multiplier_key, role_key);
-- role_multipliers: CREATE UNIQUE INDEX role_multipliers_pkey ON public.role_multipliers USING btree (id);
-- role_points_config: CREATE UNIQUE INDEX role_points_config_organization_id_role_key_key ON public.role_points_config USING btree (organization_id, role_key);
-- role_points_config: CREATE UNIQUE INDEX role_points_config_pkey ON public.role_points_config USING btree (id);
-- role_weight_config: CREATE UNIQUE INDEX role_weight_config_pkey ON public.role_weight_config USING btree (id);
-- saved_collections: CREATE UNIQUE INDEX saved_collections_pkey ON public.saved_collections USING btree (id);
-- saved_creators: CREATE UNIQUE INDEX saved_creators_pkey ON public.saved_creators USING btree (id);
-- saved_creators: CREATE UNIQUE INDEX saved_creators_unique ON public.saved_creators USING btree (user_id, creator_id);
-- saved_items: CREATE UNIQUE INDEX saved_items_pkey ON public.saved_items USING btree (id);
-- saved_items: CREATE UNIQUE INDEX saved_items_user_id_item_type_item_id_key ON public.saved_items USING btree (user_id, item_type, item_id);
-- saved_searches: CREATE UNIQUE INDEX saved_searches_pkey ON public.saved_searches USING btree (id);
-- season_goals: CREATE UNIQUE INDEX season_goals_pkey ON public.season_goals USING btree (id);
-- season_reward_claims: CREATE UNIQUE INDEX season_reward_claims_pkey ON public.season_reward_claims USING btree (id);
-- season_reward_claims: CREATE UNIQUE INDEX season_reward_claims_season_id_reward_id_user_id_key ON public.season_reward_claims USING btree (season_id, reward_id, user_id);
-- season_rewards: CREATE UNIQUE INDEX season_rewards_pkey ON public.season_rewards USING btree (id);
-- social_notifications: CREATE UNIQUE INDEX social_notifications_pkey ON public.social_notifications USING btree (id);
-- story_views: CREATE UNIQUE INDEX story_views_pkey ON public.story_views USING btree (id);
-- story_views: CREATE UNIQUE INDEX unique_story_view ON public.story_views USING btree (story_id, viewer_id);
-- streaming_accounts: CREATE UNIQUE INDEX streaming_accounts_pkey ON public.streaming_accounts USING btree (id);
-- streaming_analytics_v2: CREATE UNIQUE INDEX streaming_analytics_v2_pkey ON public.streaming_analytics_v2 USING btree (id);
-- streaming_channels_v2: CREATE UNIQUE INDEX streaming_channels_v2_pkey ON public.streaming_channels_v2 USING btree (id);
-- streaming_chat_messages_v2: CREATE UNIQUE INDEX streaming_chat_messages_v2_pkey ON public.streaming_chat_messages_v2 USING btree (id);
-- streaming_event_products: CREATE UNIQUE INDEX streaming_event_products_pkey ON public.streaming_event_products USING btree (id);
-- streaming_events: CREATE UNIQUE INDEX streaming_events_pkey ON public.streaming_events USING btree (id);
-- streaming_guests_v2: CREATE UNIQUE INDEX streaming_guests_v2_join_token_key ON public.streaming_guests_v2 USING btree (join_token);
-- streaming_guests_v2: CREATE UNIQUE INDEX streaming_guests_v2_pkey ON public.streaming_guests_v2 USING btree (id);
-- streaming_logs: CREATE UNIQUE INDEX streaming_logs_pkey ON public.streaming_logs USING btree (id);
-- streaming_overlays_v2: CREATE UNIQUE INDEX streaming_overlays_v2_pkey ON public.streaming_overlays_v2 USING btree (id);
-- streaming_products_v2: CREATE UNIQUE INDEX streaming_products_v2_pkey ON public.streaming_products_v2 USING btree (id);
-- streaming_providers_config: CREATE UNIQUE INDEX streaming_providers_config_owner_type_owner_id_provider_key ON public.streaming_providers_config USING btree (owner_type, owner_id, provider);
-- streaming_providers_config: CREATE UNIQUE INDEX streaming_providers_config_pkey ON public.streaming_providers_config USING btree (id);
-- streaming_sales: CREATE UNIQUE INDEX streaming_sales_pkey ON public.streaming_sales USING btree (id);
-- streaming_session_channels_v2: CREATE UNIQUE INDEX streaming_session_channels_v2_pkey ON public.streaming_session_channels_v2 USING btree (id);
-- streaming_session_channels_v2: CREATE UNIQUE INDEX streaming_session_channels_v2_session_id_channel_id_key ON public.streaming_session_channels_v2 USING btree (session_id, channel_id);
-- streaming_sessions_v2: CREATE UNIQUE INDEX streaming_sessions_v2_pkey ON public.streaming_sessions_v2 USING btree (id);
-- suggested_profiles_cache: CREATE UNIQUE INDEX suggested_profiles_cache_pkey ON public.suggested_profiles_cache USING btree (id);
-- suggested_profiles_cache: CREATE UNIQUE INDEX unique_suggestion ON public.suggested_profiles_cache USING btree (user_id, suggested_user_id);
-- unified_reputation_config: CREATE UNIQUE INDEX unified_reputation_config_organization_id_key ON public.unified_reputation_config USING btree (organization_id);
-- unified_reputation_config: CREATE UNIQUE INDEX unified_reputation_config_pkey ON public.unified_reputation_config USING btree (id);
-- up_ai_config: CREATE UNIQUE INDEX up_ai_config_organization_id_key ON public.up_ai_config USING btree (organization_id);
-- up_ai_config: CREATE UNIQUE INDEX up_ai_config_pkey ON public.up_ai_config USING btree (id);
-- up_arbiter_log: CREATE UNIQUE INDEX up_arbiter_log_pkey ON public.up_arbiter_log USING btree (id);
-- up_chronometer_pauses: CREATE UNIQUE INDEX up_chronometer_pauses_pkey ON public.up_chronometer_pauses USING btree (id);
-- up_client_trust_scores: CREATE UNIQUE INDEX up_client_trust_scores_organization_id_client_id_key ON public.up_client_trust_scores USING btree (organization_id, client_id);
-- up_client_trust_scores: CREATE UNIQUE INDEX up_client_trust_scores_pkey ON public.up_client_trust_scores USING btree (id);
-- up_creadores: CREATE UNIQUE INDEX up_creadores_pkey ON public.up_creadores USING btree (id);
-- up_creadores_totals: CREATE UNIQUE INDEX up_creadores_totals_pkey ON public.up_creadores_totals USING btree (id);
-- up_creadores_totals: CREATE UNIQUE INDEX up_creadores_totals_user_id_organization_id_season_id_key ON public.up_creadores_totals USING btree (user_id, organization_id, season_id);
-- up_currency_conversions: CREATE UNIQUE INDEX up_currency_conversions_pkey ON public.up_currency_conversions USING btree (id);
-- up_editores: CREATE UNIQUE INDEX up_editores_pkey ON public.up_editores USING btree (id);
-- up_editores_totals: CREATE UNIQUE INDEX up_editores_totals_pkey ON public.up_editores_totals USING btree (id);
-- up_editores_totals: CREATE UNIQUE INDEX up_editores_totals_user_id_organization_id_season_id_key ON public.up_editores_totals USING btree (user_id, organization_id, season_id);
-- up_event_types: CREATE UNIQUE INDEX up_event_types_organization_id_event_key_key ON public.up_event_types USING btree (organization_id, event_key);
-- up_event_types: CREATE UNIQUE INDEX up_event_types_pkey ON public.up_event_types USING btree (id);
-- up_events: CREATE UNIQUE INDEX up_events_pkey ON public.up_events USING btree (id);
-- up_fraud_alerts: CREATE UNIQUE INDEX up_fraud_alerts_pkey ON public.up_fraud_alerts USING btree (id);
-- up_permissions: CREATE UNIQUE INDEX up_permissions_organization_id_role_key ON public.up_permissions USING btree (organization_id, role);
-- up_permissions: CREATE UNIQUE INDEX up_permissions_pkey ON public.up_permissions USING btree (id);
-- up_quality_scores: CREATE UNIQUE INDEX up_quality_scores_content_id_key ON public.up_quality_scores USING btree (content_id);
-- up_quality_scores: CREATE UNIQUE INDEX up_quality_scores_pkey ON public.up_quality_scores USING btree (id);
-- up_quest_progress: CREATE UNIQUE INDEX up_quest_progress_pkey ON public.up_quest_progress USING btree (id);
-- up_quest_progress: CREATE UNIQUE INDEX up_quest_progress_quest_id_user_id_key ON public.up_quest_progress USING btree (quest_id, user_id);
-- up_quests: CREATE UNIQUE INDEX up_quests_pkey ON public.up_quests USING btree (id);
-- up_rules: CREATE UNIQUE INDEX up_rules_pkey ON public.up_rules USING btree (id);
-- up_season_snapshots: CREATE UNIQUE INDEX up_season_snapshots_pkey ON public.up_season_snapshots USING btree (id);
-- up_seasons: CREATE UNIQUE INDEX up_seasons_organization_id_name_key ON public.up_seasons USING btree (organization_id, name);
-- up_seasons: CREATE UNIQUE INDEX up_seasons_pkey ON public.up_seasons USING btree (id);
-- up_settings: CREATE UNIQUE INDEX up_settings_key_key ON public.up_settings USING btree (key);
-- up_settings: CREATE UNIQUE INDEX up_settings_pkey ON public.up_settings USING btree (id);
-- up_user_scores: CREATE UNIQUE INDEX up_user_scores_pkey ON public.up_user_scores USING btree (id);
-- user_achievements: CREATE UNIQUE INDEX user_achievements_pkey ON public.user_achievements USING btree (id);
-- user_achievements: CREATE UNIQUE INDEX user_achievements_user_id_achievement_id_key ON public.user_achievements USING btree (user_id, achievement_id);
-- user_daily_missions: CREATE UNIQUE INDEX user_daily_missions_pkey ON public.user_daily_missions USING btree (id);
-- user_daily_missions: CREATE UNIQUE INDEX user_daily_missions_user_id_assigned_date_mission_template__key ON public.user_daily_missions USING btree (user_id, assigned_date, mission_template_id);
-- user_feed_events: CREATE UNIQUE INDEX user_feed_events_pkey ON public.user_feed_events USING btree (id);
-- user_global_badges: CREATE UNIQUE INDEX user_global_badges_pkey ON public.user_global_badges USING btree (id);
-- user_global_badges: CREATE UNIQUE INDEX user_global_badges_user_id_badge_id_key ON public.user_global_badges USING btree (user_id, badge_id);
-- user_global_stats: CREATE UNIQUE INDEX user_global_stats_pkey ON public.user_global_stats USING btree (user_id);
-- user_interest_profile: CREATE UNIQUE INDEX unique_user_interest ON public.user_interest_profile USING btree (user_id);
-- user_interest_profile: CREATE UNIQUE INDEX unique_viewer_interest ON public.user_interest_profile USING btree (viewer_id);
-- user_interest_profile: CREATE UNIQUE INDEX user_interest_profile_pkey ON public.user_interest_profile USING btree (id);
-- user_points: CREATE UNIQUE INDEX user_points_pkey ON public.user_points USING btree (id);
-- user_points: CREATE UNIQUE INDEX user_points_user_id_key ON public.user_points USING btree (user_id);
-- user_reputation_totals: CREATE UNIQUE INDEX user_reputation_totals_organization_id_user_id_role_key_key ON public.user_reputation_totals USING btree (organization_id, user_id, role_key);
-- user_reputation_totals: CREATE UNIQUE INDEX user_reputation_totals_pkey ON public.user_reputation_totals USING btree (id);
-- user_streaks: CREATE UNIQUE INDEX user_streaks_pkey ON public.user_streaks USING btree (user_id);
