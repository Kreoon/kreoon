import { useCallback, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useContentAnalytics } from "@/analytics";
import { canMoveToStatusWithRules, type OrgStatus, type StatusRule } from "@/lib/contentBoardPermissions";
import type { MoveContentResult } from "@/hooks/useContent";
import { STATUS_LABELS, type Content, type ContentStatus } from "@/types/database";
import { describeHidingFilter, type BoardClientFilters } from "./kanban/kanbanUtils";
import type { BoardColumnDef, ShareMode } from "./kanban/kanbanTypes";

interface UseContentMoveArgs {
  contentById: ReadonlyMap<string, Content>;
  columns: BoardColumnDef[];
  /** Usuario efectivo (el suplantado si hay impersonación) y rol/roles con los que se validan las reglas. */
  userId: string | undefined;
  primaryRole: string;
  roles: string[];
  orgStatuses: OrgStatus[];
  rules: StatusRule[];
  moveContentStatus: (contentId: string, newStatus: ContentStatus, expectedStatus: ContentStatus) => Promise<MoveContentResult>;
  filters: BoardClientFilters;
  onOpenDetail: (content: Content) => void;
  onShare: (content: Content, mode: ShareMode) => void;
}

/**
 * Cambios de estado del tablero. TODOS los caminos (arrastre, «Mover a…», acciones rápidas) pasan por
 * `moveContentStatus` → RPC update_content_status_rpc (con markLocalUpdate), y los tres primeros por
 * canMoveToStatusWithRules. Evita llamadas dobles (un movimiento por producción a la vez), explica
 * conflictos y fallos con mensajes accionables y avisa si la tarjeta sale de la vista filtrada.
 */
export function useContentMove({
  contentById,
  columns,
  userId,
  primaryRole,
  roles,
  orgStatuses,
  rules,
  moveContentStatus,
  filters,
  onOpenDetail,
  onShare,
}: UseContentMoveArgs) {
  const { toast } = useToast();
  const { trackContentApproved, trackContentRejected } = useContentAnalytics();
  const [movingIds, setMovingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Lecturas "vivas" sin invalidar los callbacks estables que se pasan a las tarjetas
  const live = useRef({ contentById, columns, userId, primaryRole, roles, orgStatuses, rules, filters, moveContentStatus, onOpenDetail, onShare, trackContentApproved, trackContentRejected, toast });
  live.current = { contentById, columns, userId, primaryRole, roles, orgStatuses, rules, filters, moveContentStatus, onOpenDetail, onShare, trackContentApproved, trackContentRejected, toast };
  const movingRef = useRef<Set<string>>(new Set());

  const stageLabel = useCallback((status: string) => {
    return live.current.columns.find((c) => c.status === status)?.title || STATUS_LABELS[status as ContentStatus] || status;
  }, []);

  const canMove = useCallback((content: Content, target: string): boolean => {
    const l = live.current;
    return canMoveToStatusWithRules(l.primaryRole, content.status, target, content, l.userId || "", l.orgStatuses, l.rules, l.roles);
  }, []);

  const getMoveTargets = useCallback(
    (content: Content): BoardColumnDef[] =>
      live.current.columns.filter((c) => c.status !== content.status && canMove(content, c.status)),
    [canMove],
  );

  const setMoving = (id: string, on: boolean) => {
    if (on) movingRef.current.add(id);
    else movingRef.current.delete(id);
    setMovingIds(new Set(movingRef.current));
  };

  const doMove = useCallback(
    async (id: string, target: string, opts: { checkRules: boolean }) => {
      const l = live.current;
      const { toast } = l;
      const item = l.contentById.get(id);
      if (!item) return;
      const from = item.status as string;
      if (from === target) return;
      const title = item.title || "producción";

      if (movingRef.current.has(id)) {
        toast({ title: "Este cambio todavía se está guardando", description: "Espera un momento antes de volver a moverla." });
        return;
      }
      if (opts.checkRules && !canMove(item, target)) {
        toast({
          title: "Movimiento no permitido",
          description: `Tu rol no puede mover «${title}» de ${stageLabel(from)} a ${stageLabel(target)}.`,
          variant: "destructive",
        });
        return;
      }

      setMoving(id, true);
      setPinnedId(id);
      const result = await l.moveContentStatus(id, target as ContentStatus, from as ContentStatus);
      setMoving(id, false);

      if (result.ok) {
        if (target === "approved") l.trackContentApproved({ content_id: id, reviewer_role: l.primaryRole || "client" });
        else if (target === "issue") l.trackContentRejected({ content_id: id, reviewer_role: l.primaryRole || "client", reason: "status_change" });

        const moved = { ...item, status: target } as Content;
        const hiddenBy = describeHidingFilter(moved, l.filters);
        if (hiddenBy) {
          toast({
            title: "Salió de la vista filtrada",
            description: `«${title}» ahora está en ${stageLabel(target)}, pero ${hiddenBy === "archived" ? "«Ocultar archivados» está activo y la oculta" : "los filtros activos la ocultan"}. El cambio sí se guardó.`,
            action: (
              <ToastAction altText={`Ver detalle de ${title}`} onClick={() => live.current.onOpenDetail(moved)}>
                Ver detalle
              </ToastAction>
            ),
            duration: 9000,
          });
        } else if (target === "approved") {
          toast({
            title: "Contenido aprobado",
            description: `«${title}» pasó a ${stageLabel(target)}. Puedes compartirlo en redes sociales.`,
            action: (
              <ToastAction altText="Compartir en redes" onClick={() => live.current.onShare(moved, "full")}>
                <Share2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Compartir
              </ToastAction>
            ),
            duration: 8000,
          });
        } else {
          toast({ title: "Estado actualizado", description: `«${title}» ahora está en ${stageLabel(target)}.` });
        }
        return;
      }

      if (result.reason === "conflict") {
        toast({
          title: "Otra persona ya la movió",
          description: `«${title}» ya está en ${stageLabel(result.serverStatus)}. No se hizo ningún cambio; el tablero se actualizó.`,
          variant: "destructive",
          duration: 9000,
        });
        return;
      }

      toast({
        title: "No se pudo mover",
        description: `«${title}» volvió a ${stageLabel(from)}. Revisa tu conexión e inténtalo de nuevo.`,
        variant: "destructive",
        action: (
          <ToastAction altText="Reintentar el movimiento" onClick={() => void doMove(id, target, opts)}>
            Reintentar
          </ToastAction>
        ),
        duration: 10000,
      });
    },
    [canMove, stageLabel],
  );

  /** Arrastre, teclado y «Mover a…»: validan reglas de la organización. */
  const requestMove = useCallback((id: string, target: string) => void doMove(id, target, { checkRules: true }), [doMove]);

  /** Acciones rápidas por rol (Iniciar grabación, Entregar, Aprobar…): flujo previo, sin la regla de columnas. */
  const quickStatus = useCallback(
    async (id: string, status: ContentStatus) => {
      await doMove(id, status, { checkRules: false });
    },
    [doMove],
  );

  return useMemo(
    () => ({ canMove, getMoveTargets, requestMove, quickStatus, movingIds, pinnedId, stageLabel }),
    [canMove, getMoveTargets, requestMove, quickStatus, movingIds, pinnedId, stageLabel],
  );
}
