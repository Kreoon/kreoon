-- Fase 1 Feed Social: reacciones (love/fire/clap/wow/sad) sobre portfolio_items
-- + columnas de visibilidad/aprobación de cliente para publicar entregas al feed.
-- NO se crean feed_posts/feed_saves/user_follows: se reutilizan portfolio_items,
-- saved_items y followers ya existentes (ver auditoria Fase 1.1).

alter table public.portfolio_items
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'followers', 'org')),
  add column if not exists client_approved_showcase boolean not null default false,
  add column if not exists reactions_count integer not null default 0;

create table if not exists public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.portfolio_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('love', 'fire', 'clap', 'wow', 'sad')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_feed_reactions_post on public.feed_reactions(post_id);
create index if not exists idx_feed_reactions_user on public.feed_reactions(user_id);

alter table public.feed_reactions enable row level security;

create policy "feed_reactions_select_visible_posts"
  on public.feed_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.portfolio_items pi
      where pi.id = feed_reactions.post_id
        and (
          pi.is_public = true
          or exists (
            select 1 from public.creator_profiles cp
            where cp.id = pi.creator_id and cp.user_id = auth.uid()
          )
        )
    )
  );

create policy "feed_reactions_insert_own"
  on public.feed_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "feed_reactions_update_own"
  on public.feed_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "feed_reactions_delete_own"
  on public.feed_reactions for delete
  to authenticated
  using (user_id = auth.uid());

grant all on public.feed_reactions to authenticated;
grant all on public.feed_reactions to service_role;

create or replace function public.fn_sync_portfolio_item_reactions_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.portfolio_items
      set reactions_count = reactions_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.portfolio_items
      set reactions_count = greatest(0, reactions_count - 1)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_feed_reactions_sync_count on public.feed_reactions;
create trigger trg_feed_reactions_sync_count
  after insert or delete on public.feed_reactions
  for each row execute function public.fn_sync_portfolio_item_reactions_count();

notify pgrst, 'reload schema';
