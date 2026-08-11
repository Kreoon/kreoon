-- RLS y politicas de las 135 tablas del set
-- Proyecto Supabase: wjkbqcrxwsmvtxmqgiqc (schema public)
-- Respaldo pre-simplificacion generado 2026-08-11T21:38:59.966Z
-- Set: 135 tablas candidatas a eliminacion. SOLO DDL de respaldo, no ejecutar sin revisar.
-- Politicas totales: 310. Tablas con RLS activo: 135/135.
-- achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage achievements" ON public.achievements
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read achievements" ON public.achievements
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY "Anyone can view achievements" ON public.achievements
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- activation_publications
ALTER TABLE public.activation_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creadores pueden crear sus publicaciones" ON public.activation_publications
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((creator_id IN ( SELECT creator_profiles.id
   FROM creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = activation_publications.campaign_id) AND (mc.created_by = auth.uid()))))));
CREATE POLICY "Creadores ven sus publicaciones" ON public.activation_publications
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((creator_id IN ( SELECT creator_profiles.id
   FROM creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = activation_publications.campaign_id) AND (mc.created_by = auth.uid()))))));
CREATE POLICY "Creadores y marcas pueden actualizar publicaciones" ON public.activation_publications
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((creator_id IN ( SELECT creator_profiles.id
   FROM creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = activation_publications.campaign_id) AND (mc.created_by = auth.uid()))))));
CREATE POLICY "activation_pub_insert" ON public.activation_publications
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((creator_id IN ( SELECT creator_profiles.id
   FROM creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));
CREATE POLICY "activation_pub_select" ON public.activation_publications
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((creator_id IN ( SELECT creator_profiles.id
   FROM creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = activation_publications.campaign_id) AND ((mc.created_by = auth.uid()) OR is_brand_admin(mc.brand_id) OR is_org_admin(mc.organization_id)))))));
CREATE POLICY "activation_pub_update" ON public.activation_publications
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((creator_id IN ( SELECT creator_profiles.id
   FROM creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = activation_publications.campaign_id) AND ((mc.created_by = auth.uid()) OR is_brand_admin(mc.brand_id)))))));

-- booking_availability
ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_availability_owner_all" ON public.booking_availability
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "booking_availability_public_read" ON public.booking_availability
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- booking_branding
ALTER TABLE public.booking_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view branding" ON public.booking_branding
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY "Users can manage their branding" ON public.booking_branding
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- booking_custom_questions
ALTER TABLE public.booking_custom_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view questions of active events" ON public.booking_custom_questions
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((EXISTS ( SELECT 1
   FROM booking_event_types et
  WHERE ((et.id = booking_custom_questions.event_type_id) AND (et.is_active = true)))));
CREATE POLICY "Owners can manage custom questions" ON public.booking_custom_questions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM booking_event_types et
  WHERE ((et.id = booking_custom_questions.event_type_id) AND (et.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM booking_event_types et
  WHERE ((et.id = booking_custom_questions.event_type_id) AND (et.user_id = auth.uid())))));

-- booking_event_types
ALTER TABLE public.booking_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_event_types_owner_all" ON public.booking_event_types
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "booking_event_types_public_read" ON public.booking_event_types
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((is_active = true));

-- booking_exceptions
ALTER TABLE public.booking_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_exceptions_owner_all" ON public.booking_exceptions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "booking_exceptions_public_read" ON public.booking_exceptions
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- booking_question_answers
ALTER TABLE public.booking_question_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create answers when booking" ON public.booking_question_answers
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Hosts can view booking answers" ON public.booking_question_answers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.id = booking_question_answers.booking_id) AND (b.host_user_id = auth.uid())))));

-- booking_reminder_logs
ALTER TABLE public.booking_reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can view reminder logs" ON public.booking_reminder_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM bookings b
  WHERE ((b.id = booking_reminder_logs.booking_id) AND (b.host_user_id = auth.uid())))));
CREATE POLICY "Service can insert reminder logs" ON public.booking_reminder_logs
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- booking_reminder_settings
ALTER TABLE public.booking_reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage reminder settings" ON public.booking_reminder_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM booking_event_types et
  WHERE ((et.id = booking_reminder_settings.event_type_id) AND (et.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM booking_event_types et
  WHERE ((et.id = booking_reminder_settings.event_type_id) AND (et.user_id = auth.uid())))));
CREATE POLICY "Service can read reminder settings" ON public.booking_reminder_settings
  AS PERMISSIVE
  FOR SELECT
  TO service_role
  USING (true);

-- booking_webhook_logs
ALTER TABLE public.booking_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage webhook logs" ON public.booking_webhook_logs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Users can view their webhook logs" ON public.booking_webhook_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM booking_webhooks w
  WHERE ((w.id = booking_webhook_logs.webhook_id) AND (w.user_id = auth.uid())))));

-- booking_webhooks
ALTER TABLE public.booking_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can read webhooks" ON public.booking_webhooks
  AS PERMISSIVE
  FOR SELECT
  TO service_role
  USING (true);
CREATE POLICY "Users can manage their webhooks" ON public.booking_webhooks
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_guest_select" ON public.bookings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = guest_user_id));
CREATE POLICY "bookings_host_delete" ON public.bookings
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = host_user_id));
CREATE POLICY "bookings_host_select" ON public.bookings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = host_user_id));
CREATE POLICY "bookings_host_update" ON public.bookings
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = host_user_id));
CREATE POLICY "bookings_insert_public" ON public.bookings
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- calendar_blocked_events
ALTER TABLE public.calendar_blocked_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage blocked events" ON public.calendar_blocked_events
  AS PERMISSIVE
  FOR ALL
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Users can view their blocked events" ON public.calendar_blocked_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM calendar_integrations ci
  WHERE ((ci.id = calendar_blocked_events.integration_id) AND (ci.user_id = auth.uid())))));

