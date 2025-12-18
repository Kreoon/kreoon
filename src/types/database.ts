export type AppRole = 'admin' | 'creator' | 'editor' | 'client';

export type ContentStatus = 
  | 'draft' 
  | 'script_pending' 
  | 'script_approved' 
  | 'recording' 
  | 'editing' 
  | 'review' 
  | 'approved' 
  | 'rejected' 
  | 'paid';

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
  client_id: string | null;
  creator_id: string | null;
  editor_id: string | null;
  status: ContentStatus;
  is_ambassador_content: boolean;
  script: string | null;
  script_approved_at: string | null;
  script_approved_by: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  deadline: string | null;
  creator_payment: number;
  editor_payment: number;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  creator?: Profile;
  editor?: Profile;
}

export interface ContentComment {
  id: string;
  content_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: Profile;
}

export interface ContentHistory {
  id: string;
  content_id: string;
  user_id: string | null;
  old_status: ContentStatus | null;
  new_status: ContentStatus;
  notes: string | null;
  created_at: string;
  user?: Profile;
}

export interface Payment {
  id: string;
  user_id: string;
  content_id: string | null;
  amount: number;
  payment_type: 'creator' | 'editor';
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  content?: Content;
  user?: Profile;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Borrador',
  script_pending: 'Guión Pendiente',
  script_approved: 'Guión Aprobado',
  recording: 'En Grabación',
  editing: 'En Edición',
  review: 'En Revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paid: 'Pagado'
};

export const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  script_pending: 'bg-warning/20 text-warning',
  script_approved: 'bg-info/20 text-info',
  recording: 'bg-primary/20 text-primary',
  editing: 'bg-purple-500/20 text-purple-500',
  review: 'bg-orange-500/20 text-orange-500',
  approved: 'bg-success/20 text-success',
  rejected: 'bg-destructive/20 text-destructive',
  paid: 'bg-emerald-500/20 text-emerald-500'
};
