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

/** Roles que gestionan la producción: pueden mover cualquier tarjeta (salvo poner «Archivado») */
const MANAGEMENT_ROLES = new Set(['strategist', 'digital_strategist', 'creative_strategist', 'team_leader', 'trafficker']);

/** Movimientos permitidos «origen>destino» por rol de producción, siempre sobre sus propios videos */
const PRODUCTION_MOVES: Record<string, string[]> = {
  creator: ['assigned>recording', 'recording>recorded', 'issue>corrected'],
  editor: ['recorded>editing', 'editing>delivered', 'issue>corrected'],
  client: ['draft>script_approved', 'script_pending>script_approved', 'delivered>approved', 'delivered>issue'],
};

/** content_creator (canónico) y creator (legado) son el mismo rol para el tablero */
const normalizeBoardRole = (r: string): string => (r === 'content_creator' ? 'creator' : r);

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
  // «Archivado» es automático (aprobado por el cliente + pagos completos): nadie lo pone a mano.
  // La base de datos también lo rechaza (fn_content_archive_rule).
  if (targetStatus === 'archived' && currentStatus !== 'archived') return false;

  // Admin siempre puede mover
  if (role === 'admin' || allUserRoles?.includes('admin')) return true;

  // Mapa fijo para roles de producción (aprobado por Alexander, 2026-10-01). Manda sobre las reglas
  // configurables, que solo miraban la dirección (un creador podía saltar de «Entregado» a «Aprobado»)
  // y no revisaban si el video era suyo.
  const roles = (allUserRoles && allUserRoles.length > 0 ? allUserRoles : [role]).map(normalizeBoardRole);
  if (roles.some(r => MANAGEMENT_ROLES.has(r))) return true;
  const mapped = roles.filter(r => r in PRODUCTION_MOVES);
  if (mapped.length > 0) {
    const move = `${currentStatus}>${targetStatus}`;
    return mapped.some(r => {
      if (r === 'creator' && content.creator_id !== userId) return false;
      if (r === 'editor' && content.editor_id !== userId) return false;
      return PRODUCTION_MOVES[r].includes(move);
    });
  }

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
