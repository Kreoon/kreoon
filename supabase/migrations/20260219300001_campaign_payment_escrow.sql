-- ============================================================================
-- CAMPAIGN PAYMENT & ESCROW INTEGRATION
-- Adds commission tracking, escrow integration, and activation workflow
-- Commission: 30% self-service, 40% with Kreoon Agency support
-- ============================================================================

-- ── 1. Add commission and payment columns to marketplace_campaigns ──────

ALTER TABLE marketplace_campaigns
  ADD COLUMN IF NOT EXISTS requires_agency_support BOOLEAN DEFAULT false,
  -- When true: full strategy, scripts, process support from Kreoon Agency → 40% commission
  -- When false: self-service campaign → 30% commission
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 30,
  -- 30 or 40 based on requires_agency_support
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  -- 'unpaid' | 'pending_payment' | 'in_escrow' | 'partially_released' | 'fully_released' | 'refunded'
  ADD COLUMN IF NOT EXISTS escrow_hold_id UUID REFERENCES escrow_holds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ── 2. Add payment fields to campaign_applications ──────────────────────

ALTER TABLE campaign_applications
  ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2),
  -- Final agreed price (after counter-offers)
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  -- 'unpaid' | 'in_escrow' | 'released' | 'refunded'
  ADD COLUMN IF NOT EXISTS escrow_hold_id UUID REFERENCES escrow_holds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS includes_editing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_delivery_days INTEGER,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- ── 3. Trigger to auto-set commission rate based on agency support ──────

CREATE OR REPLACE FUNCTION auto_set_campaign_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.requires_agency_support = true THEN
    NEW.commission_rate := 40;
  ELSE
    NEW.commission_rate := 30;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_campaign_commission ON marketplace_campaigns;
CREATE TRIGGER trg_auto_campaign_commission
  BEFORE INSERT OR UPDATE OF requires_agency_support
  ON marketplace_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_campaign_commission();

-- ── 4. Function to activate a campaign (create escrow, set status) ──────

CREATE OR REPLACE FUNCTION activate_campaign(
  p_campaign_id UUID,
  p_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_escrow_id UUID;
  v_result JSON;
BEGIN
  SELECT * INTO v_campaign
  FROM marketplace_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  IF v_campaign.status NOT IN ('draft', 'active') THEN
    RETURN json_build_object('success', false, 'error', 'Campaign cannot be activated in current status');
  END IF;

  -- Create escrow hold for the campaign budget
  IF v_campaign.total_budget IS NOT NULL AND v_campaign.total_budget > 0 THEN
    INSERT INTO escrow_holds (
      payer_wallet_id,
      payee_wallet_id,
      amount,
      currency,
      description,
      auto_release_at,
      metadata
    )
    SELECT
      pw.id,     -- payer = brand/org wallet
      NULL,      -- payee determined per creator on release
      v_campaign.total_budget,
      COALESCE(v_campaign.currency, 'USD'),
      'Campaign escrow: ' || v_campaign.title,
      v_campaign.campaign_end_date + INTERVAL '7 days',
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'commission_rate', v_campaign.commission_rate,
        'type', 'campaign_escrow'
      )
    FROM unified_wallets pw
    WHERE pw.owner_id = COALESCE(v_campaign.organization_id::TEXT, v_campaign.created_by::TEXT)
      AND pw.wallet_type IN ('organization', 'creator')
    LIMIT 1
    RETURNING id INTO v_escrow_id;
  END IF;

  -- Update campaign
  UPDATE marketplace_campaigns
  SET
    status = 'active',
    payment_status = CASE WHEN v_escrow_id IS NOT NULL THEN 'in_escrow' ELSE 'pending_payment' END,
    escrow_hold_id = v_escrow_id,
    stripe_payment_intent_id = p_payment_intent_id,
    activated_at = NOW(),
    published_at = COALESCE(published_at, NOW())
  WHERE id = p_campaign_id;

  RETURN json_build_object(
    'success', true,
    'campaign_id', p_campaign_id,
    'escrow_hold_id', v_escrow_id,
    'payment_status', CASE WHEN v_escrow_id IS NOT NULL THEN 'in_escrow' ELSE 'pending_payment' END
  );
END;
$$;

-- ── 5. Function to approve application and create project ───────────────

