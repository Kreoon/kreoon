import { memo, useId } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import type { Content } from "@/types/database";
import { DraggableKanbanCard } from "./KanbanCard";
import type { BoardColumnDef, ContentSocialStatus, KanbanCardContext, KanbanDensity } from "./kanbanTypes";

export const INITIAL_CARDS_PER_COLUMN = 15;
export const CARDS_PAGE = 20;

interface ColumnCardsProps {
  items: Content[];
  limit: number;
  pinnedId: string | null;
  density: KanbanDensity;
  visibleFields: string[];
  ctx: KanbanCardContext;
  socialStatusMap: Record<string, ContentSocialStatus> | undefined;
  movingIds: ReadonlySet<string>;
  pulseId: string | null;
}

/** Lista de tarjetas memoizada: no se repinta por los cambios de `over` que sí repintan la columna. */
const ColumnCards = memo(function ColumnCards({
  items,
  limit,
  pinnedId,
  density,
  visibleFields,
  ctx,
  socialStatusMap,
  movingIds,
  pulseId,
}: ColumnCardsProps) {
  let visible = items.length > limit ? items.slice(0, limit) : items;
  // La producción recién movida debe verse (y poder recibir el foco) aunque quede bajo «Ver más».
  if (pinnedId && items.length > limit && !visible.some((c) => c.id === pinnedId)) {
    const pinned = items.find((c) => c.id === pinnedId);
    if (pinned) visible = [...visible, pinned];
  }
  return (
    <ul role="list" className="m-0 flex list-none flex-col gap-2 p-0">
      {visible.map((item) => (
        <DraggableKanbanCard
          key={item.id}
          content={item}
          density={density}
          visibleFields={visibleFields}
          ctx={ctx}
          social={socialStatusMap?.[item.id]}
          isAmbassador={item.is_ambassador_content}
          moving={movingIds.has(item.id)}
          pinned={pulseId === item.id}
        />
      ))}
    </ul>
  );
});

export interface KanbanColumnProps {
  column: BoardColumnDef;
  items: Content[];
  overdueCount: number;
  limit: number;
  /** Producción que se está arrastrando (null si no hay arrastre). */
  activeContent: Content | null;
  canDrop: (content: Content, targetStatus: string) => boolean;
  density: KanbanDensity;
  visibleFields: string[];
  ctx: KanbanCardContext;
  socialStatusMap: Record<string, ContentSocialStatus> | undefined;
  movingIds: ReadonlySet<string>;
  pinnedId: string | null;
  pulseId: string | null;
  onShowMore: (status: string) => void;
  onShowLess: (status: string) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  column,
  items,
  overdueCount,
  limit,
  activeContent,
  canDrop,
  density,
  visibleFields,
  ctx,
  socialStatusMap,
  movingIds,
  pinnedId,
  pulseId,
  onShowMore,
  onShowLess,
}: KanbanColumnProps) {
  const titleId = useId();
  const isSource = !!activeContent && activeContent.status === column.status;
  const allowed = !activeContent || isSource || canDrop(activeContent, column.status);
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    // Las etapas que no aceptan la transición no pueden ser destino (ni con puntero ni con teclado).
    disabled: !allowed,
    data: { type: "column" },
  });

  const dropState = !activeContent
    ? undefined
    : !allowed
      ? "blocked"
      : isOver
        ? "over"
        : isSource
          ? undefined
          : "allowed";

  const remaining = Math.max(0, items.length - limit);
  const expanded = limit > INITIAL_CARDS_PER_COLUMN;

  return (
    <section
      ref={setNodeRef}
      className="kb-col"
      data-kb-column={column.status}
      data-drop={dropState}
      aria-labelledby={titleId}
      style={{ ["--col" as string]: column.color }}
    >
      <header className="kb-col__head">
        <span className="kb-col__dot" aria-hidden="true" />
        <h2 id={titleId} className="kb-col__title">
          {column.title}
        </h2>
        {overdueCount > 0 && (
          <span
            className="kb-col__alert"
            role="img"
            aria-label={`${overdueCount} ${overdueCount === 1 ? "vencida" : "vencidas"}`}
            title={`${overdueCount} ${overdueCount === 1 ? "producción vencida" : "producciones vencidas"}`}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {overdueCount}
          </span>
        )}
        <span className="kb-col__count" aria-label={`${items.length} ${items.length === 1 ? "producción" : "producciones"}`}>
          {items.length}
        </span>
      </header>

      <div className="kb-col__list">
        <p className="kb-col__hint" aria-hidden="true">
          {dropState === "blocked" ? "No permitido para tu rol" : `Suelta aquí para mover a ${column.title}`}
        </p>
        {items.length === 0 ? (
          <div className="kb-col__empty">Sin producciones en esta etapa</div>
        ) : (
          <ColumnCards
            items={items}
            limit={limit}
            pinnedId={pinnedId}
            density={density}
            visibleFields={visibleFields}
            ctx={ctx}
            socialStatusMap={socialStatusMap}
            movingIds={movingIds}
            pulseId={pulseId}
          />
        )}
        {remaining > 0 && (
          <button type="button" className="kb-more" onClick={() => onShowMore(column.status)}>
            Ver {Math.min(CARDS_PAGE, remaining)} más ({remaining} sin mostrar)
          </button>
        )}
        {expanded && remaining === 0 && items.length > INITIAL_CARDS_PER_COLUMN && (
          <button type="button" className="kb-more" onClick={() => onShowLess(column.status)}>
            Mostrar menos
          </button>
        )}
      </div>
    </section>
  );
});
