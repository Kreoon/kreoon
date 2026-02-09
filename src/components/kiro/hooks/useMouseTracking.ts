import { useState, useEffect, useRef, RefObject } from 'react';

interface MouseAngle {
  x: number;
  y: number;
}

export function useMouseTracking(targetRef: RefObject<HTMLElement | null>) {
  const [mouseAngle, setMouseAngle] = useState<MouseAngle>({ x: 0, y: 0 });
  const lastUpdate = useRef(0);
  const THROTTLE_MS = 16; // ~60fps

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate.current < THROTTLE_MS) return;
      lastUpdate.current = now;

      if (!targetRef.current) return;

      const rect = targetRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const maxDist = 400;

      const normalizedX = Math.max(-1, Math.min(1, dx / maxDist));
      const normalizedY = Math.max(-1, Math.min(1, dy / maxDist));

      setMouseAngle({ x: normalizedX, y: normalizedY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [targetRef]);

  return mouseAngle;
}
