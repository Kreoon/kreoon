import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { KiroState, KiroExpression } from '@/contexts/KiroContext';
import {
  type KiroNotification,
  type NewKiroNotification,
  generateNotificationId,
  getNotificationConfig,
  filterOldNotifications,
} from '../types/notifications';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'kreoon_kiro_notifications';
const MAX_NOTIFICATIONS = 100;
const KIRO_REACTION_DURATION_MS = 3000;

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE PERSISTENCIA
// ═══════════════════════════════════════════════════════════════════════════

function loadNotificationsFromStorage(): KiroNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const notifications = JSON.parse(stored) as KiroNotification[];
    if (!Array.isArray(notifications)) return [];

    // Filtrar notificaciones antiguas (más de 7 días)
    return filterOldNotifications(notifications);
  } catch {
    return [];
  }
}

function saveNotificationsToStorage(notifications: KiroNotification[]): void {
  try {
    // Solo guardar las últimas MAX_NOTIFICATIONS
    const toSave = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[KIRO Notifications] Error guardando notificaciones:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface UseKiroNotificationsOptions {
  /** Callback para cambiar el estado de KIRO */
  onKiroStateChange?: (state: KiroState) => void;
  /** Callback para cambiar la expresión de KIRO */
  onKiroExpressionChange?: (expression: KiroExpression) => void;
}

interface UseKiroNotificationsReturn {
  /** Lista de notificaciones ordenadas por timestamp (más reciente primero) */
  notifications: KiroNotification[];
  /** Cantidad de notificaciones no leídas y no descartadas */
  unreadCount: number;
  /** Agrega una nueva notificación */
  addNotification: (notification: NewKiroNotification) => KiroNotification;
  /** Marca una notificación como leída */
  markAsRead: (id: string) => void;
  /** Marca todas las notificaciones como leídas */
  markAllAsRead: () => void;
  /** Descarta una notificación */
  dismissNotification: (id: string) => void;
  /** Limpia todas las notificaciones */
  clearAll: () => void;
  /** Obtiene una notificación por ID */
  getNotificationById: (id: string) => KiroNotification | undefined;
}

/**
 * Hook que maneja toda la lógica de notificaciones de KIRO.
 * Incluye persistencia, auto-dismiss, y reacciones de KIRO.
 */
export function useKiroNotifications(
  options: UseKiroNotificationsOptions = {}
): UseKiroNotificationsReturn {
  const { onKiroStateChange, onKiroExpressionChange } = options;

  // ─────────────────────────────────────────────────────────────────────────
  // Estado
  // ─────────────────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<KiroNotification[]>(() =>
    loadNotificationsFromStorage()
  );

  // Refs para auto-dismiss timeouts
  const autoDismissTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const kiroReactionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed: conteo de no leídas
  // ─────────────────────────────────────────────────────────────────────────
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read && !n.dismissed).length;
  }, [notifications]);

  // ─────────────────────────────────────────────────────────────────────────
  // Persistencia: guardar cuando cambian las notificaciones
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

  // ─────────────────────────────────────────────────────────────────────────
  // Limpiar timeouts al desmontar
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Limpiar todos los timeouts de auto-dismiss
      autoDismissTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      autoDismissTimeouts.current.clear();

      // Limpiar timeout de reacción de KIRO
      if (kiroReactionTimeout.current) {
        clearTimeout(kiroReactionTimeout.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Función para programar auto-dismiss
  // ─────────────────────────────────────────────────────────────────────────
  const scheduleAutoDismiss = useCallback((notificationId: string, seconds: number) => {
    const timeout = setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, dismissed: true } : n))
      );
      autoDismissTimeouts.current.delete(notificationId);
    }, seconds * 1000);

    autoDismissTimeouts.current.set(notificationId, timeout);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Función para hacer reaccionar a KIRO
  // ─────────────────────────────────────────────────────────────────────────
  const triggerKiroReaction = useCallback(
    (state: KiroState, expression: KiroExpression) => {
      // Cancelar reacción anterior si existe
      if (kiroReactionTimeout.current) {
        clearTimeout(kiroReactionTimeout.current);
      }

      // Cambiar estado y expresión de KIRO
      onKiroStateChange?.(state);
      onKiroExpressionChange?.(expression);

      // Volver a estado normal después de la duración
      kiroReactionTimeout.current = setTimeout(() => {
        onKiroStateChange?.('idle');
        onKiroExpressionChange?.('neutral');
      }, KIRO_REACTION_DURATION_MS);
    },
    [onKiroStateChange, onKiroExpressionChange]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Agregar notificación
  // ─────────────────────────────────────────────────────────────────────────
  const addNotification = useCallback(
    (newNotification: NewKiroNotification): KiroNotification => {
      const notification: KiroNotification = {
        ...newNotification,
        id: generateNotificationId(),
        read: false,
        dismissed: false,
        timestamp: Date.now(),
      };

      // Agregar a la lista (al principio para orden descendente)
      setNotifications((prev) => {
        const updated = [notification, ...prev];
        // Limitar a MAX_NOTIFICATIONS
        return updated.slice(0, MAX_NOTIFICATIONS);
      });

      // Obtener configuración del tipo
      const config = getNotificationConfig(notification.type);

      // Hacer reaccionar a KIRO
      triggerKiroReaction(config.kiroState, config.kiroExpression);

      // Programar auto-dismiss si aplica
      if (config.autoDismissSeconds !== null) {
        scheduleAutoDismiss(notification.id, config.autoDismissSeconds);
      }

      return notification;
    },
    [triggerKiroReaction, scheduleAutoDismiss]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Marcar como leída
  // ─────────────────────────────────────────────────────────────────────────
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Marcar todas como leídas
  // ─────────────────────────────────────────────────────────────────────────
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Descartar notificación
  // ─────────────────────────────────────────────────────────────────────────
  const dismissNotification = useCallback((id: string) => {
    // Cancelar auto-dismiss si existe
    const timeout = autoDismissTimeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      autoDismissTimeouts.current.delete(id);
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
    );
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Limpiar todas
  // ─────────────────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    // Cancelar todos los auto-dismiss
    autoDismissTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    autoDismissTimeouts.current.clear();

    setNotifications([]);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Obtener por ID
  // ─────────────────────────────────────────────────────────────────────────
  const getNotificationById = useCallback(
    (id: string): KiroNotification | undefined => {
      return notifications.find((n) => n.id === id);
    },
    [notifications]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    getNotificationById,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { STORAGE_KEY as NOTIFICATIONS_STORAGE_KEY, MAX_NOTIFICATIONS };
