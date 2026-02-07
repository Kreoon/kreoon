import { useCallback, useRef, useMemo } from 'react';
import type { KiroZone } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface KiroPosition {
  x: number;
  y: number;
}

export interface KiroChatMessage {
  id: string;
  text: string;
  isKiro: boolean;
  timestamp: number;
  zone?: KiroZone;
}

export interface KiroPreferences {
  isVisible: boolean;
  defaultTab: 'chat' | 'actions' | 'game';
  soundEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  POSITION: 'kiro-position',
  CHAT_HISTORY: 'kiro-chat-history',
  PREFERENCES: 'kiro-preferences',
} as const;

const MAX_MESSAGES = 50;
const DEBOUNCE_MS = 300;

const DEFAULT_PREFERENCES: KiroPreferences = {
  isVisible: true,
  defaultTab: 'chat',
  soundEnabled: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intenta guardar en localStorage con manejo de errores para modo incógnito
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // localStorage no disponible (modo incógnito, storage lleno, etc.)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[KIRO Persistence] No se pudo guardar ${key}:`, error);
    }
    return false;
  }
}

/**
 * Intenta leer de localStorage con manejo de errores
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[KIRO Persistence] No se pudo leer ${key}:`, error);
    }
    return null;
  }
}

/**
 * Intenta eliminar de localStorage con manejo de errores
 */
function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[KIRO Persistence] No se pudo eliminar ${key}:`, error);
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook que centraliza toda la lógica de persistencia de KIRO usando localStorage.
 *
 * @example
 * ```tsx
 * const {
 *   savePosition,
 *   loadPosition,
 *   saveMessages,
 *   loadMessages,
 *   clearMessages,
 *   savePreferences,
 *   loadPreferences,
 * } = useKiroPersistence();
 * ```
 */
export function useKiroPersistence() {
  // Ref para el debounce de posición
  const positionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // POSICIÓN DEL WIDGET
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Guarda la posición del widget con debounce de 300ms.
   * Esto evita saturar localStorage durante el arrastre.
   */
  const savePosition = useCallback((x: number, y: number) => {
    // Limpiar timeout anterior si existe
    if (positionTimeoutRef.current) {
      clearTimeout(positionTimeoutRef.current);
    }

    // Aplicar debounce
    positionTimeoutRef.current = setTimeout(() => {
      const position: KiroPosition = { x, y };
      safeSetItem(STORAGE_KEYS.POSITION, JSON.stringify(position));
    }, DEBOUNCE_MS);
  }, []);

  /**
   * Carga la posición guardada del widget.
   * Retorna null si no hay posición guardada o si hay error.
   */
  const loadPosition = useCallback((): KiroPosition | null => {
    const stored = safeGetItem(STORAGE_KEYS.POSITION);
    if (!stored) return null;

    try {
      const position = JSON.parse(stored) as KiroPosition;
      // Validar que los valores son números válidos
      if (typeof position.x === 'number' && typeof position.y === 'number') {
        return position;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Limpia la posición guardada (reset a default).
   */
  const clearPosition = useCallback(() => {
    if (positionTimeoutRef.current) {
      clearTimeout(positionTimeoutRef.current);
    }
    safeRemoveItem(STORAGE_KEYS.POSITION);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORIAL DE CHAT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Guarda los mensajes del chat.
   * Solo guarda los últimos 50 mensajes para no llenar localStorage.
   */
  const saveMessages = useCallback((messages: KiroChatMessage[]) => {
    // Tomar solo los últimos MAX_MESSAGES
    const trimmedMessages = messages.slice(-MAX_MESSAGES);
    safeSetItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(trimmedMessages));
  }, []);

  /**
   * Carga el historial de mensajes guardado.
   * Retorna array vacío si no hay historial o hay error.
   */
  const loadMessages = useCallback((): KiroChatMessage[] => {
    const stored = safeGetItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!stored) return [];

    try {
      const messages = JSON.parse(stored) as KiroChatMessage[];
      // Validar que es un array
      if (Array.isArray(messages)) {
        return messages;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  /**
   * Limpia todo el historial de chat.
   */
  const clearMessages = useCallback(() => {
    safeRemoveItem(STORAGE_KEYS.CHAT_HISTORY);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // PREFERENCIAS DE UI
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Guarda las preferencias de UI del usuario.
   */
  const savePreferences = useCallback((prefs: Partial<KiroPreferences>) => {
    // Cargar preferencias actuales y mergear con las nuevas
    const current = loadPreferencesInternal();
    const updated = { ...current, ...prefs };
    safeSetItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
  }, []);

  /**
   * Función interna para cargar preferencias (usada por savePreferences).
   */
  const loadPreferencesInternal = (): KiroPreferences => {
    const stored = safeGetItem(STORAGE_KEYS.PREFERENCES);
    if (!stored) return DEFAULT_PREFERENCES;

    try {
      const prefs = JSON.parse(stored) as Partial<KiroPreferences>;
      // Mergear con defaults para asegurar todos los campos
      return { ...DEFAULT_PREFERENCES, ...prefs };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  };

  /**
   * Carga las preferencias de UI guardadas.
   * Retorna valores por defecto si no hay preferencias o hay error.
   */
  const loadPreferences = useCallback((): KiroPreferences => {
    return loadPreferencesInternal();
  }, []);

  /**
   * Resetea las preferencias a valores por defecto.
   */
  const clearPreferences = useCallback(() => {
    safeRemoveItem(STORAGE_KEYS.PREFERENCES);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LIMPIEZA TOTAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Limpia todos los datos de KIRO de localStorage.
   */
  const clearAll = useCallback(() => {
    clearPosition();
    clearMessages();
    clearPreferences();
  }, [clearPosition, clearMessages, clearPreferences]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return useMemo(
    () => ({
      // Posición
      savePosition,
      loadPosition,
      clearPosition,

      // Chat
      saveMessages,
      loadMessages,
      clearMessages,

      // Preferencias
      savePreferences,
      loadPreferences,
      clearPreferences,

      // Global
      clearAll,

      // Constantes útiles
      MAX_MESSAGES,
      DEFAULT_PREFERENCES,
    }),
    [
      savePosition,
      loadPosition,
      clearPosition,
      saveMessages,
      loadMessages,
      clearMessages,
      savePreferences,
      loadPreferences,
      clearPreferences,
      clearAll,
    ]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { STORAGE_KEYS };
