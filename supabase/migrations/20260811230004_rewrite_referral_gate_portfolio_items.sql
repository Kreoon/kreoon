-- Referral gate: desacoplar de portfolio_posts (tabla en via de drop).
--
-- CONTEXTO
-- El sistema de referidos SE QUEDA. Tres funciones lo sostienen:
--   * trigger_check_referrer_unlock()  -> dispatcher de 5 triggers (content, creator_profiles,
--     portfolio_items, portfolio_posts, profiles); resuelve el user_id del autor y dispara el check.
--   * count_qualified_referrals(uuid)  -> cuenta referidos que cumplen (perfil activo + avatar + portafolio).
--   * check_and_unlock_access(uuid)    -> si >= 3 calificados, desbloquea acceso + trial + tokens.
-- Las dos primeras usan portfolio_posts como una de las 3 fuentes de "tiene portafolio".
-- El backfill 20260708040000_backfill_legacy_posts_and_feed_rpc.sql ya migro a portfolio_items
-- (source_type='legacy_post', legacy_post_id no nulo) todos los posts vivos cuyo autor tiene
-- creator_profile — que son exactamente los unicos que el gate podia contar (ver abajo).
--
-- BUG PREEXISTENTE QUE SE CORRIGE DE PASO
-- count_qualified_referrals y get_referral_gate_status referencian `portfolio_items.creator_profile_id`,
-- columna que NO EXISTE (la real es `creator_id`, FK a creator_profiles.id). Resultado: hoy
-- count_qualified_referrals(...) SIEMPRE lanza 42703 "column pi.creator_profile_id does not exist".
-- El error queda oculto porque trigger_check_referrer_unlock lo traga con EXCEPTION WHEN OTHERS,
-- y get_referral_gate_status solo lo evita cuando el usuario ya viene desbloqueado (return temprano).
-- O sea: el gate esta inoperante en produccion. Se corrige a `pi.creator_id = cp.id`.
--
-- EQUIVALENCIA DE CONTEO (verificada con SELECT contra produccion, 2026-08-11)
--   referral_relationships: 0 filas (0 activas) -> hoy NADIE puede calificar por ninguna via.
--   portfolio_posts: 158 filas vivas, de 21 autores distintos.
--     - 2 de esos 21 autores tienen creator_profile; 1 lo tiene activo.
--     - Los otros 19 nunca podian calificar: count_qualified_referrals hace
--       `JOIN creator_profiles cp ON cp.user_id = rr.referred_id AND cp.is_active = true`
--       ANTES del check de portafolio, asi que un autor sin creator_profile activo queda fuera
--       independientemente de sus posts.
--     - De los 2 con creator_profile, los 2 tienen filas backfilleadas en portfolio_items.
--   => autores que pierden calificacion al cambiar portfolio_posts -> portfolio_items: 0.
-- Simulacion del criterio completo sobre los 523 creator_profiles activos (avatar + portafolio,
-- ignorando referral_relationships por estar vacia): 22 calificaban con la semantica vieja,
-- 83 con la nueva; PIERDEN 0, GANAN 61. Esos 61 no vienen del cambio de tabla sino de arreglar
-- el bug creator_profile_id -> creator_id (hoy esa rama no evalua: revienta la funcion entera).
-- Con referral_relationships vacia, el conteo real sigue dando 0 para todos: cero desbloqueos nuevos.
--
-- DECISIONES DE SEMANTICA (deliberadamente conservadoras)
--   * NO se agregan filtros nuevos (deleted_at / is_public / visibility) al EXISTS de portfolio_items:
--     ni la rama vieja de portfolio_items ni la de portfolio_posts filtraban nada. Mantener la misma
--     laxitud evita cambiar quien califica.
--   * Umbral (>= 3), condiciones de avatar y rama de `content` intactos.
--   * check_and_unlock_access NO se toca: no referencia portfolio_posts.
--   * trigger_check_referrer_unlock pierde la rama TG_TABLE_NAME = 'portfolio_posts' (queda muerta
--     al dropear la tabla: el trigger trg_check_referrer_on_portfolio_post cae con ella).
--     Los otros 4 triggers siguen apuntando a esta misma funcion sin cambios.

