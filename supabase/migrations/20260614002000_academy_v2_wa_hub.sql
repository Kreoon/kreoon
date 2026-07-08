-- ============================================================
-- CRION Academy v2 — WhatsApp Hub (S3.1)
--
-- Tablas para el módulo WhatsApp Hub estilo nas.io:
--   - academy_space_whatsapp_groups: conexión del space a un grupo WA
--   - academy_wa_messages_log: log de mensajes inbound del grupo
--     (poblado por webhook Botcake — en S3.2 se conecta)
--   - academy_wa_summaries: resúmenes IA diarios del grupo
--   - academy_wa_broadcasts: log de broadcasts manuales del owner
--
-- Rollback:
--   DROP TABLE academy_space_whatsapp_groups CASCADE;
--   DROP TABLE academy_wa_messages_log CASCADE;
--   DROP TABLE academy_wa_summaries CASCADE;
--   DROP TABLE academy_wa_broadcasts CASCADE;
-- ============================================================

-- ─── academy_space_whatsapp_groups ────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_space_whatsapp_groups (
  space_id uuid PRIMARY KEY REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  group_invite_url text NOT NULL,
  group_id text,                                        -- WhatsApp group ID (cuando se pueda obtener vía API)
  group_name text,
  auto_invite_on_join boolean NOT NULL DEFAULT true,
  tier_required text,                                   -- nullable: si seteado, solo miembros de ese tier reciben invite
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_space_whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Owner del space gestiona, los miembros pueden leer (para mostrar el invite_url).
CREATE POLICY "academy_wa_groups_owner_all"
  ON public.academy_space_whatsapp_groups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "academy_wa_groups_members_read"
  ON public.academy_space_whatsapp_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_memberships m
      WHERE m.space_id = academy_space_whatsapp_groups.space_id
        AND m.user_id = auth.uid() AND m.is_active = true
    )
  );

GRANT ALL ON public.academy_space_whatsapp_groups TO service_role, authenticated;


-- ─── academy_wa_messages_log ───────────────────────────────────
-- Webhook Botcake inbound popula esta tabla con cada mensaje del grupo.
CREATE TABLE IF NOT EXISTS public.academy_wa_messages_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  group_id text,
  sender_phone text NOT NULL,                          -- número del que envió
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- resuelto si matchea profile
  message_text text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'other')),
  media_url text,
  raw_payload jsonb,                                   -- payload completo del webhook
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_wa_messages_space_date_idx
  ON public.academy_wa_messages_log (space_id, received_at DESC);

ALTER TABLE public.academy_wa_messages_log ENABLE ROW LEVEL SECURITY;

-- Solo service_role escribe (webhook). Owner del space puede leer logs.
CREATE POLICY "academy_wa_messages_owner_read"
  ON public.academy_wa_messages_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "academy_wa_messages_service_role_all"
  ON public.academy_wa_messages_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_wa_messages_log TO service_role;
GRANT SELECT ON public.academy_wa_messages_log TO authenticated;


-- ─── academy_wa_summaries ──────────────────────────────────────
-- Resumen IA diario del grupo (generado por academy-wa-summarizer cron).
CREATE TABLE IF NOT EXISTS public.academy_wa_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  summary_md text NOT NULL,                            -- markdown del resumen
  top_contributors jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{phone, name, message_count}]
  unanswered_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_messages int NOT NULL DEFAULT 0,
  active_members int NOT NULL DEFAULT 0,
  sent_to_owner_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, summary_date)
);

CREATE INDEX IF NOT EXISTS academy_wa_summaries_space_date_idx
  ON public.academy_wa_summaries (space_id, summary_date DESC);

ALTER TABLE public.academy_wa_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_wa_summaries_owner_read"
  ON public.academy_wa_summaries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "academy_wa_summaries_service_role_all"
  ON public.academy_wa_summaries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_wa_summaries TO service_role;
GRANT SELECT ON public.academy_wa_summaries TO authenticated;


-- ─── academy_wa_broadcasts ─────────────────────────────────────
-- Log de broadcasts manuales del owner (template MARKETING academy_broadcast).
CREATE TABLE IF NOT EXISTS public.academy_wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {tier, min_level, max_inactive_days, course_id, ...}
  message_text text NOT NULL,                           -- copy ya armado con variables resueltas
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_count int,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  opened_count int NOT NULL DEFAULT 0,                  -- opcional: si webhook Meta lo expone
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_wa_broadcasts_space_idx
  ON public.academy_wa_broadcasts (space_id, created_at DESC);

ALTER TABLE public.academy_wa_broadcasts ENABLE ROW LEVEL SECURITY;

-- Owner del space CRUD; service_role para edge function de envío.
CREATE POLICY "academy_wa_broadcasts_owner_all"
  ON public.academy_wa_broadcasts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    ) AND sender_user_id = auth.uid()
  );

CREATE POLICY "academy_wa_broadcasts_service_role_all"
  ON public.academy_wa_broadcasts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_wa_broadcasts TO service_role, authenticated;
