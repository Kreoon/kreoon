-- Add UPDATE policy for chat_participants so users can update their last_read_at
CREATE POLICY "Users can update their own participation"
ON public.chat_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());