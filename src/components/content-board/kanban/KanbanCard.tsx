import { memo, useCallback, useMemo, useState, type DOMAttributes, type KeyboardEvent, type PointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  AlertTriangle,
  Brain,
  CalendarClock,
  CheckCircle,
  Clock4,
  Crown,
  DollarSign,
  Eye,
  FileText,
  GripVertical,
  Heart,
  Lightbulb,
  Megaphone,
  MoreHorizontal,
  RefreshCw,
  Receipt,
  Share2,
  Star,
  Video,
  XCircle,
  Zap,
  ArrowRightLeft,
  ExternalLink,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickStatusButtons, hasQuickActions } from "@/components/board/StatusChangeDropdown";
import type { Content, ContentStatus } from "@/types/database";
import { cn } from "@/lib/utils";
import { AssigneeSlot } from "./AssigneeSlot";
import { MediaPlayer, MediaThumb, getCardMediaInfo } from "./KanbanCardMedia";
import { getDueInfo, getProductName, getStaleDays } from "./kanbanUtils";
import type { BoardColumnDef, ContentSocialStatus, KanbanCardContext, KanbanDensity } from "./kanbanTypes";

const SPHERE_PHASE: Record<string, { label: string; short: string; Icon: typeof Zap }> = {
  engage: { label: "Enganchar", short: "ENG", Icon: Zap },
  solution: { label: "Solución", short: "SOL", Icon: Lightbulb },
  remarketing: { label: "Remarketing", short: "RMK", Icon: RefreshCw },
  fidelize: { label: "Fidelizar", short: "FID", Icon: Heart },
};

const SHAREABLE_STATUSES = ["approved", "review", "paid", "archived"];

type DndListeners = DOMAttributes<HTMLElement> | undefined;
export interface CardDragBind {
  setNodeRef?: (el: HTMLElement | null) => void;
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
  attributes?: Record<string, unknown>;
  listeners?: DndListeners;
  isDragging?: boolean;
}

/**
 * Los listeners de dnd-kit se aplican a toda la tarjeta (arrastre con puntero/táctil), pero:
 * - los eventos que vienen de portales React (menús, selectores, diálogos) NO inician arrastre
 *   (no son descendientes DOM de la tarjeta);
 * - los controles marcados con data-no-drag (avatares, botones, menús) tampoco.
 * El teclado solo se activa desde el asa (setActivatorNodeRef), lo exige el propio sensor.
 */
function guardListeners(listeners: DndListeners): DndListeners {
  if (!listeners) return undefined;
  const out: Record<string, (e: PointerEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void> = {};
  for (const [name, handler] of Object.entries(listeners as Record<string, unknown>)) {
    if (typeof handler !== "function") continue;
    out[name] = (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || !(e.currentTarget as HTMLElement).contains(target)) return;
      // En táctil la pulsación larga ya distingue arrastre de toque, así que también vale sobre avatares y botones.
      if (name !== "onKeyDown" && name !== "onTouchStart" && target.closest?.("[data-no-drag]")) return;
      (handler as (ev: unknown) => void)(e);
    };
  }
  return out as unknown as DndListeners;
}

export interface KanbanCardViewProps {
  content: Content;
  density: KanbanDensity;
  visibleFields: string[];
  ctx: KanbanCardContext;
  social?: ContentSocialStatus;
  isAmbassador?: boolean;
  /** Se está guardando un cambio de estado de esta producción. */
  moving?: boolean;
  /** Recién movida: pulso breve. */
  pinned?: boolean;
  overlay?: boolean;
  drag?: CardDragBind;
}

