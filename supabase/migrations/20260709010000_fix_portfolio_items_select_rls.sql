-- FIX CRITICO (auditoria Fase 1.1): portfolio_items_select_policy tenia qual:true,
-- superpuesta con "Public portfolio items are readable" (is_public OR owner). El OR entre
-- ambas dejaba CUALQUIER fila legible por cualquier usuario autenticado, sin importar
-- is_public/visibility/owner.
--
-- Se reemplazan ambas por DOS policies (no una sola) separadas por rol:
--   - anon:          solo is_public=true AND visibility='public'. NO referencia followers/
--                     organization_members porque anon no tiene GRANT SELECT en followers
--                     (verificado) y Postgres exige privilegio en toda tabla referenciada
--                     por la policy que aplica al rol, aunque esa rama del OR no se alcance
--                     en runtime para una fila dada. Una sola policy combinada rompia TODA
--                     lectura anonima de portfolio_items (usada por /profile/:userId via
--                     useCreatorPublicProfile) con "permission denied for table followers".
--   - authenticated:  publico + owner (via creator_profiles) + org (visibility='org', misma
--                     organizacion) + followers (visibility='followers', sigue al creador) +
--                     is_platform_admin().
--
-- Verificado con 2 usuarios reales via `set local role` + `request.jwt.claims`: owner ve su
-- fila privada, un usuario distinto no la ve (0 filas), anon ve solo publicas (558), y
-- get_feed_posts (SECURITY DEFINER, bypasa RLS) no se vio afectada.

drop policy if exists "Public portfolio items are readable" on public.portfolio_items;
drop policy if exists "portfolio_items_select_policy" on public.portfolio_items;

create policy "portfolio_items_select_anon"
  on public.portfolio_items
  for select
  to anon
  using (is_public = true and visibility = 'public');

create policy "portfolio_items_select_authenticated"
  on public.portfolio_items
  for select
  to authenticated
  using (
    (is_public = true and visibility = 'public')
    or exists (
      select 1 from public.creator_profiles cp
      where cp.id = portfolio_items.creator_id and cp.user_id = auth.uid()
    )
    or (
      is_public = true and visibility = 'org' and organization_id is not null
      and organization_id in (
        select om.organization_id from public.organization_members om where om.user_id = auth.uid()
      )
    )
    or (
      is_public = true and visibility = 'followers'
      and exists (
        select 1 from public.creator_profiles cp2
        join public.followers f on f.following_id = cp2.user_id
        where cp2.id = portfolio_items.creator_id and f.follower_id = auth.uid()
      )
    )
    or is_platform_admin()
  );
