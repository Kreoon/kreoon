-- ============================================================================
-- Security hardening:
-- 1. _can_dm_in_space exige que ambos users sean miembros activos del space
--    y usa rol DEL SPACE (academy_memberships.role) no rol global.
-- 2. is_lesson_unlocked_for_user bloquea p_user_id != auth.uid() y revoca anon.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._can_dm_in_space(
  p_space_id UUID, p_user_a UUID, p_user_b UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_owner UUID;
  v_member_a RECORD;
  v_member_b RECORD;
  v_a_is_owner BOOLEAN;
  v_b_is_owner BOOLEAN;
  v_a_is_talent BOOLEAN;
  v_b_is_talent BOOLEAN;
BEGIN
  IF p_user_a = p_user_b THEN RETURN false; END IF;
  SELECT owner_id INTO v_owner FROM academy_spaces WHERE id = p_space_id;
  IF v_owner IS NULL THEN RETURN false; END IF;

  v_a_is_owner := (p_user_a = v_owner);
  v_b_is_owner := (p_user_b = v_owner);

  IF NOT v_a_is_owner THEN
    SELECT role, is_active INTO v_member_a
      FROM academy_memberships
     WHERE space_id = p_space_id AND user_id = p_user_a;
    IF v_member_a.is_active IS NOT TRUE THEN RETURN false; END IF;
  END IF;

  IF NOT v_b_is_owner THEN
    SELECT role, is_active INTO v_member_b
      FROM academy_memberships
     WHERE space_id = p_space_id AND user_id = p_user_b;
    IF v_member_b.is_active IS NOT TRUE THEN RETURN false; END IF;
  END IF;

  IF v_a_is_owner OR v_b_is_owner THEN RETURN true; END IF;

  v_a_is_talent := v_member_a.role IN ('content_creator', 'editor', 'admin');
  v_b_is_talent := v_member_b.role IN ('content_creator', 'editor', 'admin');
  IF v_a_is_talent AND v_b_is_talent THEN RETURN true; END IF;
  RETURN false;
END; $func$;

CREATE OR REPLACE FUNCTION public.is_lesson_unlocked_for_user(
  p_lesson_id UUID, p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_unlock INT;
  v_course_id UUID;
  v_enrolled_at TIMESTAMPTZ;
  v_uid UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT unlock_after_days, course_id INTO v_unlock, v_course_id
    FROM academy_lessons WHERE id = p_lesson_id;
  IF v_unlock IS NULL OR v_unlock = 0 THEN RETURN true; END IF;

  SELECT enrolled_at INTO v_enrolled_at
    FROM academy_enrollments
   WHERE user_id = v_uid AND course_id = v_course_id;
  IF v_enrolled_at IS NULL THEN RETURN false; END IF;
  RETURN (v_enrolled_at + (v_unlock || ' days')::interval) <= NOW();
END; $func$;

REVOKE EXECUTE ON FUNCTION public.is_lesson_unlocked_for_user(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.days_until_lesson_unlock(UUID) FROM anon;
