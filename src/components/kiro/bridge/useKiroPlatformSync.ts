/**
 * useKiroPlatformSync.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * Hook de sincronización en tiempo real entre las notificaciones de la
 * plataforma (user_notifications) y el sistema de notificaciones de KIRO.
 * Maneja sincronización bidireccional y eventos de reacción.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserNotification } from '@/hooks/useUserNotifications';
import type { KiroNotification } from '../types/notifications';
import {
  transformPlatformNotification,
  transformPlatformNotifications,
  getKiroReactionForNotification,
  shouldVibrateAntenna,
  getConfettiType,
  getVoiceAnnouncementForNotification,
  syncReadStatus,
  findMissingNotifications,
} from './KiroNotificationBridge';
import type { KiroVoiceEmotion } from './KiroNotificationBridge';
import type { KiroReactionType, KiroConfettiType } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface KiroPlatformSyncOptions {
  /** Si la sincronización está habilitada */
  enabled?: boolean;
  /** Callback cuando llega una nueva notificación */
  onNewNotification?: (notification: KiroNotification) => void;
  /** Callback para disparar reacción de KIRO */
  onTriggerReaction?: (reaction: KiroReactionType) => void;
  /** Callback para vibrar antena */
  onVibrateAntenna?: () => void;
  /** Callback para disparar confetti */
  onTriggerConfetti?: (type: KiroConfettiType) => void;
  /** Callback para anuncio de voz de KIRO */
  onVoiceAnnouncement?: (text: string, emotion: KiroVoiceEmotion) => void;
  /** Notificaciones KIRO actuales (para sincronización) */
  currentKiroNotifications?: KiroNotification[];
  /** Callback para actualizar notificaciones KIRO */
  onUpdateNotifications?: (notifications: KiroNotification[]) => void;
}

export interface KiroPlatformSyncState {
  /** Estado de conexión con la plataforma */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Última sincronización exitosa */
  lastSyncTimestamp: number | null;
  /** Cantidad de notificaciones sincronizadas */
  syncedCount: number;
  /** Si hay sincronización pendiente */
  hasPendingSync: boolean;
  /** Error de conexión (si hay) */
  error: string | null;
}