-- calendar_event_mappings
ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage event mappings" ON public.calendar_event_mappings
  AS PERMISSIVE
  FOR ALL
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Users can view their event mappings" ON public.calendar_event_mappings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM calendar_integrations ci
  WHERE ((ci.id = calendar_event_mappings.integration_id) AND (ci.user_id = auth.uid())))));

-- calendar_integrations
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage calendar integrations" ON public.calendar_integrations
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can manage their calendar integrations" ON public.calendar_integrations
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- campaign_applications
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants and brand members can update applications" ON public.campaign_applications
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((EXISTS ( SELECT 1
   FROM creator_profiles cp
  WHERE ((cp.id = campaign_applications.creator_id) AND (cp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.brand_id IS NOT NULL) AND is_brand_member(mc.brand_id)))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.organization_id IS NOT NULL) AND is_org_admin(mc.organization_id))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM creator_profiles cp
  WHERE ((cp.id = campaign_applications.creator_id) AND (cp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.brand_id IS NOT NULL) AND is_brand_member(mc.brand_id)))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.organization_id IS NOT NULL) AND is_org_admin(mc.organization_id))))));
CREATE POLICY "Applications visible to campaign brand and applicant" ON public.campaign_applications
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((EXISTS ( SELECT 1
   FROM creator_profiles cp
  WHERE ((cp.id = campaign_applications.creator_id) AND (cp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.brand_id IS NOT NULL) AND is_brand_member(mc.brand_id)))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.organization_id IS NOT NULL) AND is_org_member(mc.organization_id)))) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_applications.campaign_id) AND (mc.created_by = auth.uid()))))));
CREATE POLICY "Creators can apply to campaigns" ON public.campaign_applications
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM creator_profiles cp
  WHERE ((cp.id = campaign_applications.creator_id) AND (cp.user_id = auth.uid())))));
CREATE POLICY "Creators can withdraw their applications" ON public.campaign_applications
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((EXISTS ( SELECT 1
   FROM creator_profiles cp
  WHERE ((cp.id = campaign_applications.creator_id) AND (cp.user_id = auth.uid())))) AND (status = 'pending'::application_status)));

-- campaign_case_studies
ALTER TABLE public.campaign_case_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "case_studies_brand_all" ON public.campaign_case_studies
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_brand_admin(brand_id));
CREATE POLICY "case_studies_public_read" ON public.campaign_case_studies
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((is_published = true));

-- campaign_deliverables
ALTER TABLE public.campaign_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can submit deliverables" ON public.campaign_deliverables
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((auth.uid() = creator_id) AND (EXISTS ( SELECT 1
   FROM campaign_applications ca
  WHERE ((ca.id = campaign_deliverables.application_id) AND (ca.status = ANY (ARRAY['approved'::application_status, 'assigned'::application_status])))))));
CREATE POLICY "Deliverables visible to campaign participants" ON public.campaign_deliverables
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((creator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_deliverables.campaign_id) AND ((mc.created_by = auth.uid()) OR ((mc.brand_id IS NOT NULL) AND is_brand_member(mc.brand_id)) OR ((mc.organization_id IS NOT NULL) AND is_org_member(mc.organization_id))))))));
CREATE POLICY "Participants can update deliverables" ON public.campaign_deliverables
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((creator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_deliverables.campaign_id) AND ((mc.created_by = auth.uid()) OR ((mc.brand_id IS NOT NULL) AND is_brand_admin(mc.brand_id)) OR ((mc.organization_id IS NOT NULL) AND is_org_admin(mc.organization_id))))))));

-- campaign_invitations
ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaign managers can create invitations" ON public.campaign_invitations
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((auth.uid() = invited_by) AND (EXISTS ( SELECT 1
   FROM marketplace_campaigns mc
  WHERE ((mc.id = campaign_invitations.campaign_id) AND ((mc.created_by = auth.uid()) OR ((mc.brand_id IS NOT NULL) AND is_brand_admin(mc.brand_id)) OR ((mc.organization_id IS NOT NULL) AND is_org_admin(mc.organization_id))))))));
CREATE POLICY "Campaign managers can delete invitations" ON public.campaign_invitations
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (can_manage_campaign(campaign_id));
CREATE POLICY "Invitation visible to invited user and campaign org" ON public.campaign_invitations
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((invited_profile_id = auth.uid()) OR (invited_by = auth.uid()) OR can_manage_campaign(campaign_id)));
CREATE POLICY "Invited users can respond to invitations" ON public.campaign_invitations
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((invited_profile_id = auth.uid()) OR can_manage_campaign(campaign_id)));

-- campaign_mappings
ALTER TABLE public.campaign_mappings ENABLE ROW LEVEL SECURITY;
-- (sin politicas)

-- campaign_media
ALTER TABLE public.campaign_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage campaign media" ON public.campaign_media
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- campaign_metrics
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
-- (sin politicas)

-- campaign_notifications
ALTER TABLE public.campaign_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaign notifications" ON public.campaign_notifications
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- campaign_redemptions
ALTER TABLE public.campaign_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own redemptions" ON public.campaign_redemptions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

-- campaign_templates
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select" ON public.campaign_templates
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- chronometer_pauses
ALTER TABLE public.chronometer_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage chronometer" ON public.chronometer_pauses
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = chronometer_pauses.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = chronometer_pauses.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))));
CREATE POLICY "Org members can view chronometer" ON public.chronometer_pauses
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = chronometer_pauses.organization_id) AND (om.user_id = auth.uid())))));

-- company_followers
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view company followers" ON public.company_followers
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Users can follow companies" ON public.company_followers
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = follower_id));
CREATE POLICY "Users can unfollow companies" ON public.company_followers
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((auth.uid() = follower_id));

-- content_likes
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.content_likes
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Authenticated users can like content" ON public.content_likes
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((auth.uid())::text = viewer_id));

