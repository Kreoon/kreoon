import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

// Breakpoints consistentes con Tailwind CSS
const BREAKPOINTS = {
  mobile: 768,   // < 768px
  tablet: 1024,  // 768px - 1024px
  // desktop: >= 1024px
};

/**
 * Hook que detecta el tipo de dispositivo actual basado en el viewport.
 * Usa los mismos breakpoints que el profile builder para consistencia.
 */
export function useCurrentDevice(): DeviceType {
  const [device, setDevice] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getDeviceFromWidth(window.innerWidth);
  });

  useEffect(() => {
    function handleResize() {
      setDevice(getDeviceFromWidth(window.innerWidth));
    }

    // Usar matchMedia para mejor performance
    const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
    const tabletQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`);

    function updateDevice() {
      if (mobileQuery.matches) {
        setDevice('mobile');
      } else if (tabletQuery.matches) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    }

    // Listener inicial
    updateDevice();

    // Listeners para cambios
    mobileQuery.addEventListener('change', updateDevice);
    tabletQuery.addEventListener('change', updateDevice);

    return () => {
      mobileQuery.removeEventListener('change', updateDevice);
      tabletQuery.removeEventListener('change', updateDevice);
    };
  }, []);

  return device;
}

function getDeviceFromWidth(width: number): DeviceType {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export default useCurrentDevice;
