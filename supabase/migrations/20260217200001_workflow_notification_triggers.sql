-- ============================================================
-- Workflow Notification Triggers
--
-- Fires pg_net HTTP calls to the workflow-notifications edge
-- function when relevant status changes occur.
--
-- Notifications:
--   Creator: content assigned, content approved, application approved, project created
--   Editor:  content recorded (ready for editing)
--   Issues:  notify responsible party
--
-- Clients get a DAILY DIGEST (via daily-reminders cron), NOT real-time.
-- ============================================================

-- ─── Content status change trigger ──────────────────────
CREATE OR REPLACE FUNCTION public.notify_content_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payload jsonb;
  _type text;
  _url text;
BEGIN
  -- Only fire on actual status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification type based on new status
  CASE NEW.status
    WHEN 'assigned' THEN
      -- Creator assigned content (only if creator_id just set or status changed to assigned)
      IF NEW.creator_id IS NOT NULL THEN
        _type := 'content_assigned';
      END IF;
    WHEN 'recorded' THEN
      -- Editor notified that content is ready for editing
      IF NEW.editor_id IS NOT NULL THEN
        _type := 'content_recorded';
      END IF;
    WHEN 'approved' THEN
      -- Creator notified their content was approved
      IF NEW.creator_id IS NOT NULL THEN
        _type := 'content_approved';
      END IF;
    WHEN 'issue' THEN
      -- Notify the person responsible for fixing
      _type := 'content_issue';
    ELSE
      -- No notification needed for other statuses
      RETURN NEW;
  END CASE;

  IF _type IS NULL THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'type', _type,
    'record', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'status', NEW.status,
      'creator_id', NEW.creator_id,
      'editor_id', NEW.editor_id,
      'client_id', NEW.client_id,
      'organization_id', NEW.organization_id
    ),
    'old_record', jsonb_build_object(
      'status', OLD.status
    )
  );

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  END IF;

  -- Fire and forget via pg_net
  PERFORM net.http_post(
    url := _url || '/functions/v1/workflow-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to content table
DROP TRIGGER IF EXISTS trg_content_workflow_notification ON public.content;
CREATE TRIGGER trg_content_workflow_notification
  AFTER UPDATE OF status ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_status_change();

-- ─── Creator assignment trigger (when creator_id changes) ──
CREATE OR REPLACE FUNCTION public.notify_creator_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payload jsonb;
  _url text;
BEGIN
  -- Only fire when creator_id is newly set (was NULL, now has value)
  IF OLD.creator_id IS NOT NULL OR NEW.creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't double-fire if status also changed to 'assigned' (the other trigger handles it)
  IF NEW.status = 'assigned' AND OLD.status != 'assigned' THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'type', 'content_assigned',
    'record', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'status', NEW.status,
      'creator_id', NEW.creator_id,
      'editor_id', NEW.editor_id,
      'client_id', NEW.client_id,
      'organization_id', NEW.organization_id
    )
  );

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := _url || '/functions/v1/workflow-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_creator_assigned ON public.content;
CREATE TRIGGER trg_content_creator_assigned
  AFTER UPDATE OF creator_id ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_creator_assigned();

-- ─── Campaign application approved trigger ──────────────
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payload jsonb;
  _url text;
BEGIN
  -- Only fire when status changes to 'approved'
  IF OLD.status = NEW.status OR NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'type', 'application_approved',
    'record', jsonb_build_object(
      'id', NEW.id,
      'campaign_id', NEW.campaign_id,
      'creator_id', NEW.creator_id,
      'status', NEW.status
    )
  );

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := _url || '/functions/v1/workflow-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_approved ON public.campaign_applications;
CREATE TRIGGER trg_application_approved
  AFTER UPDATE OF status ON public.campaign_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();

-- ─── Marketplace project created trigger ────────────────
CREATE OR REPLACE FUNCTION public.notify_project_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payload jsonb;
  _url text;
BEGIN
  -- Only fire when a new project is created with a creator
  IF NEW.creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'type', 'project_created',
    'record', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'brand_id', NEW.brand_id,
      'creator_id', NEW.creator_id,
      'status', NEW.status
    )
  );

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := _url || '/functions/v1/workflow-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_project_created ON public.marketplace_projects;
CREATE TRIGGER trg_marketplace_project_created
  AFTER INSERT ON public.marketplace_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_created();
