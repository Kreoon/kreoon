/** Utilidades de foco del tablero (devolver el foco a una tarjeta tras mover/cerrar el detalle). */

const escapeId = (id: string) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"'));

export type CardFocusTarget = "handle" | "open";

/**
 * Enfoca el asa o el botón de apertura de una tarjeta. Reintenta unos fotogramas porque, tras un
 * movimiento optimista, la tarjeta se vuelve a montar en otra columna.
 */
export function focusCard(contentId: string, target: CardFocusTarget = "open", attempts = 6): void {
  if (typeof document === "undefined") return;
  const selector = target === "handle" ? "[data-handle]" : ".kb-open";
  const tryFocus = (left: number) => {
    const el = document.querySelector<HTMLElement>(`[data-card-id="${escapeId(contentId)}"] ${selector}`);
    if (el) {
      el.focus({ preventScroll: false });
      if (document.activeElement === el) return;
    }
    if (left > 0) requestAnimationFrame(() => tryFocus(left - 1));
  };
  requestAnimationFrame(() => tryFocus(attempts));
}

/**
 * Tras cerrar el detalle (un diálogo Radix sin disparador asociado) el foco cae en <body>.
 * Espera a que no quede ningún diálogo abierto y, si el foco se perdió, lo devuelve a la tarjeta
 * que abrió el detalle. No hace nada si el usuario ya movió el foco a otro sitio.
 */
export function restoreFocusToCard(contentId: string, maxMs = 2000): void {
  if (typeof document === "undefined") return;
  const started = Date.now();
  const tick = () => {
    // Cualquier diálogo aún en el DOM (también el que está animando su salida) cuenta como "no terminó de cerrarse".
    const openDialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
    const active = document.activeElement;
    const lost = !active || active === document.body || active === document.documentElement;
    if (!openDialog) {
      if (lost) focusCard(contentId, "open");
      return;
    }
    if (Date.now() - started < maxMs) setTimeout(tick, 60);
  };
  setTimeout(tick, 60);
}
