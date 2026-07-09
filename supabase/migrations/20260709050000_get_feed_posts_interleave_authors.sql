-- Fase 3.5 Bloque 2.2: el feed venia agrupado por autor (todos los posts de A, luego de B...)
-- matando el descubrimiento. Fix: round-robin por autor via ROW_NUMBER() PARTITION BY autor,
-- ordenando primero por ese rank (1ro de cada autor, luego 2do de cada autor...) y dentro de
-- cada "ronda" por el score/recencia existente. Se agrega p_seed para variar el orden entre
-- refreshes (jitter chico que no rompe el ranking real, solo desempata).
--
-- El cursor (created_at, post_id) filtra ANTES de interlacear -> cada pagina interlacea
-- solo lo que todavia no se mostro. Pagination correcta, sin comparar rank entre llamadas.
create or replace function public.get_feed_posts(
  p_tab text default 'for_you',
  p_niche text default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20,
  p_seed text default null
)
returns table(
  post_id uuid, post_source text, author_user_id uuid, author_name text, author_avatar text,
  title text, media_type text, media_url text, thumbnail_url text,
  views_count int, likes_count int, reactions_count int, category text,
  is_liked boolean, my_reaction text, is_saved boolean, is_following_author boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_viewer_id uuid := auth.uid();
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from public.organization_members
  where user_id = v_viewer_id
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
        or (pi.visibility = 'followers' and v_viewer_id is not null and exists (
          select 1 from public.followers f
          where f.follower_id = v_viewer_id and f.following_id = cp.user_id
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
  ),
  filtered as (
    select u.*
    from unified u
    where
      (p_niche is null or u.category = p_niche)
      and (p_tab is distinct from 'following' or (v_viewer_id is not null and exists (
        select 1 from public.followers f where f.follower_id = v_viewer_id and f.following_id = u.author_user_id
      )))
      and (
        p_cursor_created_at is null
        or (u.created_at, u.post_id) < (p_cursor_created_at, p_cursor_id)
      )
  ),
  scored as (
    select
      f.*,
      (
        case when p_tab = 'for_you' then
          extract(epoch from (now() - f.created_at)) / 3600.0 - (ln(f.likes_count + f.reactions_count + 1) * 10)
        else
          extract(epoch from (now() - f.created_at)) / 3600.0
        end
        + (('x' || substr(md5(coalesce(p_seed, '') || f.post_id::text), 1, 8))::bit(32)::int::numeric / 2147483647.0) * 0.15
      ) as rank_score
    from filtered f
  ),
  interleaved as (
    select
      s.*,
      row_number() over (partition by s.author_user_id order by s.rank_score asc, s.post_id desc) as author_rank
    from scored s
  )
  select
    i.post_id, i.post_source, i.author_user_id, i.author_name, i.author_avatar,
    i.title, i.media_type, i.media_url, i.thumbnail_url,
    i.views_count, i.likes_count, i.reactions_count,
    i.category,
    (case when v_viewer_id is null then false
     when i.post_source = 'portfolio_item' then
      exists (select 1 from public.feed_reactions fr where fr.post_id = i.post_id and fr.user_id = v_viewer_id)
    else
      exists (select 1 from public.portfolio_post_likes ppl where ppl.post_id = i.post_id and ppl.viewer_id = v_viewer_id::text)
    end) as is_liked,
    (case when v_viewer_id is null then null when i.post_source = 'portfolio_item' then
      (select fr.reaction_type from public.feed_reactions fr where fr.post_id = i.post_id and fr.user_id = v_viewer_id limit 1)
    else null end) as my_reaction,
    (v_viewer_id is not null and exists (
      select 1 from public.saved_items si
      where si.user_id = v_viewer_id and si.item_id = i.post_id
        and si.item_type = (case when i.post_source = 'portfolio_item' then 'portfolio_item' else 'post' end)
    )) as is_saved,
    (v_viewer_id is not null and exists (
      select 1 from public.followers f where f.follower_id = v_viewer_id and f.following_id = i.author_user_id
    )) as is_following_author,
    i.created_at
  from interleaved i
  order by i.author_rank asc, i.rank_score asc, i.created_at desc, i.post_id desc
  limit p_limit;
end;
$function$;

notify pgrst, 'reload schema';
