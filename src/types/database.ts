// Ambassador is now primarily a BADGE, not a role
// The role type still includes 'ambassador' for backward compatibility with existing data
// New implementations should use organization_member_badges table instead
export type AppRole = 'admin' | 'creator' | 'editor' | 'client' | 'ambassador' | 'strategist' | 'trafficker' | 'team_leader';

// Ambassador badge levels (new system - preferred)
export type AmbassadorLevel = 'bronze' | 'silver' | 'gold';

// Badge types available in the system
export type BadgeType = 'ambassador';

export type ContentStatus = 
  | 'draft'           // Creado
  | 'script_pending'  // Pendiente guión (legacy)
  | 'script_approved' // Guión Aprobado
  | 'assigned'        // Asignado
  | 'recording'       // En grabación
  | 'recorded'        // Grabado
  | 'editing'         // En Edición
  | 'delivered'       // Entregado
  | 'issue'           // Novedad
  | 'corrected'       // Corregido
  | 'review'          // En Revisión (legacy)
  | 'approved'        // Aprobado
  | 'rejected'        // Rechazado (legacy)
  | 'paid';           // Pagado (legacy)

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  is_ambassador: boolean;
  is_public: boolean | null;
  portfolio_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  city: string | null;
  address: string | null;
  document_type: string | null;
  document_number: string | null;
  current_organization_id: string | null;
  organization_status?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  notes: string | null;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
  onboarding_url: string | null;
  research_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Relations
  client?: Client;
}

export interface ClientPackage {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  total_value: number;
  content_quantity: number;
  hooks_per_video: number;
  creators_count: number;
  products_count: number;
  product_ids: string[];
  payment_status: PaymentStatus;
  paid_amount: number;
  paid_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  products?: Product[];
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  script: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: ContentStatus;
  client_id: string | null;
  creator_id: string | null;
  editor_id: string | null;
  creator_payment: number;
  editor_payment: number;
  is_ambassador_content: boolean;
  is_published: boolean;
  views_count: number;
  likes_count: number;
  deadline: string | null;
  notes: string | null;
  script_approved_at: string | null;
  script_approved_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Campos adicionales
  product: string | null;
  product_id: string | null;
  sales_angle: string | null;
  campaign_week: string | null;
  strategist_id: string | null;
  start_date: string | null;
  invoiced: boolean;
  drive_url: string | null;
  creator_assigned_at: string | null;
  editor_assigned_at: string | null;
  delivered_at: string | null;
  recorded_at: string | null;
  reference_url: string | null;
  creator_paid: boolean;
  editor_paid: boolean;
  // Bunny.net fields
  bunny_embed_url: string | null;
  video_processing_status: string | null;
  video_processing_started_at: string | null;
  hooks_count: number | null;
  video_urls: string[] | null;
  raw_video_urls: string[] | null;
  // Guidelines
  editor_guidelines: string | null;
  strategist_guidelines: string | null;
  trafficker_guidelines: string | null;
  // Relaciones
  client?: Partial<Client>;
  creator?: Partial<Profile>;
  editor?: Partial<Profile>;
  strategist?: Partial<Profile>;
  product_rel?: Partial<Product>;
}

export interface ContentComment {
  id: string;
  content_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface ContentHistory {
  id: string;
  content_id: string;
  user_id: string | null;
  old_status: ContentStatus | null;
  new_status: ContentStatus;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  content_id: string | null;
  amount: number;
  payment_type: 'creator' | 'editor';
  status: 'pending' | 'paid';
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

// Mapeo de estados a etiquetas en español
export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Creado',
  script_pending: 'Pendiente Guión',
  script_approved: 'Guión Aprobado',
  assigned: 'Asignado',
  recording: 'En Grabación',
  recorded: 'Grabado',
  editing: 'En Edición',
  delivered: 'Entregado',
  issue: 'Novedad',
  corrected: 'Corregido',
  review: 'En Revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paid: 'Pagado'
};

// Colores para cada estado
export const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  script_pending: 'bg-warning/10 text-warning',
  script_approved: 'bg-info/10 text-info',
  assigned: 'bg-purple-500/10 text-purple-500',
  recording: 'bg-orange-500/10 text-orange-500',
  recorded: 'bg-cyan-500/10 text-cyan-500',
  editing: 'bg-pink-500/10 text-pink-500',
  delivered: 'bg-emerald-500/10 text-emerald-500',
  issue: 'bg-destructive/10 text-destructive',
  corrected: 'bg-blue-500/10 text-blue-500',
  review: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  paid: 'bg-success/10 text-success'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado'
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  partial: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success'
};

// Estados en orden para el flujo del Kanban
export const STATUS_ORDER: ContentStatus[] = [
  'draft',
  'script_approved',
  'assigned',
  'recording',
  'recorded',
  'editing',
  'delivered',
  'issue',
  'corrected',
  'approved',
  'paid'
];

// Definición de columnas del Kanban (sin "paid" - se quita del flujo de trabajo)
export interface KanbanColumnDef {
  status: ContentStatus;
  title: string;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { status: 'draft', title: 'Creado', color: 'bg-muted-foreground' },
  { status: 'script_approved', title: 'Guión Aprobado', color: 'bg-info' },
  { status: 'assigned', title: 'Asignado', color: 'bg-purple-500' },
  { status: 'recording', title: 'En Grabación', color: 'bg-orange-500' },
  { status: 'recorded', title: 'Grabado', color: 'bg-cyan-500' },
  { status: 'editing', title: 'En Edición', color: 'bg-pink-500' },
  { status: 'delivered', title: 'Entregado', color: 'bg-emerald-500' },
  { status: 'issue', title: 'Novedad', color: 'bg-destructive' },
  { status: 'corrected', title: 'Corregido', color: 'bg-blue-500' },
  { status: 'approved', title: 'Aprobado', color: 'bg-success' }
];