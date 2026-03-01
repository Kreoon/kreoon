// ============================================================================
// KREOON LIVE HOSTING TYPES
// Tipos TypeScript para el sistema de contratación de hosts
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type HostingChannel = 'marketplace' | 'direct' | 'org_managed';

export type HostingRequestStatus =
  | 'draft'
  | 'pending_payment'
  | 'open'
  | 'reviewing'
  | 'host_selected'
  | 'negotiating'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type HostStatus =
  | 'invited'
  | 'applied'
  | 'shortlisted'
  | 'selected'
  | 'counter_offered'
  | 'negotiating'
  | 'confirmed'
  | 'rejected'
  | 'withdrawn'
  | 'completed'
  | 'no_show';

export type StreamingSessionType =
  | 'standard'
  | 'live_shopping'
  | 'interview'
  | 'webinar'
  | 'launch'
  | 'multi_creator';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface LiveHostingRequest {
  id: string;
  channel: HostingChannel;
  organization_id: string;
  client_id?: string | null;
  brand_id?: string | null;
  created_by: string;

  // Info básica
  title: string;
  description?: string | null;
  requirements: string[];
  preferred_niches: string[];
  preferred_languages: string[];

  // Programación
  scheduled_date: string; // DATE
  scheduled_time_start: string; // TIME
  scheduled_time_end?: string | null;
  timezone: string;
  estimated_duration_minutes: number;

  // Configuración del live
  live_type: StreamingSessionType;
  products_to_showcase: string[];
  target_audience?: string | null;
  content_guidelines?: string | null;

  // Presupuesto
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  fixed_rate_usd?: number | null;
  commission_on_sales_pct?: number | null;

  // Comisiones
  platform_commission_rate: number;
  org_markup_rate: number;
  org_markup_amount_usd: number;

  // Estado
  status: HostingRequestStatus;

  // Relaciones
  streaming_session_id?: string | null;
  escrow_hold_id?: string | null;
  campaign_id?: string | null;
  template_id?: string | null;

  // Métricas post-live
  actual_duration_minutes?: number | null;
  actual_revenue_usd?: number | null;
  actual_orders?: number | null;
  host_rating?: number | null;
  client_rating?: number | null;

  // Metadata
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface LiveHostingHost {
  id: string;
  request_id: string;
  user_id: string;
  creator_profile_id?: string | null;

  // Estado
  status: HostStatus;

  // Propuesta económica
  proposed_rate_usd?: number | null;
  agreed_rate_usd?: number | null;
  commission_on_sales_pct?: number | null;

  // Negociación
  counter_offer_usd?: number | null;
  counter_offer_message?: string | null;
  counter_offer_at?: string | null;

  // Aplicación
  application_message?: string | null;
  portfolio_links: string[];
  experience_description?: string | null;

  // Evaluación
  fit_score: number;
  shortlist_notes?: string | null;
  rejection_reason?: string | null;

  // Post-live
  actual_performance_score?: number | null;
  host_feedback?: string | null;
  client_feedback?: string | null;

  // Pago
  payment_status: string;
  payment_released_at?: string | null;

  created_at: string;
  updated_at: string;
}

export interface LiveHostingStatusHistory {
  id: string;
  request_id: string;
  host_id?: string | null;
  entity_type: 'request' | 'host';
  from_status?: string | null;
  to_status: string;
  changed_by?: string | null;
  change_reason?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LiveHostingTemplate {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  default_channel: HostingChannel;
  default_requirements: string[];
  default_niches: string[];
  default_duration_minutes: number;
  default_budget_min_usd?: number | null;
  default_budget_max_usd?: number | null;
  default_live_type: StreamingSessionType;
  default_content_guidelines?: string | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXTENDED TYPES (con joins)
// ============================================================================

export interface LiveHostingRequestWithRelations extends LiveHostingRequest {
  organization?: {
    id: string;
    name: string;
  };
  client?: {
    id: string;
    name: string;
  } | null;
  brand?: {
    id: string;
    name: string;
  } | null;
  streaming_session?: {
    id: string;
    status: string;
    scheduled_at: string;
  } | null;
  hosts?: LiveHostingHost[];
}

export interface LiveHostingHostWithProfile extends LiveHostingHost {
  full_name?: string | null;
  avatar_url?: string | null;
  creator_slug?: string | null;
  creator_bio?: string | null;
  creator_rating?: number | null;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface CreateHostingRequestPayload {
  channel: HostingChannel;
  organization_id: string;
  client_id?: string;
  brand_id?: string;
  title: string;
  description?: string;
  requirements?: string[];
  preferred_niches?: string[];
  preferred_languages?: string[];
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end?: string;
  timezone?: string;
  estimated_duration_minutes?: number;
  live_type?: StreamingSessionType;
  products_to_showcase?: string[];
  target_audience?: string;
  content_guidelines?: string;
  budget_min_usd?: number;
  budget_max_usd?: number;
  fixed_rate_usd?: number;
  commission_on_sales_pct?: number;
  org_markup_rate?: number;
  template_id?: string;
}

export interface UpdateHostingRequestPayload {
  request_id: string;
  updates: Partial<CreateHostingRequestPayload>;
}

export interface InviteHostPayload {
  request_id: string;
  user_id: string;
  proposed_rate_usd?: number;
  commission_on_sales_pct?: number;
  message?: string;
}

export interface ApplyAsHostPayload {
  request_id: string;
  proposed_rate_usd?: number;
  commission_on_sales_pct?: number;
  application_message?: string;
  portfolio_links?: string[];
  experience_description?: string;
}

export interface CounterOfferPayload {
  host_id: string;
  counter_offer_usd: number;
  message?: string;
}

export interface ReviewHostPayload {
  host_id: string;
  action: 'shortlist' | 'select' | 'reject';
  notes?: string;
  reason?: string;
}

export interface RespondToInvitationPayload {
  host_id: string;
  accept: boolean;
  message?: string;
}

export interface FinalizeNegotiationPayload {
  host_id: string;
  agreed_rate_usd: number;
  accept_counter?: boolean;
}

export interface AssignInternalHostPayload {
  request_id: string;
  user_id: string;
  agreed_rate_usd: number;
  commission_on_sales_pct?: number;
}

export interface SetClientPricePayload {
  request_id: string;
  client_price_usd: number;
  org_markup_rate: number;
  org_markup_amount: number;
}

export interface EndLivePayload {
  request_id: string;
  actual_duration_minutes?: number;
  actual_revenue_usd?: number;
  actual_orders?: number;
}

export interface SubmitHostReviewPayload {
  request_id: string;
  host_rating: number;
  client_feedback?: string;
}

export interface CompleteHostingPayload {
  request_id: string;
  client_rating?: number;
  host_feedback?: string;
}

export interface ListRequestsFilters {
  organization_id?: string;
  channel?: HostingChannel;
  statuses?: HostingRequestStatus[];
  as_host?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface LiveHostingServiceResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface CreateRequestResponse {
  success: boolean;
  request_id: string;
  channel: HostingChannel;
  status: HostingRequestStatus;
}

export interface ApplyAsHostResponse {
  success: boolean;
  host_id: string;
  status: HostStatus;
}

export interface ReviewHostResponse {
  success: boolean;
  host_id: string;
  new_status: HostStatus;
}

export interface InviteHostResponse {
  success: boolean;
  host_id: string;
  status: HostStatus;
  message: string;
}

export interface NegotiationResponse {
  success: boolean;
  host_id: string;
  accepted?: boolean;
  agreed_rate_usd?: number;
  status: string;
  next_step?: string | null;
}

export interface CheckoutResponse {
  success: boolean;
  escrow_id: string;
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

export interface OrgMarkupBreakdown {
  host_rate_usd: number;
  org_markup_rate: number;
  org_markup_amount: number;
  client_price_usd: number;
  platform_fee_rate: number;
  platform_fee_usd: number;
  org_net_profit_usd: number;
}

export interface CalculateOrgMarkupResponse {
  success: boolean;
  breakdown: OrgMarkupBreakdown;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface HostingRequestFormState {
  step: number;
  channel: HostingChannel;
  basicInfo: {
    title: string;
    description: string;
    requirements: string[];
  };
  scheduling: {
    scheduled_date: Date | null;
    scheduled_time_start: string;
    scheduled_time_end: string;
    timezone: string;
    estimated_duration_minutes: number;
  };
  configuration: {
    live_type: StreamingSessionType;
    products_to_showcase: string[];
    target_audience: string;
    content_guidelines: string;
    preferred_niches: string[];
    preferred_languages: string[];
  };
  budget: {
    budget_type: 'range' | 'fixed' | 'commission';
    budget_min_usd: number;
    budget_max_usd: number;
    fixed_rate_usd: number;
    commission_on_sales_pct: number;
  };
  // Canal C específico
  orgManagement?: {
    client_id: string;
    org_markup_rate: number;
    client_price_usd: number;
    assigned_host_id?: string;
  };
}

export interface HostApplicationFormState {
  proposed_rate_usd: number;
  commission_on_sales_pct: number;
  application_message: string;
  portfolio_links: string[];
  experience_description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const HOSTING_CHANNEL_LABELS: Record<HostingChannel, string> = {
  marketplace: 'Marketplace',
  direct: 'Invitación Directa',
  org_managed: 'Gestionado por Org',
};

export const HOSTING_REQUEST_STATUS_LABELS: Record<HostingRequestStatus, string> = {
  draft: 'Borrador',
  pending_payment: 'Pendiente de Pago',
  open: 'Abierto',
  reviewing: 'Revisando Aplicaciones',
  host_selected: 'Host Seleccionado',
  negotiating: 'En Negociación',
  confirmed: 'Confirmado',
  in_progress: 'En Vivo',
  completed: 'Completado',
  cancelled: 'Cancelado',
  disputed: 'En Disputa',
};

export const HOST_STATUS_LABELS: Record<HostStatus, string> = {
  invited: 'Invitado',
  applied: 'Aplicó',
  shortlisted: 'Preseleccionado',
  selected: 'Seleccionado',
  counter_offered: 'Contraoferta',
  negotiating: 'Negociando',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
  completed: 'Completado',
  no_show: 'No Asistió',
};

export const HOSTING_REQUEST_STATUS_COLORS: Record<HostingRequestStatus, string> = {
  draft: 'gray',
  pending_payment: 'yellow',
  open: 'blue',
  reviewing: 'purple',
  host_selected: 'indigo',
  negotiating: 'orange',
  confirmed: 'teal',
  in_progress: 'red',
  completed: 'green',
  cancelled: 'gray',
  disputed: 'red',
};

export const HOST_STATUS_COLORS: Record<HostStatus, string> = {
  invited: 'blue',
  applied: 'cyan',
  shortlisted: 'purple',
  selected: 'indigo',
  counter_offered: 'orange',
  negotiating: 'yellow',
  confirmed: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  completed: 'emerald',
  no_show: 'red',
};

export const COMMISSION_RATES_BY_CHANNEL: Record<HostingChannel, number> = {
  marketplace: 0.20,
  direct: 0.20,
  org_managed: 0.12,
};
