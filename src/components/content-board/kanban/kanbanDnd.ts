/**
 * Motor de arrastre del tablero (@dnd-kit/core): sensores, detección de colisiones,
 * navegación por teclado entre etapas y anuncios para lectores de pantalla en español.
 */
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";

/** Distancia (px) que debe recorrer el puntero antes de que un clic se convierta en arrastre. */
export const POINTER_DISTANCE = 6;
/** Pulsación larga táctil (ms) y tolerancia (px): permite desplazarse con el dedo sin activar el arrastre. */
export const TOUCH_DELAY = 250;
export const TOUCH_TOLERANCE = 8;

/**
 * PointerSensor limitado a ratón/lápiz: el táctil lo gestiona TouchSensor con retardo
 * (si no, el desplazamiento con el dedo arrancaría un arrastre).
 */
export class MousePenSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (
        { nativeEvent: event }: { nativeEvent: PointerEvent },
        { onActivation }: { onActivation?: (a: { event: Event }) => void },
      ) => {
        if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ] as typeof PointerSensor.activators;
}

const ARROWS = ["ArrowLeft", "ArrowRight"];

/**
 * Teclado: izquierda/derecha saltan a la etapa contigua que acepta la transición
 * (las columnas deshabilitadas por permisos se omiten). El sensor desplaza el tablero si hace falta.
 */
export const kanbanKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  if (!ARROWS.includes(event.code)) return undefined;
  const { active, droppableRects, droppableContainers, collisionRect } = context;
  if (!active || !collisionRect) return undefined;
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((c): c is { id: typeof c.id; rect: NonNullable<typeof c.rect> } => !!c.rect)
    .sort((a, b) => a.rect.left - b.rect.left);
  if (columns.length === 0) return undefined;

  const cx = collisionRect.left + collisionRect.width / 2;
  let currentIdx = 0;
  let best = Infinity;
  columns.forEach((c, i) => {
    const d = Math.abs(c.rect.left + c.rect.width / 2 - cx);
    if (d < best) {
      best = d;
      currentIdx = i;
    }
  });
  const nextIdx = Math.max(0, Math.min(columns.length - 1, currentIdx + (event.code === "ArrowRight" ? 1 : -1)));
  const target = columns[nextIdx].rect;
  return {
    x: target.left + (target.width - collisionRect.width) / 2,
    y: target.top + 56,
  };
};

/** Puntero: solo cuenta la columna bajo el cursor (fuera de columnas no hay destino). Teclado: la más cercana. */
export const kanbanCollision: CollisionDetection = (args) => {
  if (args.pointerCoordinates) return pointerWithin(args);
  return closestCenter(args);
};

// Opciones como constantes de módulo: si fueran literales nuevos en cada render, `useSensors` devolvería un
// arreglo nuevo, cambiarían los `listeners` de TODAS las tarjetas y se rompería su React.memo.
const POINTER_OPTIONS = { activationConstraint: { distance: POINTER_DISTANCE } };
const TOUCH_OPTIONS = { activationConstraint: { delay: TOUCH_DELAY, tolerance: TOUCH_TOLERANCE } };
const KEYBOARD_OPTIONS = {
  coordinateGetter: kanbanKeyboardCoordinates,
  // Tab cancela (el predeterminado SOLTARÍA la tarjeta en la etapa sobre la que esté).
  keyboardCodes: { start: ["Space", "Enter"], cancel: ["Escape", "Tab"], end: ["Space", "Enter"] },
};

export function useKanbanSensors() {
  return useSensors(
    useSensor(MousePenSensor, POINTER_OPTIONS),
    useSensor(TouchSensor, TOUCH_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_OPTIONS),
  );
}

export const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para mover una producción con el teclado: pulsa Espacio o Intro sobre su asa de arrastre, usa las flechas izquierda y derecha para elegir la etapa de destino, y Espacio o Intro para soltar. Escape cancela. También puedes abrir «Más acciones» y elegir «Mover a…».",
};

export interface AnnouncementLookups {
  getTitle: (id: string) => string;
  getStageTitle: (stageId: string) => string;
  getStageOf: (id: string) => string | undefined;
}

export function createAnnouncements({ getTitle, getStageTitle, getStageOf }: AnnouncementLookups): Announcements {
  const from = (id: string) => {
    const s = getStageOf(id);
    return s ? getStageTitle(s) : "su etapa";
  };
  return {
    onDragStart({ active }) {
      const id = String(active.id);
      return `Tomaste «${getTitle(id)}», que está en ${from(id)}. Flechas izquierda y derecha para elegir etapa, Espacio para soltar, Escape para cancelar.`;
    },
    onDragOver({ active, over }) {
      const id = String(active.id);
      if (!over) return `«${getTitle(id)}» está fuera de las etapas; no se moverá.`;
      if (getStageOf(id) === String(over.id)) return `«${getTitle(id)}» sobre su etapa actual, ${getStageTitle(String(over.id))}.`;
      return `«${getTitle(id)}» sobre la etapa ${getStageTitle(String(over.id))}.`;
    },
    onDragEnd({ active, over }) {
      const id = String(active.id);
      if (!over) return `Soltaste «${getTitle(id)}» fuera de las etapas. No se movió.`;
      if (getStageOf(id) === String(over.id)) return `«${getTitle(id)}» se queda en ${getStageTitle(String(over.id))}.`;
      return `Soltaste «${getTitle(id)}» en ${getStageTitle(String(over.id))}. Guardando el cambio.`;
    },
    onDragCancel({ active }) {
      const id = String(active.id);
      return `Movimiento cancelado. «${getTitle(id)}» sigue en ${from(id)}.`;
    },
  };
}
