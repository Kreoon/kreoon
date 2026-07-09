-- Web Push infrastructure (Fase 2.5 Frente C)
-- push_subscriptions: una fila por endpoint de navegador suscrito
-- push_dedup_log: throttle de 5 min por usuario para no floodear con push por reaccion/comentario en rafaga

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Dedup: 1 push como maximo cada 5 min por usuario (evita rafaga de reacciones/comentarios)
create table if not exists public.push_dedup_log (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_sent_at timestamptz not null default now()
);

alter table public.push_dedup_log enable row level security;
-- Sin policies para authenticated/anon: solo service_role (edge function) toca esta tabla
grant all on public.push_dedup_log to service_role;

-- Trigger: en cada insert de social_notifications, invoca push-send via pg_net (fire-and-forget)
create or replace function public.fn_dispatch_push_on_social_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_should_send boolean;
  -- Anon key publica del proyecto (mismo patron que pancake-sync trigger) — push-send
  -- valida el usuario internamente contra push_subscriptions, no confia en el JWT.
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';
begin
  -- Dedup: solo si no se envio push a este usuario en los ultimos 5 minutos
  insert into public.push_dedup_log (user_id, last_sent_at)
  values (new.user_id, now())
  on conflict (user_id) do update
    set last_sent_at = now()
    where public.push_dedup_log.last_sent_at < now() - interval '5 minutes'
  returning true into v_should_send;

  if v_should_send then
    perform net.http_post(
      url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/push-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := jsonb_build_object(
        'user_id', new.user_id,
        'notification_id', new.id,
        'notification_type', new.notification_type,
        'message', new.message
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dispatch_push_on_social_notification on public.social_notifications;
create trigger trg_dispatch_push_on_social_notification
  after insert on public.social_notifications
  for each row execute function public.fn_dispatch_push_on_social_notification();

notify pgrst, 'reload schema';
