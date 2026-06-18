import { useEffect, useRef, useState } from "react";

interface UseBuilderAutosaveParams {
  enabled: boolean;
  isDirty: boolean;
  delayMs: number;
  onSave: () => Promise<void>;
}

interface UseBuilderAutosaveResult {
  lastSavedAt: number | null;
  saveError: string | null;
}

/**
 * Autoguardado con debounce. Espera `delayMs` tras el ultimo cambio antes de
 * llamar a `onSave`. No guarda mientras `enabled` sea false (p.ej. carga inicial).
 */
export function useBuilderAutosave({
  enabled,
  isDirty,
  delayMs,
  onSave,
}: UseBuilderAutosaveParams): UseBuilderAutosaveResult {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const timer = setTimeout(async () => {
      try {
        await onSaveRef.current();
        setLastSavedAt(Date.now());
        setSaveError(null);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Error al guardar");
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [enabled, isDirty, delayMs]);

  return { lastSavedAt, saveError };
}