export interface KiroPlatformSyncReturn {
  /** Estado de la sincronización */
  state: KiroPlatformSyncState;
  /** Forzar sincronización manual */
  forceSync: () => Promise<void>;
  /** Marcar notificación como leída (sincroniza con plataforma) */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Marcar todas como leídas */
  markAllAsRead: () => Promise<void>;
  /** Notificaciones de plataforma transformadas */
  platformNotifications: KiroNotification[];
  /** Conteo de no leídas */
  unreadCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const SYNC_DEBOUNCE_MS = 500;
const MAX_NOTIFICATIONS = 50;

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function useKiroPlatformSync({
  enabled = true,
  onNewNotification,
  onTriggerReaction,
  onVibrateAntenna,
  onTriggerConfetti,
  onVoiceAnnouncement,
  currentKiroNotifications = [],
  onUpdateNotifications,
}: KiroPlatformSyncOptions = {}): KiroPlatformSyncReturn {
  const { user, profile } = useAuth();
  const organizationId = profile?.current_organization_id;

  // Estado de sincronización
  const [state, setState] = useState<KiroPlatformSyncState>({
    connectionStatus: 'connecting',
    lastSyncTimestamp: null,
    syncedCount: 0,
    hasPendingSync: false,
    error: null,
  });

  // Notificaciones de plataforma transformadas
  const [platformNotifications, setPlatformNotifications] = useState<KiroNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs para evitar dependencias en efectos
  const callbacksRef = useRef({
    onNewNotification,
    onTriggerReaction,
    onVibrateAntenna,
    onTriggerConfetti,
    onVoiceAnnouncement,
    onUpdateNotifications,
  });

  // Actualizar refs cuando cambian callbacks
  useEffect(() => {
    callbacksRef.current = {
      onNewNotification,
      onTriggerReaction,
      onVibrateAntenna,
      onTriggerConfetti,
      onVoiceAnnouncement,
      onUpdateNotifications,
    };
  }, [onNewNotification, onTriggerReaction, onVibrateAntenna, onTriggerConfetti, onVoiceAnnouncement, onUpdateNotifications]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch inicial de notificaciones
  // ─────────────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !organizationId || !enabled) return;

    try {
      setState(prev => ({ ...prev, hasPendingSync: true }));

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (error) throw error;

      const typedData = (data || []) as UserNotification[];
      const transformed = transformPlatformNotifications(typedData);

      setPlatformNotifications(transformed);
      setUnreadCount(transformed.filter(n => !n.read).length);

      setState(prev => ({
        ...prev,
        connectionStatus: 'connected',
        lastSyncTimestamp: Date.now(),
        syncedCount: transformed.length,
        hasPendingSync: false,
        error: null,
      }));

      // Notificar al contexto si hay callback
      callbacksRef.current.onUpdateNotifications?.(transformed);

    } catch (error) {
      console.error('[KiroPlatformSync] Error fetching notifications:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        hasPendingSync: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      }));
    }
  }, [user?.id, organizationId, enabled]);

  // Fetch inicial
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ─────────────────────────────────────────────────────────────────────────
  // Suscripción en tiempo real
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !organizationId || !enabled) return;

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    const channel = supabase
      .channel(`kiro_platform_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newPlatformNotification = payload.new as UserNotification;
          const kiroNotification = transformPlatformNotification(newPlatformNotification);

          // Agregar a la lista
          setPlatformNotifications(prev => [kiroNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Disparar callbacks de KIRO
          const callbacks = callbacksRef.current;

          // Notificar nueva notificación
          callbacks.onNewNotification?.(kiroNotification);

          // Disparar reacción de KIRO
          const reaction = getKiroReactionForNotification(newPlatformNotification.type);
          callbacks.onTriggerReaction?.(reaction);

          // Vibrar antena si corresponde
          if (shouldVibrateAntenna(newPlatformNotification.type)) {
            callbacks.onVibrateAntenna?.();
          }

          // Disparar confetti si corresponde
          const confetti = getConfettiType(newPlatformNotification.type);
          if (confetti) {
            callbacks.onTriggerConfetti?.(confetti);
          }

          // Anuncio de voz de KIRO
          const voiceAnnouncement = getVoiceAnnouncementForNotification(newPlatformNotification);
          if (voiceAnnouncement) {
            callbacks.onVoiceAnnouncement?.(voiceAnnouncement.text, voiceAnnouncement.emotion);
          }

          // Actualizar timestamp de sincronización
          setState(prev => ({
            ...prev,
            lastSyncTimestamp: Date.now(),
            syncedCount: prev.syncedCount + 1,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as UserNotification;

          // Actualizar notificación en la lista
          setPlatformNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id
                ? { ...n, read: updatedNotification.is_read }
                : n
            )
          );

          // Recalcular unread count
          setPlatformNotifications(prev => {
            setUnreadCount(prev.filter(n => !n.read).length);
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;

          setPlatformNotifications(prev => {
            const deleted = prev.find(n => n.id === deletedId);
            if (deleted && !deleted.read) {
              setUnreadCount(c => Math.max(0, c - 1));
            }
            return prev.filter(n => n.id !== deletedId);
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        } else if (status === 'CHANNEL_ERROR') {
          setState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: 'Error en canal de tiempo real',
          }));
        } else if (status === 'CLOSED') {
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, organizationId, enabled]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sincronización de estado de lectura
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || currentKiroNotifications.length === 0 || platformNotifications.length === 0) {
      return;
    }

    // Sincronizar estado de lectura periódicamente
    const syncTimer = setTimeout(() => {
      const synced = syncReadStatus(currentKiroNotifications, platformNotifications as any);

      // Verificar si hay diferencias
      const hasDifferences = synced.some((s, i) => s.read !== currentKiroNotifications[i]?.read);

      if (hasDifferences) {
        callbacksRef.current.onUpdateNotifications?.(synced);
      }
    }, SYNC_DEBOUNCE_MS);

    return () => clearTimeout(syncTimer);
  }, [enabled, currentKiroNotifications, platformNotifications]);

  // ─────────────────────────────────────────────────────────────────────────
  // Acciones
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Marcar una notificación como leída (sincroniza con plataforma)
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Actualizar localmente
      setPlatformNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('[KiroPlatformSync] Error marking as read:', error);
    }
  }, []);

  /**
   * Marcar todas las notificaciones como leídas
   */
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Actualizar localmente
      setPlatformNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

    } catch (error) {
      console.error('[KiroPlatformSync] Error marking all as read:', error);
    }
  }, [user?.id]);

  /**
   * Forzar sincronización manual
   */
  const forceSync = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    state,
    forceSync,
    markAsRead,
    markAllAsRead,
    platformNotifications,
    unreadCount,
  };
}
