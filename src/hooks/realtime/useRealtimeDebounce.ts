/**
 * Sistema de debounce para prevenir loops en actualizaciones realtime
 *
 * Cuando un usuario hace una actualización local:
 * 1. Se marca el ID como "actualizado localmente"
 * 2. Eventos realtime para ese ID se ignoran por X segundos
 * 3. Esto previene: update local → realtime event → refetch innecesario
 */

import type { LocalUpdate } from './types';

// Duración por defecto del debounce (3 segundos)
const DEFAULT_DEBOUNCE_MS = 3000;

// Map global de actualizaciones locales recientes
const recentLocalUpdates = new Map<string, LocalUpdate>();
const localUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Marca un item como recientemente actualizado localmente
 * Los eventos realtime para este item se ignorarán durante durationMs
 *
 * @param itemId - ID del item actualizado
 * @param modifiedFields - Campos que se modificaron (opcional, default: ['*'] = todos)
 * @param durationMs - Duración del debounce (opcional, default: 3000ms)
 */
export function markLocalUpdate(
  itemId: string,
  modifiedFields: string[] = ['*'],
  durationMs: number = DEFAULT_DEBOUNCE_MS
): void {
  // Limpiar timer existente para este item
  const existingTimer = localUpdateTimers.get(itemId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Marcar como actualizado con los campos modificados
  recentLocalUpdates.set(itemId, {
    timestamp: Date.now(),
    fields: new Set(modifiedFields),
  });

  // Configurar timer para limpiar después del debounce
  const timer = setTimeout(() => {
    recentLocalUpdates.delete(itemId);
    localUpdateTimers.delete(itemId);
  }, durationMs);

  localUpdateTimers.set(itemId, timer);
}

/**
 * Extiende la ventana de debounce para un item existente
 * Útil para operaciones largas como encoding de video
 *
 * @param itemId - ID del item
 * @param additionalMs - Tiempo adicional a agregar
 */
export function extendLocalUpdateWindow(
  itemId: string,
  additionalMs: number
): void {
  const existing = recentLocalUpdates.get(itemId);
  if (!existing) return;

  // Limpiar timer existente
  const existingTimer = localUpdateTimers.get(itemId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Calcular tiempo restante + adicional
  const elapsed = Date.now() - existing.timestamp;
  const remainingTime = Math.max(0, DEFAULT_DEBOUNCE_MS - elapsed) + additionalMs;

  // Nuevo timer
  const timer = setTimeout(() => {
    recentLocalUpdates.delete(itemId);
    localUpdateTimers.delete(itemId);
  }, remainingTime);

  localUpdateTimers.set(itemId, timer);
}

/**
 * Verifica si un evento realtime debe ignorarse
 *
 * @param itemId - ID del item del evento realtime
 * @param changedFields - Campos que cambiaron en el evento (opcional)
 * @returns true si el evento debe ignorarse (fue una actualización local reciente)
 */
export function shouldSkipRealtimeEvent(
  itemId: string | undefined,
  changedFields?: string[]
): boolean {
  if (!itemId) return false;

  const localUpdate = recentLocalUpdates.get(itemId);
  if (!localUpdate) return false;

  // Si se marcó con '*', ignorar todos los campos
  if (localUpdate.fields.has('*')) return true;

  // Si no se especifican campos cambiados, ignorar por seguridad
  if (!changedFields || changedFields.length === 0) return true;

  // Solo ignorar si TODOS los campos cambiados están en los marcados localmente
  return changedFields.every(field => localUpdate.fields.has(field));
}

/**
 * Detecta qué campos cambiaron entre dos objetos
 *
 * @param oldObj - Objeto anterior
 * @param newObj - Objeto nuevo
 * @returns Array de nombres de campos que cambiaron
 */
export function detectChangedFields<T extends Record<string, unknown>>(
  oldObj: T | null | undefined,
  newObj: T | null | undefined
): string[] {
  if (!oldObj || !newObj) return ['*'];

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changedFields.push(key);
    }
  }

  return changedFields.length > 0 ? changedFields : [];
}

/**
 * Limpia todos los debounces pendientes
 * Útil para cleanup en desarrollo/testing
 */
export function clearAllLocalUpdates(): void {
  for (const timer of localUpdateTimers.values()) {
    clearTimeout(timer);
  }
  recentLocalUpdates.clear();
  localUpdateTimers.clear();
}

/**
 * Obtiene el estado actual de debounces (para debugging)
 */
export function getDebounceState(): { count: number; ids: string[] } {
  return {
    count: recentLocalUpdates.size,
    ids: Array.from(recentLocalUpdates.keys()),
  };
}
