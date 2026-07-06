import { Content, ContentStatus, STATUS_ORDER } from "@/types/database";

// Helper types for movement rules
export interface StatusRule {
  status_id: string;
  can_advance_roles: string[];
  can_retreat_roles: string[];
  can_view_roles: string[];
}

export interface OrgStatus {
  id: string;
  status_key: string;
  sort_order: number;
}

// Lógica legacy como fallback
export const canMoveToStatusLegacy = (
  role: string,
  currentStatus: ContentStatus | string,
  targetStatus: ContentStatus | string,
  content: Content,
  userId: string
): boolean => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus as ContentStatus);
  const targetIndex = STATUS_ORDER.indexOf(targetStatus as ContentStatus);

  // Admin and management roles can move anything
  if (role === 'admin' || role === 'strategist' || role === 'team_leader' || role === 'trafficker') return true;

  if (role === 'client') {
    if (currentStatus === 'draft' && targetStatus === 'script_approved') return true;
    if (currentStatus === 'delivered' && targetStatus === 'approved') return true;
    if (currentStatus === 'delivered' && targetStatus === 'issue') return true;
    return false;
  }

  if (role === 'creator') {
    if (content.creator_id !== userId) return false;
    if (targetStatus === 'paid' || targetStatus === 'approved') return false;
    if (targetIndex <= currentIndex) return false;
    if (currentStatus === 'assigned' && targetStatus === 'recording') return true;
    if (currentStatus === 'recording' && targetStatus === 'recorded') return true;
    return false;
  }

  if (role === 'editor') {
    if (content.editor_id !== userId) return false;
    if (targetStatus === 'paid' || targetStatus === 'approved') return false;
    // Permitir movimientos desde estados de edición hacia adelante o retroceder a edición
    const editorStates = ['recorded', 'editing', 'delivered', 'issue', 'corrected', 'review'];
    if (editorStates.includes(currentStatus as string) && editorStates.includes(targetStatus as string)) {
      return true;
    }
    // Fallback: permitir avance desde recorded/editing
    if (currentStatus === 'recorded' && targetStatus === 'editing') return true;
    if (currentStatus === 'editing' && targetStatus === 'delivered') return true;
    return false;
  }

  return false;
};

// Verificar si un movimiento de estado es válido según el rol y las reglas configuradas
// Ahora acepta múltiples roles para usuarios con permisos combinados (ej: creator + editor)
export const canMoveToStatusWithRules = (
  role: string,
  currentStatus: ContentStatus | string,
  targetStatus: ContentStatus | string,
  content: Content,
  userId: string,
  orgStatuses: OrgStatus[],
  rules: StatusRule[],
  allUserRoles?: string[] // Opcional: todos los roles del usuario para verificación combinada
): boolean => {
  // Admin siempre puede mover
  if (role === 'admin' || allUserRoles?.includes('admin')) return true;

  // Encontrar los estados en la configuración de la organización
  const currentOrgStatus = orgStatuses.find(s => s.status_key === currentStatus);
  const targetOrgStatus = orgStatuses.find(s => s.status_key === targetStatus);

  // Si no hay configuración de estados, usar lógica legacy
  if (!currentOrgStatus || !targetOrgStatus || rules.length === 0) {
    // Para usuarios con múltiples roles, verificar si ALGÚN rol tiene permiso
    if (allUserRoles && allUserRoles.length > 1) {
      return allUserRoles.some(r => canMoveToStatusLegacy(r, currentStatus, targetStatus, content, userId));
    }
    return canMoveToStatusLegacy(role, currentStatus, targetStatus, content, userId);
  }

  // Buscar las reglas para el estado actual
  const currentRule = rules.find(r => r.status_id === currentOrgStatus.id);

  // Si no hay regla para el estado actual, permitir por defecto
  if (!currentRule) {
    return true;
  }

  // Determinar si es avance o retroceso basado en sort_order
  const isForward = targetOrgStatus.sort_order > currentOrgStatus.sort_order;

  // Roles a verificar (rol primario + todos los roles si están disponibles)
  const rolesToCheck = allUserRoles && allUserRoles.length > 0 ? allUserRoles : [role];

  // Verificar permisos según dirección desde el estado actual
  if (isForward) {
    const canAdvanceRoles = currentRule.can_advance_roles || [];
    if (canAdvanceRoles.length === 0) return true; // Sin restricciones
    return rolesToCheck.some(r => canAdvanceRoles.includes(r));
  } else {
    const canRetreatRoles = currentRule.can_retreat_roles || [];
    if (canRetreatRoles.length === 0) return true; // Sin restricciones
    return rolesToCheck.some(r => canRetreatRoles.includes(r));
  }
};
