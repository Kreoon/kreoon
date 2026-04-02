/**
 * useMediaQuery Hook
 *
 * Hook para detectar cambios en media queries del viewport.
 */

import { useState, useEffect, useCallback } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((): boolean => {
    // Prevenir SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);

    // Handler para cambios
    const handleChange = () => {
      setMatches(mediaQueryList.matches);
    };

    // Set valor inicial
    setMatches(mediaQueryList.matches);

    // Escuchar cambios
    // Usar addEventListener si esta disponible (moderno), sino addListener (legacy)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQueryList.addListener(handleChange);
      return () => mediaQueryList.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

export default useMediaQuery;