CREATE OR REPLACE FUNCTION approve_campaign_application(
  p_application_id UUID,
  p_agreed_price NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_campaign RECORD;
  v_project_id UUID;
  v_escrow_id UUID;
BEGIN
  SELECT * INTO v_app FROM campaign_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  SELECT * INTO v_campaign FROM marketplace_campaigns WHERE id = v_app.campaign_id;

  -- Set agreed price
  UPDATE campaign_applications
  SET
    status = 'approved',
    agreed_price = COALESCE(p_agreed_price, v_app.bid_amount, v_app.proposed_price, v_campaign.budget_per_video)
  WHERE id = p_application_id;

  -- Create marketplace project
  INSERT INTO marketplace_projects (
    campaign_id,
    brand_id,
    creator_id,
    title,
    description,
    status,
    agreed_price,
    currency,
    deadline,
    metadata
  ) VALUES (
    v_campaign.id,
    v_campaign.brand_id,
    v_app.creator_id,
    v_campaign.title || ' - ' || (SELECT display_name FROM creator_profiles WHERE id = v_app.creator_id),
    v_campaign.description,
    'in_progress',
    COALESCE(p_agreed_price, v_app.bid_amount, v_app.proposed_price, v_campaign.budget_per_video),
    COALESCE(v_campaign.currency, 'USD'),
    COALESCE(v_campaign.content_deadline, v_campaign.deadline),
    jsonb_build_object(
      'campaign_id', v_campaign.id,
      'application_id', p_application_id,
      'commission_rate', v_campaign.commission_rate,
      'includes_editing', v_app.includes_editing
    )
  )
  RETURNING id INTO v_project_id;

  -- Update application with project reference
  UPDATE campaign_applications SET status = 'assigned' WHERE id = p_application_id;

  -- Update campaign approved count
  UPDATE marketplace_campaigns
  SET approved_count = approved_count + 1,
      status = CASE WHEN status = 'active' THEN 'in_progress' ELSE status END
  WHERE id = v_campaign.id;

  RETURN json_build_object(
    'success', true,
    'project_id', v_project_id,
    'application_id', p_application_id,
    'agreed_price', COALESCE(p_agreed_price, v_app.bid_amount, v_app.proposed_price)
  );
END;
$$;

-- ── 6. Function to complete a campaign project and release payment ──────

CREATE OR REPLACE FUNCTION complete_campaign_delivery(
  p_application_id UUID,
  p_rating INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_campaign RECORD;
  v_agreed_price NUMERIC;
  v_commission NUMERIC;
  v_creator_payout NUMERIC;
BEGIN
  SELECT * INTO v_app FROM campaign_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  SELECT * INTO v_campaign FROM marketplace_campaigns WHERE id = v_app.campaign_id;

  v_agreed_price := COALESCE(v_app.agreed_price, v_app.bid_amount, v_app.proposed_price, 0);
  v_commission := v_agreed_price * (v_campaign.commission_rate / 100.0);
  v_creator_payout := v_agreed_price - v_commission;

  -- Mark application as completed
  UPDATE campaign_applications
  SET
    status = 'completed',
    payment_status = 'released',
    completed_at = NOW(),
    rating = p_rating
  WHERE id = p_application_id;

  -- Update marketplace project status
  UPDATE marketplace_projects
  SET status = 'completed',
      payment_status = 'released'
  WHERE campaign_id = v_campaign.id
    AND creator_id = v_app.creator_id;

  -- Check if all applications for this campaign are completed
  IF NOT EXISTS (
    SELECT 1 FROM campaign_applications
    WHERE campaign_id = v_campaign.id
      AND status NOT IN ('completed', 'rejected', 'withdrawn')
  ) THEN
    UPDATE marketplace_campaigns
    SET status = 'completed',
        payment_status = 'fully_released',
        completed_at = NOW()
    WHERE id = v_campaign.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'agreed_price', v_agreed_price,
    'commission', v_commission,
    'commission_rate', v_campaign.commission_rate,
    'creator_payout', v_creator_payout,
    'requires_agency_support', v_campaign.requires_agency_support
  );
END;
$$;

-- ── 7. Indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_campaigns_payment_status
  ON marketplace_campaigns(payment_status)
  WHERE payment_status != 'unpaid';

CREATE INDEX IF NOT EXISTS idx_applications_payment_status
  ON campaign_applications(payment_status)
  WHERE payment_status != 'unpaid';

-- ── 8. GRANTs ───────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION activate_campaign(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_campaign(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION approve_campaign_application(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_campaign_application(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION complete_campaign_delivery(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_campaign_delivery(UUID, INTEGER) TO service_role;
