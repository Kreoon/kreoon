-- =============================================
-- CHAT & NOTIFICATIONS MODULE - ORG-ONLY + RBAC
-- =============================================

-- 1. Create chat type enum
CREATE TYPE public.chat_type AS ENUM ('direct', 'group', 'ai_assistant');

-- 2. Add organization_id and chat_type to chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chat_type public.chat_type DEFAULT 'direct';

-- 3. Enhance chat_messages for attachments and delivery status
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT, -- 'image', 'video', 'audio', 'file'
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- 4. Create typing indicators table (realtime)
CREATE TABLE IF NOT EXISTS public.chat_typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing indicators
ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- 5. Create chat RBAC rules table
CREATE TABLE IF NOT EXISTS public.chat_rbac_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_role TEXT NOT NULL, -- role that initiates chat
  target_role TEXT NOT NULL, -- role that can be chatted with
  can_chat BOOLEAN NOT NULL DEFAULT true,
  can_see_in_list BOOLEAN NOT NULL DEFAULT true,
  can_add_to_group BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_role, target_role)
);

ALTER TABLE public.chat_rbac_rules ENABLE ROW LEVEL SECURITY;

-- 6. Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'chat_message', 'content_status', 'assignment', 'mention', etc.
  channel_in_app BOOLEAN NOT NULL DEFAULT true,
  channel_push BOOLEAN NOT NULL DEFAULT true,
  channel_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, event_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 7. Create user notification settings (per-user overrides)
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel_in_app BOOLEAN DEFAULT NULL, -- null means use org default
  channel_push BOOLEAN DEFAULT NULL,
  channel_email BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- 8. Create AI assistant configuration table
CREATE TABLE IF NOT EXISTS public.ai_assistant_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  assistant_name TEXT NOT NULL DEFAULT 'Asistente',
  provider TEXT NOT NULL DEFAULT 'lovable',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt TEXT,
  tone TEXT DEFAULT 'profesional', -- 'profesional', 'amigable', 'formal'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_config ENABLE ROW LEVEL SECURITY;

-- 9. Create AI knowledge base table
CREATE TABLE IF NOT EXISTS public.ai_assistant_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  knowledge_type TEXT NOT NULL, -- 'document', 'faq', 'flow', 'prohibition'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_knowledge ENABLE ROW LEVEL SECURITY;

-- 10. Create AI assistant chat logs for auditing
CREATE TABLE IF NOT EXISTS public.ai_assistant_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_logs ENABLE ROW LEVEL SECURITY;

-- 11. Create message read receipts table (for multi-user tracking)
CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Typing indicators: participants can see
CREATE POLICY "Participants can see typing" ON public.chat_typing_indicators
FOR SELECT USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can insert own typing" ON public.chat_typing_indicators
FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can delete own typing" ON public.chat_typing_indicators
FOR DELETE USING (auth.uid() = user_id);

-- Chat RBAC rules: org admins can manage
CREATE POLICY "Org members can view chat rules" ON public.chat_rbac_rules
FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage chat rules" ON public.chat_rbac_rules
FOR ALL USING (public.is_org_owner(auth.uid(), organization_id));

-- Notification preferences: org admins can manage
CREATE POLICY "Org members can view notification prefs" ON public.notification_preferences
FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage notification prefs" ON public.notification_preferences
FOR ALL USING (public.is_org_owner(auth.uid(), organization_id));

-- User notification settings
CREATE POLICY "Users can view own notification settings" ON public.user_notification_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification settings" ON public.user_notification_settings
FOR ALL USING (auth.uid() = user_id);

-- AI assistant config: org admins can manage
CREATE POLICY "Org members can view AI config" ON public.ai_assistant_config
FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage AI config" ON public.ai_assistant_config
FOR ALL USING (public.is_org_owner(auth.uid(), organization_id));

-- AI knowledge base
CREATE POLICY "Org members can view knowledge" ON public.ai_assistant_knowledge
FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage knowledge" ON public.ai_assistant_knowledge
FOR ALL USING (public.is_org_owner(auth.uid(), organization_id));

-- AI assistant logs: user can see own, admins can see all org
CREATE POLICY "Users can view own AI logs" ON public.ai_assistant_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Org owners can view all AI logs" ON public.ai_assistant_logs
FOR SELECT USING (public.is_org_owner(auth.uid(), organization_id));

