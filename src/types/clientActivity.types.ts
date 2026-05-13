export type ClientActivityStatus = 'active' | 'inactive' | 'prospect';

export interface ClientActivityMetrics {
  client_id: string;
  client_name: string;
  activity_status: ClientActivityStatus;
  total_packages: number;
  total_content_purchased: number;
  total_content_approved: number;
  pending_content_count: number;
  // Incorporación
  joined_at: string;
  // Paquetes
  first_package_at: string | null;
  last_package_at: string | null;
  // Contenido
  first_content_created_at: string | null;
  last_content_created_at: string | null;
  last_delivery_at: string | null;
  last_approved_at: string | null;
  // Inactividad
  inactive_since: string | null;
  days_inactive: number | null;
  days_as_client: number;
}

export const ACTIVITY_STATUS_LABELS: Record<ClientActivityStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  prospect: 'Prospecto',
};

export const ACTIVITY_STATUS_COLORS: Record<ClientActivityStatus, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  inactive: 'bg-red-500/15 text-red-400 border-red-500/30',
  prospect: 'bg-muted/50 text-muted-foreground border-border',
};
