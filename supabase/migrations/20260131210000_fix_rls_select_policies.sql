-- =====================================================
-- FIX RLS: Usar is_org_configurer para SELECT (admins no están en org_members)
-- Platform admins fallan is_org_member pero pasan is_org_configurer
-- =====================================================

-- state_permissions - SELECT debe usar is_org_configurer
DROP POLICY IF EXISTS "Members can read state_permissions" ON public.state_permissions;
CREATE POLICY "Members can read state_permissions" ON public.state_permissions FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- kanban_config
DROP POLICY IF EXISTS "Members can read kanban_config" ON public.kanban_config;
CREATE POLICY "Members can read kanban_config" ON public.kanban_config FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- organization_statuses
DROP POLICY IF EXISTS "Members can read organization_statuses" ON public.organization_statuses;
CREATE POLICY "Members can read organization_statuses" ON public.organization_statuses FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- project_raw_assets - tiene organization_id
DROP POLICY IF EXISTS "Org members can view raw assets" ON public.project_raw_assets;
DROP POLICY IF EXISTS "Org members can manage raw assets" ON public.project_raw_assets;
CREATE POLICY "Org members can view raw assets" ON public.project_raw_assets FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage raw assets" ON public.project_raw_assets FOR ALL 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id)) 
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- content_comments - políticas originales pueden estar bloqueando
DROP POLICY IF EXISTS "Authenticated can read comments" ON public.content_comments;
DROP POLICY IF EXISTS "Authenticated can insert comments" ON public.content_comments;
CREATE POLICY "Authenticated can read comments" ON public.content_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.content_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- content_block_config
DROP POLICY IF EXISTS "Members can read block config" ON public.content_block_config;
CREATE POLICY "Members can read block config" ON public.content_block_config FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- content_block_permissions
DROP POLICY IF EXISTS "Members can read block permissions" ON public.content_block_permissions;
CREATE POLICY "Members can read block permissions" ON public.content_block_permissions FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- content_advanced_config
DROP POLICY IF EXISTS "Members can read advanced config" ON public.content_advanced_config;
CREATE POLICY "Members can read advanced config" ON public.content_advanced_config FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- content_block_state_rules
DROP POLICY IF EXISTS "Members can read state rules" ON public.content_block_state_rules;
CREATE POLICY "Members can read state rules" ON public.content_block_state_rules FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- script_permissions
DROP POLICY IF EXISTS "Members can read script permissions" ON public.script_permissions;
CREATE POLICY "Members can read script permissions" ON public.script_permissions FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- organization_ai_prompts
DROP POLICY IF EXISTS "Members can read ai prompts" ON public.organization_ai_prompts;
CREATE POLICY "Members can read ai prompts" ON public.organization_ai_prompts FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- organization_ai_providers
DROP POLICY IF EXISTS "Members can read ai providers" ON public.organization_ai_providers;
CREATE POLICY "Members can read ai providers" ON public.organization_ai_providers FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- user_notifications - usar nombres exactos de políticas originales para DROP
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.user_notifications FOR DELETE USING (auth.uid() = user_id);
-- INSERT ya existe "System can insert notifications" - no tocar

-- chat_rbac_rules
DROP POLICY IF EXISTS "Members can read chat rbac rules" ON public.chat_rbac_rules;
CREATE POLICY "Members can read chat rbac rules" ON public.chat_rbac_rules FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));

-- ai_assistant_config
DROP POLICY IF EXISTS "Members can read ai assistant config" ON public.ai_assistant_config;
CREATE POLICY "Members can read ai assistant config" ON public.ai_assistant_config FOR SELECT 
USING (public.is_org_configurer(auth.uid(), organization_id) OR public.is_org_member(auth.uid(), organization_id));
