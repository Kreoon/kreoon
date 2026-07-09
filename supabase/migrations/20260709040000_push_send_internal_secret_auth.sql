-- Security fix: push-send tenia verify_jwt=false + anon key publica = cualquiera podia spammear
-- push a cualquier user_id. El trigger ahora manda un secreto interno que push-send valida.
--
-- El secreto NUNCA se hardcodea en SQL (quedaria en git history para siempre) — vive en
-- Supabase Vault. Paso manual unico (ya ejecutado para este proyecto via execute_sql):
--   select vault.create_secret('<valor-random-32-bytes>', 'push_internal_secret', 'Secreto compartido trigger <-> push-send');
-- El mismo valor debe estar seteado como secret de edge function: PUSH_INTERNAL_SECRET
-- (supabase secrets set PUSH_INTERNAL_SECRET="<mismo-valor>" --project-ref wjkbqcrxwsmvtxmqgiqc)

create or replace function public.fn_dispatch_push_on_social_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_should_send boolean;
  -- Anon key publica del proyecto (mismo patron que pancake-sync trigger) — segura de hardcodear,
  -- no autoriza nada por si sola. La autorizacion real es v_internal_secret (Vault).
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8';
  v_internal_secret text;
begin
  select decrypted_secret into v_internal_secret
  from vault.decrypted_secrets
  where name = 'push_internal_secret';

  -- Dedup: solo si no se envio push a este usuario en los ultimos 5 minutos
  insert into public.push_dedup_log (user_id, last_sent_at)
  values (new.user_id, now())
  on conflict (user_id) do update
    set last_sent_at = now()
    where public.push_dedup_log.last_sent_at < now() - interval '5 minutes'
  returning true into v_should_send;

  if v_should_send and v_internal_secret is not null then
    perform net.http_post(
      url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/push-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key,
        'X-Internal-Secret', v_internal_secret
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

notify pgrst, 'reload schema';
