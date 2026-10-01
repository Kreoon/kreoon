import type { Content, ContentStatus } from "@/types/database";
import type { ContentSocialStatus } from "@/modules/social/hooks/useContentSocialStatus";

export type KanbanDensity = "comfortable" | "compact";

export interface BoardColumnDef {
  status: string;
  title: string;
  /** Color de la etapa (hex de organization_statuses o fallback). Solo decorativo: nunca es el único portador de información. */
  color: string;
  sortOrder: number;
}

export interface AssignableUserLite {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export type AssigneeKind = "creator" | "editor";
export type ShareMode = "full" | "quick";

/**
 * Contexto ESTABLE de la tarjeta: se memoiza en el contenedor para que `React.memo`
 * de las tarjetas no se invalide en cada render (nada de callbacks inline por tarjeta).
 */
export interface KanbanCardContext {
  columns: BoardColumnDef[];
  userId?: string | null;
  userRole: string | null;
  /** admin / team_leader con handlers de asignación disponibles */
  canAssign: boolean;
  creators: AssignableUserLite[];
  editors: AssignableUserLite[];
  /** Estados a los que el usuario puede mover esta producción (reglas de la organización). Se calcula al abrir el menú. */
  getMoveTargets: (content: Content) => BoardColumnDef[];
  onOpen: (content: Content) => void;
  onMove: (contentId: string, targetStatus: string) => void;
  /** Botones rápidos por rol (Iniciar grabación, Entregar, Aprobar…). */
  onQuickStatus: (contentId: string, status: ContentStatus) => Promise<void>;
  onAssign?: (kind: AssigneeKind, contentId: string, userId: string) => Promise<void>;
  onShare: (content: Content, mode: ShareMode) => void;
  onAnalyze?: (contentId: string, title: string) => void;
}

export type { ContentSocialStatus };