-- creator_availability
ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disponibilidad es pública" ON public.creator_availability
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Usuario modifica su disponibilidad" ON public.creator_availability
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.uid() = user_id));

-- creator_live_streams
ALTER TABLE public.creator_live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_public_lives" ON public.creator_live_streams
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((((status = 'live'::live_stream_status) AND (is_unlisted = false)) OR (user_id = auth.uid())));
CREATE POLICY "creator_can_manage_own_streams" ON public.creator_live_streams
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
-- (sin politicas)

-- feed_reactions
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_reactions_delete_own" ON public.feed_reactions
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid()));
CREATE POLICY "feed_reactions_insert_own" ON public.feed_reactions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "feed_reactions_select_visible_posts" ON public.feed_reactions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM portfolio_items pi
  WHERE ((pi.id = feed_reactions.post_id) AND ((pi.is_public = true) OR (EXISTS ( SELECT 1
           FROM creator_profiles cp
          WHERE ((cp.id = pi.creator_id) AND (cp.user_id = auth.uid())))))))));
CREATE POLICY "feed_reactions_update_own" ON public.feed_reactions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- followers
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view followers" ON public.followers
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Users can follow others" ON public.followers
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = follower_id));
CREATE POLICY "Users can unfollow" ON public.followers
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((auth.uid() = follower_id));

-- global_badges
ALTER TABLE public.global_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage badges" ON public.global_badges
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::app_role)))));
CREATE POLICY "Anyone can view badges" ON public.global_badges
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((is_active = true));

-- hashtags
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read hashtags" ON public.hashtags
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- kreadores_content_likes
ALTER TABLE public.kreadores_content_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kreadores_content_likes_delete_own" ON public.kreadores_content_likes
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "kreadores_content_likes_insert_own" ON public.kreadores_content_likes
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "kreadores_content_likes_select_all" ON public.kreadores_content_likes
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- link_previews
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert link previews" ON public.link_previews
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Link previews are publicly readable" ON public.link_previews
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- live_client_settings
ALTER TABLE public.live_client_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins can manage client settings" ON public.live_client_settings
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_client_settings.organization_id) AND ((organization_members.is_owner = true) OR (organization_members.role = 'admin'::app_role))))));
CREATE POLICY "Org members can view client settings" ON public.live_client_settings
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_client_settings.organization_id)))));

-- live_event_creators
ALTER TABLE public.live_event_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage event creators" ON public.live_event_creators
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone view event creators" ON public.live_event_creators
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- live_event_monitoring
ALTER TABLE public.live_event_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view monitoring" ON public.live_event_monitoring
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM (streaming_events se
     JOIN organization_members om ON ((om.organization_id = se.organization_id)))
  WHERE ((se.id = live_event_monitoring.event_id) AND (om.user_id = auth.uid())))));

-- live_feature_flags
ALTER TABLE public.live_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage feature flags" ON public.live_feature_flags
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view feature flags" ON public.live_feature_flags
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Manage live feature flags" ON public.live_feature_flags
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR ((flag_type = 'organization'::text) AND is_org_owner(auth.uid(), (flag_id)::uuid)) OR ((flag_type = 'client'::text) AND (EXISTS ( SELECT 1
   FROM clients c
  WHERE ((c.id = (live_feature_flags.flag_id)::uuid) AND is_org_owner(auth.uid(), c.organization_id))))) OR ((flag_type = 'platform'::text) AND has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR ((flag_type = 'organization'::text) AND is_org_owner(auth.uid(), (flag_id)::uuid)) OR ((flag_type = 'client'::text) AND (EXISTS ( SELECT 1
   FROM clients c
  WHERE ((c.id = (live_feature_flags.flag_id)::uuid) AND is_org_owner(auth.uid(), c.organization_id))))) OR ((flag_type = 'platform'::text) AND has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Org managers can manage org flags" ON public.live_feature_flags
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (((flag_type = 'organization'::text) AND ((flag_id)::uuid IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND ((om.role)::text = ANY (ARRAY['admin'::text, 'strategist'::text])))))));
CREATE POLICY "Read live feature flags" ON public.live_feature_flags
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR ((auth.uid() IS NOT NULL) AND (flag_type = 'platform'::text)) OR ((flag_type = 'organization'::text) AND is_org_member(auth.uid(), (flag_id)::uuid)) OR ((flag_type = 'client'::text) AND (EXISTS ( SELECT 1
   FROM clients c
  WHERE ((c.id = (live_feature_flags.flag_id)::uuid) AND is_org_member(auth.uid(), c.organization_id)))))));
CREATE POLICY "Users can view relevant flags" ON public.live_feature_flags
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((flag_type = 'platform'::text) OR ((flag_type = 'organization'::text) AND ((flag_id)::uuid IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid())))) OR ((flag_type = 'client'::text) AND ((flag_id)::uuid IN ( SELECT cu.client_id
   FROM client_users cu
  WHERE (cu.user_id = auth.uid()))))));

-- live_hosting_hosts
ALTER TABLE public.live_hosting_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apply_as_host" ON public.live_hosting_hosts
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((user_id = auth.uid()) OR (request_id IN ( SELECT live_hosting_requests.id
   FROM live_hosting_requests
  WHERE (live_hosting_requests.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));
CREATE POLICY "delete_hosting_hosts" ON public.live_hosting_hosts
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((user_id = auth.uid()) OR (request_id IN ( SELECT live_hosting_requests.id
   FROM live_hosting_requests
  WHERE (live_hosting_requests.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));
CREATE POLICY "update_hosting_hosts" ON public.live_hosting_hosts
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((user_id = auth.uid()) OR (request_id IN ( SELECT live_hosting_requests.id
   FROM live_hosting_requests
  WHERE (live_hosting_requests.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));
CREATE POLICY "view_hosting_hosts" ON public.live_hosting_hosts
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((user_id = auth.uid()) OR (request_id IN ( SELECT live_hosting_requests.id
   FROM live_hosting_requests
  WHERE (live_hosting_requests.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));

-- live_hosting_requests
ALTER TABLE public.live_hosting_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_delete_hosting_requests" ON public.live_hosting_requests
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((created_by = auth.uid()) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::app_role))))));
CREATE POLICY "org_members_insert_hosting_requests" ON public.live_hosting_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));
CREATE POLICY "org_members_select_hosting_requests" ON public.live_hosting_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))) OR (id IN ( SELECT live_hosting_hosts.request_id
   FROM live_hosting_hosts
  WHERE (live_hosting_hosts.user_id = auth.uid()))) OR ((channel = 'marketplace'::hosting_channel_type) AND (status = 'open'::hosting_request_status))));
