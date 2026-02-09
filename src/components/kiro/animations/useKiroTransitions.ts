import { useRef, useEffect, useCallback } from 'react';
import type { KiroState } from './useKiroAnimationLoop';

// =============================================================================
// TIPOS
// =============================================================================

export interface KiroTransitionValues {
  /** Progreso de la transición (0-1) */
  transitionProgress: number;
  /** Estado anterior */
  fromState: KiroState;
  /** Estado objetivo */
  toState: KiroState;
  /** Color del cuerpo interpolado */
  bodyColor: string;
  /** Color del glow interpolado */
  glowColor: string;
  /** Color de la antena interpolado */
  antennaColor: string;
  /** Ángulo de mirada temporal durante transición */
  transitionGazeX: number;
  transitionGazeY: number;
  /** Escala de expresión (para morphing) */
  expressionMorphProgress: number;
  /** Si está en medio de una transición */
  isTransitioning: boolean;
}

interface UseKiroTransitionsOptions {
  /** Estado actual de KIRO */
  kiroState: KiroState;
  /** Si las transiciones están habilitadas */
  enabled?: boolean;
  /** Duración de transición de expresión en ms */
  expressionDuration?: number;
  /** Duración de transición de color en ms */
  colorDuration?: number;
}

// =============================================================================
// CONFIGURACIÓN DE COLORES POR ESTADO
// =============================================================================

interface StateColors {
  body: string;
  glow: string;
  antenna: string;
}

const STATE_COLORS: Record<KiroState, StateColors> = {
  idle: {
    body: '#8b5cf6',
    glow: '#a78bfa',
    antenna: '#22d3ee',
  },
  listening: {
    body: '#06b6d4',
    glow: '#22d3ee',
    antenna: '#22d3ee',
  },
  thinking: {
    body: '#f59e0b',
    glow: '#fbbf24',
    antenna: '#fbbf24',
  },
  speaking: {
    body: '#10b981',
    glow: '#34d399',
    antenna: '#34d399',
  },
  working: {
    body: '#3b82f6',
    glow: '#60a5fa',
    antenna: '#60a5fa',
  },
  celebrating: {
    body: '#ec4899',
    glow: '#f472b6',
    antenna: '#f472b6',
  },
  playing: {
    body: '#8b5cf6',
    glow: '#a78bfa',
    antenna: '#a78bfa',
  },
  sleeping: {
    body: '#4c1d95',
    glow: '#6d28d9',
    antenna: '#6d28d9',
  },
};

// =============================================================================
// GESTOS DE TRANSICIÓN
// =============================================================================

interface TransitionGesture {
  gazeX: number;
  gazeY: number;
  duration: number;
}

// Gestos que KIRO hace al cambiar de estado
const TRANSITION_GESTURES: Partial<Record<`${KiroState}_${KiroState}`, TransitionGesture>> = {
  // idle → thinking: mira arriba-izquierda brevemente
  idle_thinking: { gazeX: -15, gazeY: -10, duration: 150 },
  // thinking → speaking: asienta ligeramente
  thinking_speaking: { gazeX: 0, gazeY: 5, duration: 100 },
  // speaking → idle: mira al frente
  speaking_idle: { gazeX: 0, gazeY: 0, duration: 200 },
  // idle → listening: mira ligeramente hacia arriba (atento)
  idle_listening: { gazeX: 0, gazeY: -5, duration: 100 },
  // idle → celebrating: mira arriba con emoción
  idle_celebrating: { gazeX: 0, gazeY: -15, duration: 150 },
  // celebrating → idle: vuelve al centro suavemente
  celebrating_idle: { gazeX: 0, gazeY: 0, duration: 300 },
  // idle → working: mira al "trabajo"
  idle_working: { gazeX: 10, gazeY: 5, duration: 150 },
  // idle → sleeping: ojos hacia abajo
  idle_sleeping: { gazeX: 0, gazeY: 10, duration: 200 },
  // sleeping → idle: despertar suave
  sleeping_idle: { gazeX: 0, gazeY: -5, duration: 300 },
};

// =============================================================================
// UTILIDADES DE INTERPOLACIÓN DE COLOR
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
}

function lerpColor(from: string, to: string, t: number): string {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  const r = fromRgb.r + (toRgb.r - fromRgb.r) * t;
  const g = fromRgb.g + (toRgb.g - fromRgb.g) * t;
  const b = fromRgb.b + (toRgb.b - fromRgb.b) * t;

  return rgbToHex(r, g, b);
}

