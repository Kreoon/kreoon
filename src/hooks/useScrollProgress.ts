import { useState, useEffect } from "react";

/**
 * Devuelve el progreso de scroll (0-100). Útil para barras de progreso de lectura.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setProgress(0);
        return;
      }
      const value = (window.scrollY / totalHeight) * 100;
      setProgress(Math.min(value, 100));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return progress;
}
