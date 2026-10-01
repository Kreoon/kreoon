// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Content } from "@/types/database";
import { KanbanCardView } from "./KanbanCard";
import type { KanbanCardContext } from "./kanbanTypes";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// cmdk (selector de personas) usa scrollIntoView, que jsdom no implementa.
Element.prototype.scrollIntoView ??= () => {};

afterEach(cleanup);

const NOW = Date.now();
const content = (over: Partial<Content> = {}): Content =>
  ({
    id: "c1",
    title: "Reel unboxing sérum con un título largo que no debe recortarse en el DOM ni perderse",
    status: "recording",
    client: { name: "Nova Beauty" },
    creator_id: null,
    editor_id: null,
    deadline: new Date(NOW - 3 * 86_400_000).toISOString(),
    created_at: new Date(NOW - 40 * 86_400_000).toISOString(),
    updated_at: new Date(NOW - 5 * 86_400_000).toISOString(),
    ...over,
  }) as Content;

const ctxOf = (over: Partial<KanbanCardContext> = {}): KanbanCardContext => ({
  columns: [],
  userId: "u1",
  userRole: "admin",
  canAssign: true,
  creators: [{ id: "p1", full_name: "Ana Gómez", avatar_url: null }],
  editors: [],
  getMoveTargets: vi.fn(() => []),
  onOpen: vi.fn(),
  onMove: vi.fn(),
  onQuickStatus: vi.fn(async () => {}),
  onAssign: vi.fn(async () => {}),
  onShare: vi.fn(),
  ...over,
});

const FIELDS = ["title", "client", "deadline", "creator", "editor"];
const view = (c: Content, ctx: KanbanCardContext, fields = FIELDS) =>
  render(
    <ul>
      <KanbanCardView content={c} density="compact" visibleFields={fields} ctx={ctx} />
    </ul>,
  );

describe("KanbanCardView", () => {
  it("está memoizada (no se repinta con props idénticas)", () => {
    expect((KanbanCardView as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.memo"));
  });

  it("el título completo está en el DOM (sin altura fija que lo recorte) y abre el detalle al pulsarlo", () => {
    const c = content();
    const ctx = ctxOf();
    view(c, ctx);
    const open = screen.getByRole("button", { name: c.title });
    expect(open.textContent).toBe(c.title);
    fireEvent.click(open);
    expect(ctx.onOpen).toHaveBeenCalledWith(c);
  });

  it("no anida botones dentro de botones", () => {
    const { container } = view(content(), ctxOf());
    expect(container.querySelectorAll("button button").length).toBe(0);
  });

  it("asa y menú ⋮ no abren el detalle", () => {
    const ctx = ctxOf();
    view(content(), ctx);
    fireEvent.click(screen.getByRole("button", { name: /^Mover «/ }));
    fireEvent.click(screen.getByRole("button", { name: /Más acciones/ }));
    expect(ctx.onOpen).not.toHaveBeenCalled();
  });

  it("el asa es un control real con etiqueta accesible para teclado", () => {
    view(content(), ctxOf());
    const handle = screen.getByRole("button", { name: /Mover «/ });
    expect(handle.getAttribute("aria-label")).toMatch(/teclado/);
  });

  it("fecha con significado explícito y señal de atraso (texto, no solo color)", () => {
    view(content(), ctxOf());
    expect(screen.getByText(/^Vencida · /)).toBeTruthy();
    // vencida y estancada a la vez: se prioriza «Vencida» (misma regla que antes)
    expect(screen.queryByText(/Sin cambios/)).toBeNull();
  });

  it("estancada (sin vencer): «Sin cambios N d» con texto", () => {
    view(content({ deadline: new Date(NOW + 10 * 86_400_000).toISOString() }), ctxOf());
    expect(screen.getByText(/^Entrega /)).toBeTruthy();
    expect(screen.getByText(/Sin cambios 5 d/)).toBeTruthy();
  });

  it("sin deadline no inventa fecha", () => {
    view(content({ deadline: null, updated_at: new Date().toISOString() }), ctxOf());
    expect(screen.queryByText(/Entrega|Vencida/)).toBeNull();
  });

  it("no pinta una barra de progreso inventada", () => {
    const { container } = view(content(), ctxOf(), [...FIELDS, "progress"]);
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("admin: botones «Creador» / «Editor» para asignar rápido; asignar no abre el detalle", () => {
    const ctx = ctxOf();
    view(content(), ctx);
    expect(screen.getByRole("button", { name: /Asignar creador a/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Asignar editor a/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Asignar creador a/ }));
    expect(ctx.onOpen).not.toHaveBeenCalled();
  });

  it("sin permiso de asignar y sin nadie asignado: no hay controles ni círculos vacíos", () => {
    const { container } = view(content(), ctxOf({ canAssign: false }));
    expect(screen.queryByRole("button", { name: /Asignar/ })).toBeNull();
    expect(container.querySelector(".kb-people")).toBeNull();
  });

  it("responsables como avatares con etiqueta accesible", () => {
    view(content({ creator_id: "p1", creator: { id: "p1", full_name: "Ana Gómez" } as Content["creator"] }), ctxOf({ canAssign: false }));
    expect(screen.getByRole("img", { name: "Creador: Ana Gómez" })).toBeTruthy();
  });

  it("acción rápida del creador asignado («Iniciar grabación») y solo para él", () => {
    const ctx = ctxOf({ userRole: "creator", canAssign: false });
    const c = content({ status: "assigned", creator_id: "u1", deadline: null });
    view(c, ctx);
    fireEvent.click(screen.getByRole("button", { name: /Iniciar grabación/ }));
    expect(ctx.onQuickStatus).toHaveBeenCalledWith("c1", "recording");
    cleanup();
    view({ ...c, creator_id: "otro" }, ctxOf({ userRole: "creator", canAssign: false }));
    expect(screen.queryByRole("button", { name: /Iniciar grabación/ })).toBeNull();
  });

  it("cliente: Aprobar / Novedad solo en entregado o corregido", () => {
    view(content({ status: "delivered", deadline: null }), ctxOf({ userRole: "client", canAssign: false }));
    expect(screen.getByRole("button", { name: /Aprobar/ })).toBeTruthy();
    cleanup();
    view(content({ status: "recording", deadline: null }), ctxOf({ userRole: "client", canAssign: false }));
    expect(screen.queryByRole("button", { name: /Aprobar/ })).toBeNull();
  });

  it("compartir solo en estados compartibles y vía el diálogo único", () => {
    const ctx = ctxOf();
    view(content({ status: "approved", deadline: null }), ctx);
    fireEvent.click(screen.getByRole("button", { name: /Compartir «/ }));
    expect(ctx.onShare).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }), "full");
    cleanup();
    view(content({ status: "recording", deadline: null }), ctxOf());
    expect(screen.queryByRole("button", { name: /Compartir «/ })).toBeNull();
  });

  it("indicadores de material (crudo / video / guion) con etiqueta", () => {
    view(content({ deadline: null, raw_video_urls: ["x"], video_url: "https://a/b.mp4", script: "s" } as Partial<Content>), ctxOf());
    expect(screen.getByRole("img", { name: "Material crudo" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Video editado" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Tiene guion" })).toBeTruthy();
  });

  it("marca la tarjeta como arrastrándose para el marcador de posición", () => {
    const { container } = render(
      <ul>
        <KanbanCardView content={content()} density="compact" visibleFields={FIELDS} ctx={ctxOf()} drag={{ isDragging: true }} />
      </ul>,
    );
    expect(container.querySelector('[data-dragging="true"]')).toBeTruthy();
  });
});
