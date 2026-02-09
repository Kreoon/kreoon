import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Watches for SW updates and automatically refreshes the cache.
 * Shows a brief notification before auto-reloading.
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const triggerUpdate = useCallback(() => {
    if (waitingSW && !isUpdating) {
      setIsUpdating(true);
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingSW, isUpdating]);

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
            // New SW is installed and waiting - show notification and auto-update
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

      // Check for updates periodically (every 2 minutes)
      const interval = setInterval(() => {
        registration.update().catch(() => {});
      }, 2 * 60 * 1000);

      return () => clearInterval(interval);
    } catch (err) {
      console.error('[UpdatePrompt] Error checking SW:', err);
    }
  }, []);

  // Removed auto-countdown - updates should only happen when user clicks the button
  // This prevents unexpected reloads during active form editing

  useEffect(() => {
    checkForUpdates();

    // Only reload when the user explicitly triggered the update (via button click)
    // This prevents unexpected reloads during active form editing or mid-session
    const handleControllerChange = () => {
      if (isUpdating) {
        window.location.reload();
      }
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [checkForUpdates, isUpdating]);

  const handleUpdateNow = () => {
    triggerUpdate();
  };

  if (!showPrompt) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]',
        'bg-card border border-primary/20 rounded-xl shadow-lg p-4',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm">
            🚀 Actualizando KREOON
          </h4>
          <p className="text-muted-foreground text-xs mt-1">
            Nueva versión disponible. Actualiza cuando estés listo.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleUpdateNow} className="text-xs" disabled={isUpdating}>
              {isUpdating ? 'Actualizando...' : 'Actualizar ahora'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPrompt(false)} className="text-xs">
              Después
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