-- Message read receipts
CREATE POLICY "Participants can view read receipts" ON public.chat_message_reads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = message_id
    AND public.is_conversation_participant(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users can insert own read receipts" ON public.chat_message_reads
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to check if two users can chat based on RBAC
CREATE OR REPLACE FUNCTION public.can_chat_with_user(_source_user_id uuid, _target_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_role TEXT;
  target_role TEXT;
  rule_exists BOOLEAN;
  can_chat_result BOOLEAN;
BEGIN
  -- Get source user role in org
  SELECT role INTO source_role
  FROM public.organization_members
  WHERE user_id = _source_user_id AND organization_id = _org_id
  LIMIT 1;
  
  -- Get target user role in org
  SELECT role INTO target_role
  FROM public.organization_members
  WHERE user_id = _target_user_id AND organization_id = _org_id
  LIMIT 1;
  
  -- If either user is not in the org, deny
  IF source_role IS NULL OR target_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin can always chat with anyone
  IF source_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if there's a specific rule
  SELECT EXISTS(
    SELECT 1 FROM public.chat_rbac_rules
    WHERE organization_id = _org_id 
    AND source_role = can_chat_with_user.source_role 
    AND target_role = can_chat_with_user.target_role
  ) INTO rule_exists;
  
  IF rule_exists THEN
    SELECT can_chat INTO can_chat_result
    FROM public.chat_rbac_rules
    WHERE organization_id = _org_id 
    AND source_role = can_chat_with_user.source_role 
    AND target_role = can_chat_with_user.target_role;
    RETURN can_chat_result;
  END IF;
  
  -- Default rules if no explicit rule exists:
  -- Client can only chat with admin and strategist
  IF source_role = 'client' THEN
    RETURN target_role IN ('admin', 'strategist');
  END IF;
  
  -- Non-clients can chat with each other (internal team)
  IF source_role != 'client' AND target_role != 'client' THEN
    RETURN true;
  END IF;
  
  -- By default, non-client roles can chat with clients only if admin/strategist
  IF target_role = 'client' THEN
    RETURN source_role IN ('admin', 'strategist');
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get users visible in chat list for current user
CREATE OR REPLACE FUNCTION public.get_chat_visible_users(_user_id uuid, _org_id uuid)
RETURNS TABLE(user_id uuid, can_chat boolean, can_add_to_group boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.organization_members
  WHERE organization_members.user_id = _user_id AND organization_id = _org_id;
  
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    om.user_id,
    public.can_chat_with_user(_user_id, om.user_id, _org_id) as can_chat,
    CASE 
      WHEN user_role = 'admin' THEN true
      WHEN user_role = 'client' THEN false
      ELSE (SELECT role FROM public.organization_members WHERE organization_members.user_id = om.user_id AND organization_id = _org_id) != 'client'
    END as can_add_to_group
  FROM public.organization_members om
  WHERE om.organization_id = _org_id
    AND om.user_id != _user_id;
END;
$$;

-- Function to insert default RBAC rules for an organization
CREATE OR REPLACE FUNCTION public.create_default_chat_rbac_rules(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  internal_roles TEXT[] := ARRAY['admin', 'strategist', 'creator', 'editor', 'designer', 'trafficker'];
  r1 TEXT;
  r2 TEXT;
BEGIN
  -- Client rules: can only chat with admin and strategist
  INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_chat, can_see_in_list, can_add_to_group)
  VALUES 
    (_org_id, 'client', 'admin', true, true, false),
    (_org_id, 'client', 'strategist', true, true, false),
    (_org_id, 'client', 'creator', false, false, false),
    (_org_id, 'client', 'editor', false, false, false),
    (_org_id, 'client', 'designer', false, false, false),
    (_org_id, 'client', 'trafficker', false, false, false)
  ON CONFLICT (organization_id, source_role, target_role) DO NOTHING;
  
  -- Internal team can chat with each other
  FOREACH r1 IN ARRAY internal_roles LOOP
    FOREACH r2 IN ARRAY internal_roles LOOP
      INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_chat, can_see_in_list, can_add_to_group)
      VALUES (_org_id, r1, r2, true, true, true)
      ON CONFLICT (organization_id, source_role, target_role) DO NOTHING;
    END LOOP;
    
    -- Internal team can chat with clients (only admin and strategist)
    IF r1 IN ('admin', 'strategist') THEN
      INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_chat, can_see_in_list, can_add_to_group)
      VALUES (_org_id, r1, 'client', true, true, false)
      ON CONFLICT (organization_id, source_role, target_role) DO NOTHING;
    ELSE
      INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_chat, can_see_in_list, can_add_to_group)
      VALUES (_org_id, r1, 'client', false, false, false)
      ON CONFLICT (organization_id, source_role, target_role) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Function to mark message as delivered
CREATE OR REPLACE FUNCTION public.mark_message_delivered(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_messages
  SET delivered_at = now()
  WHERE id = _message_id AND delivered_at IS NULL;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(_conversation_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update read_at on messages from others
  UPDATE public.chat_messages
  SET read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_id != _user_id
    AND read_at IS NULL;
  
  -- Insert into read receipts table
  INSERT INTO public.chat_message_reads (message_id, user_id)
  SELECT id, _user_id
  FROM public.chat_messages
  WHERE conversation_id = _conversation_id
    AND sender_id != _user_id
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  -- Update last_read_at in participants
  UPDATE public.chat_participants
  SET last_read_at = now()
  WHERE conversation_id = _conversation_id AND user_id = _user_id;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_typing_indicators
  WHERE started_at < now() - interval '10 seconds';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER cleanup_typing_on_insert
AFTER INSERT ON public.chat_typing_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_typing_indicators();

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads;