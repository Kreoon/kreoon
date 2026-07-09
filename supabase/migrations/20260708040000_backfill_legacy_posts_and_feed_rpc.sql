-- Fase 1.4: Feed unificado.
-- Hallazgo (investigacion previa): 137/158 portfolio_posts pertenecen a usuarios SIN creator_profile
-- (no son talento de marketplace: estudiantes, clientes, etc). portfolio_items.creator_id es NOT NULL
-- con FK a creator_profiles -> no pueden recibir esas filas sin crear perfiles de creador falsos.
-- Decision: portfolio_items sigue siendo la fuente de verdad para contenido NUEVO del feed, pero la
-- lectura del feed (RPC get_feed_posts) unifica portfolio_items + portfolio_posts via UNION ALL para
-- no perder contenido que hoy es visible. NO se borra ni se deja de escribir portfolio_posts.

-- 1) Columna de tracking idempotente para el backfill parcial (solo autores con creator_profile)
alter table public.portfolio_items
  add column if not exists legacy_post_id uuid references public.portfolio_posts(id) on delete set null;

create unique index if not exists idx_portfolio_items_legacy_post
  on public.portfolio_items(legacy_post_id) where legacy_post_id is not null;

-- 2) Permitir el nuevo origen en el CHECK de source_type (ya incluye content_delivery de Paso 1.3)
alter table public.portfolio_items drop constraint if exists portfolio_items_source_type_check;
alter table public.portfolio_items add constraint portfolio_items_source_type_check
  check (source_type = any (array['manual', 'organization_content', 'content_delivery', 'legacy_post']));

-- 3) Backfill idempotente (ON CONFLICT DO NOTHING vía legacy_post_id): solo posts cuyo autor
-- SI tiene creator_profile. portfolio_posts es 100% publico hoy (RLS "Anyone can view portfolio posts").
insert into public.portfolio_items (
  creator_id, legacy_post_id, title, media_type, media_url, thumbnail_url,
  views_count, likes_count, is_public, visibility, source_type, created_at, updated_at
)
select
  cp.id,
  pp.id,
  coalesce(nullif(pp.caption, ''), 'Post'),
  pp.media_type,
  pp.media_url,
  pp.thumbnail_url,
  coalesce(pp.views_count, 0),
  coalesce(pp.likes_count, 0),
  true,
  'public',
  'legacy_post',
  pp.created_at,
  pp.updated_at
from public.portfolio_posts pp
join public.creator_profiles cp on cp.user_id = pp.user_id
where pp.deleted_at is null
on conflict (legacy_post_id) where legacy_post_id is not null do nothing;

-- 4) Indice de soporte para el feed (posts publicos recientes)
create index if not exists idx_portfolio_items_public_created
  on public.portfolio_items(created_at desc)
  where is_public = true and deleted_at is null;

create index if not exists idx_portfolio_posts_created
  on public.portfolio_posts(created_at desc)
  where deleted_at is null;

-- 5) RPC unificada de lectura del feed. SECURITY DEFINER: enforcea visibilidad manualmente
-- (mismo patron que assertOrgMembership/generate-full-research) en vez de depender de RLS directa,
-- porque unifica 2 tablas con reglas de visibilidad distintas.
create or replace function public.get_feed_posts(
  p_viewer_id uuid,
  p_tab text default 'for_you',
  p_niche text default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  post_id uuid,
  post_source text,
  author_user_id uuid,
  author_name text,
  author_avatar text,
  title text,
  media_type text,
  media_url text,
  thumbnail_url text,
  views_count integer,
  likes_count integer,
  reactions_count integer,
  category text,
  is_liked boolean,
  my_reaction text,
  is_saved boolean,
  is_following_author boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from public.organization_members
  where user_id = p_viewer_id
  limit 1;

  return query
  with unified as (
    select
      pi.id as post_id,
      'portfolio_item'::text as post_source,
      cp.user_id as author_user_id,
      cp.display_name as author_name,
      cp.avatar_url as author_avatar,
      pi.title,
      pi.media_type,
      pi.media_url,
      pi.thumbnail_url,
      coalesce(pi.views_count, 0) as views_count,
      coalesce(pi.likes_count, 0) as likes_count,
      coalesce(pi.reactions_count, 0) as reactions_count,
      pi.category,
      pi.created_at
    from public.portfolio_items pi
    join public.creator_profiles cp on cp.id = pi.creator_id
    where pi.deleted_at is null
      and pi.is_public = true
      and (
        pi.visibility = 'public'
        or (pi.visibility = 'followers' and exists (
          select 1 from public.followers f
          where f.follower_id = p_viewer_id and f.following_id = cp.user_id
        ))
        or (pi.visibility = 'org' and v_org_id is not null and pi.organization_id = v_org_id)
      )

    union all

    select
      pp.id as post_id,
      'portfolio_post'::text as post_source,
      pp.user_id as author_user_id,
      prof.full_name as author_name,
      prof.avatar_url as author_avatar,
      pp.caption as title,
      pp.media_type,
      pp.media_url,
      pp.thumbnail_url,
      coalesce(pp.views_count, 0),
      coalesce(pp.likes_count, 0),
      0 as reactions_count,
      null::text as category,
      pp.created_at
    from public.portfolio_posts pp
    join public.profiles prof on prof.id = pp.user_id
    where pp.deleted_at is null
  )
  select
    u.post_id, u.post_source, u.author_user_id, u.author_name, u.author_avatar,
    u.title, u.media_type, u.media_url, u.thumbnail_url,
    u.views_count, u.likes_count, u.reactions_count,
    u.category,
    (case when u.post_source = 'portfolio_item' then
      exists (select 1 from public.feed_reactions fr where fr.post_id = u.post_id and fr.user_id = p_viewer_id)
    else
      exists (select 1 from public.portfolio_post_likes ppl where ppl.post_id = u.post_id and ppl.viewer_id = p_viewer_id::text)
    end) as is_liked,
    (case when u.post_source = 'portfolio_item' then
      (select fr.reaction_type from public.feed_reactions fr where fr.post_id = u.post_id and fr.user_id = p_viewer_id limit 1)
    else null end) as my_reaction,
    exists (
      select 1 from public.saved_items si
      where si.user_id = p_viewer_id and si.item_id = u.post_id
        and si.item_type = (case when u.post_source = 'portfolio_item' then 'portfolio_item' else 'post' end)
    ) as is_saved,
    exists (
      select 1 from public.followers f where f.follower_id = p_viewer_id and f.following_id = u.author_user_id
    ) as is_following_author,
    u.created_at
  from unified u
  where
    (p_niche is null or u.category = p_niche)
    and (p_tab is distinct from 'following' or exists (
      select 1 from public.followers f where f.follower_id = p_viewer_id and f.following_id = u.author_user_id
    ))
    and (
      p_cursor_created_at is null
      or (u.created_at, u.post_id) < (p_cursor_created_at, p_cursor_id)
    )
  order by
    case when p_tab = 'for_you' then
      extract(epoch from (now() - u.created_at)) / 3600.0 - (ln(u.likes_count + u.reactions_count + 1) * 10)
    else null end asc nulls last,
    u.created_at desc,
    u.post_id desc
  limit p_limit;
end;
$$;

grant execute on function public.get_feed_posts(uuid, text, text, timestamptz, uuid, integer) to authenticated;

notify pgrst, 'reload schema';
