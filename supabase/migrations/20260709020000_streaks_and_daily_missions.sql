-- Fase 2: racha global + misiones diarias.
--
-- HALLAZGO (auditoria Paso 0): Academia tiene su PROPIO sistema de gamificacion (streak_days
-- en member_gamification_state, WeeklyMission con space_id) — scoped a Academia, no global.
-- Se deja intacto. user_streaks es NUEVO y global, documentado para unificacion futura.
--
-- HALLAZGO CRITICO (bloquea el diseno original): award_reputation_event exige
-- is_org_member(auth.uid(), p_organization_id) — RAISE EXCEPTION si no. Estudiantes (rol
-- global sin org) y freelancers (sin org) NO PUEDEN emitir reputation_events nunca. La
-- "fuente unica de actividad = reputation_events" del plan original no cubre a esos usuarios.
-- Decision aplicada (no hay regla para esto en las instrucciones): la racha se actualiza desde
-- DOS puntos, no solo reputation_events:
--   1) award_reputation_event (modificada, additiva) — cubre TODA actividad org-scoped (UP)
--   2) trigger AFTER INSERT en feed_reactions — cubre reacciones de CUALQUIER usuario
--      (con o sin org), con cap diario anti-farmeo. Es la unica actividad de Fase 1 que
--      no requiere org.
-- academy_lesson_completed y campaign_application quedan con el tipo de evento reservado en
-- el CHECK pero SIN punto de emision conectado todavia (no localice esos flujos con certeza
-- suficiente para tocarlos sin riesgo de romperlos) — documentado como pendiente.

-- 1) "Hoy" centralizado (America/Bogota, sin DST) para poder cambiar la zona despues
create or replace function public.kreoon_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- 2) Racha global
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  streak_started_at date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "user_streaks_select_own"
  on public.user_streaks for select
  to authenticated
  using (user_id = auth.uid());
-- Sin policies de insert/update/delete para authenticated a proposito: el cliente NUNCA
-- escribe su racha directamente, solo via las funciones SECURITY DEFINER de abajo
-- (que corren como owner de la tabla y por lo tanto bypasean RLS).

grant select on public.user_streaks to authenticated;
grant all on public.user_streaks to service_role;

-- 3) Motor de racha: mismo dia = no-op, dia siguiente = +1, gap = reinicia a 1.
-- Devuelve el multiplicador de racha vigente DESPUES de aplicar la actividad de hoy.
create or replace function public.fn_bump_user_streak(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.kreoon_today();
  v_current int;
begin
  insert into public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, streak_started_at)
  values (p_user_id, 1, 1, v_today, v_today)
  on conflict (user_id) do update set
    current_streak = case
      when public.user_streaks.last_activity_date = v_today then public.user_streaks.current_streak
      when public.user_streaks.last_activity_date = v_today - 1 then public.user_streaks.current_streak + 1
      else 1
    end,
    longest_streak = greatest(
      public.user_streaks.longest_streak,
      case
        when public.user_streaks.last_activity_date = v_today then public.user_streaks.current_streak
        when public.user_streaks.last_activity_date = v_today - 1 then public.user_streaks.current_streak + 1
        else 1
      end
    ),
    streak_started_at = case
      when public.user_streaks.last_activity_date = v_today then public.user_streaks.streak_started_at
      when public.user_streaks.last_activity_date = v_today - 1 then public.user_streaks.streak_started_at
      else v_today
    end,
    last_activity_date = v_today,
    updated_at = now()
  returning current_streak into v_current;

  return case when v_current >= 30 then 1.25 when v_current >= 7 then 1.10 else 1.0 end;
end;
$$;

grant execute on function public.fn_bump_user_streak(uuid) to authenticated, service_role;

-- 4) Multiplicador de racha en unified_reputation_config (mismo patron que
-- speed_multiplier/quality_multiplier/volume_multiplier ya existentes)
alter table public.unified_reputation_config
  add column if not exists streak_multiplier_7d numeric not null default 1.10,
  add column if not exists streak_multiplier_30d numeric not null default 1.25;

