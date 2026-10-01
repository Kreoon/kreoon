// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Content } from "@/types/database";

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
const trackApproved = vi.fn();
const trackRejected = vi.fn();
vi.mock("@/analytics", () => ({ useContentAnalytics: () => ({ trackContentApproved: trackApproved, trackContentRejected: trackRejected }) }));

import { useContentMove } from "./useContentMove";

const columns = ["draft", "assigned", "recording", "approved", "archived"].map((s, i) => ({ status: s, title: s.toUpperCase(), color: "#000", sortOrder: i }));
const orgStatuses = columns.map((c) => ({ id: `id-${c.status}`, status_key: c.status, sort_order: c.sortOrder }));
// El creador solo puede avanzar desde assigned/recording; nadie más restringido salvo por estas reglas
const rules = orgStatuses.map((s) => ({
  status_id: s.id,
  can_advance_roles: ["assigned", "recording"].includes(s.status_key) ? ["creator", "admin"] : ["admin"],
  can_retreat_roles: ["admin"],
  can_view_roles: [],
}));
const mk = (id: string, status: string): Content => ({ id, title: `Prod ${id}`, status, created_at: new Date().toISOString() }) as unknown as Content;
const filters = { searchTerm: "", creatorId: "all", editorId: "all", productId: "all", hideArchived: false };

function setup(role: string, over: Record<string, unknown> = {}) {
  const items = [mk("a", "assigned"), mk("d", "draft")];
  const moveContentStatus = vi.fn(async () => ({ ok: true }) as const);
  const onOpenDetail = vi.fn();
  const onShare = vi.fn();
  const hook = renderHook(() =>
    useContentMove({
      contentById: new Map(items.map((c) => [c.id, c])),
      columns,
      userId: "u1",
      primaryRole: role,
      roles: [role],
      orgStatuses,
      rules,
      moveContentStatus: moveContentStatus as never,
      filters,
      onOpenDetail,
      onShare,
      ...over,
    } as never),
  );
  return { ...hook, moveContentStatus, onOpenDetail, onShare, items };
}

beforeEach(() => {
  toast.mockClear();
  trackApproved.mockClear();
  trackRejected.mockClear();
});

describe("useContentMove", () => {
  it("canMove usa las reglas de la organización (admin siempre; creador solo lo permitido)", () => {
    const admin = setup("admin");
    expect(admin.result.current.canMove(admin.items[1], "archived")).toBe(true);
    const creator = setup("creator");
    expect(creator.result.current.canMove(creator.items[0], "recording")).toBe(true); // assigned → avanzar permitido
    expect(creator.result.current.canMove(creator.items[1], "assigned")).toBe(false); // draft → no permitido
    expect(creator.result.current.canMove(creator.items[0], "draft")).toBe(false); // retroceder → no permitido
  });

  it("«Mover a…» solo ofrece transiciones permitidas (misma regla que el arrastre)", () => {
    const creator = setup("creator");
    const targets = creator.result.current.getMoveTargets(creator.items[0]).map((t) => t.status);
    expect(targets).toEqual(["recording", "approved", "archived"]);
    expect(targets).not.toContain("draft");
    expect(targets).not.toContain("assigned"); // no se ofrece su propia etapa
  });

  it("movimiento prohibido: no llama al servidor y explica por qué", async () => {
    const h = setup("creator");
    await act(async () => h.result.current.requestMove("d", "assigned"));
    expect(h.moveContentStatus).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Movimiento no permitido", variant: "destructive" }));
  });

  it("movimiento permitido: una llamada con (id, destino, origen) y aviso", async () => {
    const h = setup("admin");
    await act(async () => h.result.current.requestMove("a", "recording"));
    expect(h.moveContentStatus).toHaveBeenCalledTimes(1);
    expect(h.moveContentStatus).toHaveBeenCalledWith("a", "recording", "assigned");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Estado actualizado" }));
  });

  it("evita llamadas dobles mientras se guarda la misma producción", async () => {
    let release!: () => void;
    const slow = vi.fn(() => new Promise<{ ok: true }>((r) => (release = () => r({ ok: true }))));
    const h = setup("admin", { moveContentStatus: slow });
    let p1!: Promise<void>;
    act(() => {
      p1 = Promise.resolve(h.result.current.requestMove("a", "recording"));
    });
    expect(h.result.current.movingIds.has("a")).toBe(true);
    await act(async () => h.result.current.requestMove("a", "approved"));
    expect(slow).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Este cambio todavía se está guardando" }));
    await act(async () => {
      release();
      await p1;
    });
    expect(h.result.current.movingIds.has("a")).toBe(false);
  });

  it("conflicto: avisa sin sobrescribir en silencio", async () => {
    const h = setup("admin", { moveContentStatus: vi.fn(async () => ({ ok: false, reason: "conflict", serverStatus: "approved" })) });
    await act(async () => h.result.current.requestMove("a", "recording"));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Otra persona ya la movió", variant: "destructive" }));
  });

  it("error: mensaje accionable con «Reintentar»", async () => {
    const h = setup("admin", { moveContentStatus: vi.fn(async () => ({ ok: false, reason: "error", error: new Error("net") })) });
    await act(async () => h.result.current.requestMove("a", "recording"));
    const call = toast.mock.calls.at(-1)![0];
    expect(call.title).toBe("No se pudo mover");
    expect(call.description).toContain("volvió a");
    expect(call.action).toBeTruthy();
  });

  it("si la tarjeta sale de la vista filtrada, lo explica y deja acceso al detalle", async () => {
    const h = setup("admin", { filters: { ...filters, hideArchived: true } });
    await act(async () => h.result.current.requestMove("a", "archived"));
    const call = toast.mock.calls.at(-1)![0];
    expect(call.title).toBe("Salió de la vista filtrada");
    expect(call.description).toContain("Ocultar archivados");
    expect(call.action).toBeTruthy();
  });

  it("aprobar muestra la acción Compartir y registra analítica (como el selector anterior)", async () => {
    const h = setup("admin");
    await act(async () => h.result.current.requestMove("a", "approved"));
    expect(trackApproved).toHaveBeenCalled();
    expect(toast.mock.calls.at(-1)![0].title).toBe("Contenido aprobado");
  });

  it("acciones rápidas por rol conservan su flujo (no validan columnas)", async () => {
    const h = setup("creator");
    await act(async () => {
      await h.result.current.quickStatus("d", "recording" as never);
    });
    expect(h.moveContentStatus).toHaveBeenCalledWith("d", "recording", "draft");
  });
});
