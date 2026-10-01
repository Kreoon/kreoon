/**
 * Utilidades puras del tablero Kanban (sin React): agrupación por estado en un
 * solo recorrido, fechas con significado explícito, iniciales y filtros.
 * Se mantienen puras para poder probarlas sin DOM.
 */
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Content } from "@/types/database";

/** Campos visibles por defecto (referencia estable: evita `[]`/arrays nuevos por render y romper React.memo). */
export const DEFAULT_VISIBLE_FIELDS: string[] = ["title", "client", "deadline", "creator", "editor", "sphere_phase", "campaign_week", "marketing_status"];

/** Estados en los que una fecha límite pasada ya no cuenta como atraso. */
const DONE_STATUSES = ["approved", "paid", "archived", "delivered"];
/** Estados en los que "sin cambios hace ≥3 días" es una señal de estancamiento. */
const STALE_STATUSES = ["draft", "assigned", "recording", "editing", "review"];
const DAY_MS = 86_400_000;

/** Una fecha 'YYYY-MM-DD' (sin hora) se interpreta en hora local, no UTC (evita el día corrido). */
export function parseBoardDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatShortDate(d: Date, now: Date = new Date()): string {
  const withYear = d.getFullYear() !== now.getFullYear();
  return format(d, withYear ? "d MMM yyyy" : "d MMM", { locale: es });
}

export type DueKind = "none" | "overdue" | "soon" | "ok";
export interface DueInfo {
  kind: DueKind;
  /** Texto con significado explícito: «Entrega 12 mar» / «Vencida · 12 mar». */
  label: string | null;
  /** Texto largo para lectores de pantalla. */
  ariaLabel: string | null;
}

/**
 * Información de entrega a partir de `deadline`. NO inventa fechas: sin deadline → kind "none".
 * Vencida solo si la fecha pasó y la producción aún no está entregada/aprobada/pagada/archivada.
 */
export function getDueInfo(content: Pick<Content, "deadline" | "status">, now: Date = new Date()): DueInfo {
  const d = parseBoardDate(content.deadline);
  if (!d) return { kind: "none", label: null, ariaLabel: null };
  const short = formatShortDate(d, now);
  const done = DONE_STATUSES.includes(String(content.status));
  if (d.getTime() < now.getTime() && !done) {
    return { kind: "overdue", label: `Vencida · ${short}`, ariaLabel: `Entrega vencida, era el ${short}` };
  }
  const soon = !done && d.getTime() - now.getTime() < 48 * 3_600_000;
  return { kind: soon ? "soon" : "ok", label: `Entrega ${short}`, ariaLabel: `Entrega el ${short}` };
}

/** Días sin cambios si la producción está estancada (≥3 días en estados de trabajo), si no null. */
export function getStaleDays(
  content: Pick<Content, "updated_at" | "status">,
  now: Date = new Date(),
): number | null {
  if (!content.updated_at) return null;
  const updated = new Date(content.updated_at).getTime();
  if (Number.isNaN(updated)) return null;
  const days = (now.getTime() - updated) / DAY_MS;
  return STALE_STATUSES.includes(String(content.status)) && days >= 3 ? Math.floor(days) : null;
}

export function isOverdueContent(content: Pick<Content, "deadline" | "status">, now: Date = new Date()): boolean {
  return getDueInfo(content, now).kind === "overdue";
}

export function getInitials(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function getFirstName(name: string | null | undefined): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

/** `product` puede llegar como texto o como objeto {name}; se tolera ambos. */
export function getProductName(content: Content): string | null {
  const p = (content as unknown as { product?: unknown }).product;
  if (!p) return null;
  if (typeof p === "string") return p;
  const name = (p as { name?: unknown }).name;
  return typeof name === "string" && name ? name : null;
}

export interface GroupedContent {
  byStatus: Map<string, Content[]>;
  overdueByStatus: Map<string, number>;
  /** Producciones cuyo estado no tiene columna (invisibles en el tablero). */
  orphanCount: number;
}

/** Agrupa por estado en UN solo recorrido (O(n)), conservando el orden de entrada. */
export function groupContentByStatus(
  content: readonly Content[],
  columnKeys: readonly string[],
  now: Date = new Date(),
): GroupedContent {
  const byStatus = new Map<string, Content[]>();
  const overdueByStatus = new Map<string, number>();
  for (const key of columnKeys) {
    byStatus.set(key, []);
    overdueByStatus.set(key, 0);
  }
  let orphanCount = 0;
  for (const item of content) {
    const bucket = byStatus.get(item.status as string);
    if (!bucket) {
      orphanCount++;
      continue;
    }
    bucket.push(item);
    if (isOverdueContent(item, now)) {
      overdueByStatus.set(item.status as string, (overdueByStatus.get(item.status as string) ?? 0) + 1);
    }
  }
  return { byStatus, overdueByStatus, orphanCount };
}

export interface BoardClientFilters {
  searchTerm: string;
  /** Rango sobre la fecha de CREACIÓN (created_at). */
  createdFrom?: Date | null;
  createdTo?: Date | null;
  creatorId: string; // 'all' | '__unassigned__' | id (el id concreto lo resuelve el servidor)
  editorId: string;
  productId: string; // 'all' | id
  hideArchived: boolean;
}

/** Filtros que se resuelven en el cliente sobre lo ya cargado. */
export function matchesClientFilters(c: Content, f: BoardClientFilters): boolean {
  if (f.searchTerm) {
    const term = f.searchTerm.toLowerCase();
    const hit =
      (c.title ?? "").toLowerCase().includes(term) ||
      (c.description ?? "").toLowerCase().includes(term) ||
      (c.client?.name ?? "").toLowerCase().includes(term);
    if (!hit) return false;
  }
  if (f.createdFrom || f.createdTo) {
    const created = c.created_at ? new Date(c.created_at) : null;
    if (!created) return false;
    if (f.createdFrom && created < f.createdFrom) return false;
    if (f.createdTo && created > f.createdTo) return false;
  }
  if (f.creatorId === "__unassigned__" && c.creator_id) return false;
  if (f.editorId === "__unassigned__" && c.editor_id) return false;
  if (f.productId !== "all" && c.product_id !== f.productId) return false;
  if (f.hideArchived && c.status === "archived") return false;
  return true;
}

/** Qué oculta una producción tras cambiar su estado: 'archived' (Ocultar archivados), 'filters' (otros) o null. */
export function describeHidingFilter(c: Content, f: BoardClientFilters): "archived" | "filters" | null {
  if (f.hideArchived && c.status === "archived") return "archived";
  return matchesClientFilters(c, f) ? null : "filters";
}