CREATE POLICY "org_members_update_hosting_requests" ON public.live_hosting_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));

-- live_hosting_status_history
ALTER TABLE public.live_hosting_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_hosting_history" ON public.live_hosting_status_history
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((request_id IN ( SELECT live_hosting_requests.id
   FROM live_hosting_requests
  WHERE (live_hosting_requests.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid()))))));

-- live_hosting_templates
ALTER TABLE public.live_hosting_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_templates" ON public.live_hosting_templates
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))))
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));

-- live_hour_assignments
ALTER TABLE public.live_hour_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all assignments" ON public.live_hour_assignments
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members view assignments" ON public.live_hour_assignments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners manage assignments" ON public.live_hour_assignments
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_org_owner(auth.uid(), organization_id));
CREATE POLICY "Org users can manage their org assignments" ON public.live_hour_assignments
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));

-- live_hour_purchases
ALTER TABLE public.live_hour_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage purchases" ON public.live_hour_purchases
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members view purchases" ON public.live_hour_purchases
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));

-- live_hour_wallets
ALTER TABLE public.live_hour_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wallets" ON public.live_hour_wallets
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members view org wallets" ON public.live_hour_wallets
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((owner_type = 'organization'::text) AND is_org_member(auth.uid(), owner_id)));

-- live_org_oauth_tokens
ALTER TABLE public.live_org_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins can manage oauth tokens" ON public.live_org_oauth_tokens
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_org_oauth_tokens.organization_id) AND ((organization_members.is_owner = true) OR (organization_members.role = 'admin'::app_role))))));
CREATE POLICY "Org members can view their oauth tokens" ON public.live_org_oauth_tokens
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_org_oauth_tokens.organization_id)))));

-- live_packages
ALTER TABLE public.live_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all packages" ON public.live_packages
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org managers can manage packages" ON public.live_packages
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND ((om.role)::text = ANY (ARRAY['admin'::text, 'strategist'::text]))))));
CREATE POLICY "Org members view packages" ON public.live_packages
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners manage packages" ON public.live_packages
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_org_owner(auth.uid(), organization_id));
CREATE POLICY "Org users can view their packages" ON public.live_packages
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));

-- live_platform_config
ALTER TABLE public.live_platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can manage config" ON public.live_platform_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

-- live_stream_comments
ALTER TABLE public.live_stream_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_comments" ON public.live_stream_comments
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((is_deleted = false));
CREATE POLICY "authenticated_can_comment" ON public.live_stream_comments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_comments.stream_id) AND (creator_live_streams.status = 'live'::live_stream_status) AND (creator_live_streams.allow_comments = true))))));
CREATE POLICY "creator_can_manage_comments" ON public.live_stream_comments
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_comments.stream_id) AND (creator_live_streams.user_id = auth.uid()))))));

-- live_stream_history
ALTER TABLE public.live_stream_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view history" ON public.live_stream_history
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_stream_history.organization_id)))));

-- live_stream_products
ALTER TABLE public.live_stream_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_view_live_products" ON public.live_stream_products
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY "creator_can_manage_products" ON public.live_stream_products
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_products.stream_id) AND (creator_live_streams.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_products.stream_id) AND (creator_live_streams.user_id = auth.uid())))));

-- live_stream_reactions
ALTER TABLE public.live_stream_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_react" ON public.live_stream_reactions
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_reactions.stream_id) AND (creator_live_streams.status = 'live'::live_stream_status) AND (creator_live_streams.allow_reactions = true)))));
CREATE POLICY "anyone_can_view_reactions" ON public.live_stream_reactions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_reactions.stream_id) AND (creator_live_streams.status = 'live'::live_stream_status)))));

-- live_stream_viewers
ALTER TABLE public.live_stream_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_join_live" ON public.live_stream_viewers
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_viewers.stream_id) AND (creator_live_streams.status = 'live'::live_stream_status)))));
CREATE POLICY "creator_can_view_viewers" ON public.live_stream_viewers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM creator_live_streams
  WHERE ((creator_live_streams.id = live_stream_viewers.stream_id) AND (creator_live_streams.user_id = auth.uid())))));

-- live_streaming_channels
ALTER TABLE public.live_streaming_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins can manage channels" ON public.live_streaming_channels
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_streaming_channels.organization_id) AND ((organization_members.is_owner = true) OR (organization_members.role = 'admin'::app_role))))));
CREATE POLICY "Org members can view channels" ON public.live_streaming_channels
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.organization_id = live_streaming_channels.organization_id)))));

-- live_usage_logs
ALTER TABLE public.live_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view usage logs" ON public.live_usage_logs
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org users can view their logs" ON public.live_usage_logs
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));

-- managed_campaign_subscriptions
ALTER TABLE public.managed_campaign_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can insert managed_campaign_subscriptions" ON public.managed_campaign_subscriptions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::app_role)))));
CREATE POLICY "Admins can update managed_campaign_subscriptions" ON public.managed_campaign_subscriptions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::app_role)))));
CREATE POLICY "Admins can view all managed_campaign_subscriptions" ON public.managed_campaign_subscriptions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::app_role)))));
CREATE POLICY "Service role full access on managed_campaign_subscriptions" ON public.managed_campaign_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can view own managed_campaign_subscriptions" ON public.managed_campaign_subscriptions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (auth.uid())::text));

