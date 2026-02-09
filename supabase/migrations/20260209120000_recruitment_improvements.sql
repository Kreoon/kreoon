-- Recruitment improvements: prevent duplicate pending invitations + auto-add on accept

-- Partial unique index: only one pending invitation per org-creator pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_org_invitation
  ON marketplace_org_invitations(organization_id, creator_user_id)
  WHERE status = 'pending';

-- Trigger: when invitation is accepted, auto-add creator to the organization
CREATE OR REPLACE FUNCTION handle_recruitment_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Insert into organization_members if not already a member
    INSERT INTO organization_members (organization_id, user_id, role, invited_by)
    VALUES (
      NEW.organization_id,
      NEW.creator_user_id,
      COALESCE(NEW.proposed_role, 'creator')::app_role,
      NEW.invited_by
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Set responded_at timestamp
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recruitment_accepted ON marketplace_org_invitations;
CREATE TRIGGER trg_recruitment_accepted
  BEFORE UPDATE ON marketplace_org_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_recruitment_accepted();
