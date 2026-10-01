import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import "@/styles/board-kanban.css";
import type { Content } from "@/types/database";
import { cn } from "@/lib/utils";
import { KanbanCardView } from "./kanban/KanbanCard";
import { CARDS_PAGE, INITIAL_CARDS_PER_COLUMN, KanbanColumn } from "./kanban/KanbanColumn";
import { createAnnouncements, kanbanCollision, SCREEN_READER_INSTRUCTIONS, useKanbanSensors } from "./kanban/kanbanDnd";
import { focusCard } from "./kanban/kanbanFocus";
import type { GroupedContent } from "./kanban/kanbanUtils";
import type {
  BoardColumnDef,
  ContentSocialStatus,
  KanbanCardContext,
  KanbanDensity,
} from "./kanban/kanbanTypes";

export interface ContentBoardKanbanViewProps {
  columns: BoardColumnDef[];
  grouped: GroupedContent;
  /** Todas las producciones cargadas, por id (para resolver la que se arrastra). */
  contentById: ReadonlyMap<string, Content>;
  density: KanbanDensity;
  visibleFields: string[];
  ctx: KanbanCardContext;
  socialStatusMap: Record<string, ContentSocialStatus> | undefined;
  movingIds: ReadonlySet<string>;
  /** Última producción movida: se garantiza que su tarjeta esté visible y se anima un instante. */
  pinnedId: string | null;
  /** ¿Puede este usuario mover la producción a esa etapa? (reglas de la organización) */
  canMove: (content: Content, targetStatus: string) => boolean;
  onMove: (contentId: string, targetStatus: string, origin: "drag" | "keyboard") => void;
  className?: string;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Tablero Kanban con arrastre real (@dnd-kit): ratón/lápiz con umbral, táctil con pulsación larga,
 * teclado con anuncios en español, copia flotante (DragOverlay), auto-desplazamiento y navegación
 * entre etapas en pantallas estrechas.
 */
export function ContentBoardKanbanView({
  columns,
  grouped,
  contentById,
  density,
  visibleFields,
  ctx,
  socialStatusMap,
  movingIds,
  pinnedId,
  canMove,
  onMove,
  className,
}: ContentBoardKanbanViewProps) {
  const sensors = useKanbanSensors();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | undefined>();
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [currentStage, setCurrentStage] = useState<string | null>(columns[0]?.status ?? null);

  const activeContent = activeId ? contentById.get(activeId) ?? null : null;

  // Pulso breve de la tarjeta recién movida (se retira solo)
  const [pulseId, setPulseId] = useState<string | null>(null);
  useEffect(() => {
    if (!pinnedId) return;
    setPulseId(pinnedId);
    const t = setTimeout(() => setPulseId(null), 1500);
    return () => clearTimeout(t);
  }, [pinnedId]);

  // Lecturas actualizadas para los anuncios sin recrear el objeto en cada render
  const lookups = useRef({ contentById, columns });
  lookups.current = { contentById, columns };
  const announcements = useMemo(
    () =>
      createAnnouncements({
        getTitle: (id) => lookups.current.contentById.get(id)?.title || "producción",
        getStageTitle: (s) => lookups.current.columns.find((c) => c.status === s)?.title || s,
        getStageOf: (id) => lookups.current.contentById.get(id)?.status as string | undefined,
      }),
    [],
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setActiveWidth(e.active.rect.current.initial?.width);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (!over) return;
      const id = String(active.id);
      const target = String(over.id);
      const item = contentById.get(id);
      if (!item || item.status === target) return;
      const fromKeyboard = typeof KeyboardEvent !== "undefined" && e.activatorEvent instanceof KeyboardEvent;
      onMove(id, target, fromKeyboard ? "keyboard" : "drag");
      // Con teclado la tarjeta se vuelve a montar en otra columna: devolver el foco a su asa.
      if (fromKeyboard) focusCard(id, "handle");
    },
    [contentById, onMove],
  );

  const handleDragCancel = useCallback(() => setActiveId(null), []);

  const canDrop = useCallback(
    (content: Content, target: string) => (content.status === target ? true : canMove(content, target)),
    [canMove],
  );

  const showMore = useCallback((status: string) => {
    setLimits((p) => ({ ...p, [status]: (p[status] ?? INITIAL_CARDS_PER_COLUMN) + CARDS_PAGE }));
  }, []);
  const showLess = useCallback((status: string) => {
    setLimits((p) => ({ ...p, [status]: INITIAL_CARDS_PER_COLUMN }));
  }, []);

  // Etapa visible (para el selector de etapas en pantallas estrechas)
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const best = entries.filter((en) => en.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const key = (best?.target as HTMLElement | undefined)?.dataset.kbColumn;
        if (key) setCurrentStage(key);
      },
      { root, threshold: [0.5, 0.8] },
    );
    root.querySelectorAll("[data-kb-column]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [columns]);

  const goToStage = useCallback((status: string) => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-kb-column="${CSS.escape(status)}"]`);
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "start", block: "nearest" });
    setCurrentStage(status);
  }, []);

  return (
    <div className={cn("kb-root", className)}>
      {/* Selector de etapas: navegación directa entre columnas cuando no caben todas */}
      <div className="mb-1 lg:hidden">
        <nav className="kb-stages" aria-label="Ir a una etapa">
          {columns.map((col) => (
            <button
              key={col.status}
              type="button"
              className="kb-stage"
              aria-current={currentStage === col.status ? "true" : undefined}
              onClick={() => goToStage(col.status)}
            >
              <span className="kb-col__dot" style={{ ["--col" as string]: col.color }} aria-hidden="true" />
              <span className="max-w-[9rem] truncate">{col.title}</span>
              <b>{grouped.byStatus.get(col.status)?.length ?? 0}</b>
            </button>
          ))}
        </nav>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
      >
        <div
          ref={scrollerRef}
          className="kb-scroller"
          data-dragging={activeId ? "true" : "false"}
          data-snap={activeId ? "false" : "true"}
          role="region"
          aria-label="Tablero de producciones por etapa"
          tabIndex={-1}
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              items={grouped.byStatus.get(col.status) ?? EMPTY}
              overdueCount={grouped.overdueByStatus.get(col.status) ?? 0}
              limit={limits[col.status] ?? INITIAL_CARDS_PER_COLUMN}
              activeContent={activeContent}
              canDrop={canDrop}
              density={density}
              visibleFields={visibleFields}
              ctx={ctx}
              socialStatusMap={socialStatusMap}
              movingIds={movingIds}
              pinnedId={pinnedId}
              pulseId={pulseId}
              onShowMore={showMore}
              onShowLess={showLess}
            />
          ))}
        </div>

        <DragOverlay
          dropAnimation={prefersReducedMotion() ? null : { duration: 160, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        >
          {activeContent ? (
            <ul role="presentation" className="kb-root m-0 list-none p-0" style={{ width: activeWidth }}>
              <KanbanCardView
                content={activeContent}
                density={density}
                visibleFields={visibleFields}
                ctx={ctx}
                social={socialStatusMap?.[activeContent.id]}
                isAmbassador={activeContent.is_ambassador_content}
                overlay
              />
            </ul>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

const EMPTY: Content[] = [];