-- 1) Dispatcher de triggers: se elimina la rama portfolio_posts.
create or replace function public.trigger_check_referrer_unlock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_referrer_id uuid;
  v_user_id uuid;
begin
  if TG_TABLE_NAME = 'creator_profiles' then
    v_user_id := NEW.user_id;
  elsif TG_TABLE_NAME = 'portfolio_items' then
    select cp.user_id into v_user_id from creator_profiles cp where cp.id = NEW.creator_id;
  elsif TG_TABLE_NAME = 'content' then
    v_user_id := NEW.creator_id;
  elsif TG_TABLE_NAME = 'profiles' then
    v_user_id := NEW.id;
  end if;

  if v_user_id is not null then
    select rr.referrer_id into v_referrer_id
    from referral_relationships rr
    where rr.referred_id = v_user_id and rr.status = 'active'
    limit 1;

    if v_referrer_id is not null then
      perform check_and_unlock_access(v_referrer_id);
    end if;
  end if;

  return NEW;
exception when others then
  return NEW;
end;
$function$;

-- 2) Conteo de referidos calificados: portfolio_posts fuera, portfolio_items con la columna correcta.
create or replace function public.count_qualified_referrals(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count int;
begin
  select count(distinct rr.referred_id) into v_count
  from referral_relationships rr
  join creator_profiles cp on cp.user_id = rr.referred_id
  left join profiles p on p.id = rr.referred_id
  where rr.referrer_id = p_user_id
    and rr.status = 'active'
    and cp.is_active = true
    -- Avatar check: creator_profiles OR profiles fallback (igual que useMarketplaceReadiness)
    and (cp.avatar_url is not null or p.avatar_url is not null)
    -- Portfolio check: portfolio_items (incluye los legacy_post backfilleados) OR contenido publicado
    and (
      exists (select 1 from portfolio_items pi where pi.creator_id = cp.id)
      or exists (select 1 from content c where c.creator_id = rr.referred_id and c.is_published = true)
    );

  return coalesce(v_count, 0);
end;
$function$;

-- 3) Estado del gate para la UI: misma sustitucion en las 2 apariciones del check de portafolio.
create or replace function public.get_referral_gate_status(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_unlocked boolean;
  v_qualified int;
  v_referral_code text;
  v_referrals jsonb;
begin
  select platform_access_unlocked into v_unlocked
  from profiles where id = p_user_id;

  if v_unlocked = true then
    return jsonb_build_object(
      'unlocked', true,
      'qualified_count', 3,
      'remaining', 0,
      'referral_code', null,
      'referrals', '[]'::jsonb
    );
  end if;

  v_qualified := count_qualified_referrals(p_user_id);

  select code into v_referral_code
  from referral_codes
  where user_id = p_user_id and is_active = true
  order by created_at asc
  limit 1;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb) into v_referrals
  from (
    select
      rr.referred_id,
      rr.status,
      rr.created_at,
      p.full_name,
      coalesce(cp.avatar_url, p.avatar_url) as referred_avatar,
      cp.id is not null and cp.is_active = true as has_active_profile,
      (cp.avatar_url is not null or p.avatar_url is not null) as has_avatar,
      (
        exists (select 1 from portfolio_items pi where pi.creator_id = cp.id)
        or exists (select 1 from content c where c.creator_id = rr.referred_id and c.is_published = true)
      ) as has_portfolio,
      (
        cp.id is not null and cp.is_active = true
        and (cp.avatar_url is not null or p.avatar_url is not null)
        and (
          exists (select 1 from portfolio_items pi where pi.creator_id = cp.id)
          or exists (select 1 from content c where c.creator_id = rr.referred_id and c.is_published = true)
        )
      ) as is_qualified
    from referral_relationships rr
    join profiles p on p.id = rr.referred_id
    left join creator_profiles cp on cp.user_id = rr.referred_id
    where rr.referrer_id = p_user_id
      and rr.status = 'active'
    order by rr.created_at desc
  ) r;

  return jsonb_build_object(
    'unlocked', false,
    'qualified_count', v_qualified,
    'remaining', greatest(3 - v_qualified, 0),
    'referral_code', v_referral_code,
    'referrals', v_referrals
  );
end;
$function$;

notify pgrst, 'reload schema';