-- marketplace_campaigns
ALTER TABLE public.marketplace_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can delete draft campaigns" ON public.marketplace_campaigns
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((status = 'draft'::campaign_status) AND ((created_by = auth.uid()) OR ((brand_id IS NOT NULL) AND is_brand_admin(brand_id)) OR ((organization_id IS NOT NULL) AND is_org_admin(organization_id)))));
CREATE POLICY "Anon can view public open campaigns" ON public.marketplace_campaigns
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (((visibility = 'public'::text) AND (status = ANY (ARRAY['open'::campaign_status, 'active'::campaign_status, 'in_progress'::campaign_status, 'completed'::campaign_status]))));
CREATE POLICY "Brand or org members can create campaigns" ON public.marketplace_campaigns
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((auth.uid() = created_by) AND (((brand_id IS NOT NULL) AND is_brand_member(brand_id)) OR ((organization_id IS NOT NULL) AND is_org_member(organization_id)) OR ((brand_id IS NULL) AND (organization_id IS NULL)))));
CREATE POLICY "Campaign owners can update campaigns" ON public.marketplace_campaigns
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((created_by = auth.uid()) OR ((brand_id IS NOT NULL) AND is_brand_admin(brand_id)) OR ((organization_id IS NOT NULL) AND is_org_admin(organization_id))))
  WITH CHECK (((created_by = auth.uid()) OR ((brand_id IS NOT NULL) AND is_brand_admin(brand_id)) OR ((organization_id IS NOT NULL) AND is_org_admin(organization_id))));
CREATE POLICY "Campaigns visible based on visibility rules" ON public.marketplace_campaigns
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((created_by = auth.uid()) OR ((brand_id IS NOT NULL) AND is_brand_member(brand_id)) OR ((organization_id IS NOT NULL) AND is_org_member(organization_id)) OR ((visibility = 'public'::text) AND (status = ANY (ARRAY['open'::campaign_status, 'active'::campaign_status, 'in_progress'::campaign_status, 'completed'::campaign_status]))) OR ((visibility = 'selective'::text) AND (status = ANY (ARRAY['open'::campaign_status, 'active'::campaign_status, 'in_progress'::campaign_status, 'completed'::campaign_status])) AND is_campaign_invitee(id))));

-- mission_templates
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_templates_select_all" ON public.mission_templates
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((is_active = true));

-- organization_streaming_config
ALTER TABLE public.organization_streaming_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners can view their streaming config" ON public.organization_streaming_config
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_owner(auth.uid(), organization_id));
CREATE POLICY "Platform admins can manage all org streaming configs" ON public.organization_streaming_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- point_transactions
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage transactions" ON public.point_transactions
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert transactions" ON public.point_transactions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);
CREATE POLICY "Users can view all transactions" ON public.point_transactions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- portfolio_post_comments
ALTER TABLE public.portfolio_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view portfolio post comments" ON public.portfolio_post_comments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Users can add comments" ON public.portfolio_post_comments
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can delete their own comments" ON public.portfolio_post_comments
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = auth.uid()));

-- portfolio_post_likes
ALTER TABLE public.portfolio_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view portfolio post likes" ON public.portfolio_post_likes
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Authenticated users can like portfolio posts" ON public.portfolio_post_likes
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((auth.uid())::text = viewer_id));
CREATE POLICY "Users can unlike their own likes" ON public.portfolio_post_likes
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((auth.uid())::text = viewer_id));

-- portfolio_posts
ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view portfolio posts" ON public.portfolio_posts
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "Users can create their own posts" ON public.portfolio_posts
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own posts" ON public.portfolio_posts
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own posts" ON public.portfolio_posts
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((auth.uid() = user_id));

-- portfolio_stories
ALTER TABLE public.portfolio_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view non-expired stories" ON public.portfolio_stories
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((expires_at > now()));
CREATE POLICY "Users can create their own stories" ON public.portfolio_stories
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own stories" ON public.portfolio_stories
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own stories" ON public.portfolio_stories
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

-- post_hashtags
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read post_hashtags" ON public.post_hashtags
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- post_metrics
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_insert" ON public.post_metrics
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM social_accounts sa
  WHERE ((sa.id = post_metrics.social_account_id) AND ((sa.user_id = auth.uid()) OR ((sa.organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM organization_members om
          WHERE ((om.organization_id = sa.organization_id) AND (om.user_id = auth.uid()))))))))));
CREATE POLICY "pm_select" ON public.post_metrics
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM social_accounts sa
  WHERE ((sa.id = post_metrics.social_account_id) AND ((sa.user_id = auth.uid()) OR ((sa.organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM organization_members om
          WHERE ((om.organization_id = sa.organization_id) AND (om.user_id = auth.uid()))))))))));

-- profile_views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile owner views their profile views" ON public.profile_views
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((profile_user_id = auth.uid()) OR (viewer_id = auth.uid())));
CREATE POLICY "System inserts profile views" ON public.profile_views
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- promotional_campaigns
ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active promos" ON public.promotional_campaigns
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- publication_verification_queue
ALTER TABLE public.publication_verification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo sistema puede ver cola de verificación" ON public.publication_verification_queue
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- reputation_configs
ALTER TABLE public.reputation_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reputation configs" ON public.reputation_configs
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- reputation_events
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can insert events" ON public.reputation_events
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = reputation_events.organization_id) AND (om.user_id = auth.uid())))));
CREATE POLICY "Org members can view events" ON public.reputation_events
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = reputation_events.organization_id) AND (om.user_id = auth.uid())))));
CREATE POLICY "System can manage events" ON public.reputation_events
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- reputation_global
ALTER TABLE public.reputation_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public reputation" ON public.reputation_global
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((is_visible = true));
CREATE POLICY "Users can view own reputation" ON public.reputation_global
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

