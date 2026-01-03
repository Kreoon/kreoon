import { STATUS_COLORS, STATUS_LABELS, ContentStatus } from "@/types/database";

// Organization status interface
export interface OrganizationStatus {
  id: string;
  status_key: string;
  label: string;
  color: string;
  sort_order: number;
}

/**
 * Get status label from organization config or fallback to hardcoded
 */
export function getStatusLabel(
  status: ContentStatus,
  organizationStatuses: OrganizationStatus[] = []
): string {
  const orgStatus = organizationStatuses.find(s => s.status_key === status);
  return orgStatus?.label || STATUS_LABELS[status] || status;
}

/**
 * Get status color style for inline styling
 * Returns null if should use fallback CSS classes
 */
export function getStatusColorStyle(
  status: ContentStatus,
  organizationStatuses: OrganizationStatus[] = []
): React.CSSProperties | null {
  const orgStatus = organizationStatuses.find(s => s.status_key === status);
  if (orgStatus?.color) {
    return {
      backgroundColor: `${orgStatus.color}20`,
      color: orgStatus.color
    };
  }
  return null;
}

/**
 * Get fallback CSS class for status (when no org config)
 */
export function getStatusFallbackClass(
  status: ContentStatus,
  organizationStatuses: OrganizationStatus[] = []
): string {
  const orgStatus = organizationStatuses.find(s => s.status_key === status);
  if (orgStatus?.color) {
    return ''; // Will use inline style instead
  }
  return STATUS_COLORS[status] || '';
}

/**
 * Calculate progress based on organization statuses or fallback
 */
export function getStatusProgress(
  status: ContentStatus,
  organizationStatuses: OrganizationStatus[] = []
): number {
  if (organizationStatuses.length > 0) {
    const currentStatusConfig = organizationStatuses.find(s => s.status_key === status);
    if (currentStatusConfig) {
      const maxOrder = Math.max(...organizationStatuses.map(s => s.sort_order));
      if (maxOrder === 0) return 0;
      return Math.round((currentStatusConfig.sort_order / maxOrder) * 100);
    }
  }
  // Fallback to hardcoded values
  const statusProgress: Record<string, number> = {
    'draft': 5, 'pending_script': 10, 'script_review': 20, 'script_approved': 30,
    'assigned': 40, 'recording': 50, 'recorded': 60, 'editing': 70,
    'delivered': 80, 'corrected': 80, 'issue': 75, 'approved': 90, 'paid': 100
  };
  return statusProgress[status] || 0;
}
