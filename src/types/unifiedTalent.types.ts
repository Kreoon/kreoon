import type { CreatorRelationshipType } from './crm.types';

export type TalentSource = 'internal' | 'external' | 'both';

export interface UnifiedTalentMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  source: TalentSource;
  // Internal fields (null if external-only)
  org_role: string | null;    // primary role (highest priority)
  all_roles: string[] | null; // all roles for this member
  is_owner: boolean;
  content_count: number;
  is_ambassador: boolean;
  ambassador_level: string | null;
  quality_score_avg: number | null;
  reliability_score: number | null;
  velocity_score: number | null;
  ai_recommended_level: string | null;
  ai_risk_flag: string | null;
  active_tasks: number;
  up_points: number;
  up_level: string | null;
  avg_star_rating: number | null;
  rated_content_count: number;
  // External CRM fields (null if internal-only)
  relationship_id: string | null;
  relationship_type: CreatorRelationshipType | null;
  times_worked_together: number;
  total_paid: number;
  average_rating_given: number | null;
  last_collaboration_at: string | null;
  internal_notes: string | null;
  internal_tags: string[] | null;
  list_name: string | null;
  // Marketplace fields (null if no creator_profile)
  creator_profile_id: string | null;
  categories: string[] | null;
  content_types: string[] | null;
  platforms: string[] | null;
  slug: string | null;
}
