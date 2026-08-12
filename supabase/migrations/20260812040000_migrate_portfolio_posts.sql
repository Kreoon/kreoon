-- Migracion de datos: portfolio_posts -> portfolio_items (solo filas SIN ambiguedad).
--
-- REGLA DE ORO DEL PRODUCTO: no se pierde contenido de creadores. En la duda, se conserva.
-- Por eso esta migracion es SOLO ADITIVA: no borra, no actualiza y no dropea portfolio_posts.
--
-- CONTEXTO (diagnostico 2026-08-11, ver docs/MIGRACION_PORTFOLIO_POSTS.md):
--   * portfolio_posts tiene 158 filas, 0 soft-deleted.
--   * 21 filas (2 autores) pertenecen a usuarios con creator_profile -> migrables.
--     Las 21 YA fueron replicadas por 20260708040000_backfill_legacy_posts_and_feed_rpc.sql.
--   * 137 filas (19 autores) tienen user_id que NO existe en auth.users NI en public.profiles:
--     son autores huerfanos de un proyecto Supabase anterior (hfooshsteglylhvrpuka).
--     portfolio_items.creator_id es NOT NULL con FK a creator_profiles(id): esas filas NO
--     pueden migrarse sin inventar perfiles de creador. Quedan en portfolio_posts como archivo.
--
-- CONSECUENCIA: al correr hoy, este script inserta 0 filas. Se deja igual por dos razones:
--   1) captura cualquier post publicado entre el diagnostico y el apply cuyo autor SI tenga
--      creator_profile (portfolio_posts sigue recibiendo INSERTs desde la app hoy);
--   2) el bloque de verificacion final deja constancia auditable del estado real.

begin;

-- ---------------------------------------------------------------------------
-- 1) INSERT idempotente. Solo posts vivos cuyo autor tiene creator_profile y que
--    no fueron replicados aun (filtro explicito por legacy_post_id existente).
-- ---------------------------------------------------------------------------
insert into public.portfolio_items (
  creator_id,      -- <- creator_profiles.id del autor (NO es el user_id)
  legacy_post_id,  -- <- portfolio_posts.id: marca de origen + clave de idempotencia
  title,           -- <- caption (si viene vacio se usa 'Post'; title es nullable pero el feed lo muestra)
  description,     -- <- sin origen en portfolio_posts: queda NULL
  media_type,      -- <- media_type ('video' | 'image'); el CHECK de destino acepta video/image/carousel
  media_url,       -- <- media_url (1:1)
  thumbnail_url,   -- <- thumbnail_url (1:1)
  views_count,     -- <- views_count (0 si NULL)
  likes_count,     -- <- likes_count (0 si NULL). OJO: los likes viven en portfolio_post_likes,
                   --    que sigue apuntando a portfolio_posts.id. Solo se copia el contador.
  reactions_count, -- <- sin origen: 0 (portfolio_posts no tiene reacciones, solo likes)
  is_public,       -- <- true: la RLS de portfolio_posts es "Anyone can view portfolio posts" (qual = true)
  visibility,      -- <- 'public' por la misma razon
  source_type,     -- <- 'legacy_post' (valor ya permitido por portfolio_items_source_type_check)
  organization_id, -- <- sin origen en portfolio_posts: queda NULL
  created_at,      -- <- created_at (se preserva la fecha original, no now())
  updated_at,      -- <- updated_at (1:1)
  deleted_at,      -- <- deleted_at (se preserva el soft-delete del origen)
  deleted_by       -- <- deleted_by (1:1)
)
select
  cp.id,
  pp.id,
  coalesce(nullif(pp.caption, ''), 'Post'),
  null::text,
  pp.media_type,
  pp.media_url,
  pp.thumbnail_url,
  coalesce(pp.views_count, 0),
  coalesce(pp.likes_count, 0),
  0,
  true,
  'public',
  'legacy_post',
  null::uuid,
  pp.created_at,
  pp.updated_at,
  pp.deleted_at,
  pp.deleted_by
