import { useEffect, useCallback, useState, type RefObject, type ReactNode } from "react";

// ─── useFocusTrap ───────────────────────────────────────────────────────────

/**
 * Atrapa el foco dentro de un contenedor (útil para modales/dialogs).
 * Al activarse, mueve el foco al primer elemento focusable y evita que Tab salga del contenedor.
 */
export function useFocusTrap(
  isActive: boolean,
  containerRef: RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    firstElement?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, containerRef]);
}

// ─── useAnnounce ────────────────────────────────────────────────────────────

/**
 * Devuelve una función para anunciar mensajes a screen readers.
 * Crea un elemento temporal con role="status" y aria-live.
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const el = document.createElement("div");
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", priority);
      el.setAttribute("aria-atomic", "true");
      el.className = "sr-only";
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    },
    []
  );

  return announce;
}

// ─── VisuallyHidden ─────────────────────────────────────────────────────────

/**
 * Texto solo para screen readers (oculto visualmente).
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

// ─── SkipLink ───────────────────────────────────────────────────────────────

/**
 * Link para saltar al contenido principal (#main-content).
 * Visible solo al recibir foco (accesibilidad por teclado).
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-kreoon-purple-500 focus:text-white focus:rounded-lg focus:shadow-kreoon-glow"
    >
      Saltar al contenido principal
    </a>
  );
}

// ─── useReducedMotion ───────────────────────────────────────────────────────

/**
 * Detecta si el usuario prefiere movimiento reducido (prefers-reduced-motion).
 * Útil para deshabilitar animaciones complejas.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return reducedMotion;
}
