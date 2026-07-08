-- ============================================================
-- CRION Academy v2 — Triggers DB → Event Bus
--
-- Conecta los eventos académicos existentes al bus (academy_emit_event)
-- mediante triggers AFTER INSERT/UPDATE. NO modifica los RPCs ni
-- triggers existentes — son sinks adicionales, desacoplados.
--
-- Eventos emitidos:
--   - welcome_to_space  → academy_memberships INSERT/REACTIVATE
--   - badge_earned      → academy_member_badges INSERT
--   - level_up          → academy_space_points UPDATE OF level (NEW > OLD)
--   - certificate_ready → academy_certificates INSERT
--
-- Lesson_unlocked se emite en S4 desde el cron de drip/cohortes.
-- Cohort_starting/checkpoint_due en sus respectivos sprints.
--
-- Cada trigger es SECURITY DEFINER y corre como `postgres` → puede
-- llamar academy_emit_event aunque el REVOKE a authenticated del
-- hardening esté en efecto.
--
-- Rollback:
--   DROP TRIGGER trg_academy_v2_bus_membership_join ON academy_memberships;
--   DROP TRIGGER trg_academy_v2_bus_badge_earned ON academy_member_badges;
--   DROP TRIGGER trg_academy_v2_bus_level_up ON academy_space_points;
--   DROP TRIGGER trg_academy_v2_bus_certificate_ready ON academy_certificates;
--   DROP FUNCTION academy_emit_event_safe(text, jsonb, uuid, uuid);
--   DROP FUNCTION trg_academy_v2_bus_membership(), ... etc.
-- ============================================================

