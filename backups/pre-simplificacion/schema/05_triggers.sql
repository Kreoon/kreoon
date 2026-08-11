-- Triggers no internos de las 135 tablas del set
-- Proyecto Supabase: wjkbqcrxwsmvtxmqgiqc (schema public)
-- Respaldo pre-simplificacion generado 2026-08-11T21:39:00.263Z
-- Set: 135 tablas candidatas a eliminacion. SOLO DDL de respaldo, no ejecutar sin revisar.
-- Triggers totales: 57. Las funciones que invocan NO se respaldan aqui.
-- activation_publications
CREATE TRIGGER trigger_activation_publications_updated_at BEFORE UPDATE ON public.activation_publications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- booking_branding
CREATE TRIGGER trg_booking_branding_updated_at BEFORE UPDATE ON public.booking_branding FOR EACH ROW EXECUTE FUNCTION update_booking_branding_updated_at();
-- booking_custom_questions
CREATE TRIGGER trg_booking_questions_updated_at BEFORE UPDATE ON public.booking_custom_questions FOR EACH ROW EXECUTE FUNCTION update_booking_questions_updated_at();
-- booking_event_types
CREATE TRIGGER trg_create_default_reminders AFTER INSERT ON public.booking_event_types FOR EACH ROW EXECUTE FUNCTION create_default_reminders();
-- booking_event_types
CREATE TRIGGER trigger_auto_booking_event_type_slug BEFORE INSERT ON public.booking_event_types FOR EACH ROW EXECUTE FUNCTION auto_booking_event_type_slug();
-- booking_event_types
CREATE TRIGGER trigger_booking_event_types_updated_at BEFORE UPDATE ON public.booking_event_types FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- booking_event_types
CREATE TRIGGER trigger_protect_delete_booking_event_types BEFORE DELETE ON public.booking_event_types FOR EACH ROW EXECUTE FUNCTION protect_delete_generic();
-- booking_reminder_settings
CREATE TRIGGER trg_reminder_settings_updated_at BEFORE UPDATE ON public.booking_reminder_settings FOR EACH ROW EXECUTE FUNCTION update_booking_questions_updated_at();
-- booking_webhooks
CREATE TRIGGER trg_generate_webhook_secret BEFORE INSERT ON public.booking_webhooks FOR EACH ROW EXECUTE FUNCTION generate_webhook_secret();
-- booking_webhooks
CREATE TRIGGER trg_webhooks_updated_at BEFORE UPDATE ON public.booking_webhooks FOR EACH ROW EXECUTE FUNCTION update_booking_questions_updated_at();
-- bookings
CREATE TRIGGER trg_generate_booking_tokens BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION generate_booking_tokens();
-- bookings
CREATE TRIGGER trigger_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- calendar_integrations
CREATE TRIGGER trg_calendar_integrations_updated_at BEFORE UPDATE ON public.calendar_integrations FOR EACH ROW EXECUTE FUNCTION update_booking_questions_updated_at();
-- campaign_applications
CREATE TRIGGER trg_campaign_applications_guard_update BEFORE UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION trg_guard_campaign_application_update();
-- campaign_applications
CREATE TRIGGER trigger_applications_updated_at BEFORE UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- campaign_applications
CREATE TRIGGER trigger_update_campaign_application_count AFTER INSERT OR DELETE OR UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION update_campaign_application_count();
-- campaign_deliverables
CREATE TRIGGER trigger_deliverables_updated_at BEFORE UPDATE ON public.campaign_deliverables FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- campaign_invitations
CREATE TRIGGER trigger_invitations_updated_at BEFORE UPDATE ON public.campaign_invitations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- creator_availability
CREATE TRIGGER trigger_creator_availability_updated_at BEFORE UPDATE ON public.creator_availability FOR EACH ROW EXECUTE FUNCTION update_creator_availability_updated_at();
-- creator_live_streams
CREATE TRIGGER trg_live_streams_updated BEFORE UPDATE ON public.creator_live_streams FOR EACH ROW EXECUTE FUNCTION update_live_stream_timestamp();
-- feed_reactions
CREATE TRIGGER trg_feed_reaction_activity AFTER INSERT ON public.feed_reactions FOR EACH ROW EXECUTE FUNCTION fn_feed_reaction_activity();
-- feed_reactions
CREATE TRIGGER trg_feed_reactions_guard_update BEFORE UPDATE ON public.feed_reactions FOR EACH ROW EXECUTE FUNCTION fn_feed_reactions_guard_update();
-- feed_reactions
CREATE TRIGGER trg_feed_reactions_sync_count AFTER INSERT OR DELETE ON public.feed_reactions FOR EACH ROW EXECUTE FUNCTION fn_sync_portfolio_item_reactions_count();
-- followers
CREATE TRIGGER on_follow_notification AFTER INSERT ON public.followers FOR EACH ROW EXECUTE FUNCTION notify_on_follow();
-- live_hosting_hosts
CREATE TRIGGER trg_live_hosting_hosts_updated BEFORE UPDATE ON public.live_hosting_hosts FOR EACH ROW EXECUTE FUNCTION update_live_hosting_timestamp();
-- live_hosting_hosts
CREATE TRIGGER trg_log_hosting_host_status AFTER UPDATE ON public.live_hosting_hosts FOR EACH ROW EXECUTE FUNCTION log_hosting_host_status_change();
-- live_hosting_requests
CREATE TRIGGER trg_live_hosting_requests_updated BEFORE UPDATE ON public.live_hosting_requests FOR EACH ROW EXECUTE FUNCTION update_live_hosting_timestamp();
-- live_hosting_requests
CREATE TRIGGER trg_log_hosting_request_status AFTER UPDATE ON public.live_hosting_requests FOR EACH ROW EXECUTE FUNCTION log_hosting_request_status_change();
-- live_hosting_templates
CREATE TRIGGER trg_live_hosting_templates_updated BEFORE UPDATE ON public.live_hosting_templates FOR EACH ROW EXECUTE FUNCTION update_live_hosting_timestamp();
-- live_stream_comments
CREATE TRIGGER trg_update_comments_count AFTER INSERT ON public.live_stream_comments FOR EACH ROW EXECUTE FUNCTION update_live_stream_comments_count();
-- live_stream_reactions
CREATE TRIGGER trg_update_likes_count AFTER INSERT ON public.live_stream_reactions FOR EACH ROW EXECUTE FUNCTION update_live_stream_likes_count();
-- live_stream_viewers
CREATE TRIGGER trg_update_viewers_count AFTER INSERT OR UPDATE ON public.live_stream_viewers FOR EACH ROW EXECUTE FUNCTION update_live_stream_viewers_count();
-- managed_campaign_subscriptions
CREATE TRIGGER set_updated_at_managed_campaign_subscriptions BEFORE UPDATE ON public.managed_campaign_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- marketplace_campaigns
CREATE TRIGGER trg_auto_campaign_commission BEFORE INSERT OR UPDATE OF requires_agency_support ON public.marketplace_campaigns FOR EACH ROW EXECUTE FUNCTION auto_set_campaign_commission();
-- marketplace_campaigns
CREATE TRIGGER trg_auto_case_study AFTER UPDATE ON public.marketplace_campaigns FOR EACH ROW EXECUTE FUNCTION auto_generate_case_study();
-- marketplace_campaigns
CREATE TRIGGER trigger_auto_campaign_slug BEFORE INSERT ON public.marketplace_campaigns FOR EACH ROW EXECUTE FUNCTION auto_campaign_slug();
-- marketplace_campaigns
CREATE TRIGGER trigger_campaigns_updated_at BEFORE UPDATE ON public.marketplace_campaigns FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- organization_streaming_config
CREATE TRIGGER update_org_streaming_config_updated_at BEFORE UPDATE ON public.organization_streaming_config FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- point_transactions
CREATE TRIGGER check_achievements_on_transaction AFTER INSERT ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements();
-- portfolio_post_comments
CREATE TRIGGER on_post_comment_notify AFTER INSERT ON public.portfolio_post_comments FOR EACH ROW EXECUTE FUNCTION notify_on_portfolio_comment();
-- portfolio_post_comments
CREATE TRIGGER update_comments_count_trigger AFTER INSERT OR DELETE ON public.portfolio_post_comments FOR EACH ROW EXECUTE FUNCTION update_portfolio_post_comments_count();
-- portfolio_post_likes
CREATE TRIGGER on_post_like_notify AFTER INSERT ON public.portfolio_post_likes FOR EACH ROW EXECUTE FUNCTION notify_on_post_like();
-- portfolio_posts
CREATE TRIGGER trg_check_referrer_on_portfolio_post AFTER INSERT ON public.portfolio_posts FOR EACH ROW EXECUTE FUNCTION trigger_check_referrer_unlock();
-- portfolio_posts
CREATE TRIGGER trg_posts_portfolio_count AFTER INSERT OR DELETE ON public.portfolio_posts FOR EACH ROW EXECUTE FUNCTION trg_update_portfolio_count_posts();
-- portfolio_posts
CREATE TRIGGER trigger_protect_delete_portfolio_posts BEFORE DELETE ON public.portfolio_posts FOR EACH ROW EXECUTE FUNCTION protect_delete_generic();
-- reputation_events
CREATE TRIGGER trg_reputation_totals AFTER INSERT ON public.reputation_events FOR EACH ROW EXECUTE FUNCTION update_reputation_totals();
-- social_notifications
CREATE TRIGGER trg_dispatch_push_on_social_notification AFTER INSERT ON public.social_notifications FOR EACH ROW EXECUTE FUNCTION fn_dispatch_push_on_social_notification();
-- streaming_accounts
CREATE TRIGGER update_streaming_accounts_updated_at BEFORE UPDATE ON public.streaming_accounts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- streaming_channels_v2
CREATE TRIGGER streaming_channels_v2_updated_at BEFORE UPDATE ON public.streaming_channels_v2 FOR EACH ROW EXECUTE FUNCTION streaming_update_timestamp();
-- streaming_event_products
CREATE TRIGGER update_streaming_event_products_updated_at BEFORE UPDATE ON public.streaming_event_products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- streaming_events
CREATE TRIGGER update_streaming_events_updated_at BEFORE UPDATE ON public.streaming_events FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- streaming_overlays_v2
CREATE TRIGGER streaming_overlays_v2_updated_at BEFORE UPDATE ON public.streaming_overlays_v2 FOR EACH ROW EXECUTE FUNCTION streaming_update_timestamp();
-- streaming_providers_config
CREATE TRIGGER update_streaming_providers_config_updated_at BEFORE UPDATE ON public.streaming_providers_config FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- streaming_sales
CREATE TRIGGER update_streaming_sales_updated_at BEFORE UPDATE ON public.streaming_sales FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
-- streaming_sessions_v2
CREATE TRIGGER streaming_sessions_v2_updated_at BEFORE UPDATE ON public.streaming_sessions_v2 FOR EACH ROW EXECUTE FUNCTION streaming_update_timestamp();
-- up_events
CREATE TRIGGER trg_update_user_scores AFTER INSERT ON public.up_events FOR EACH ROW EXECUTE FUNCTION update_up_user_scores();
-- user_points
CREATE TRIGGER check_achievements_on_points_update AFTER INSERT OR UPDATE ON public.user_points FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements();
