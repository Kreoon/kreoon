import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, Loader2 } from 'lucide-react';

// UX-C02b + UX-C03: Componente de estado vacío con polling automático
export function EmptyBrandClientState({ onRetry }: { onRetry: () => Promise<void> }) {
  const [polling, setPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [failed, setFailed] = useState(false);
  const MAX_ATTEMPTS = 3;
  const POLL_INTERVAL_MS = 3000;

  useEffect(() => {
    let cancelled = false;

    const runPolling = async () => {
      setPolling(true);
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) break;
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) break;
        setAttempts(i + 1);
        await onRetry();
      }
      if (!cancelled) {
        setPolling(false);
        setFailed(true);
      }
    };

    runPolling();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Building2 className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-xl font-semibold mb-2">Configurando tu empresa</h2>
      {polling ? (
        <>
          <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
          <p className="text-muted-foreground text-center max-w-md">
            Vinculando tu empresa con la plataforma&hellip; ({attempts}/{MAX_ATTEMPTS})
          </p>
        </>
      ) : failed ? (
        <>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            No pudimos detectar tu empresa automáticamente.
            Contacta a soporte o intenta de nuevo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => { setFailed(false); setAttempts(0); setPolling(false); onRetry(); }}>
              Intentar de nuevo
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:soporte@kreoon.com">Contactar soporte</a>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
