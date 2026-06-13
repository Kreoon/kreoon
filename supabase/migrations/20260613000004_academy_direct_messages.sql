-- ============================================================================
-- DMs entre miembros de academia con role gating:
-- - content_creator / editor (talento) <-> talento: libre
-- - student / client: solo con admin/owner del space
-- - admin/owner: con cualquiera
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academy_dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count_a INT NOT NULL DEFAULT 0,
  unread_count_b INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a < user_b),
  UNIQUE (space_id, user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_dm_threads_user_a
  ON public.academy_dm_threads(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_threads_user_b
  ON public.academy_dm_threads(user_b, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.academy_dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.academy_dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (LENGTH(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread
  ON public.academy_dm_messages(thread_id, created_at DESC);

ALTER TABLE public.academy_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_threads_participants_read" ON public.academy_dm_threads;
CREATE POLICY "dm_threads_participants_read"
  ON public.academy_dm_threads FOR SELECT
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "dm_messages_participants_read" ON public.academy_dm_messages;
CREATE POLICY "dm_messages_participants_read"
  ON public.academy_dm_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_dm_threads t
      WHERE t.id = academy_dm_messages.thread_id
        AND (t.user_a = auth.uid() OR t.user_b = auth.uid())
    )
  );

GRANT SELECT ON public.academy_dm_threads TO authenticated;
GRANT SELECT ON public.academy_dm_messages TO authenticated;

-- Helper de role gating
CREATE OR REPLACE FUNCTION public._can_dm_in_space(
  p_space_id UUID, p_user_a UUID, p_user_b UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_owner UUID;
  v_global_role_a TEXT;
  v_global_role_b TEXT;
  v_a_is_admin BOOLEAN;
  v_b_is_admin BOOLEAN;
  v_a_is_talent BOOLEAN;
  v_b_is_talent BOOLEAN;
BEGIN
  IF p_user_a = p_user_b THEN RETURN false; END IF;
  SELECT owner_id INTO v_owner FROM academy_spaces WHERE id = p_space_id;
  IF v_owner IS NULL THEN RETURN false; END IF;

  v_a_is_admin := (p_user_a = v_owner);
  v_b_is_admin := (p_user_b = v_owner);

  SELECT role INTO v_global_role_a FROM organization_members
   WHERE user_id = p_user_a AND is_active = true LIMIT 1;
  SELECT role INTO v_global_role_b FROM organization_members
   WHERE user_id = p_user_b AND is_active = true LIMIT 1;

  v_a_is_talent := v_global_role_a IN ('content_creator', 'editor', 'admin');
  v_b_is_talent := v_global_role_b IN ('content_creator', 'editor', 'admin');

  IF v_a_is_admin OR v_b_is_admin
     OR v_global_role_a = 'admin' OR v_global_role_b = 'admin' THEN
    RETURN true;
  END IF;
  IF v_a_is_talent AND v_b_is_talent THEN RETURN true; END IF;
  RETURN false;
END; $func$;

GRANT EXECUTE ON FUNCTION public._can_dm_in_space(UUID, UUID, UUID) TO authenticated;

-- RPC: enviar mensaje (crea thread si no existe)
CREATE OR REPLACE FUNCTION public.send_academy_dm(
  p_space_id UUID, p_to_user UUID, p_body TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_thread_id UUID;
  v_a UUID;
  v_b UUID;
  v_message_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF p_body IS NULL OR LENGTH(TRIM(p_body)) = 0 THEN
    RAISE EXCEPTION 'empty_message' USING ERRCODE = '22023';
  END IF;
  IF LENGTH(p_body) > 4000 THEN
    RAISE EXCEPTION 'message_too_long' USING ERRCODE = '22023';
  END IF;
  IF NOT public._can_dm_in_space(p_space_id, auth.uid(), p_to_user) THEN
    RAISE EXCEPTION 'dm_not_allowed_for_roles' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() < p_to_user THEN v_a := auth.uid(); v_b := p_to_user;
  ELSE v_a := p_to_user; v_b := auth.uid(); END IF;

  INSERT INTO academy_dm_threads (space_id, user_a, user_b, last_message_preview, last_message_at,
                                   unread_count_a, unread_count_b)
  VALUES (p_space_id, v_a, v_b, LEFT(p_body, 120), NOW(),
          CASE WHEN v_a = p_to_user THEN 1 ELSE 0 END,
          CASE WHEN v_b = p_to_user THEN 1 ELSE 0 END)
  ON CONFLICT (space_id, user_a, user_b) DO UPDATE
     SET last_message_preview = LEFT(EXCLUDED.last_message_preview, 120),
         last_message_at = NOW(),
         unread_count_a = academy_dm_threads.unread_count_a +
           CASE WHEN academy_dm_threads.user_a = p_to_user THEN 1 ELSE 0 END,
         unread_count_b = academy_dm_threads.unread_count_b +
           CASE WHEN academy_dm_threads.user_b = p_to_user THEN 1 ELSE 0 END
  RETURNING id INTO v_thread_id;

  INSERT INTO academy_dm_messages (thread_id, sender_id, body)
  VALUES (v_thread_id, auth.uid(), p_body)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('thread_id', v_thread_id, 'message_id', v_message_id);
END; $func$;

GRANT EXECUTE ON FUNCTION public.send_academy_dm(UUID, UUID, TEXT) TO authenticated;

-- RPC: marcar thread leído
CREATE OR REPLACE FUNCTION public.mark_dm_thread_read(p_thread_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE v_t RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO v_t FROM academy_dm_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF auth.uid() NOT IN (v_t.user_a, v_t.user_b) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = v_t.user_a THEN
    UPDATE academy_dm_threads SET unread_count_a = 0 WHERE id = p_thread_id;
  ELSE
    UPDATE academy_dm_threads SET unread_count_b = 0 WHERE id = p_thread_id;
  END IF;
  UPDATE academy_dm_messages SET is_read = true
   WHERE thread_id = p_thread_id AND sender_id <> auth.uid() AND is_read = false;
END; $func$;

GRANT EXECUTE ON FUNCTION public.mark_dm_thread_read(UUID) TO authenticated;

-- RPC: listar threads del user
CREATE OR REPLACE FUNCTION public.list_my_dm_threads(p_space_id UUID DEFAULT NULL)
RETURNS TABLE (
  thread_id UUID,
  space_id UUID,
  space_name TEXT,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY
  SELECT t.id, t.space_id, s.name,
         CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END,
         COALESCE(p.full_name, p.email, 'Anónimo'),
         p.avatar_url,
         t.last_message_preview, t.last_message_at,
         CASE WHEN t.user_a = auth.uid() THEN t.unread_count_a ELSE t.unread_count_b END
  FROM academy_dm_threads t
  JOIN academy_spaces s ON s.id = t.space_id
  LEFT JOIN profiles p
    ON p.id = CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END
  WHERE (t.user_a = auth.uid() OR t.user_b = auth.uid())
    AND (p_space_id IS NULL OR t.space_id = p_space_id)
  ORDER BY t.last_message_at DESC;
END; $func$;

GRANT EXECUTE ON FUNCTION public.list_my_dm_threads(UUID) TO authenticated;
