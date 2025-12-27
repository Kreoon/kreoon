-- Create table for message reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for reactions
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_participants p ON p.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions to messages in their conversations"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_participants p ON p.conversation_id = m.conversation_id
    WHERE m.id = message_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Create table for link previews cache
CREATE TABLE public.link_previews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS (public read for caching)
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Link previews are publicly readable"
ON public.link_previews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert link previews"
ON public.link_previews FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add indexes for performance
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX idx_link_previews_url ON public.link_previews(url);
CREATE INDEX idx_chat_messages_content_search ON public.chat_messages USING GIN(to_tsvector('spanish', content));

-- Add user_presence updates for better tracking
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS current_activity TEXT;