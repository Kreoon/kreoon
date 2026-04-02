import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ProfileBlock } from '../types/profile-builder';

// ─── Constantes ───────────────────────────────────────────────────────────────

const AUTO_SAVE_DEBOUNCE_MS = 30_000; // 30 segundos

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UseAutoSaveOptions {
  /** Bloques actuales del builder */
  blocks: ProfileBlock[];
  /** Si hay cambios sin guardar */
  isDirty: boolean;
  /** Función que persiste los bloques como borrador */
  onSave: (blocks: ProfileBlock[], isDraft: boolean) => Promise<void> | void;
  /** Callback opcional al completar el guardado */
  onSaveSuccess?: () => void;
  /** Deshabilitar el auto-guardado temporalmente */
  disabled?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAutoSave({
  blocks,
  isDirty,
  onSave,
  onSaveSuccess,
  disabled = false,
}: UseAutoSaveOptions): void {
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Guardamos la referencia a onSave y onSaveSuccess para no re-triggear el effect
  const onSaveRef = useRef(onSave);
  const onSaveSuccessRef = useRef(onSaveSuccess);
  useEffect(() => {
    onSaveRef.current = onSave;
    onSaveSuccessRef.current = onSaveSuccess;
  });

  const executeSave = useCallback(
    async (blocksSnapshot: ProfileBlock[]) => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;

      try {
        await onSaveRef.current(blocksSnapshot, true);

        toast({
          title: 'Guardado automático',
          description: 'Los cambios se guardaron como borrador.',
        });

        onSaveSuccessRef.current?.();
      } catch (err) {
        console.error('[useAutoSave] Error en guardado automático:', err);
        // No mostramos toast de error para no interrumpir al usuario
      } finally {
        isSavingRef.current = false;
      }
    },
    [toast]
  );

  useEffect(() => {
    // Limpiar cualquier timer previo
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // No programar si no hay cambios, está deshabilitado o no hay bloques
    if (!isDirty || disabled || blocks.length === 0) return;

    // Capturamos snapshot actual para evitar closures desactualizadas
    const blocksSnapshot = blocks;

    timerRef.current = setTimeout(() => {
      executeSave(blocksSnapshot);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [blocks, isDirty, disabled, executeSave]);

  // Limpiar el timer al desmontar el componente
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
