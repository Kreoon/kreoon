-- Fase 1.4 Paso 0: whitelist de columnas en UPDATE de feed_reactions.
-- El usuario solo puede mutar reaction_type; post_id/user_id/created_at quedan protegidos
-- por un trigger BEFORE UPDATE (no hay soporte nativo de column-level RLS para UPDATE).

create or replace function public.fn_feed_reactions_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.post_id <> old.post_id or new.user_id <> old.user_id or new.created_at <> old.created_at then
    raise exception 'feed_reactions: solo se permite modificar reaction_type';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feed_reactions_guard_update on public.feed_reactions;
create trigger trg_feed_reactions_guard_update
  before update on public.feed_reactions
  for each row execute function public.fn_feed_reactions_guard_update();
