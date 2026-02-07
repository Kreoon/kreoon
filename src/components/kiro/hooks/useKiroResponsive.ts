import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export const KIRO_BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  PANEL_HEIGHT_MOBILE: '85vh',
  PANEL_HEIGHT_TABLET: '70vh',
  PANEL_HEIGHT_DESKTOP: 520,
  PANEL_WIDTH_MOBILE: '100vw',
  PANEL_WIDTH_TABLET: 380,
  PANEL_WIDTH_DESKTOP: 400,
  FLOATING_SIZE_MOBILE: 56,
  FLOATING_SIZE_DESKTOP: 64,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface KiroResponsiveState {
  /** Viewport menor a 768px */
  isMobile: boolean;
  /** Viewport entre 768px y 1024px */
  isTablet: boolean;
  /** Viewport mayor o igual a 1024px */
  isDesktop: boolean;
  /** Altura actual del viewport en px */
  viewportHeight: number;
  /** Ancho actual del viewport en px */
  viewportWidth: number;
  /** Safe area inferior para iPhones con notch */
  safeAreaBottom: number;
  /** Orientación del dispositivo */
  orientation: 'portrait' | 'landscape';
  /** Si el dispositivo soporta touch */
  isTouchDevice: boolean;
  /** Si el teclado virtual está visible (mobile) */
  keyboardVisible: boolean;
}

interface UseKiroResponsiveOptions {
  /** Callback cuando cambia la visibilidad del teclado */
  onKeyboardChange?: (visible: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta si el dispositivo soporta touch
 */
function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Obtiene el valor de safe-area-inset-bottom
 */
function getSafeAreaBottom(): number {
  if (typeof window === 'undefined') return 0;

  // Crear elemento temporal para leer CSS env()
  const div = document.createElement('div');
  div.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
  document.body.appendChild(div);
  const computedStyle = window.getComputedStyle(div);
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
  document.body.removeChild(div);

  return paddingBottom;
}

/**
 * Debounce function
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook que detecta el dispositivo y adapta el comportamiento de KIRO.
 * Usa matchMedia para breakpoints y resize con debounce para dimensiones.
 */
export function useKiroResponsive(
  options: UseKiroResponsiveOptions = {}
): KiroResponsiveState {
  const { onKeyboardChange } = options;

  // Guardar altura inicial del viewport para detectar teclado
  const initialViewportHeight = useRef<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  // Estado principal
  const [state, setState] = useState<KiroResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        viewportHeight: 0,
        viewportWidth: 0,
        safeAreaBottom: 0,
        orientation: 'portrait',
        isTouchDevice: false,
        keyboardVisible: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      isMobile: width < KIRO_BREAKPOINTS.MOBILE,
      isTablet: width >= KIRO_BREAKPOINTS.MOBILE && width < KIRO_BREAKPOINTS.TABLET,
      isDesktop: width >= KIRO_BREAKPOINTS.TABLET,
      viewportHeight: height,
      viewportWidth: width,
      safeAreaBottom: getSafeAreaBottom(),
      orientation: width > height ? 'landscape' : 'portrait',
      isTouchDevice: detectTouchDevice(),
      keyboardVisible: false,
    };
  });

  // Ref para el callback de keyboard para evitar stale closures
  const onKeyboardChangeRef = useRef(onKeyboardChange);
  onKeyboardChangeRef.current = onKeyboardChange;

  // Actualizar breakpoints con matchMedia
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mobileQuery = window.matchMedia(`(max-width: ${KIRO_BREAKPOINTS.MOBILE - 1}px)`);
    const tabletQuery = window.matchMedia(
      `(min-width: ${KIRO_BREAKPOINTS.MOBILE}px) and (max-width: ${KIRO_BREAKPOINTS.TABLET - 1}px)`
    );
    const desktopQuery = window.matchMedia(`(min-width: ${KIRO_BREAKPOINTS.TABLET}px)`);

    const handleBreakpointChange = () => {
      setState((prev) => ({
        ...prev,
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isDesktop: desktopQuery.matches,
      }));
    };

    // Listener inicial
    handleBreakpointChange();

    // Agregar listeners
    mobileQuery.addEventListener('change', handleBreakpointChange);
    tabletQuery.addEventListener('change', handleBreakpointChange);
    desktopQuery.addEventListener('change', handleBreakpointChange);

    return () => {
      mobileQuery.removeEventListener('change', handleBreakpointChange);
      tabletQuery.removeEventListener('change', handleBreakpointChange);
      desktopQuery.removeEventListener('change', handleBreakpointChange);
    };
  }, []);

  // Actualizar dimensiones con resize (debounced con requestAnimationFrame)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Cancelar RAF anterior
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Debounce de 150ms
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          const orientation: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';

          // Detectar si el teclado está visible (altura disminuyó más del 30%)
          const heightDiff = initialViewportHeight.current - height;
          const heightPercentChange = heightDiff / initialViewportHeight.current;
          const keyboardVisible = heightPercentChange > 0.3;

          setState((prev) => {
            // Notificar cambio de teclado si es diferente
            if (prev.keyboardVisible !== keyboardVisible) {
              onKeyboardChangeRef.current?.(keyboardVisible);
            }

            return {
              ...prev,
              viewportHeight: height,
              viewportWidth: width,
              orientation,
              keyboardVisible,
              safeAreaBottom: getSafeAreaBottom(),
            };
          });
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // También escuchar orientationchange para mobile
    window.addEventListener('orientationchange', () => {
      // Después de orientationchange, actualizar initialViewportHeight
      setTimeout(() => {
        initialViewportHeight.current = window.innerHeight;
        handleResize();
      }, 300); // Esperar a que termine la rotación
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Verificar viewport meta tag
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      console.warn(
        '[KIRO] No se encontró meta viewport. Para mejor experiencia mobile, ' +
          'agrega: <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
      );
    }
  }, []);

  return state;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK SIMPLIFICADO PARA SOLO DETECTAR MOBILE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook simplificado que solo retorna si es mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < KIRO_BREAKPOINTS.MOBILE;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = window.matchMedia(`(max-width: ${KIRO_BREAKPOINTS.MOBILE - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(query.matches);
    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}
