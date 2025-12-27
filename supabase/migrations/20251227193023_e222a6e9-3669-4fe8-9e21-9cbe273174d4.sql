-- Create function to check if user is assigned to content
CREATE OR REPLACE FUNCTION public.is_user_assigned_to_content(p_user_id UUID, p_content_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_assigned BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = p_content_id
    AND (
      c.creator_id = p_user_id OR
      c.editor_id = p_user_id OR
      c.strategist_id = p_user_id OR
      EXISTS (SELECT 1 FROM public.content_collaborators cc WHERE cc.content_id = p_content_id AND cc.user_id = p_user_id)
    )
  ) INTO is_assigned;
  RETURN is_assigned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- content_update, mention, message, assignment, status_change
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT, -- content, comment, chat, etc.
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- User can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.user_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create notification for content updates
CREATE OR REPLACE FUNCTION public.notify_content_update()
RETURNS TRIGGER AS $$
DECLARE
  assigned_user RECORD;
  content_title TEXT;
  org_id UUID;
BEGIN
  content_title := NEW.title;
  org_id := NEW.organization_id;
  
  -- Notify creator if exists and different from updater
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
    VALUES (NEW.creator_id, org_id, 'content_update', 'Contenido actualizado', 'El contenido "' || content_title || '" ha sido actualizado', 'content', NEW.id);
  END IF;
  
  -- Notify editor if exists
  IF NEW.editor_id IS NOT NULL AND NEW.editor_id != NEW.creator_id THEN
    INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
    VALUES (NEW.editor_id, org_id, 'content_update', 'Contenido actualizado', 'El contenido "' || content_title || '" ha sido actualizado', 'content', NEW.id);
  END IF;
  
  -- Notify strategist if exists
  IF NEW.strategist_id IS NOT NULL AND NEW.strategist_id != NEW.creator_id AND NEW.strategist_id != NEW.editor_id THEN
    INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
    VALUES (NEW.strategist_id, org_id, 'content_update', 'Contenido actualizado', 'El contenido "' || content_title || '" ha sido actualizado', 'content', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to notify on status change
CREATE OR REPLACE FUNCTION public.notify_content_status_change()
RETURNS TRIGGER AS $$
DECLARE
  content_title TEXT;
  org_id UUID;
  new_status_name TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.custom_status_id IS DISTINCT FROM NEW.custom_status_id THEN
    content_title := NEW.title;
    org_id := NEW.organization_id;
    new_status_name := COALESCE(NEW.status::TEXT, 'nuevo estado');
    
    -- Notify all assigned users
    IF NEW.creator_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.creator_id, org_id, 'status_change', 'Cambio de estado', 'El contenido "' || content_title || '" cambió a ' || new_status_name, 'content', NEW.id);
    END IF;
    
    IF NEW.editor_id IS NOT NULL AND NEW.editor_id != COALESCE(NEW.creator_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
      INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.editor_id, org_id, 'status_change', 'Cambio de estado', 'El contenido "' || content_title || '" cambió a ' || new_status_name, 'content', NEW.id);
    END IF;
    
    IF NEW.strategist_id IS NOT NULL AND NEW.strategist_id != COALESCE(NEW.creator_id, '00000000-0000-0000-0000-000000000000'::UUID) AND NEW.strategist_id != COALESCE(NEW.editor_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
      INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
      VALUES (NEW.strategist_id, org_id, 'status_change', 'Cambio de estado', 'El contenido "' || content_title || '" cambió a ' || new_status_name, 'content', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for status changes
CREATE TRIGGER trigger_notify_content_status_change
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_status_change();

-- Function to notify on new comment/mention
CREATE OR REPLACE FUNCTION public.notify_content_comment()
RETURNS TRIGGER AS $$
DECLARE
  content_rec RECORD;
  commenter_name TEXT;
BEGIN
  -- Get content info
  SELECT c.title, c.organization_id, c.creator_id, c.editor_id, c.strategist_id
  INTO content_rec
  FROM public.content c
  WHERE c.id = NEW.content_id;
  
  -- Get commenter name
  SELECT full_name INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify content creator if not the commenter
  IF content_rec.creator_id IS NOT NULL AND content_rec.creator_id != NEW.user_id THEN
    INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
    VALUES (content_rec.creator_id, content_rec.organization_id, 'mention', 'Nuevo comentario', COALESCE(commenter_name, 'Alguien') || ' comentó en "' || content_rec.title || '"', 'content', NEW.content_id);
  END IF;
  
  -- Notify editor if not the commenter
  IF content_rec.editor_id IS NOT NULL AND content_rec.editor_id != NEW.user_id AND content_rec.editor_id != content_rec.creator_id THEN
    INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
    VALUES (content_rec.editor_id, content_rec.organization_id, 'mention', 'Nuevo comentario', COALESCE(commenter_name, 'Alguien') || ' comentó en "' || content_rec.title || '"', 'content', NEW.content_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new comments
CREATE TRIGGER trigger_notify_content_comment
  AFTER INSERT ON public.content_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_comment();

-- Function to notify on chat message
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
  conv_org_id UUID;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Get conversation organization
  SELECT organization_id INTO conv_org_id FROM public.chat_conversations WHERE id = NEW.conversation_id;
  
  -- Notify all participants except sender
  FOR participant IN 
    SELECT cp.user_id 
    FROM public.chat_participants cp 
    WHERE cp.conversation_id = NEW.conversation_id 
    AND cp.user_id != NEW.sender_id
  LOOP
    INSERT INTO public.user_notifications (user_id, organization_id, type, title, message, entity_type, entity_id)
    VALUES (participant.user_id, conv_org_id, 'message', 'Nuevo mensaje', COALESCE(sender_name, 'Alguien') || ': ' || LEFT(NEW.content, 50), 'chat', NEW.conversation_id);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for chat messages
CREATE TRIGGER trigger_notify_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- Create function to initialize default RBAC rules for new organizations
CREATE OR REPLACE FUNCTION public.initialize_org_chat_rbac()
RETURNS TRIGGER AS $$
BEGIN
  -- Admin can chat with everyone
  INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_see_in_list, can_chat, can_add_to_group) VALUES
  (NEW.id, 'admin', 'admin', true, true, true),
  (NEW.id, 'admin', 'creator', true, true, true),
  (NEW.id, 'admin', 'editor', true, true, true),
  (NEW.id, 'admin', 'strategist', true, true, true),
  (NEW.id, 'admin', 'client', true, true, true),
  (NEW.id, 'admin', 'ambassador', true, true, true);
  
  -- Strategist can chat with team and clients
  INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_see_in_list, can_chat, can_add_to_group) VALUES
  (NEW.id, 'strategist', 'admin', true, true, true),
  (NEW.id, 'strategist', 'creator', true, true, true),
  (NEW.id, 'strategist', 'editor', true, true, true),
  (NEW.id, 'strategist', 'strategist', true, true, true),
  (NEW.id, 'strategist', 'client', true, true, false);
  
  -- Creator can chat with team (not clients)
  INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_see_in_list, can_chat, can_add_to_group) VALUES
  (NEW.id, 'creator', 'admin', true, true, true),
  (NEW.id, 'creator', 'creator', true, true, true),
  (NEW.id, 'creator', 'editor', true, true, true),
  (NEW.id, 'creator', 'strategist', true, true, true),
  (NEW.id, 'creator', 'client', false, false, false);
  
  -- Editor can chat with team (not clients)
  INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_see_in_list, can_chat, can_add_to_group) VALUES
  (NEW.id, 'editor', 'admin', true, true, true),
  (NEW.id, 'editor', 'creator', true, true, true),
  (NEW.id, 'editor', 'editor', true, true, true),
  (NEW.id, 'editor', 'strategist', true, true, true),
  (NEW.id, 'editor', 'client', false, false, false);
  
  -- Client can only chat with admin and strategist
  INSERT INTO public.chat_rbac_rules (organization_id, source_role, target_role, can_see_in_list, can_chat, can_add_to_group) VALUES
  (NEW.id, 'client', 'admin', true, true, false),
  (NEW.id, 'client', 'strategist', true, true, false),
  (NEW.id, 'client', 'creator', false, false, false),
  (NEW.id, 'client', 'editor', false, false, false),
  (NEW.id, 'client', 'client', false, false, false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new organizations
CREATE TRIGGER trigger_initialize_org_chat_rbac
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_org_chat_rbac();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;