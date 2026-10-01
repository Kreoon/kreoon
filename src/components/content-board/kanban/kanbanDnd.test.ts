import { describe, it, expect } from "vitest";
import {
  createAnnouncements,
  kanbanCollision,
  kanbanKeyboardCoordinates,
  MousePenSensor,
  POINTER_DISTANCE,
  TOUCH_DELAY,
  TOUCH_TOLERANCE,
} from "./kanbanDnd";

const rect = (left: number, width = 280) => ({ left, top: 0, right: left + width, bottom: 600, width, height: 600 });

function ctxFor(activeLeft: number, enabled: Array<[string, number]>) {
  const droppableRects = new Map(enabled.map(([id, left]) => [id, rect(left)]));
  return {
    active: { id: "c1" },
    collisionRect: rect(activeLeft, 270),
    droppableRects,
    droppableContainers: { getEnabled: () => enabled.map(([id]) => ({ id })) },
  } as never;
}
const key = (code: string) => ({ code, preventDefault() {} }) as unknown as KeyboardEvent;

describe("teclado: navegación entre etapas", () => {
  const cols: Array<[string, number]> = [["a", 0], ["b", 300], ["c", 600]];
  it("ArrowRight salta a la etapa contigua (centra la tarjeta en ella)", () => {
    const out = kanbanKeyboardCoordinates(key("ArrowRight"), { context: ctxFor(0, cols), currentCoordinates: { x: 0, y: 0 }, active: "c1" } as never) as { x: number; y: number };
    expect(out.x).toBeCloseTo(300 + (280 - 270) / 2);
  });
  it("ArrowLeft en la primera etapa se queda en ella", () => {
    const out = kanbanKeyboardCoordinates(key("ArrowLeft"), { context: ctxFor(0, cols), currentCoordinates: { x: 0, y: 0 }, active: "c1" } as never) as { x: number };
    expect(out.x).toBeCloseTo(5);
  });
  it("omite las etapas deshabilitadas (no aceptan la transición)", () => {
    const onlyAC: Array<[string, number]> = [["a", 0], ["c", 600]];
    const out = kanbanKeyboardCoordinates(key("ArrowRight"), { context: ctxFor(0, onlyAC), currentCoordinates: { x: 0, y: 0 }, active: "c1" } as never) as { x: number };
    expect(out.x).toBeCloseTo(605);
  });
  it("otras teclas no se interceptan", () => {
    expect(kanbanKeyboardCoordinates(key("KeyA"), { context: ctxFor(0, cols), currentCoordinates: { x: 0, y: 0 }, active: "c1" } as never)).toBeUndefined();
  });
});

describe("colisión", () => {
  const droppableRects = new Map([["a", rect(0)], ["b", rect(300)]]);
  const droppableContainers = [{ id: "a", rect: { current: rect(0) } }, { id: "b", rect: { current: rect(300) } }];
  const base = { droppableRects, droppableContainers, collisionRect: rect(100, 100), active: { id: "c1" }, pointerCoordinates: null } as never;
  it("con puntero solo cuenta la columna bajo el cursor (fuera = sin destino)", () => {
    const inside = kanbanCollision({ ...(base as object), pointerCoordinates: { x: 310, y: 100 } } as never);
    expect(inside.map((c) => c.id)).toEqual(["b"]);
    const outside = kanbanCollision({ ...(base as object), pointerCoordinates: { x: 290, y: 100 } } as never);
    expect(outside).toEqual([]);
  });
});

describe("configuración de sensores", () => {
  it("umbral de puntero, retardo y tolerancia táctiles definidos", () => {
    expect(POINTER_DISTANCE).toBeGreaterThanOrEqual(4);
    expect(TOUCH_DELAY).toBeGreaterThanOrEqual(150);
    expect(TOUCH_TOLERANCE).toBeGreaterThan(0);
  });
  it("el sensor de puntero ignora el táctil (lo gestiona TouchSensor)", () => {
    const act = MousePenSensor.activators[0] as { handler: (e: unknown, o: { onActivation?: () => void }) => boolean };
    let activated = false;
    const mk = (pointerType: string, button = 0) => ({ nativeEvent: { pointerType, isPrimary: true, button } });
    expect(act.handler(mk("touch"), { onActivation: () => (activated = true) })).toBe(false);
    expect(activated).toBe(false);
    expect(act.handler(mk("mouse"), { onActivation: () => (activated = true) })).toBe(true);
    expect(activated).toBe(true);
    expect(act.handler(mk("mouse", 2), {})).toBe(false);
  });
});

describe("anuncios en español", () => {
  const ann = createAnnouncements({
    getTitle: () => "Reel sérum",
    getStageTitle: (s) => ({ a: "Asignado", b: "En Grabación" })[s] ?? s,
    getStageOf: () => "a",
  });
  const active = { id: "c1" } as never;
  it("inicio, sobre etapa, soltar y cancelar", () => {
    expect(ann.onDragStart!({ active } as never)).toContain("Tomaste «Reel sérum», que está en Asignado");
    expect(ann.onDragOver!({ active, over: { id: "b" } } as never)).toBe("«Reel sérum» sobre la etapa En Grabación.");
    expect(ann.onDragOver!({ active, over: { id: "a" } } as never)).toContain("sobre su etapa actual");
    expect(ann.onDragOver!({ active, over: null } as never)).toContain("fuera de las etapas");
    expect(ann.onDragEnd!({ active, over: { id: "b" } } as never)).toContain("Soltaste «Reel sérum» en En Grabación");
    expect(ann.onDragEnd!({ active, over: null } as never)).toContain("No se movió");
    expect(ann.onDragCancel!({ active } as never)).toContain("Movimiento cancelado");
  });
});
