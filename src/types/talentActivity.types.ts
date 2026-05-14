export type TalentActivityStatus = 'active' | 'inactive';

export interface TalentActivityMetrics {
  talent_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  org_role: string | null;
  joined_at: string;
  activity_status: TalentActivityStatus;
  active_content_count: number;
  pending_payment_count: number;
  pending_payment_amount: number;
  total_content_count: number;
  last_delivery_at: string | null;
  last_assigned_at: string | null;
  last_approved_at: string | null;
  first_content_at: string | null;
  days_since_last_delivery: number | null;
  days_on_team: number;
}

export const TALENT_ACTIVITY_LABELS: Record<TalentActivityStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
};

export const TALENT_ACTIVITY_COLORS: Record<TalentActivityStatus, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
};