export const KanbanCardView = memo(function KanbanCardView({
  content,
  density,
  visibleFields,
  ctx,
  social,
  isAmbassador,
  moving,
  pinned,
  overlay,
  drag,
}: KanbanCardViewProps) {
  const compact = density === "compact";
  const title = content.title || "Sin título";
  const has = (f: string) => visibleFields.includes(f);
  const [playing, setPlaying] = useState(false);

  const due = useMemo(() => getDueInfo({ deadline: content.deadline, status: content.status }), [content.deadline, content.status]);
  const staleDays = useMemo(() => getStaleDays({ updated_at: content.updated_at, status: content.status }), [content.updated_at, content.status]);
  const overdue = due.kind === "overdue";
  const stale = staleDays != null && !overdue;

  const mediaInfo = useMemo(() => getCardMediaInfo(content), [content]);
  const productName = has("product") ? getProductName(content) : null;
  const clientName = has("client") ? content.client?.name : null;
  const contextText = [clientName, productName].filter(Boolean).join(" · ");

  const hasVideo = !!content.video_url || (content.video_urls?.length ?? 0) > 0;
  const hasRawVideo = (content.raw_video_urls?.length ?? 0) > 0;
  const shareable = SHAREABLE_STATUSES.includes(String(content.status));
  const showCreator = has("creator") || has("responsible");
  const showEditor = has("editor") || has("responsible");
  // La fila de responsables solo aparece si hay alguien asignado o si el usuario puede asignar (sin círculos vacíos de relleno)
  const showPeople =
    (showCreator || showEditor) &&
    (ctx.canAssign || (showCreator && !!(content.creator || content.creator_id)) || (showEditor && !!(content.editor || content.editor_id)));

  const isAssignedCreator = !!ctx.userId && content.creator_id === ctx.userId;
  const isAssignedEditor = !!ctx.userId && content.editor_id === ctx.userId;
  const quick = hasQuickActions(String(content.status), ctx.userRole, isAssignedCreator, isAssignedEditor);

  const marketing = content.marketing_approved_at
    ? { Icon: CheckCircle, label: "Aprobado MKT", tone: "ok" }
    : content.marketing_rejected_at
      ? { Icon: XCircle, label: "Rechazado MKT", tone: "danger" }
      : content.marketing_campaign_id
        ? { Icon: Megaphone, label: "En campaña", tone: "brand" }
        : null;
  const phase = has("sphere_phase") && content.sphere_phase ? SPHERE_PHASE[content.sphere_phase] : null;

  const payC = has("creator_payment") && content.creator_payment != null;
  const payE = has("editor_payment") && content.editor_payment != null;
  // up_points existe en la fila (RPC get_org_content) aunque el tipo Content aún no lo declare
  const upPoints = (content as unknown as { up_points?: number | null }).up_points;
  const points = has("points") && upPoints != null;
  const views = has("views_count") && content.views_count != null;

  const hasChips =
    !!phase ||
    (has("campaign_week") && !!content.campaign_week) ||
    (has("marketing_status") && !!marketing) ||
    (has("sales_angle") && !!content.sales_angle) ||
    payC || payE || has("invoiced") || points || views || !!isAmbassador;

  const handleOpen = useCallback(() => ctx.onOpen(content), [ctx, content]);
  const guarded = useMemo(() => guardListeners(drag?.listeners), [drag?.listeners]);

  const showMedia = !!mediaInfo?.hasMedia && !playing;

  return (
    <li
      ref={overlay ? undefined : drag?.setNodeRef}
      className="kb-card"
      data-kb-card
      data-card-id={content.id}
      data-density={density}
      data-overdue={overdue || undefined}
      data-stale={stale || undefined}
      data-dragging={drag?.isDragging || undefined}
      data-moving={moving || undefined}
      data-pinned={pinned || undefined}
      data-overlay={overlay || undefined}
      aria-busy={moving || undefined}
      {...(overlay ? { "aria-hidden": true } : guarded)}
    >
      {/* Fila superior: contexto (cliente · producto) + asa de arrastre + menú */}
      <div className="flex items-start gap-1">
        <p className="kb-context mt-0.5" title={contextText || undefined}>
          {contextText || <span className="sr-only">Sin cliente</span>}
        </p>
        {!overlay && (
          <>
            <button
              ref={drag?.setActivatorNodeRef}
              type="button"
              className="kb-tool"
              data-handle="true"
              data-no-click
              {...drag?.attributes}
              aria-label={`Mover «${title}»: arrastra, o con teclado pulsa Espacio, usa las flechas y vuelve a pulsar Espacio`}
              title="Arrastrar para mover (o usa el menú «Mover a…»)"
            >
              <GripVertical aria-hidden="true" />
            </button>
            <CardMenu content={content} title={title} ctx={ctx} shareable={shareable} />
          </>
        )}
      </div>

      {/* Título: botón que abre el detalle y cubre la tarjeta (sin anidar botones) */}
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1">
          <button type="button" className="kb-open" onClick={handleOpen} title={title} tabIndex={overlay ? -1 : undefined}>
            {title}
          </button>
        </h3>
        {showMedia && mediaInfo && (
          <MediaThumb title={title} info={mediaInfo} hooksCount={content.hooks_count} onPlay={() => setPlaying(true)} />
        )}
      </div>

      {playing && mediaInfo && (
        <MediaPlayer title={title} content={content} info={mediaInfo} onClose={() => setPlaying(false)} />
      )}

      {/* Responsables */}
      {showPeople && (
        <div className="kb-people" data-no-click>
          {showCreator && (
            <AssigneeSlot
              kind="creator"
              contentId={content.id}
              contentTitle={title}
              person={content.creator}
              personId={content.creator_id}
              users={ctx.creators}
              canAssign={ctx.canAssign}
              showName={!compact}
              onAssign={ctx.onAssign}
            />
          )}
          {showEditor && (
            <AssigneeSlot
              kind="editor"
              contentId={content.id}
              contentTitle={title}
              person={content.editor}
              personId={content.editor_id}
              users={ctx.editors}
              canAssign={ctx.canAssign}
              showName={!compact}
              onAssign={ctx.onAssign}
            />
          )}
        </div>
      )}

      {/* Etiquetas de contexto (solo las que tienen dato) */}
      {hasChips && (
        <div className="flex flex-wrap items-center gap-1">
          {phase && (
            <span className="kb-chip" data-tone={content.sphere_phase} title={`Fase: ${phase.label}`}>
              <phase.Icon aria-hidden="true" />
              <span>{phase.label}</span>
            </span>
          )}
          {has("campaign_week") && content.campaign_week && (
            <span className="kb-chip" title={`Semana de campaña ${content.campaign_week}`}>
              <span>Sem. {content.campaign_week}</span>
            </span>
          )}
          {has("marketing_status") && marketing && (
            <span className="kb-chip" data-tone={marketing.tone}>
              <marketing.Icon aria-hidden="true" />
              <span>{marketing.label}</span>
            </span>
          )}
          {has("sales_angle") && content.sales_angle && (
            <span className="kb-chip max-w-[12rem]" title={`Ángulo de venta: ${content.sales_angle}`}>
              <span>{content.sales_angle}</span>
            </span>
          )}
          {payC && (
            <span
              className="kb-chip"
              data-tone={content.creator_paid ? "ok" : undefined}
              aria-label={`Pago creador ${content.creator_paid ? "pagado" : "pendiente"}: ${content.creator_payment}`}
              title={`Pago creador ${content.creator_paid ? "(pagado)" : "(pendiente)"}`}
            >
              <DollarSign aria-hidden="true" />
              <span>C: ${Number(content.creator_payment).toLocaleString()}</span>
            </span>
          )}
          {payE && (
            <span
              className="kb-chip"
              data-tone={content.editor_paid ? "ok" : undefined}
              aria-label={`Pago editor ${content.editor_paid ? "pagado" : "pendiente"}: ${content.editor_payment}`}
              title={`Pago editor ${content.editor_paid ? "(pagado)" : "(pendiente)"}`}
            >
              <DollarSign aria-hidden="true" />
              <span>E: ${Number(content.editor_payment).toLocaleString()}</span>
            </span>
          )}
          {has("invoiced") && (
            <span className="kb-chip" data-tone={content.invoiced ? "ok" : undefined} title={content.invoiced ? "Facturado" : "Sin facturar"}>
              <Receipt aria-hidden="true" />
              <span>{content.invoiced ? "Facturado" : "Sin facturar"}</span>
            </span>
          )}
          {points && (
            <span className="kb-chip" title="Puntos UP" aria-label={`${upPoints} puntos UP`}>
              <Star aria-hidden="true" />
              <span>{upPoints}</span>
            </span>
          )}
          {views && (
            <span className="kb-chip" title="Vistas" aria-label={`${content.views_count} vistas`}>
              <Eye aria-hidden="true" />
              <span>{Number(content.views_count).toLocaleString()}</span>
            </span>
          )}
          {isAmbassador && (
            <span className="kb-chip" data-tone="warn">
              <Crown aria-hidden="true" />
              <span>Embajador</span>
            </span>
          )}
        </div>
      )}

      {/* Acciones rápidas por rol */}
      {quick && !overlay && (
        <QuickStatusButtons
          currentStatus={content.status as ContentStatus}
          contentId={content.id}
          userRole={ctx.userRole}
          isAssignedCreator={isAssignedCreator}
          isAssignedEditor={isAssignedEditor}
          onStatusChange={ctx.onQuickStatus}
        />
      )}

      {/* Pie: entrega con significado explícito + señales calculadas + indicadores de material */}
      <div className="kb-foot">
        {has("deadline") && due.label ? (
          <span className="kb-foot__date" data-kind={due.kind} title={due.ariaLabel || undefined}>
            {overdue ? <AlertTriangle aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
            <span>{due.label}</span>
          </span>
        ) : overdue ? (
          <span className="kb-foot__date" data-kind="overdue">
            <AlertTriangle aria-hidden="true" />
            <span>Vencida</span>
          </span>
        ) : null}
        {stale && (
          <span className="kb-foot__flag" title={`Sin cambios desde hace ${staleDays} días en un estado de trabajo`}>
            <Clock4 aria-hidden="true" />
            <span>Sin cambios {staleDays} d</span>
          </span>
        )}
        <span className="kb-foot__icons">
          {social && social.count > 0 && (
            <span
              className="inline-flex items-center gap-1"
              role="img"
              aria-label={`${social.count} publicaci${social.count === 1 ? "ón" : "ones"} en redes${social.hasPublished ? " (publicado)" : social.hasScheduled ? " (programado)" : ""}`}
              title={`${social.count} publicaciones en redes`}
              style={{ color: social.hasPublished ? "var(--kb-ok-ink)" : undefined }}
            >
              <Share2 aria-hidden="true" />
              <span className="text-xs font-medium">{social.count}</span>
            </span>
          )}
          {hasRawVideo && (
            <span role="img" aria-label="Material crudo" title="Material crudo" className="inline-flex">
              <Video aria-hidden="true" />
            </span>
          )}
          {hasVideo && (
            <span role="img" aria-label="Video editado" title="Video editado" className="inline-flex" style={{ color: "var(--kb-ok-ink)" }}>
              <Video aria-hidden="true" fill="currentColor" fillOpacity={0.25} />
            </span>
          )}
          {content.script && (
            <span role="img" aria-label="Tiene guion" title="Tiene guion" className="inline-flex">
              <FileText aria-hidden="true" />
            </span>
          )}
          {shareable && !overlay && (
            <button
              type="button"
              className="kb-tool kb-lift"
              style={{ width: "1.75rem", height: "1.75rem", margin: "-0.25rem -0.25rem -0.25rem 0" }}
              data-no-click
              data-no-drag
              aria-label={`Compartir «${title}» en redes sociales`}
              title="Compartir en redes sociales"
              onClick={(e) => {
                e.stopPropagation();
                ctx.onShare(content, "full");
              }}
            >
              <Share2 aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
    </li>
  );
});

/** Menú ⋮ de la tarjeta: «Mover a…» (alternativa a arrastrar para teclado y táctil), detalle, IA, publicación rápida. */
function CardMenu({
  content,
  title,
  ctx,
  shareable,
}: {
  content: Content;
  title: string;
  ctx: KanbanCardContext;
  shareable: boolean;
}) {
  const [targets, setTargets] = useState<BoardColumnDef[]>([]);
  const onOpenChange = useCallback(
    (open: boolean) => {
      // Las transiciones permitidas se calculan solo al abrir (no por tarjeta en cada render).
      if (open) setTargets(ctx.getMoveTargets(content));
    },
    [ctx, content],
  );
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="kb-tool"
          data-no-click
          data-no-drag
          aria-label={`Más acciones para «${title}»`}
          title="Más acciones"
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-no-drag>
        <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">{title}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => ctx.onOpen(content)} className="gap-2">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Abrir detalle
        </DropdownMenuItem>
        {targets.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              Mover a…
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
              {targets.map((t) => (
                <DropdownMenuItem key={t.status} onSelect={() => ctx.onMove(content.id, t.status)} className="gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                  <span className="truncate">{t.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {(shareable || ctx.onAnalyze) && <DropdownMenuSeparator />}
        {shareable && (
          <DropdownMenuItem onSelect={() => ctx.onShare(content, "full")} className="gap-2">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartir en redes…
          </DropdownMenuItem>
        )}
        {ctx.onAnalyze && (
          <>
            <DropdownMenuItem onSelect={() => ctx.onAnalyze?.(content.id, content.title)} className="gap-2">
              <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
              Analizar con IA
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ctx.onShare(content, "quick")} className="gap-2">
              <Send className="h-4 w-4" aria-hidden="true" />
              Publicación rápida
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface DraggableKanbanCardProps extends Omit<KanbanCardViewProps, "drag" | "overlay"> {}

/**
 * Cápsula fina que se suscribe al contexto de dnd-kit (useDraggable re-renderiza con cada cambio de
 * `over`) para que el contenido pesado, memoizado, NO se vuelva a pintar durante el arrastre.
 */
export function DraggableKanbanCard(props: DraggableKanbanCardProps) {
  const { content } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: content.id,
    data: { type: "card", status: content.status },
    attributes: { roleDescription: "tarjeta de producción movible" },
  });
  const drag = useMemo<CardDragBind>(
    () => ({
      setNodeRef,
      setActivatorNodeRef,
      attributes: attributes as unknown as Record<string, unknown>,
      listeners: listeners as DndListeners,
      isDragging,
    }),
    [setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging],
  );
  return <KanbanCardView {...props} drag={drag} />;
}