-- reputation_seasons
ALTER TABLE public.reputation_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage seasons" ON public.reputation_seasons
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = reputation_seasons.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = reputation_seasons.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))));
CREATE POLICY "Org members can view seasons" ON public.reputation_seasons
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = reputation_seasons.organization_id) AND (om.user_id = auth.uid())))));

-- role_multipliers
ALTER TABLE public.role_multipliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage multipliers" ON public.role_multipliers
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = role_multipliers.organization_id) AND (om.user_id = auth.uid()) AND (om.is_owner = true)))));
CREATE POLICY "Org members can view multipliers" ON public.role_multipliers
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = role_multipliers.organization_id) AND (om.user_id = auth.uid())))));

-- role_points_config
ALTER TABLE public.role_points_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage config" ON public.role_points_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = role_points_config.organization_id) AND (om.user_id = auth.uid()) AND (om.is_owner = true)))));
CREATE POLICY "Org members can view config" ON public.role_points_config
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = role_points_config.organization_id) AND (om.user_id = auth.uid())))));

-- role_weight_config
ALTER TABLE public.role_weight_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read global role weights" ON public.role_weight_config
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IS NULL));
CREATE POLICY "Org members can read org role weights" ON public.role_weight_config
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = role_weight_config.organization_id) AND (om.user_id = auth.uid()))))));

-- saved_collections
ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own collections" ON public.saved_collections
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own collections" ON public.saved_collections
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

-- saved_creators
ALTER TABLE public.saved_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can save creators" ON public.saved_creators
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can unsave creators" ON public.saved_creators
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their saved creators" ON public.saved_creators
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their saved creators" ON public.saved_creators
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

-- saved_items
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved items" ON public.saved_items
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own saved items" ON public.saved_items
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

-- saved_searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches" ON public.saved_searches
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- season_goals
ALTER TABLE public.season_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage season_goals of their organization" ON public.season_goals
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid()))))))
  WITH CHECK ((organization_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid()))))));
CREATE POLICY "season_goals_delete" ON public.season_goals
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));
CREATE POLICY "season_goals_insert" ON public.season_goals
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));
CREATE POLICY "season_goals_select" ON public.season_goals
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));
CREATE POLICY "season_goals_update" ON public.season_goals
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));

-- season_reward_claims
ALTER TABLE public.season_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage claims" ON public.season_reward_claims
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = season_reward_claims.organization_id) AND (om.user_id = auth.uid()) AND (om.is_owner = true)))));
CREATE POLICY "Org members can view org claims" ON public.season_reward_claims
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = season_reward_claims.organization_id) AND (om.user_id = auth.uid())))));
CREATE POLICY "Users can view own claims" ON public.season_reward_claims
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

-- season_rewards
ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage rewards" ON public.season_rewards
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = season_rewards.organization_id) AND (om.user_id = auth.uid()) AND (om.is_owner = true)))));
CREATE POLICY "Org members can view rewards" ON public.season_rewards
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = season_rewards.organization_id) AND (om.user_id = auth.uid())))));

-- social_notifications
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can create notifications" ON public.social_notifications
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "Users can update their own notifications" ON public.social_notifications
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own notifications" ON public.social_notifications
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

-- story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story owners can see who viewed" ON public.story_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM portfolio_stories ps
  WHERE ((ps.id = story_views.story_id) AND (ps.user_id = auth.uid())))));
CREATE POLICY "Users can insert own story views" ON public.story_views
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = viewer_id));
CREATE POLICY "Viewers can see own views" ON public.story_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = viewer_id));

-- streaming_accounts
ALTER TABLE public.streaming_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage streaming accounts" ON public.streaming_accounts
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR ((owner_type = 'organization'::streaming_owner_type) AND is_org_owner(auth.uid(), owner_id)) OR ((owner_type = 'client'::streaming_owner_type) AND (EXISTS ( SELECT 1
   FROM clients c
  WHERE ((c.id = streaming_accounts.client_id) AND is_org_owner(auth.uid(), c.organization_id)))))))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR ((owner_type = 'organization'::streaming_owner_type) AND is_org_owner(auth.uid(), owner_id)) OR ((owner_type = 'client'::streaming_owner_type) AND (EXISTS ( SELECT 1
   FROM clients c
  WHERE ((c.id = streaming_accounts.client_id) AND is_org_owner(auth.uid(), c.organization_id)))))));
CREATE POLICY "Org members can view their accounts" ON public.streaming_accounts
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_member(auth.uid(), owner_id)));
CREATE POLICY "Org owners can manage their accounts" ON public.streaming_accounts
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id) AND (EXISTS ( SELECT 1
   FROM organization_streaming_config
  WHERE ((organization_streaming_config.organization_id = streaming_accounts.owner_id) AND (organization_streaming_config.is_enabled = true))))))
  WITH CHECK (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)));
CREATE POLICY "Platform admins can manage all accounts" ON public.streaming_accounts
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "View streaming accounts" ON public.streaming_accounts
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR ((owner_type = 'organization'::streaming_owner_type) AND is_org_member(auth.uid(), owner_id)) OR ((owner_type = 'client'::streaming_owner_type) AND (EXISTS ( SELECT 1
   FROM clients c
  WHERE ((c.id = streaming_accounts.client_id) AND is_org_member(auth.uid(), c.organization_id))))) OR (owner_type = 'platform'::streaming_owner_type)));

-- streaming_analytics_v2
ALTER TABLE public.streaming_analytics_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_analytics_v2_insert" ON public.streaming_analytics_v2
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "streaming_analytics_v2_select" ON public.streaming_analytics_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_analytics_v2.session_id) AND is_streaming_org_member(s.organization_id)))));

