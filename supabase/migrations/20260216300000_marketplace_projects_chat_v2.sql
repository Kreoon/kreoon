-- ============================================================
-- Migration: marketplace_projects_chat_v2
-- Adds: organization_id, project_messages, marketplace-media bucket,
--        triggers for unread counts & auto-dates
-- ============================================================

-- 1. Add organization_id to marketplace_projects
ALTER TABLE public.marketplace_projects
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_projects_organization ON public.marketplace_projects(organization_id);

-- 2. Make brand_id nullable (org-based projects may not have a brand)
ALTER TABLE public.marketplace_projects
  ALTER COLUMN brand_id DROP NOT NULL;

-- ============================================================
-- 3. Create project_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_name text NOT NULL DEFAULT '',
  sender_avatar text,
  sender_role text NOT NULL CHECK (sender_role IN ('brand', 'creator', 'editor', 'system')),
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "project_messages_select"
  ON public.project_messages FOR SELECT
  USING (public.is_project_participant(project_id));

CREATE POLICY "project_messages_insert"
  ON public.project_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_project_participant(project_id)
  );

CREATE POLICY "project_messages_update"
  ON public.project_messages FOR UPDATE
  USING (public.is_project_participant(project_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_messages_project ON public.project_messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_project_messages_sender ON public.project_messages(sender_id);

-- Grant permissions
GRANT ALL ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;

-- Enable realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. Create marketplace-media storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-media',
  'marketplace-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "marketplace_media_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-media' AND auth.role() = 'authenticated');

CREATE POLICY "marketplace_media_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-media');

CREATE POLICY "marketplace_media_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketplace-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "marketplace_media_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 5. Trigger: update counts on deliverable upload
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_deliverable_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.marketplace_projects
  SET unread_brand_messages = unread_brand_messages + 1,
      deliverables_count = (
        SELECT count(*) FROM public.project_deliveries WHERE project_id = NEW.project_id
      ),
      updated_at = now()
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_deliverable_inserted ON public.project_deliveries;
CREATE TRIGGER trg_on_deliverable_inserted
  AFTER INSERT ON public.project_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.on_deliverable_inserted();

-- ============================================================
-- 6. Trigger: update counts on deliverable review
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_deliverable_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- If brand approved or requested changes → notify creator (via unread count)
  IF NEW.status IN ('approved', 'revision_requested') THEN
    UPDATE public.marketplace_projects
    SET unread_creator_messages = unread_creator_messages + 1,
        deliverables_approved = (
          SELECT count(*) FROM public.project_deliveries
          WHERE project_id = NEW.project_id AND status = 'approved'
        ),
        updated_at = now()
    WHERE id = NEW.project_id;
  ELSE
    -- Other status changes: just recompute approved count
    UPDATE public.marketplace_projects
    SET deliverables_approved = (
          SELECT count(*) FROM public.project_deliveries
          WHERE project_id = NEW.project_id AND status = 'approved'
        ),
        updated_at = now()
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_deliverable_reviewed ON public.project_deliveries;
CREATE TRIGGER trg_on_deliverable_reviewed
  AFTER UPDATE ON public.project_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.on_deliverable_reviewed();

-- ============================================================
-- 7. Trigger: handle project messages (unread counts)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_project_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.sender_role = 'system' THEN
    UPDATE public.marketplace_projects
    SET last_message_at = now(), updated_at = now()
    WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;

  UPDATE public.marketplace_projects
  SET last_message_at = now(),
      updated_at = now(),
      unread_brand_messages = CASE
        WHEN NEW.sender_role IN ('creator', 'editor') THEN unread_brand_messages + 1
        ELSE unread_brand_messages
      END,
      unread_creator_messages = CASE
        WHEN NEW.sender_role = 'brand' THEN unread_creator_messages + 1
        ELSE unread_creator_messages
      END
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_project_message ON public.project_messages;
CREATE TRIGGER trg_handle_project_message
  AFTER INSERT ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_message();

-- ============================================================
-- 8. Trigger: auto-set started_at / completed_at on status change
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_project_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NEW.status = 'in_progress' AND OLD.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  IF NEW.status = 'completed' AND OLD.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_project_status_changed ON public.marketplace_projects;
CREATE TRIGGER trg_on_project_status_changed
  BEFORE UPDATE ON public.marketplace_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.on_project_status_changed();

-- ============================================================
-- 9. Update is_project_participant to handle org-based projects
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_project_participant(_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_projects mp
    WHERE mp.id = _project_id
      AND (
        mp.creator_id = auth.uid()
        OR mp.editor_id = auth.uid()
        OR (mp.brand_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.brand_members bm
          WHERE bm.brand_id = mp.brand_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        ))
        OR (mp.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = mp.organization_id
            AND om.user_id = auth.uid()
        ))
      )
  );
$$;
