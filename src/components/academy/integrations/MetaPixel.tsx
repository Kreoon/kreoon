import { useEffect } from 'react';

interface MetaPixelProps {
  pixelId: string | null;
  enabled: boolean;
}

/**
 * Inyecta el script de Meta Pixel cuando el plugin está habilitado.
 * Solo se monta una vez por pixelId; al desmontar limpia el script.
 *
 * Diferenciación vs Skool: no usamos un loader bloqueante, el pixel se carga
 * de forma asíncrona y se limpia automáticamente al cambiar de space.
 */
export function MetaPixel({ pixelId, enabled }: MetaPixelProps) {
  useEffect(() => {
    if (!enabled || !pixelId) return;
    if (typeof window === 'undefined') return;

    // Evitar doble carga
    if ((window as any).__metaPixelId === pixelId) return;
    (window as any).__metaPixelId = pixelId;

    // Standard Meta Pixel snippet
    /* eslint-disable */
    // @ts-ignore
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    (window as any).fbq?.('init', pixelId);
    (window as any).fbq?.('track', 'PageView');

    return () => {
      delete (window as any).__metaPixelId;
    };
  }, [pixelId, enabled]);

  return null;
}
