import type { Variants, Transition } from "framer-motion";

/**
 * Configuraciones reutilizables de animaciones para framer-motion.
 */

export const FADE_IN_UP: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: "easeOut" },
};

export const FADE_IN_DOWN: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.4, ease: "easeOut" },
};

export const FADE_IN_LEFT: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export const FADE_IN_RIGHT: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export const SCALE_IN: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3, ease: "easeOut" },
};

export const STAGGER_CONTAINER: Variants = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

export const STAGGER_ITEM: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const GLOW_PULSE: Variants = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(124, 58, 237, 0.2)",
      "0 0 40px rgba(124, 58, 237, 0.4)",
      "0 0 20px rgba(124, 58, 237, 0.2)",
    ],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const FLOAT: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

export const SLIDE_IN_MODAL: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
  transition: { duration: 0.2, ease: "easeOut" },
};

// --- Helpers ---

type VariantsWithTransition = Variants & { transition?: Transition };

/**
 * Crear variantes con delay custom.
 */
export function withDelay(
  variants: VariantsWithTransition,
  delay: number
): VariantsWithTransition {
  const baseTransition = variants.transition ?? {};
  return {
    ...variants,
    transition:
      typeof baseTransition === "object" && !Array.isArray(baseTransition)
        ? { ...baseTransition, delay }
        : { delay, duration: 0.4, ease: "easeOut" },
  };
}

/**
 * Crear stagger con timing custom.
 */
export function createStagger(staggerTime = 0.1): Variants {
  return {
    animate: {
      transition: { staggerChildren: staggerTime },
    },
  };
}

/**
 * Hook para animación en viewport.
 * Úsalo con motion components que tengan variants con keys "initial" y "animate".
 */
export function useScrollAnimation(): {
  initial: "initial";
  whileInView: "animate";
  viewport: { once: boolean; margin: string };
} {
  return {
    initial: "initial",
    whileInView: "animate",
    viewport: { once: true, margin: "-100px" },
  };
}
