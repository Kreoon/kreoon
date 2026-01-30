-- =============================================================
-- LIMPIAR_DUPLICADOS_KREOON_V4 (tolerante a tablas faltantes)
-- Objetivo: dejar UN solo perfil por email, sin borrar el que tenga proyectos.
-- Nota: este script NO asume nombres de tablas de puntos/chat; solo borra si existen.
-- =============================================================

-- 1) (Opcional) Ver duplicados por email y conteo de proyectos
WITH dup AS (
  SELECT email
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
)
SELECT
  p.email,
  p.id,
  p.full_name,
  p.created_at,
  (
    (SELECT COUNT(*) FROM public.content c WHERE c.creator_id = p.id) +
    (SELECT COUNT(*) FROM public.content c WHERE c.editor_id = p.id) +
    (SELECT COUNT(*) FROM public.content c WHERE c.strategist_id = p.id)
  ) AS total_proyectos
FROM public.profiles p
JOIN dup d ON d.email = p.email
ORDER BY p.email, total_proyectos DESC, p.created_at ASC;

-- 2) Construir lista de perfiles a eliminar (mantener el que tenga más proyectos; si empate, el más antiguo)
CREATE TEMP TABLE perfiles_a_eliminar AS
WITH dup AS (
  SELECT email
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
),
scored AS (
  SELECT
    p.id,
    p.email,
    p.created_at,
    (
      (SELECT COUNT(*) FROM public.content c WHERE c.creator_id = p.id) +
      (SELECT COUNT(*) FROM public.content c WHERE c.editor_id = p.id) +
      (SELECT COUNT(*) FROM public.content c WHERE c.strategist_id = p.id)
    ) AS total_proyectos
  FROM public.profiles p
  JOIN dup d ON d.email = p.email
),
keep AS (
  SELECT DISTINCT ON (email)
    id
  FROM scored
  ORDER BY email, total_proyectos DESC, created_at ASC
)
SELECT s.id
FROM scored s
WHERE s.id NOT IN (SELECT id FROM keep);

SELECT COUNT(*) AS perfiles_a_eliminar FROM perfiles_a_eliminar;

-- 3) Borrar dependencias SOLO si la tabla existe
DO $$
DECLARE
  tbl text;
BEGIN
  -- Si ejecutas solo este bloque (paso 3) sin haber corrido el paso 2,
  -- la tabla temporal no existe y el DELETE dinámico falla.
  -- Este guard la crea automáticamente en pg_temp.
  IF to_regclass('pg_temp.perfiles_a_eliminar') IS NULL THEN
    CREATE TEMP TABLE perfiles_a_eliminar AS
    WITH dup AS (
      SELECT email
      FROM public.profiles
      WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
      GROUP BY email
      HAVING COUNT(*) > 1
    ),
    scored AS (
      SELECT
        p.id,
        p.email,
        p.created_at,
        (
          (SELECT COUNT(*) FROM public.content c WHERE c.creator_id = p.id) +
          (SELECT COUNT(*) FROM public.content c WHERE c.editor_id = p.id) +
          (SELECT COUNT(*) FROM public.content c WHERE c.strategist_id = p.id)
        ) AS total_proyectos
      FROM public.profiles p
      JOIN dup d ON d.email = p.email
    ),
    keep AS (
      SELECT DISTINCT ON (email)
        id
      FROM scored
      ORDER BY email, total_proyectos DESC, created_at ASC
    )
    SELECT s.id
    FROM scored s
    WHERE s.id NOT IN (SELECT id FROM keep);
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'organization_member_badges',
    'organization_member_roles',
    'organization_members',
    'client_users',
    'user_achievements',
    'notifications',
    'chat_participants',
    -- tablas de puntos (pueden variar por instalación)
    'up_creadores_totals',
    'up_editores_totals',
    'up_events',
    'up_transactions',
    'up_creadores_transactions',
    'up_editores_transactions'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM public.%I WHERE user_id IN (SELECT id FROM perfiles_a_eliminar)',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- 4) Eliminar perfiles duplicados (los elegidos en perfiles_a_eliminar)
DELETE FROM public.profiles
WHERE id IN (SELECT id FROM perfiles_a_eliminar);

DROP TABLE perfiles_a_eliminar;

-- 5) Verificación final
SELECT
  COUNT(*) AS duplicados_restantes
FROM (
  SELECT email
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
) x;