-- 5) award_reputation_event: aplica el multiplicador de racha SERVER-SIDE (el cliente no
-- puede falsificarlo pasando un p_multiplier alto — el motor de racha manda). additivo,
-- misma firma y contrato de retorno que antes.
create or replace function public.award_reputation_event(
  p_organization_id uuid,
  p_user_id uuid,
  p_role_key character varying,
  p_reference_type character varying,
  p_reference_id uuid,
  p_event_type character varying,
  p_event_subtype character varying default null::character varying,
  p_base_points integer default 0,
  p_multiplier numeric default 1.0,
  p_breakdown jsonb default null::jsonb,
  p_season_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller uuid := auth.uid();
  v_inserted_id uuid;
  v_streak_multiplier numeric;
  v_final_multiplier numeric;
begin
  if v_caller is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;
  if v_caller <> p_user_id then
    raise exception 'No autorizado: p_user_id no coincide con auth.uid()' using errcode = 'P0001';
  end if;
  if not public.is_org_member(v_caller, p_organization_id) then
    raise exception 'No autorizado: usuario no es miembro de la organización' using errcode = 'P0001';
  end if;
  if p_base_points < -500 or p_base_points > 500 then
    raise exception 'base_points fuera de rango permitido [-500, 500]: valor=%', p_base_points using errcode = 'P0001';
  end if;
  if p_multiplier < 0.1 or p_multiplier > 5.0 then
    raise exception 'multiplier fuera de rango permitido [0.1, 5.0]: valor=%', p_multiplier using errcode = 'P0001';
  end if;

  v_streak_multiplier := public.fn_bump_user_streak(p_user_id);
  v_final_multiplier := least(5.0, p_multiplier * v_streak_multiplier);

  begin
    insert into public.reputation_events (
      organization_id, user_id, role_key, reference_type, reference_id,
      event_type, event_subtype, base_points, multiplier, calculation_breakdown, season_id
    ) values (
      p_organization_id, p_user_id, p_role_key, p_reference_type, p_reference_id,
      p_event_type, p_event_subtype, p_base_points, v_final_multiplier,
      coalesce(p_breakdown, '{}'::jsonb) || jsonb_build_object('streak_multiplier', v_streak_multiplier),
      p_season_id
    )
    returning id into v_inserted_id;
  exception when unique_violation then
    return jsonb_build_object('data', null, 'error', null, 'duplicate', true);
  end;

  begin
    perform public.sync_marketplace_reputation(p_user_id);
  exception when others then null;
  end;

  begin
    perform public.fn_match_daily_missions(p_user_id, p_event_type);
  exception when others then null;
  end;

  return jsonb_build_object('data', jsonb_build_object('id', v_inserted_id), 'error', null, 'duplicate', false);
end;
$$;

-- 6) Reacciones del feed: cuentan para la racha de CUALQUIER usuario (con o sin org).
-- Cap anti-farmeo: max 5 reacciones/dia otorgan UP; el resto solo mantienen la racha.
create or replace function public.fn_feed_reaction_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_today_count int;
begin
  perform public.fn_bump_user_streak(new.user_id);

  select organization_id into v_org_id
  from public.organization_members
  where user_id = new.user_id
  limit 1;

  if v_org_id is not null then
    select count(*) into v_today_count
    from public.reputation_events
    where user_id = new.user_id
      and event_type = 'feed_reaction_given'
      and event_date = public.kreoon_today();

    if v_today_count < 5 then
      insert into public.reputation_events (
        organization_id, user_id, role_key, reference_type, reference_id,
        event_type, base_points, multiplier, event_date
      ) values (
        v_org_id, new.user_id, 'member', 'feed_reactions', new.id,
        'feed_reaction_given', 2, 1.0, public.kreoon_today()
      )
      on conflict do nothing;
    end if;
  end if;

  -- Progreso de misiones tipo 'feed_reaction_given': se llama siempre (con o sin org),
  -- el cap de UP de arriba no debe bloquear el progreso de la mision.
  begin
    perform public.fn_match_daily_missions(new.user_id, 'feed_reaction_given');
  exception when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_feed_reaction_activity on public.feed_reactions;
create trigger trg_feed_reaction_activity
  after insert on public.feed_reactions
  for each row execute function public.fn_feed_reaction_activity();

-- 7) Misiones diarias
create table if not exists public.mission_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  action_type text not null,
  target_count integer not null default 1,
  up_reward integer not null default 5,
  audience text not null default 'all',
  is_active boolean not null default true,
  weight integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.user_daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_template_id uuid not null references public.mission_templates(id) on delete cascade,
  assigned_date date not null,
  progress integer not null default 0,
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, assigned_date, mission_template_id)
);

create index if not exists idx_user_daily_missions_user_date
  on public.user_daily_missions(user_id, assigned_date);

alter table public.mission_templates enable row level security;
alter table public.user_daily_missions enable row level security;

create policy "mission_templates_select_all"
  on public.mission_templates for select
  to authenticated
  using (is_active = true);

create policy "user_daily_missions_select_own"
  on public.user_daily_missions for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.mission_templates to authenticated;