-- ─── Helper: emit con captura de excepciones ───────────────────
-- Wraps academy_emit_event para que un fallo en el bus (pg_net no
-- disponible, secret no configurado, etc.) NO aborte la transacción
-- raíz (INSERT de membresía/badge/etc.). El evento se pierde pero el
-- INSERT principal commitea. Esto es fire-and-forget verdadero.
CREATE OR REPLACE FUNCTION public.academy_emit_event_safe(
  p_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_space_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  v_event_id := public.academy_emit_event(p_type, p_payload, p_space_id, p_user_id);
  RETURN v_event_id;
EXCEPTION WHEN OTHERS THEN
  -- Log como WARNING en Postgres logs; el INSERT raíz commitea normal.
  RAISE WARNING 'academy_emit_event_safe[%]: % — %', p_type, SQLSTATE, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.academy_emit_event_safe(text, jsonb, uuid, uuid) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_emit_event_safe(text, jsonb, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.academy_emit_event_safe(text, jsonb, uuid, uuid) IS
  'Wrapper de academy_emit_event que captura excepciones. Úsalo desde triggers de tablas críticas para que un fallo del bus no aborte la transacción raíz.';


-- ─── welcome_to_space ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_academy_v2_bus_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_name text;
  v_space_slug text;
  v_member_name text;
BEGIN
  -- Solo emit en INSERT con is_active=true, o en UPDATE que activa
  -- una membresía previamente desactivada (reactivation).
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active IS NOT TRUE THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_active IS NOT TRUE OR OLD.is_active IS TRUE THEN RETURN NEW; END IF;
  END IF;

  SELECT name, slug INTO v_space_name, v_space_slug
  FROM academy_spaces WHERE id = NEW.space_id;

  SELECT COALESCE(full_name, email, 'Miembro')
    INTO v_member_name
  FROM profiles WHERE id = NEW.user_id;

  PERFORM academy_emit_event_safe(
    p_type     := 'welcome_to_space',
    p_space_id := NEW.space_id,
    p_user_id  := NEW.user_id,
    p_payload  := jsonb_build_object(
      'title',     'Bienvenido a ' || COALESCE(v_space_name, 'la comunidad'),
      'body',      'Tu acceso está activo. Comienza por la lección de bienvenida.',
      'link',      '/academia/' || v_space_slug,
      'variables', jsonb_build_array(
        COALESCE(v_member_name, 'Miembro'),
        COALESCE(v_space_name, 'la comunidad'),
        '/academia/' || v_space_slug
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_v2_bus_membership_join ON public.academy_memberships;
CREATE TRIGGER trg_academy_v2_bus_membership_join
  AFTER INSERT OR UPDATE OF is_active ON public.academy_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_v2_bus_membership();


-- ─── badge_earned ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_academy_v2_bus_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_name text;
  v_space_slug text;
  v_member_name text;
  v_badge_label text;
BEGIN
  SELECT name, slug INTO v_space_name, v_space_slug
  FROM academy_spaces WHERE id = NEW.space_id;

  SELECT COALESCE(full_name, email, 'Miembro')
    INTO v_member_name
  FROM profiles WHERE id = NEW.user_id;

  -- Label legible del badge — si no hay catálogo, usar el slug.
  v_badge_label := COALESCE(
    (SELECT name FROM academy_badges WHERE id = NEW.badge_id LIMIT 1),
    INITCAP(REPLACE(NEW.badge_id, '_', ' '))
  );

  PERFORM academy_emit_event_safe(
    p_type     := 'badge_earned',
    p_space_id := NEW.space_id,
    p_user_id  := NEW.user_id,
    p_payload  := jsonb_build_object(
      'title',         'Ganaste la insignia ' || v_badge_label,
      'body',          'Sigue participando para subir de nivel.',
      'link',          '/academia/' || v_space_slug,
      'reference_id',  NEW.id,
      'reference_type','badge',
      'variables',     jsonb_build_array(
        COALESCE(v_member_name, 'Miembro'),
        v_badge_label,
        COALESCE(v_space_name, 'la comunidad')
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_v2_bus_badge_earned ON public.academy_member_badges;
CREATE TRIGGER trg_academy_v2_bus_badge_earned
  AFTER INSERT ON public.academy_member_badges
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_v2_bus_badge();


-- ─── level_up ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_academy_v2_bus_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_name text;
  v_space_slug text;
  v_member_name text;
BEGIN
  -- Solo emit si el nivel realmente subió.
  IF NEW.level IS NULL OR OLD.level IS NULL OR NEW.level <= OLD.level THEN
    RETURN NEW;
  END IF;

  SELECT name, slug INTO v_space_name, v_space_slug
  FROM academy_spaces WHERE id = NEW.space_id;

  SELECT COALESCE(full_name, email, 'Miembro')
    INTO v_member_name
  FROM profiles WHERE id = NEW.user_id;

  PERFORM academy_emit_event_safe(
    p_type     := 'level_up',
    p_space_id := NEW.space_id,
    p_user_id  := NEW.user_id,
    p_payload  := jsonb_build_object(
      'title',     'Subiste al nivel ' || NEW.level::text,
      'body',      'Llevas ' || COALESCE(NEW.total_points, 0)::text || ' XP en ' || COALESCE(v_space_name, 'la comunidad'),
      'link',      '/academia/' || v_space_slug || '/leaderboard',
      'variables', jsonb_build_array(
        COALESCE(v_member_name, 'Miembro'),
        NEW.level::text,
        COALESCE(v_space_name, 'la comunidad'),
        COALESCE(NEW.total_points, 0)::text
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_v2_bus_level_up ON public.academy_space_points;
CREATE TRIGGER trg_academy_v2_bus_level_up
  AFTER UPDATE OF level ON public.academy_space_points
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_v2_bus_level_up();


-- ─── certificate_ready ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_academy_v2_bus_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
  v_space_name text;
  v_space_slug text;
  v_course_name text;
  v_member_name text;
BEGIN
  -- academy_certificates → academy_courses → academy_spaces
  SELECT c.title, c.space_id INTO v_course_name, v_space_id
  FROM academy_courses c WHERE c.id = NEW.course_id;

  SELECT name, slug INTO v_space_name, v_space_slug
  FROM academy_spaces WHERE id = v_space_id;

  SELECT COALESCE(full_name, email, 'Miembro')
    INTO v_member_name
  FROM profiles WHERE id = NEW.user_id;

  PERFORM academy_emit_event_safe(
    p_type     := 'certificate_ready',
    p_space_id := v_space_id,
    p_user_id  := NEW.user_id,
    p_payload  := jsonb_build_object(
      'title',           'Tu certificado de ' || COALESCE(v_course_name, 'curso') || ' está listo',
      'body',            'Descárgalo desde tu perfil en ' || COALESCE(v_space_name, 'la academia'),
      'link',            '/academia/' || v_space_slug || '?cert=' || NEW.id,
      'reference_id',    NEW.id,
      'reference_type',  'certificate',
      'variables',       jsonb_build_array(
        COALESCE(v_member_name, 'Miembro'),
        COALESCE(v_course_name, 'curso')
      ),
      'button_variables', jsonb_build_array(
        '/academia/' || v_space_slug || '?cert=' || NEW.id
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_v2_bus_certificate_ready ON public.academy_certificates;
CREATE TRIGGER trg_academy_v2_bus_certificate_ready
  AFTER INSERT ON public.academy_certificates
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_v2_bus_certificate();

-- ============================================================
-- Notas de seguridad
-- ============================================================
-- 1. Cada trigger es SECURITY DEFINER y corre como `postgres`. El RPC
--    academy_emit_event puede ser llamado aunque GRANT EXECUTE haya
--    sido revocado de authenticated (postgres es el owner).
--
-- 2. Los triggers NO confían en data del cliente — todo se deriva
--    server-side de las tablas (academy_spaces, profiles, etc.) usando
--    NEW.* que ya pasó por RLS y constraints upstream.
--
-- 3. Si academy_emit_event falla (pg_net no disponible, secret no
--    configurado, etc.), el trigger NO debe abortar la transacción
--    raíz. PERFORM ignora el resultado pero re-lanza excepciones —
--    si esto se vuelve un problema, envolver en BEGIN/EXCEPTION.
-- ============================================================