-- streaming_channels_v2
ALTER TABLE public.streaming_channels_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_channels_v2_delete" ON public.streaming_channels_v2
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_channels_v2_insert" ON public.streaming_channels_v2
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_channels_v2_select" ON public.streaming_channels_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_channels_v2_update" ON public.streaming_channels_v2
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (is_streaming_org_member(organization_id));

-- streaming_chat_messages_v2
ALTER TABLE public.streaming_chat_messages_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_chat_v2_insert" ON public.streaming_chat_messages_v2
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_chat_messages_v2.session_id) AND is_streaming_org_member(s.organization_id) AND (streaming_chat_messages_v2.is_host = (s.host_user_id = auth.uid())))))));
CREATE POLICY "streaming_chat_v2_select" ON public.streaming_chat_messages_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_chat_messages_v2.session_id) AND is_streaming_org_member(s.organization_id)))));
CREATE POLICY "streaming_chat_v2_update" ON public.streaming_chat_messages_v2
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_chat_messages_v2.session_id) AND is_streaming_org_member(s.organization_id))))));

-- streaming_event_products
ALTER TABLE public.streaming_event_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can manage all event products" ON public.streaming_event_products
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));
CREATE POLICY "Users can manage products for their events" ON public.streaming_event_products
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM streaming_events e
  WHERE ((e.id = streaming_event_products.event_id) AND (is_platform_admin(auth.uid()) OR ((e.owner_type = 'organization'::streaming_owner_type) AND is_org_owner(auth.uid(), e.owner_id)))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM streaming_events e
  WHERE ((e.id = streaming_event_products.event_id) AND (is_platform_admin(auth.uid()) OR ((e.owner_type = 'organization'::streaming_owner_type) AND is_org_owner(auth.uid(), e.owner_id)))))));

-- streaming_events
ALTER TABLE public.streaming_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view their events" ON public.streaming_events
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_member(auth.uid(), owner_id)));
CREATE POLICY "Org owners can manage their events" ON public.streaming_events
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)))
  WITH CHECK (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)));
CREATE POLICY "Platform admins can manage all events" ON public.streaming_events
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- streaming_guests_v2
ALTER TABLE public.streaming_guests_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_guests_v2_all" ON public.streaming_guests_v2
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_guests_v2.session_id) AND is_streaming_org_member(s.organization_id)))));
CREATE POLICY "streaming_guests_v2_select" ON public.streaming_guests_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_guests_v2.session_id) AND is_streaming_org_member(s.organization_id))))));

-- streaming_logs
ALTER TABLE public.streaming_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners can view their logs" ON public.streaming_logs
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)));
CREATE POLICY "Platform admins can view all logs" ON public.streaming_logs
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_platform_admin(auth.uid()));

-- streaming_overlays_v2
ALTER TABLE public.streaming_overlays_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_overlays_v2_all" ON public.streaming_overlays_v2
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_overlays_v2_select" ON public.streaming_overlays_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_streaming_org_member(organization_id));

-- streaming_products_v2
ALTER TABLE public.streaming_products_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_products_v2_all" ON public.streaming_products_v2
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_products_v2.session_id) AND is_streaming_org_member(s.organization_id)))));
CREATE POLICY "streaming_products_v2_select" ON public.streaming_products_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_products_v2.session_id) AND is_streaming_org_member(s.organization_id)))));

-- streaming_providers_config
ALTER TABLE public.streaming_providers_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org owners can manage their provider configs" ON public.streaming_providers_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id) AND (EXISTS ( SELECT 1
   FROM organization_streaming_config
  WHERE ((organization_streaming_config.organization_id = streaming_providers_config.owner_id) AND (organization_streaming_config.is_enabled = true))))))
  WITH CHECK (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)));
CREATE POLICY "Platform admins can manage all provider configs" ON public.streaming_providers_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- streaming_sales
ALTER TABLE public.streaming_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view their sales" ON public.streaming_sales
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_member(auth.uid(), owner_id)));
CREATE POLICY "Org owners can manage their sales" ON public.streaming_sales
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)))
  WITH CHECK (((owner_type = 'organization'::streaming_owner_type) AND (owner_id IS NOT NULL) AND is_org_owner(auth.uid(), owner_id)));
CREATE POLICY "Platform admins can manage all sales" ON public.streaming_sales
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- streaming_session_channels_v2
ALTER TABLE public.streaming_session_channels_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_session_channels_v2_all" ON public.streaming_session_channels_v2
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_session_channels_v2.session_id) AND is_streaming_org_member(s.organization_id)))));
CREATE POLICY "streaming_session_channels_v2_select" ON public.streaming_session_channels_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM streaming_sessions_v2 s
  WHERE ((s.id = streaming_session_channels_v2.session_id) AND is_streaming_org_member(s.organization_id)))));

-- streaming_sessions_v2
ALTER TABLE public.streaming_sessions_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaming_sessions_v2_delete" ON public.streaming_sessions_v2
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_sessions_v2_insert" ON public.streaming_sessions_v2
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_sessions_v2_select" ON public.streaming_sessions_v2
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_streaming_org_member(organization_id));
CREATE POLICY "streaming_sessions_v2_update" ON public.streaming_sessions_v2
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (is_streaming_org_member(organization_id));

-- suggested_profiles_cache
ALTER TABLE public.suggested_profiles_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own suggestions" ON public.suggested_profiles_cache
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

-- unified_reputation_config
ALTER TABLE public.unified_reputation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage config" ON public.unified_reputation_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = unified_reputation_config.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = unified_reputation_config.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))));
CREATE POLICY "Org members can view config" ON public.unified_reputation_config
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = unified_reputation_config.organization_id) AND (om.user_id = auth.uid())))));

-- up_ai_config
ALTER TABLE public.up_ai_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ai config" ON public.up_ai_config
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_org_owner(auth.uid(), organization_id)));
CREATE POLICY "Org members can view ai config" ON public.up_ai_config
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));

