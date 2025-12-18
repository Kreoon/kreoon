export type AppRole = 'admin' | 'creator' | 'editor' | 'client';

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
  | 'review'          // En Revisión (legacy)
  | 'approved'        // Aprobado
  | 'rejected'        // Rechazado (legacy)
  | 'paid';           // Pagado (legacy)

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  is_ambassador: boolean;
  portfolio_url: string | null;
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
  deadline: string | null;
  notes: string | null;
  script_approved_at: string | null;
  script_approved_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Nuevos campos
  product: string | null;
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
  // Relaciones
  client?: Client;
  creator?: Profile;
  editor?: Profile;
  strategist?: Profile;
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
  review: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
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
  'approved'
];

// Definición de columnas del Kanban
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
  { status: 'approved', title: 'Aprobado', color: 'bg-success' }
];
