-- =============================================================================
-- MARKETPLACE INFRASTRUCTURE - Complete Database Setup
-- =============================================================================
-- This migration creates the full marketplace infrastructure.
-- RULE: DO NOT modify, drop, or alter ANY existing table, policy, function, or trigger.
-- Everything here is ADDITIVE.
-- =============================================================================

-- ============================================
-- 1. HELPER FUNCTIONS
-- ============================================

-- is_brand_member: check if current user belongs to a brand
CREATE OR REPLACE FUNCTION public.is_brand_member(_brand_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- is_brand_admin: check if current user is admin/owner of a brand
CREATE OR REPLACE FUNCTION public.is_brand_admin(_brand_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.brands
    WHERE id = _brand_id
      AND owner_id = auth.uid()
  );
$$;

-- get_creator_profile_id: get creator_profile id for current user
CREATE OR REPLACE FUNCTION public.get_creator_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.creator_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- is_project_participant: check if current user participates in a marketplace project
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
        OR EXISTS (
          SELECT 1 FROM public.brand_members bm
          WHERE bm.brand_id = mp.brand_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
      )
  );
$$;

-- generate_unique_slug: create a unique slug from text
CREATE OR REPLACE FUNCTION public.generate_unique_slug(_text text, _table_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  _slug text;
  _base_slug text;
  _counter int := 0;
  _exists boolean;
BEGIN
  -- Normalize: lowercase, replace spaces/special chars with hyphens
  _base_slug := lower(trim(_text));
  _base_slug := regexp_replace(_base_slug, '[^a-z0-9]+', '-', 'g');
  _base_slug := regexp_replace(_base_slug, '^-|-$', '', 'g');
  _base_slug := left(_base_slug, 60);

  _slug := _base_slug;

  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE slug = $1)', _table_name)
      INTO _exists USING _slug;
    EXIT WHEN NOT _exists;
    _counter := _counter + 1;
    _slug := _base_slug || '-' || _counter;
  END LOOP;

  RETURN _slug;
END;
$$;