-- up_arbiter_log
ALTER TABLE public.up_arbiter_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view arbiter log" ON public.up_arbiter_log
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = up_arbiter_log.organization_id) AND (om.user_id = auth.uid())))));

-- up_chronometer_pauses
ALTER TABLE public.up_chronometer_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage chronometer pauses" ON public.up_chronometer_pauses
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = up_chronometer_pauses.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = up_chronometer_pauses.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::app_role, 'team_leader'::app_role]))))));
CREATE POLICY "Org members can view chronometer pauses" ON public.up_chronometer_pauses
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = up_chronometer_pauses.organization_id) AND (om.user_id = auth.uid())))));

-- up_client_trust_scores
ALTER TABLE public.up_client_trust_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view client trust" ON public.up_client_trust_scores
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = up_client_trust_scores.organization_id) AND (om.user_id = auth.uid())))));

-- up_creadores
ALTER TABLE public.up_creadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage up_creadores" ON public.up_creadores
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));
CREATE POLICY "Org members can read up_creadores" ON public.up_creadores
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));

-- up_creadores_totals
ALTER TABLE public.up_creadores_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage up_creadores_totals" ON public.up_creadores_totals
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));
CREATE POLICY "Org members can read up_creadores_totals" ON public.up_creadores_totals
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));

-- up_currency_conversions
ALTER TABLE public.up_currency_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System manages up currency conversions" ON public.up_currency_conversions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users view own up currency conversions" ON public.up_currency_conversions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((user_id = auth.uid()) OR is_org_member(auth.uid(), organization_id)));

-- up_editores
ALTER TABLE public.up_editores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage up_editores" ON public.up_editores
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));
CREATE POLICY "Org members can read up_editores" ON public.up_editores
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));

-- up_editores_totals
ALTER TABLE public.up_editores_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage up_editores_totals" ON public.up_editores_totals
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));
CREATE POLICY "Org members can read up_editores_totals" ON public.up_editores_totals
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT get_my_organization_ids() AS get_my_organization_ids)));

-- up_event_types
ALTER TABLE public.up_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view up event types" ON public.up_event_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Platform root manages up event types" ON public.up_event_types
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_events
ALTER TABLE public.up_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view events" ON public.up_events
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can insert events" ON public.up_events
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);

-- up_fraud_alerts
ALTER TABLE public.up_fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform root manages fraud alerts" ON public.up_fraud_alerts
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((is_platform_root(auth.uid()) OR (user_id = auth.uid())))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_permissions
ALTER TABLE public.up_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view up permissions" ON public.up_permissions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Platform root manages up permissions" ON public.up_permissions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_quality_scores
ALTER TABLE public.up_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view quality scores" ON public.up_quality_scores
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "System manages quality scores" ON public.up_quality_scores
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_quest_progress
ALTER TABLE public.up_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quest progress" ON public.up_quest_progress
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- up_quests
ALTER TABLE public.up_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view up quests" ON public.up_quests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners manage up quests" ON public.up_quests
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- up_rules
ALTER TABLE public.up_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage rules" ON public.up_rules
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_org_owner(auth.uid(), organization_id)));
CREATE POLICY "Org members can view rules" ON public.up_rules
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));

-- up_season_snapshots
ALTER TABLE public.up_season_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System manages season snapshots" ON public.up_season_snapshots
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));
CREATE POLICY "Users view own season snapshots" ON public.up_season_snapshots
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((user_id = auth.uid()) OR is_org_member(auth.uid(), organization_id)));

-- up_seasons
ALTER TABLE public.up_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage seasons" ON public.up_seasons
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((has_role(auth.uid(), 'admin'::app_role) OR is_org_owner(auth.uid(), organization_id)));
CREATE POLICY "Org members can view seasons" ON public.up_seasons
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_org_member(auth.uid(), organization_id));

-- up_settings
ALTER TABLE public.up_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read up settings" ON public.up_settings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Platform root manages up settings" ON public.up_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));

-- up_user_scores
ALTER TABLE public.up_user_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view org scores" ON public.up_user_scores
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = up_user_scores.organization_id) AND (om.user_id = auth.uid())))));
CREATE POLICY "Users can view own scores" ON public.up_user_scores
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

-- user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage user achievements" ON public.user_achievements
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view user achievements" ON public.user_achievements
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Users can view all user achievements" ON public.user_achievements
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- user_daily_missions
ALTER TABLE public.user_daily_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_daily_missions_select_own" ON public.user_daily_missions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()));

-- user_feed_events
ALTER TABLE public.user_feed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can insert feed events" ON public.user_feed_events
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK ((user_id IS NULL));
CREATE POLICY "Service role full access" ON public.user_feed_events
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can insert own feed events" ON public.user_feed_events
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));
CREATE POLICY "Users can view own feed events" ON public.user_feed_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

-- user_global_badges
ALTER TABLE public.user_global_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view completed badges" ON public.user_global_badges
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((is_completed = true));
CREATE POLICY "System can manage badges" ON public.user_global_badges
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can view own badges" ON public.user_global_badges
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((user_id = auth.uid()) OR (is_completed = true)));

-- user_global_stats
ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stats" ON public.user_global_stats
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);
CREATE POLICY "System can manage stats" ON public.user_global_stats
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- user_interest_profile
ALTER TABLE public.user_interest_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own interest profile" ON public.user_interest_profile
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.uid() = user_id));

-- user_points
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage points" ON public.user_points
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own points" ON public.user_points
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can view all points" ON public.user_points
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- user_reputation_totals
ALTER TABLE public.user_reputation_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view org totals" ON public.user_reputation_totals
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = user_reputation_totals.organization_id) AND (om.user_id = auth.uid())))));
CREATE POLICY "System can manage totals" ON public.user_reputation_totals
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can view own totals" ON public.user_reputation_totals
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

-- user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_streaks_select_own" ON public.user_streaks
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()));