// Easing function: ease-out-cubic para transiciones suaves
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export function useKiroTransitions({
  kiroState,
  enabled = true,
  expressionDuration = 200,
  colorDuration = 400,
}: UseKiroTransitionsOptions) {
  // Valores de transición (ref para evitar re-renders)
  const transitionValues = useRef<KiroTransitionValues>({
    transitionProgress: 1,
    fromState: kiroState,
    toState: kiroState,
    bodyColor: STATE_COLORS[kiroState].body,
    glowColor: STATE_COLORS[kiroState].glow,
    antennaColor: STATE_COLORS[kiroState].antenna,
    transitionGazeX: 0,
    transitionGazeY: 0,
    expressionMorphProgress: 1,
    isTransitioning: false,
  });

  // Estado anterior para detectar cambios
  const previousStateRef = useRef<KiroState>(kiroState);

  // Timestamps de inicio de transición
  const transitionStartRef = useRef<number>(0);
  const gestureStartRef = useRef<number>(0);
  const gestureActiveRef = useRef<boolean>(false);

  // Colores de inicio y destino
  const fromColorsRef = useRef<StateColors>(STATE_COLORS[kiroState]);
  const toColorsRef = useRef<StateColors>(STATE_COLORS[kiroState]);

  // Gesto actual
  const currentGestureRef = useRef<TransitionGesture | null>(null);

  // RAF ID para cleanup
  const rafIdRef = useRef<number | null>(null);

  // Iniciar transición cuando cambia el estado
  useEffect(() => {
    if (!enabled) return;
    if (kiroState === previousStateRef.current) return;

    const fromState = previousStateRef.current;
    const toState = kiroState;

    // Guardar colores de inicio y destino
    fromColorsRef.current = STATE_COLORS[fromState];
    toColorsRef.current = STATE_COLORS[toState];

    // Buscar gesto de transición
    const gestureKey = `${fromState}_${toState}` as `${KiroState}_${KiroState}`;
    currentGestureRef.current = TRANSITION_GESTURES[gestureKey] || null;

    // Actualizar valores de transición
    transitionValues.current.fromState = fromState;
    transitionValues.current.toState = toState;
    transitionValues.current.transitionProgress = 0;
    transitionValues.current.expressionMorphProgress = 0;
    transitionValues.current.isTransitioning = true;

    // Timestamps
    const now = performance.now();
    transitionStartRef.current = now;
    gestureStartRef.current = now;
    gestureActiveRef.current = currentGestureRef.current !== null;

    previousStateRef.current = kiroState;
  }, [kiroState, enabled]);

  // Loop de transición
  useEffect(() => {
    if (!enabled) return;

    const animate = () => {
      const now = performance.now();
      const values = transitionValues.current;

      if (values.isTransitioning) {
        const elapsed = now - transitionStartRef.current;

        // Progreso de expresión (más rápido)
        const expressionProgress = Math.min(1, elapsed / expressionDuration);
        values.expressionMorphProgress = easeOutCubic(expressionProgress);

        // Progreso de color (más lento)
        const colorProgress = Math.min(1, elapsed / colorDuration);
        const colorT = easeOutCubic(colorProgress);

        // Interpolar colores
        values.bodyColor = lerpColor(
          fromColorsRef.current.body,
          toColorsRef.current.body,
          colorT
        );
        values.glowColor = lerpColor(
          fromColorsRef.current.glow,
          toColorsRef.current.glow,
          colorT
        );
        values.antennaColor = lerpColor(
          fromColorsRef.current.antenna,
          toColorsRef.current.antenna,
          colorT
        );

        // Progreso general de transición
        values.transitionProgress = Math.max(expressionProgress, colorProgress);

        // Finalizar transición
        if (colorProgress >= 1 && expressionProgress >= 1) {
          values.isTransitioning = false;
        }
      }

      // Gesto de transición
      if (gestureActiveRef.current && currentGestureRef.current) {
        const gesture = currentGestureRef.current;
        const gestureElapsed = now - gestureStartRef.current;
        const gestureDuration = gesture.duration * 2; // ida y vuelta

        if (gestureElapsed < gestureDuration) {
          // Primera mitad: ir al gesto
          // Segunda mitad: volver al centro
          const halfDuration = gesture.duration;

          if (gestureElapsed < halfDuration) {
            // Ir al gesto
            const t = easeOutCubic(gestureElapsed / halfDuration);
            values.transitionGazeX = gesture.gazeX * t;
            values.transitionGazeY = gesture.gazeY * t;
          } else {
            // Volver
            const returnElapsed = gestureElapsed - halfDuration;
            const t = 1 - easeOutCubic(returnElapsed / halfDuration);
            values.transitionGazeX = gesture.gazeX * t;
            values.transitionGazeY = gesture.gazeY * t;
          }
        } else {
          // Gesto terminado
          values.transitionGazeX = 0;
          values.transitionGazeY = 0;
          gestureActiveRef.current = false;
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, expressionDuration, colorDuration]);

  // Función para obtener colores del estado actual (sin transición)
  const getStateColors = useCallback((state: KiroState): StateColors => {
    return STATE_COLORS[state];
  }, []);

  // Función para forzar una transición inmediata (sin animación)
  const skipTransition = useCallback(() => {
    const values = transitionValues.current;
    const colors = STATE_COLORS[values.toState];

    values.transitionProgress = 1;
    values.expressionMorphProgress = 1;
    values.isTransitioning = false;
    values.bodyColor = colors.body;
    values.glowColor = colors.glow;
    values.antennaColor = colors.antenna;
    values.transitionGazeX = 0;
    values.transitionGazeY = 0;
    gestureActiveRef.current = false;
  }, []);

  return {
    transitionValues,
    getStateColors,
    skipTransition,
  };
}

export { STATE_COLORS };
