export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  country: string;
  city: string | null;
  nit: string | null;
  plan: string;
  is_verified: boolean;
  owner_id: string;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandMember {
  id: string;
  brand_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'rejected';
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandMemberWithProfile extends BrandMember {
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface CreateBrandInput {
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  nit?: string;
}
