-- Create a single entrypoint to create conversations + participants atomically
-- This avoids RLS edge-cases and ensures creator is added as participant.

CREATE OR REPLACE FUNCTION public.create_chat_conversation(
  participant_ids uuid[],
  _name text DEFAULT NULL,
  _is_group boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id uuid;
  pid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF participant_ids IS NULL OR array_length(participant_ids, 1) IS NULL OR array_length(participant_ids, 1) < 1 THEN
    RAISE EXCEPTION 'participant_ids required';
  END IF;

  -- Validate 1:1 rules via existing function
  IF _is_group = false AND array_length(participant_ids, 1) <> 1 THEN
    RAISE EXCEPTION 'For 1-on-1 chats, exactly one participant is required';
  END IF;

  -- Check permission to chat with each participant (client restrictions etc.)
  FOREACH pid IN ARRAY participant_ids LOOP
    IF public.can_users_chat(auth.uid(), pid) IS NOT TRUE THEN
      RAISE EXCEPTION 'Users are not allowed to chat';
    END IF;
  END LOOP;

  INSERT INTO public.chat_conversations (name, is_group, created_by)
  VALUES (CASE WHEN _is_group THEN _name ELSE NULL END, _is_group, auth.uid())
  RETURNING id INTO new_conversation_id;

  -- Add creator first
  INSERT INTO public.chat_participants (conversation_id, user_id)
  VALUES (new_conversation_id, auth.uid());

  -- Add others
  FOREACH pid IN ARRAY participant_ids LOOP
    INSERT INTO public.chat_participants (conversation_id, user_id)
    VALUES (new_conversation_id, pid);
  END LOOP;

  RETURN new_conversation_id;
END;
$$;

-- Allow authenticated users to execute
GRANT EXECUTE ON FUNCTION public.create_chat_conversation(uuid[], text, boolean) TO authenticated;