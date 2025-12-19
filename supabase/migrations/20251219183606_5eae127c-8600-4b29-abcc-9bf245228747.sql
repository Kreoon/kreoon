-- Create user presence table for tracking online status
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_page TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Policies for user_presence
CREATE POLICY "Users can update own presence" ON public.user_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presence" ON public.user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view presence" ON public.user_presence
  FOR SELECT USING (true);

-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT, -- null for 1-on-1 chats
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE, -- optional link to content
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Create chat participants table
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Function to check if user is participant of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Function to check if two users can chat based on roles
CREATE OR REPLACE FUNCTION public.can_users_chat(_user1_id UUID, _user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user1_roles app_role[];
  user2_roles app_role[];
  user1_is_client BOOLEAN;
  user2_is_client BOOLEAN;
BEGIN
  -- Get roles for both users
  SELECT ARRAY_AGG(role) INTO user1_roles FROM public.user_roles WHERE user_id = _user1_id;
  SELECT ARRAY_AGG(role) INTO user2_roles FROM public.user_roles WHERE user_id = _user2_id;
  
  user1_is_client := 'client' = ANY(user1_roles);
  user2_is_client := 'client' = ANY(user2_roles);
  
  -- Clients can only chat with strategists and admins
  IF user1_is_client THEN
    RETURN 'admin' = ANY(user2_roles) OR 'strategist' = ANY(user2_roles);
  END IF;
  
  IF user2_is_client THEN
    RETURN 'admin' = ANY(user1_roles) OR 'strategist' = ANY(user1_roles);
  END IF;
  
  -- Non-clients can chat with anyone (creators, editors, strategists, admins)
  RETURN true;
END;
$$;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their conversations" ON public.chat_conversations
  FOR SELECT USING (
    public.is_conversation_participant(auth.uid(), id)
  );

CREATE POLICY "Users can create conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their conversations" ON public.chat_participants
  FOR SELECT USING (
    public.is_conversation_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "Conversation creator can add participants" ON public.chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = conversation_id AND created_by = auth.uid()
    ) OR user_id = auth.uid()
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations" ON public.chat_messages
  FOR SELECT USING (
    public.is_conversation_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "Users can send messages to their conversations" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    public.is_conversation_participant(auth.uid(), conversation_id)
  );

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Trigger to update conversation updated_at when new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();