grant select on public.user_daily_missions to authenticated;
grant all on public.mission_templates to service_role;
grant all on public.user_daily_missions to service_role;

-- 8) Matching de progreso: se llama desde award_reputation_event (paso 5). Guard anti-recursion
-- explicito: 'daily_mission_completed' nunca hace match de si mismo.
create or replace function public.fn_match_daily_missions(p_user_id uuid, p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission record;
  v_today date := public.kreoon_today();
begin
  if p_event_type = 'daily_mission_completed' then
    return;
  end if;

  for v_mission in
    select udm.id, udm.progress, mt.target_count, mt.up_reward, udm.mission_template_id
    from public.user_daily_missions udm
    join public.mission_templates mt on mt.id = udm.mission_template_id
    where udm.user_id = p_user_id
      and udm.assigned_date = v_today
      and udm.completed_at is null
      and mt.action_type = p_event_type
  loop
    if v_mission.progress + 1 >= v_mission.target_count then
      update public.user_daily_missions
        set progress = v_mission.target_count, completed_at = now()
        where id = v_mission.id;
    else
      update public.user_daily_missions
        set progress = v_mission.progress + 1
        where id = v_mission.id;
    end if;
  end loop;
end;
$$;

-- 9) Asignacion lazy (sin cron): get_daily_missions() devuelve las de hoy, asignando 3 si
-- no existen todavia. audience: 'all' o el permission group real del usuario (se resuelve
-- via organization_members.role si existe; freelance/estudiante caen en 'all').
create or replace function public.get_daily_missions()
returns table (
  id uuid,
  code text,
  title text,
  description text,
  target_count integer,
  progress integer,
  up_reward integer,
  completed_at timestamptz,
  reward_claimed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := public.kreoon_today();
  v_audience text := 'all';
  v_count int;
begin
  if v_user is null then
    return;
  end if;

  select om.role into v_audience
  from public.organization_members om
  where om.user_id = v_user
  limit 1;

  -- Mapear rol legacy -> canonico (ver CLAUDE.md: 'creator' legacy convive con 'content_creator')
  if v_audience = 'creator' then
    v_audience := 'content_creator';
  end if;

  v_audience := coalesce(v_audience, 'all');

  select count(*) into v_count
  from public.user_daily_missions
  where user_id = v_user and assigned_date = v_today;

  if v_count = 0 then
    insert into public.user_daily_missions (user_id, mission_template_id, assigned_date)
    select v_user, mt.id, v_today
    from public.mission_templates mt
    where mt.is_active = true
      and (mt.audience = 'all' or mt.audience = v_audience)
    order by mt.weight desc, random()
    limit 3
    on conflict (user_id, assigned_date, mission_template_id) do nothing;
  end if;

  return query
  select mt.id, mt.code, mt.title, mt.description, mt.target_count,
         udm.progress, mt.up_reward, udm.completed_at, udm.reward_claimed
  from public.user_daily_missions udm
  join public.mission_templates mt on mt.id = udm.mission_template_id
  where udm.user_id = v_user and udm.assigned_date = v_today
  order by udm.created_at;
end;
$$;

grant execute on function public.get_daily_missions() to authenticated;
grant execute on function public.fn_match_daily_missions(uuid, text) to authenticated, service_role;

-- 10) Seed real (no mock) — SOLO templates con action_type que ya dispara hoy de verdad.
-- 'content_delivery'/'academy_lesson_completed'/'campaign_application' NO se seedean:
-- no hay punto de emision conectado todavia (documentado como pendiente) y una mision que
-- nunca puede completarse es peor que no tenerla.
insert into public.mission_templates (code, title, description, action_type, target_count, up_reward, audience, weight)
values
  ('react_3_feed', 'Reacciona a 3 trabajos de tu nicho', 'Descubre y reacciona a contenido del feed', 'feed_reaction_given', 3, 5, 'all', 3),
  ('react_5_feed', 'Reacciona a 5 trabajos hoy', 'Explora el feed y reacciona a lo que te guste', 'feed_reaction_given', 5, 8, 'all', 2),
  ('deliver_content', 'Entrega 1 contenido a tiempo', 'Cumple con una entrega asignada', 'delivery', 1, 15, 'content_creator', 5),
  ('deliver_content_editor', 'Entrega 1 edición a tiempo', 'Cumple con una entrega de edición asignada', 'delivery', 1, 15, 'editor', 5),
  ('get_approval', 'Consigue 1 aprobación limpia', 'Que tu entrega sea aprobada sin correcciones', 'approval', 1, 10, 'all', 4)
on conflict (code) do nothing;

notify pgrst, 'reload schema';
