-- Drop the existing policies (note the space in the name)
DROP POLICY IF EXISTS "Users can create conversations " ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;

-- Recreate as permissive with TO authenticated
CREATE POLICY "Users can create conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow updates to conversations (for updated_at trigger)
CREATE POLICY "Users can update their conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (is_conversation_participant(auth.uid(), id));