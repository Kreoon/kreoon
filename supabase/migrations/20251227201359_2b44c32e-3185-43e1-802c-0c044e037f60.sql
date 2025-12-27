-- Drop existing INSERT policy and create a more permissive one
DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;

-- Create new INSERT policy that allows authenticated users to create conversations
CREATE POLICY "Users can create conversations" 
ON public.chat_conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must set themselves as creator OR creator can be null
  (created_by IS NULL OR created_by = auth.uid())
);

-- Also ensure SELECT policy works for authenticated users
DROP POLICY IF EXISTS "Users can view their conversations" ON public.chat_conversations;

CREATE POLICY "Users can view their conversations" 
ON public.chat_conversations 
FOR SELECT 
TO authenticated
USING (
  -- User is a participant OR user is the creator
  is_conversation_participant(auth.uid(), id) OR created_by = auth.uid()
);