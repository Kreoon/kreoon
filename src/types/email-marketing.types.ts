// ============================================================
// KREOON Email Marketing Types
// ============================================================

// ─── Enums / Constants ──────────────────────────────────

export type EmailCampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";
export type DripTriggerType = "manual" | "on_lead_created" | "on_contact_created" | "on_signup";
export type EnrollmentStatus = "active" | "completed" | "paused" | "unsubscribed" | "bounced";
export type EmailEventType = "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "failed";
export type TemplateCategory = "general" | "onboarding" | "marketing" | "transactional" | "notification";

export const CAMPAIGN_STATUS_LABELS: Record<EmailCampaignStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  sending: "Enviando",
  sent: "Enviada",
  cancelled: "Cancelada",
};

export const CAMPAIGN_STATUS_COLORS: Record<EmailCampaignStatus, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  sending: "bg-yellow-500/20 text-yellow-400",
  sent: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export const DRIP_TRIGGER_LABELS: Record<DripTriggerType, string> = {
  manual: "Manual",
  on_lead_created: "Nuevo Lead",
  on_contact_created: "Nuevo Contacto",
  on_signup: "Nuevo Registro",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: "Activo",
  completed: "Completado",
  paused: "Pausado",
  unsubscribed: "Desuscrito",
  bounced: "Rebotado",
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: "General",
  onboarding: "Onboarding",
  marketing: "Marketing",
  transactional: "Transaccional",
  notification: "Notificación",
};

// ─── Template Variable ──────────────────────────────────

export interface TemplateVariable {
  key: string;
  label: string;
  default_value: string;
}

// ─── Email Template ─────────────────────────────────────

export interface EmailTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: TemplateVariable[];
  category: TemplateCategory;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateInsert = Omit<EmailTemplate, "id" | "created_at" | "updated_at">;

// ─── Email Segment ──────────────────────────────────────

export interface SegmentFilterCriteria {
  contact_type?: string;
  tags?: string[];
  relationship_strength?: string;
  pipeline_stage?: string;
  lead_stage?: string;
  source?: string;
}

export interface EmailSegment {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  resend_segment_id: string | null;
  filter_criteria: SegmentFilterCriteria;
  contact_count: number;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailSegmentInsert = Omit<EmailSegment, "id" | "created_at" | "updated_at" | "contact_count" | "last_synced_at" | "resend_segment_id">;

// ─── Email Campaign ─────────────────────────────────────

export interface EmailCampaign {
  id: string;
  organization_id: string | null;
  name: string;
  subject: string;
  template_id: string | null;
  segment_id: string | null;
  html_body: string | null;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  status: EmailCampaignStatus;
  resend_broadcast_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  email_templates?: EmailTemplate;
  email_segments?: EmailSegment;
}

export type EmailCampaignInsert = Pick<
  EmailCampaign,
  "name" | "subject" | "template_id" | "segment_id" | "html_body" | "from_name" | "from_email" | "reply_to" | "scheduled_at"
>;

// ─── Drip Sequence ──────────────────────────────────────

export interface EmailDripSequence {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  trigger_type: DripTriggerType;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed / joined
  steps_count?: number;
  active_enrollments?: number;
}

export type EmailDripSequenceInsert = Omit<EmailDripSequence, "id" | "created_at" | "updated_at" | "steps_count" | "active_enrollments">;

// ─── Drip Step ──────────────────────────────────────────

export interface DripStepConditions {
  skip_if_opened_prev?: boolean;
  skip_if_clicked_prev?: boolean;
  skip_if_bounced?: boolean;
}

export interface EmailDripStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_minutes: number;
  template_id: string | null;
  subject_override: string | null;
  conditions: DripStepConditions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  email_templates?: EmailTemplate;
}

export type EmailDripStepInsert = Omit<EmailDripStep, "id" | "created_at" | "updated_at" | "email_templates">;

// ─── Drip Enrollment ────────────────────────────────────

export interface EnrollmentMetadata {
  source_table?: string;
  source_id?: string;
  first_name?: string;
  last_name?: string;
  properties?: Record<string, string>;
}

export interface EmailDripEnrollment {
  id: string;
  sequence_id: string;
  contact_email: string;
  contact_name: string | null;
  contact_metadata: EnrollmentMetadata;
  current_step: number;
  status: EnrollmentStatus;
  next_send_at: string | null;
  last_sent_at: string | null;
  resend_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Email Event ────────────────────────────────────────

export interface EmailEvent {
  id: string;
  campaign_id: string | null;
  enrollment_id: string | null;
  resend_email_id: string | null;
  event_type: EmailEventType;
  recipient_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Analytics ──────────────────────────────────────────

export interface CampaignAnalytics {
  delivery_rate: number; // delivered / sent
  open_rate: number;     // opened / delivered
  click_rate: number;    // clicked / opened
  bounce_rate: number;   // bounced / sent
  complaint_rate: number; // complained / delivered
}

export interface GlobalEmailAnalytics {
  total_campaigns: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  avg_open_rate: number;
  avg_click_rate: number;
  active_drip_enrollments: number;
  total_segments: number;
  total_contacts_synced: number;
}

// ─── Filters ────────────────────────────────────────────

export interface CampaignFilters {
  status?: EmailCampaignStatus;
  segment_id?: string;
  search?: string;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  search?: string;
}
