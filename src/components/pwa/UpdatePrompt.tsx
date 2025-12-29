import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Watches for SW updates and shows a toast prompting the user to refresh.
 * Works with vite-plugin-pwa's generated registration.
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // Listen for new waiting SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW is installed and waiting
            setWaitingSW(newWorker);
            setShowPrompt(true);
          }
        });
      });

      // Check if there's already a waiting SW
      if (registration.waiting) {
        setWaitingSW(registration.waiting);
        setShowPrompt(true);
      }

      // Periodically check for updates (every 60s)
      const interval = setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);

      return () => clearInterval(interval);
    } catch (err) {
      console.error('[UpdatePrompt] Error checking SW:', err);
    }
  }, []);

  useEffect(() => {
    checkForUpdates();

    // Also listen for controlled change (SW took over)
    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [checkForUpdates]);

  const handleUpdate = () => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]',
        'bg-card border border-border rounded-xl shadow-lg p-4',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm">
            Nueva versión disponible
          </h4>
          <p className="text-muted-foreground text-xs mt-1">
            Hay una actualización lista. Actualiza para obtener las últimas mejoras.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleUpdate} className="text-xs">
              Actualizar ahora
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs">
              Más tarde
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
