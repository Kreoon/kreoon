import { describe, it, expect } from "vitest";
import type { Content } from "@/types/database";
import {
  describeHidingFilter,
  getDueInfo,
  getFirstName,
  getInitials,
  getProductName,
  getStaleDays,
  groupContentByStatus,
  matchesClientFilters,
  parseBoardDate,
  type BoardClientFilters,
} from "./kanbanUtils";

const NOW = new Date(2026, 2, 12, 10, 0, 0); // 12 mar 2026, 10:00 local
const mk = (over: Partial<Content> & { id: string }): Content =>
  ({ title: "t", status: "draft", deadline: null, updated_at: NOW.toISOString(), created_at: NOW.toISOString(), ...over }) as Content;

describe("parseBoardDate", () => {
  it("interpreta YYYY-MM-DD en hora local (no se corre un día)", () => {
    const d = parseBoardDate("2026-03-12")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 12]);
  });
  it("devuelve null con vacío o fecha inválida", () => {
    expect(parseBoardDate(null)).toBeNull();
    expect(parseBoardDate("no es fecha")).toBeNull();
  });
});

describe("getDueInfo", () => {
  it("sin deadline NO inventa fecha (no usa created_at)", () => {
    expect(getDueInfo({ deadline: null, status: "editing" }, NOW)).toEqual({ kind: "none", label: null, ariaLabel: null });
  });
  it("«Entrega 20 mar» cuando falta tiempo", () => {
    const due = getDueInfo({ deadline: "2026-03-20", status: "editing" }, NOW);
    expect(due.kind).toBe("ok");
    expect(due.label).toBe("Entrega 20 mar");
  });
  it("vencida solo si no está entregada/aprobada/pagada/archivada", () => {
    expect(getDueInfo({ deadline: "2026-03-01", status: "editing" }, NOW).kind).toBe("overdue");
    expect(getDueInfo({ deadline: "2026-03-01", status: "editing" }, NOW).label).toBe("Vencida · 1 mar");
    for (const status of ["approved", "paid", "archived", "delivered"] as const) {
      expect(getDueInfo({ deadline: "2026-03-01", status }, NOW).kind).not.toBe("overdue");
    }
  });
  it("«pronto» a menos de 48 h", () => {
    expect(getDueInfo({ deadline: "2026-03-13", status: "recording" }, NOW).kind).toBe("soon");
  });
  it("incluye el año si no es el actual", () => {
    expect(getDueInfo({ deadline: "2027-01-05", status: "recording" }, NOW).label).toBe("Entrega 5 ene 2027");
  });
});

describe("getStaleDays", () => {
  it("estancada: ≥3 días en estados de trabajo", () => {
    const old = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
    expect(getStaleDays({ updated_at: old, status: "editing" }, NOW)).toBe(5);
  });
  it("no es estancada en estados cerrados o con cambios recientes", () => {
    const old = new Date(NOW.getTime() - 9 * 86_400_000).toISOString();
    expect(getStaleDays({ updated_at: old, status: "approved" }, NOW)).toBeNull();
    expect(getStaleDays({ updated_at: NOW.toISOString(), status: "editing" }, NOW)).toBeNull();
  });
});

describe("groupContentByStatus", () => {
  const items = [
    mk({ id: "1", status: "draft" }),
    mk({ id: "2", status: "editing", deadline: "2026-03-01" }),
    mk({ id: "3", status: "editing" }),
    mk({ id: "4", status: "estado_sin_columna" as Content["status"] }),
  ];
  it("agrupa en un solo recorrido conservando el orden, con columnas vacías incluidas", () => {
    const g = groupContentByStatus(items, ["draft", "editing", "approved"], NOW);
    expect(g.byStatus.get("draft")!.map((c) => c.id)).toEqual(["1"]);
    expect(g.byStatus.get("editing")!.map((c) => c.id)).toEqual(["2", "3"]);
    expect(g.byStatus.get("approved")).toEqual([]);
  });
  it("cuenta los vencidos por columna y los estados sin columna (huérfanos)", () => {
    const g = groupContentByStatus(items, ["draft", "editing", "approved"], NOW);
    expect(g.overdueByStatus.get("editing")).toBe(1);
    expect(g.overdueByStatus.get("draft")).toBe(0);
    expect(g.orphanCount).toBe(1);
  });
});

describe("matchesClientFilters / describeHidingFilter", () => {
  const base: BoardClientFilters = { searchTerm: "", creatorId: "all", editorId: "all", productId: "all", hideArchived: false };
  const c = mk({ id: "1", title: "Reel Sérum", client: { name: "Nova" } as Content["client"], created_at: "2026-03-10T12:00:00Z" });
  it("busca en título, descripción y cliente (sin distinguir mayúsculas)", () => {
    expect(matchesClientFilters(c, { ...base, searchTerm: "sérum" })).toBe(true);
    expect(matchesClientFilters(c, { ...base, searchTerm: "NOVA" })).toBe(true);
    expect(matchesClientFilters(c, { ...base, searchTerm: "otra" })).toBe(false);
  });
  it("el rango de fechas usa la fecha de CREACIÓN", () => {
    expect(matchesClientFilters(c, { ...base, createdFrom: new Date("2026-03-11T00:00:00Z") })).toBe(false);
    expect(matchesClientFilters(c, { ...base, createdFrom: new Date("2026-03-01T00:00:00Z"), createdTo: new Date("2026-03-31T00:00:00Z") })).toBe(true);
  });
  it("sin creador / sin editor y ocultar archivados", () => {
    expect(matchesClientFilters({ ...c, creator_id: "x" }, { ...base, creatorId: "__unassigned__" })).toBe(false);
    expect(matchesClientFilters({ ...c, editor_id: null }, { ...base, editorId: "__unassigned__" })).toBe(true);
    expect(matchesClientFilters({ ...c, status: "archived" }, { ...base, hideArchived: true })).toBe(false);
  });
  it("explica qué filtro oculta una producción", () => {
    expect(describeHidingFilter({ ...c, status: "archived" }, { ...base, hideArchived: true })).toBe("archived");
    expect(describeHidingFilter(c, { ...base, searchTerm: "zzz" })).toBe("filters");
    expect(describeHidingFilter(c, base)).toBeNull();
  });
});

describe("helpers de texto", () => {
  it("iniciales y primer nombre", () => {
    expect(getInitials("Ana Gómez")).toBe("AG");
    expect(getInitials("Sofía")).toBe("S");
    expect(getInitials(null)).toBe("?");
    expect(getFirstName("Luis Fernando Rodríguez")).toBe("Luis");
  });
  it("producto como texto u objeto", () => {
    expect(getProductName({ product: "Sérum" } as unknown as Content)).toBe("Sérum");
    expect(getProductName({ product: { name: "Kit" } } as unknown as Content)).toBe("Kit");
    expect(getProductName({ product: null } as unknown as Content)).toBeNull();
  });
});
