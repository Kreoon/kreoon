/**
 * AdnResearchV3Modal
 * Modal contenedor del flujo completo de ADN Recargado v3
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdnResearchV3Configurator } from "./AdnResearchV3Configurator";
import { AdnResearchV3Progress } from "./AdnResearchV3Progress";
import { useAdnResearchV3 } from "@/hooks/use-adn-research-v3";
import type { AdnResearchV3Config } from "@/types/adn-research-v3";

type ModalState = "configuring" | "processing" | "completed";

interface AdnResearchV3ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productDnaId: string;
  clientDnaId?: string;
  productName: string;
  productDescription: string;
  completenessScore: number;
  hasClientDna: boolean;
  clientDnaName?: string;
  userTokenBalance: number;
  onComplete?: () => void;
  useLiteMode?: boolean; // Usar orchestrator-lite con n8n webhook
}

export function AdnResearchV3Modal({
  open,
  onOpenChange,
  productId,
  productDnaId,
  clientDnaId,
  productName,
  productDescription,
  completenessScore,
  hasClientDna,
  clientDnaName,
  userTokenBalance,
  onComplete,
  useLiteMode = false,
}: AdnResearchV3ModalProps) {
  const [state, setState] = useState<ModalState>("configuring");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const {
    session,
    isLoading,
    isRunning,
    isCompleted,
    start,
    startLite,
    cancel,
  } = useAdnResearchV3({ productId, useLiteMode });

  // Handle start
  const handleStart = useCallback(
    async (config: AdnResearchV3Config) => {
      let success: boolean;

      if (useLiteMode) {
        // Modo lite: usar n8n webhook
        success = await startLite();
      } else {
        // Modo estándar
        success = await start({
          productDnaId,
          clientDnaId,
          config,
        });
      }

      if (success) {
        setState("processing");
      }
    },
    [start, startLite, useLiteMode, productDnaId, clientDnaId]
  );

  // Handle close attempt
  const handleCloseAttempt = useCallback(() => {
    if (isRunning) {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [isRunning, onOpenChange]);

  // Handle confirm cancel
  const handleConfirmCancel = useCallback(async () => {
    await cancel();
    setShowCancelConfirm(false);
    onOpenChange(false);
  }, [cancel, onOpenChange]);

  // Handle complete
  const handleComplete = useCallback(() => {
    setState("completed");
    onComplete?.();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  // Sync state with session
  if (session) {
    if (session.status === "completed" && state !== "completed") {
      // Research finished
    } else if (isRunning && state === "configuring") {
      setState("processing");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {state === "configuring"
                ? "Configurar ADN Recargado"
                : state === "processing"
                ? "Generando ADN Recargado"
                : "ADN Recargado Completado"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {state === "configuring" && (
              <AdnResearchV3Configurator
                productDnaId={productDnaId}
                clientDnaId={clientDnaId}
                productName={productName}
                productDescription={productDescription}
                completenessScore={completenessScore}
                hasClientDna={hasClientDna}
                clientDnaName={clientDnaName}
                userTokenBalance={userTokenBalance}
                onStart={handleStart}
                onCancel={() => onOpenChange(false)}
                isLoading={isLoading}
              />
            )}

            {state === "processing" && session && (
              <AdnResearchV3Progress
                session={session}
                onComplete={handleComplete}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar análisis?</AlertDialogTitle>
            <AlertDialogDescription>
              El análisis está en progreso. Si cancelas, perderás el progreso actual
              y los tokens consumidos no serán reembolsados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar análisis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
