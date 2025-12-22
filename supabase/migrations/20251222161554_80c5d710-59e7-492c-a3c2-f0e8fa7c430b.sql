-- Add read_at column to chat_messages for read receipts
ALTER TABLE public.chat_messages 
ADD COLUMN read_at timestamp with time zone DEFAULT NULL;

-- Allow admins to delete conversations
CREATE POLICY "Admins can delete conversations" 
ON public.chat_conversations 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete chat messages
CREATE POLICY "Admins can delete messages" 
ON public.chat_messages 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete chat participants
CREATE POLICY "Admins can delete participants" 
ON public.chat_participants 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow users to update message read_at (for read receipts)
CREATE POLICY "Users can mark messages as read" 
ON public.chat_messages 
FOR UPDATE 
USING (public.is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (public.is_conversation_participant(auth.uid(), conversation_id));