-- ============================================
-- 2. CUSTOM TYPES (enums)
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.marketplace_project_status AS ENUM (
    'pending', 'briefing', 'in_progress', 'revision', 'approved', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM (
    'draft', 'active', 'paused', 'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM (
    'pending', 'approved', 'rejected', 'assigned', 'delivered', 'completed', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_status AS ENUM (
    'pending', 'uploaded', 'in_review', 'revision_requested', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. TABLES
-- ============================================

-- ---- creator_profiles ----
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  slug text UNIQUE,
  bio text,
  bio_full text,
  avatar_url text,
  banner_url text,
  location_city text,
  location_country text DEFAULT 'CO',
  country_flag text DEFAULT '🇨🇴',
  categories text[] DEFAULT '{}',
  content_types text[] DEFAULT '{}',
  languages text[] DEFAULT '{es}',
  platforms text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  level text DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'elite')),
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT true,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  completed_projects integer DEFAULT 0,
  base_price numeric(10,2),
  currency text DEFAULT 'USD',
  accepts_product_exchange boolean DEFAULT false,
  exchange_conditions text,
  response_time_hours integer DEFAULT 24,
  on_time_delivery_pct numeric(5,2) DEFAULT 100,
  repeat_clients_pct numeric(5,2) DEFAULT 0,
  marketplace_roles text[] DEFAULT '{}',
  stripe_account_id text,
  payout_method text DEFAULT 'bank_transfer',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT creator_profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_slug ON public.creator_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_categories ON public.creator_profiles USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_level ON public.creator_profiles(level);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_is_available ON public.creator_profiles(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_creator_profiles_rating ON public.creator_profiles(rating_avg DESC);

-- ---- portfolio_items ----
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  title text,
  description text,
  media_type text NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'image', 'carousel')),
  media_url text NOT NULL,
  thumbnail_url text,
  bunny_video_id text,
  duration_seconds integer,
  aspect_ratio text DEFAULT '9:16',
  category text,
  tags text[] DEFAULT '{}',
  brand_name text,
  campaign_id uuid,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_creator ON public.portfolio_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_category ON public.portfolio_items(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured ON public.portfolio_items(is_featured) WHERE is_featured = true;

-- ---- marketplace_campaigns ----
CREATE TABLE IF NOT EXISTS public.marketplace_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  slug text UNIQUE,
  description text NOT NULL,
  category text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'paid' CHECK (campaign_type IN ('paid', 'exchange', 'hybrid')),
  budget_mode text DEFAULT 'per_video' CHECK (budget_mode IN ('per_video', 'total_budget')),
  budget_per_video numeric(10,2),
  total_budget numeric(10,2),
  currency text DEFAULT 'USD',
  platform_fee_pct numeric(5,2) DEFAULT 10,
  content_requirements jsonb DEFAULT '[]',
  creator_requirements jsonb DEFAULT '{}',
  max_creators integer DEFAULT 5,
  applications_count integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  status public.campaign_status DEFAULT 'draft',
  deadline timestamptz,
  tags text[] DEFAULT '{}',
  -- Auction/bidding fields
  pricing_mode text DEFAULT 'fixed' CHECK (pricing_mode IN ('fixed', 'auction', 'range')),
  min_bid numeric(10,2),
  max_bid numeric(10,2),
  bid_deadline timestamptz,
  bid_visibility text DEFAULT 'public' CHECK (bid_visibility IN ('public', 'sealed')),
  desired_roles text[] DEFAULT '{}',
  -- Exchange fields
  exchange_product_name text,
  exchange_product_value numeric(10,2),
  exchange_product_description text,
  -- Media
  cover_image_url text,
  gallery_urls text[] DEFAULT '{}',
  -- Metadata
  is_featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON public.marketplace_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.marketplace_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.marketplace_campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_deadline ON public.marketplace_campaigns(deadline);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.marketplace_campaigns(slug);

-- ---- campaign_applications ----
CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketplace_campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  status public.application_status DEFAULT 'pending',
  cover_letter text,
  proposed_price numeric(10,2),
  portfolio_links text[] DEFAULT '{}',
  availability_date date,
  -- Bidding fields
  bid_amount numeric(10,2),
  bid_message text,
  -- Counter offer
  counter_offer_amount numeric(10,2),
  counter_offer_message text,
  counter_offer_response text CHECK (counter_offer_response IN ('accepted', 'rejected')),
  counter_offer_response_at timestamptz,
  -- Brand notes
  brand_notes text,
  brand_rating integer CHECK (brand_rating >= 1 AND brand_rating <= 5),
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT campaign_applications_unique UNIQUE (campaign_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_campaign ON public.campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_creator ON public.campaign_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.campaign_applications(status);

-- ---- marketplace_projects ----
CREATE TABLE IF NOT EXISTS public.marketplace_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  editor_id uuid REFERENCES auth.users(id),
  campaign_id uuid REFERENCES public.marketplace_campaigns(id),
  application_id uuid REFERENCES public.campaign_applications(id),
  -- Service reference
  service_id uuid REFERENCES public.creator_services(id),
  package_name text,
  -- Project info
  title text NOT NULL,
  brief jsonb DEFAULT '{}',
  status public.marketplace_project_status DEFAULT 'pending',
  -- Payment
  payment_method text DEFAULT 'payment' CHECK (payment_method IN ('payment', 'exchange')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'escrow', 'released', 'refunded')),
  total_price numeric(10,2) DEFAULT 0,
  platform_fee numeric(10,2) DEFAULT 0,
  creator_payout numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  -- Deliverables tracking
  deliverables_count integer DEFAULT 0,
  deliverables_approved integer DEFAULT 0,
  revisions_used integer DEFAULT 0,
  revisions_limit integer DEFAULT 2,
  -- Dates
  deadline timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  -- Messaging
  last_message_at timestamptz,
  unread_brand_messages integer DEFAULT 0,
  unread_creator_messages integer DEFAULT 0,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_brand ON public.marketplace_projects(brand_id);
CREATE INDEX IF NOT EXISTS idx_projects_creator ON public.marketplace_projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_editor ON public.marketplace_projects(editor_id);
CREATE INDEX IF NOT EXISTS idx_projects_campaign ON public.marketplace_projects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.marketplace_projects(status);

-- ---- project_deliveries ----
CREATE TABLE IF NOT EXISTS public.project_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  -- File info
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'video' CHECK (file_type IN ('video', 'image', 'document', 'audio', 'other')),
  file_size_bytes bigint,
  thumbnail_url text,
  bunny_video_id text,
  duration_seconds integer,
  -- Review
  status public.delivery_status DEFAULT 'uploaded',
  version integer DEFAULT 1,
  revision_notes text,
  brand_feedback text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_project ON public.project_deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_creator ON public.project_deliveries(creator_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.project_deliveries(status);

-- ---- creator_reviews ----
CREATE TABLE IF NOT EXISTS public.creator_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  brand_id uuid REFERENCES public.brands(id),
  -- Review content
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  -- Detailed ratings
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeliness_rating integer CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  -- Response from creator
  creator_response text,
  creator_response_at timestamptz,
  -- Metadata
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT creator_reviews_project_unique UNIQUE (project_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_creator ON public.creator_reviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON public.creator_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.creator_reviews(rating);

-- ---- saved_creators ----
CREATE TABLE IF NOT EXISTS public.saved_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  notes text,
  list_name text DEFAULT 'Favoritos',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT saved_creators_unique UNIQUE (user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_creators_user ON public.saved_creators(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_creators_creator ON public.saved_creators(creator_id);

-- ---- marketplace_media ----
CREATE TABLE IF NOT EXISTS public.marketplace_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  -- Reference context
  project_id uuid REFERENCES public.marketplace_projects(id) ON DELETE SET NULL,
  delivery_id uuid REFERENCES public.project_deliveries(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.marketplace_campaigns(id) ON DELETE SET NULL,
  portfolio_item_id uuid REFERENCES public.portfolio_items(id) ON DELETE SET NULL,
  -- File info
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'video',
  file_size_bytes bigint,
  mime_type text,
  thumbnail_url text,
  -- Bunny CDN specific
  bunny_video_id text,
  bunny_library_id text,
  cdn_url text,
  encoding_status text DEFAULT 'pending' CHECK (encoding_status IN ('pending', 'processing', 'completed', 'failed')),
  -- Video metadata
  duration_seconds integer,
  width integer,
  height integer,
  aspect_ratio text,
  -- Metadata
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON public.marketplace_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_project ON public.marketplace_media(project_id);
CREATE INDEX IF NOT EXISTS idx_media_delivery ON public.marketplace_media(delivery_id);
CREATE INDEX IF NOT EXISTS idx_media_bunny_id ON public.marketplace_media(bunny_video_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Auto-update updated_at on all new tables
CREATE OR REPLACE TRIGGER trigger_creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON public.marketplace_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.marketplace_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_deliveries_updated_at
  BEFORE UPDATE ON public.project_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON public.creator_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-generate slug for creator_profiles
CREATE OR REPLACE FUNCTION public.auto_creator_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_slug(NEW.display_name, 'creator_profiles');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_auto_creator_profile_slug
  BEFORE INSERT ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_creator_profile_slug();

-- Auto-generate slug for campaigns
CREATE OR REPLACE FUNCTION public.auto_campaign_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_slug(NEW.title, 'marketplace_campaigns');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_auto_campaign_slug
  BEFORE INSERT ON public.marketplace_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.auto_campaign_slug();

-- Update creator rating when a review is created/updated
CREATE OR REPLACE FUNCTION public.update_creator_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.creator_profiles
  SET
    rating_avg = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
      FROM public.creator_reviews
      WHERE creator_id = COALESCE(NEW.creator_id, OLD.creator_id)
        AND is_public = true
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.creator_reviews
      WHERE creator_id = COALESCE(NEW.creator_id, OLD.creator_id)
        AND is_public = true
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.creator_id, OLD.creator_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_creator_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.creator_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_creator_rating();

-- Update campaign application count
CREATE OR REPLACE FUNCTION public.update_campaign_application_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.marketplace_campaigns
  SET
    applications_count = (
      SELECT COUNT(*)
      FROM public.campaign_applications
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    approved_count = (
      SELECT COUNT(*)
      FROM public.campaign_applications
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
        AND status IN ('approved', 'assigned', 'delivered', 'completed')
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_campaign_application_count
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_application_count();

-- Update project deliverables count
CREATE OR REPLACE FUNCTION public.update_project_deliverables_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.marketplace_projects
  SET
    deliverables_count = (
      SELECT COUNT(*)
      FROM public.project_deliveries
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ),
    deliverables_approved = (
      SELECT COUNT(*)
      FROM public.project_deliveries
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND status = 'approved'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_project_deliverables_count
  AFTER INSERT OR UPDATE OR DELETE ON public.project_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_project_deliverables_count();

-- ============================================
-- 5. ENABLE RLS ON ALL NEW TABLES
-- ============================================

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_media ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- ---- creator_profiles ----
CREATE POLICY "Creator profiles are publicly readable"
  ON public.creator_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own creator profile"
  ON public.creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creator profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creator profile"
  ON public.creator_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ---- portfolio_items ----
CREATE POLICY "Public portfolio items are readable"
  ON public.portfolio_items FOR SELECT
  USING (
    is_public = true
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = portfolio_items.creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can insert their portfolio items"
  ON public.portfolio_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = portfolio_items.creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update their portfolio items"
  ON public.portfolio_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = portfolio_items.creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete their portfolio items"
  ON public.portfolio_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = portfolio_items.creator_id AND cp.user_id = auth.uid()
    )
  );

-- ---- marketplace_campaigns ----
CREATE POLICY "Active campaigns are publicly readable"
  ON public.marketplace_campaigns FOR SELECT
  USING (
    status IN ('active', 'in_progress', 'completed')
    OR public.is_brand_member(brand_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "Brand members can create campaigns"
  ON public.marketplace_campaigns FOR INSERT
  WITH CHECK (
    public.is_brand_member(brand_id)
    AND auth.uid() = created_by
  );

CREATE POLICY "Brand admins can update campaigns"
  ON public.marketplace_campaigns FOR UPDATE
  USING (public.is_brand_admin(brand_id) OR created_by = auth.uid())
  WITH CHECK (public.is_brand_admin(brand_id) OR created_by = auth.uid());

CREATE POLICY "Brand admins can delete draft campaigns"
  ON public.marketplace_campaigns FOR DELETE
  USING (
    public.is_brand_admin(brand_id)
    AND status = 'draft'
  );

-- ---- campaign_applications ----
CREATE POLICY "Applications visible to campaign brand and applicant"
  ON public.campaign_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = campaign_applications.creator_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_applications.campaign_id
        AND public.is_brand_member(mc.brand_id)
    )
  );

CREATE POLICY "Creators can apply to campaigns"
  ON public.campaign_applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = campaign_applications.creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Applicants and brand members can update applications"
  ON public.campaign_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = campaign_applications.creator_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_applications.campaign_id
        AND public.is_brand_member(mc.brand_id)
    )
  );

CREATE POLICY "Creators can withdraw their applications"
  ON public.campaign_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = campaign_applications.creator_id AND cp.user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- ---- marketplace_projects ----
CREATE POLICY "Project participants can view projects"
  ON public.marketplace_projects FOR SELECT
  USING (public.is_project_participant(id));

CREATE POLICY "Brand members can create projects"
  ON public.marketplace_projects FOR INSERT
  WITH CHECK (public.is_brand_member(brand_id));

CREATE POLICY "Project participants can update projects"
  ON public.marketplace_projects FOR UPDATE
  USING (public.is_project_participant(id));

-- No DELETE policy - projects are never deleted, only cancelled

-- ---- project_deliveries ----
CREATE POLICY "Project participants can view deliveries"
  ON public.project_deliveries FOR SELECT
  USING (public.is_project_participant(project_id));

CREATE POLICY "Creators can upload deliveries"
  ON public.project_deliveries FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their deliveries"
  ON public.project_deliveries FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM public.marketplace_projects mp
      WHERE mp.id = project_deliveries.project_id
        AND public.is_brand_member(mp.brand_id)
    )
  );

-- ---- creator_reviews ----
CREATE POLICY "Public reviews are readable"
  ON public.creator_reviews FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = reviewer_id
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_reviews.creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reviews for their projects"
  ON public.creator_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND public.is_project_participant(project_id)
  );

CREATE POLICY "Reviewers can update their reviews"
  ON public.creator_reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Creators can respond to their reviews"
  ON public.creator_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_reviews.creator_id AND cp.user_id = auth.uid()
    )
  );

-- ---- saved_creators ----
CREATE POLICY "Users can view their saved creators"
  ON public.saved_creators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save creators"
  ON public.saved_creators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their saved creators"
  ON public.saved_creators FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unsave creators"
  ON public.saved_creators FOR DELETE
  USING (auth.uid() = user_id);

-- ---- marketplace_media ----
CREATE POLICY "Media visible to uploader and project participants"
  ON public.marketplace_media FOR SELECT
  USING (
    auth.uid() = uploaded_by
    OR is_public = true
    OR (project_id IS NOT NULL AND public.is_project_participant(project_id))
  );

CREATE POLICY "Authenticated users can upload media"
  ON public.marketplace_media FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can update their media"
  ON public.marketplace_media FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can delete their media"
  ON public.marketplace_media FOR DELETE
  USING (auth.uid() = uploaded_by);

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.creator_profiles TO authenticated;
GRANT ALL ON public.portfolio_items TO authenticated;
GRANT ALL ON public.marketplace_campaigns TO authenticated;
GRANT ALL ON public.campaign_applications TO authenticated;
GRANT ALL ON public.marketplace_projects TO authenticated;
GRANT ALL ON public.project_deliveries TO authenticated;
GRANT ALL ON public.creator_reviews TO authenticated;
GRANT ALL ON public.saved_creators TO authenticated;
GRANT ALL ON public.marketplace_media TO authenticated;

-- Read-only for anon (public profiles, portfolio, campaigns)
GRANT SELECT ON public.creator_profiles TO anon;
GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT ON public.marketplace_campaigns TO anon;
GRANT SELECT ON public.creator_reviews TO anon;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_slug(text, text) TO authenticated;