from public.portfolio_posts pp
join public.creator_profiles cp on cp.user_id = pp.user_id
where not exists (
  select 1 from public.portfolio_items pi where pi.legacy_post_id = pp.id
)
on conflict (legacy_post_id) where legacy_post_id is not null do nothing;

-- ---------------------------------------------------------------------------
-- 2) Verificacion de conteos. Falla la migracion (rollback) si algo no cuadra.
-- ---------------------------------------------------------------------------
do $$
declare
  v_total            int;  -- filas en portfolio_posts
  v_migrables        int;  -- filas cuyo autor tiene creator_profile
  v_replicadas       int;  -- filas migrables efectivamente presentes en portfolio_items
  v_no_migrables     int;  -- filas cuyo autor no tiene creator_profile
  v_autor_fantasma   int;  -- subconjunto: el user_id ni siquiera existe en auth.users
  v_huerfanas        int;  -- legacy_post_id que apuntan a un post inexistente
begin
  select count(*) into v_total from public.portfolio_posts;

  select count(*) into v_migrables
  from public.portfolio_posts pp
  where exists (select 1 from public.creator_profiles cp where cp.user_id = pp.user_id);

  select count(*) into v_replicadas
  from public.portfolio_posts pp
  where exists (select 1 from public.creator_profiles cp where cp.user_id = pp.user_id)
    and exists (select 1 from public.portfolio_items pi where pi.legacy_post_id = pp.id);

  select count(*) into v_no_migrables
  from public.portfolio_posts pp
  where not exists (select 1 from public.creator_profiles cp where cp.user_id = pp.user_id);

  select count(*) into v_autor_fantasma
  from public.portfolio_posts pp
  where not exists (select 1 from auth.users u where u.id = pp.user_id);

  select count(*) into v_huerfanas
  from public.portfolio_items pi
  where pi.legacy_post_id is not null
    and not exists (select 1 from public.portfolio_posts pp where pp.id = pi.legacy_post_id);

  -- Invariante 1: toda fila migrable quedo replicada. Si falla, el INSERT no cubrio todo.
  if v_replicadas <> v_migrables then
    raise exception
      'FALLO migracion portfolio_posts: migrables=% pero replicadas=% (faltan %).',
      v_migrables, v_replicadas, v_migrables - v_replicadas;
  end if;

  -- Invariante 2: la suma cierra contra el total de la tabla origen.
  if v_migrables + v_no_migrables <> v_total then
    raise exception
      'FALLO migracion portfolio_posts: migrables(%) + no_migrables(%) <> total(%).',
      v_migrables, v_no_migrables, v_total;
  end if;

  -- Invariante 3: ningun puntero legacy_post_id colgando.
  if v_huerfanas > 0 then
    raise exception
      'FALLO migracion portfolio_posts: % portfolio_items con legacy_post_id sin post origen.',
      v_huerfanas;
  end if;

  raise notice '--- portfolio_posts -> portfolio_items ---';
  raise notice 'total portfolio_posts .............. %', v_total;
  raise notice 'migrables (autor con creator_profile) %', v_migrables;
  raise notice 'replicadas en portfolio_items ...... %', v_replicadas;
  raise notice 'NO migrables (sin creator_profile) . %', v_no_migrables;
  raise notice '  de esas, con autor inexistente ... %', v_autor_fantasma;

  -- Compuerta explicita para el drop: solo con 100 % replicado.
  if v_no_migrables > 0 then
    raise notice 'RESULTADO: replicacion PARCIAL. portfolio_posts NO se puede dropear.';
    raise notice 'portfolio_posts queda como archivo con % filas no replicables.', v_no_migrables;
  else
    raise notice 'RESULTADO: replicacion 100%%. portfolio_posts seria candidata a drop.';
    raise notice 'Aun asi, verificar antes que ningun archivo de src/ escriba en la tabla.';
  end if;
end $$;

commit;
