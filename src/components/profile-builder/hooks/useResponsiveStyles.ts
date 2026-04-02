/**
 * useResponsiveStyles - Profile Builder Pro
 *
 * Hook que aplica estilos responsive segun el viewport actual.
 * Combina estilos base con overrides de tablet/mobile.
 */

import { useMemo } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { BlockStyles } from '../types/profile-builder';

// Breakpoints (matchean con Tailwind)
const BREAKPOINTS = {
  tablet: '(max-width: 1023px)',   // < lg
  mobile: '(max-width: 767px)',    // < md
};

export type CurrentDevice = 'desktop' | 'tablet' | 'mobile';

interface UseResponsiveStylesReturn {
  /** Estilos efectivos combinando base + overrides del dispositivo actual */
  effectiveStyles: BlockStyles;
  /** Dispositivo actual detectado */
  currentDevice: CurrentDevice;
  /** Si hay overrides activos para el dispositivo actual */
  hasOverrides: boolean;
}

/**
 * Combina estilos base con overrides segun el viewport actual
 */
export function useResponsiveStyles(styles: BlockStyles): UseResponsiveStylesReturn {
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  const result = useMemo(() => {
    // Determinar dispositivo actual
    let currentDevice: CurrentDevice = 'desktop';
    if (isMobile) {
      currentDevice = 'mobile';
    } else if (isTablet) {
      currentDevice = 'tablet';
    }

    // Obtener overrides para el dispositivo
    const overrides = styles.responsiveOverrides?.[currentDevice as 'tablet' | 'mobile'];
    const hasOverrides = Boolean(overrides && Object.keys(overrides).length > 0);

    // Combinar estilos
    const effectiveStyles: BlockStyles = overrides
      ? { ...styles, ...overrides }
      : styles;

    return {
      effectiveStyles,
      currentDevice,
      hasOverrides,
    };
  }, [styles, isMobile, isTablet]);

  return result;
}

/**
 * Aplica overrides de forma estatica (para preview con dispositivo forzado)
 */
export function applyResponsiveOverrides(
  styles: BlockStyles,
  device: CurrentDevice
): BlockStyles {
  if (device === 'desktop') {
    return styles;
  }

  const overrides = styles.responsiveOverrides?.[device];
  return overrides ? { ...styles, ...overrides } : styles;
}

export default useResponsiveStyles;
