import { memo, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, CheckCheck, Trash2, ExternalLink, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useKiro } from '@/contexts/KiroContext';
import {
  type KiroNotification,
  getNotificationConfig,
  formatRelativeTime,
  getPriorityColor,
} from './types/notifications';
import { kiroSounds } from './sounds/KiroSounds';
import type { AwardResult } from './hooks/useKiroGamification';

// Umbral de swipe para descartar (en píxeles)
const SWIPE_THRESHOLD = 80;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE NOTIFICACIÓN INDIVIDUAL
// ═══════════════════════════════════════════════════════════════════════════

interface NotificationItemProps {
  notification: KiroNotification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (route: string, label: string) => void;
  onAwardPoints?: () => void;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onNavigate,
  onAwardPoints,
}: NotificationItemProps) {
  const config = getNotificationConfig(notification.type);
  const priorityColor = getPriorityColor(notification.priority);
  const isUnread = !notification.read && !notification.dismissed;
  const showPriorityBadge = notification.priority === 'high' || notification.priority === 'urgent';
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    if (isDragging) return; // No hacer click mientras se arrastra
    kiroSounds.play('action_click');
    if (!notification.read) {
      onMarkAsRead(notification.id);
      onAwardPoints?.();
    }
  }, [notification.id, notification.read, onMarkAsRead, onAwardPoints, isDragging]);

  const handleAction = useCallback(() => {
    kiroSounds.play('action_click');
    if (notification.actionRoute && notification.actionLabel) {
      onNavigate(notification.actionRoute, notification.actionLabel);
    }
  }, [notification.actionRoute, notification.actionLabel, onNavigate]);

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      kiroSounds.play('action_click');
      onDismiss(notification.id);
    },
    [notification.id, onDismiss]
  );

  // Handler para swipe-to-dismiss
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      // Si el usuario arrastra más allá del umbral, descartar
      if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
        kiroSounds.play('action_click');
        onDismiss(notification.id);
      }
    },
    [notification.id, onDismiss]
  );

  if (notification.dismissed) {
    return null;
  }

  return (
    <div ref={constraintsRef} className="overflow-hidden">
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        className={cn(
          'relative group p-3 rounded-sm transition-colors duration-150',
          'border-l-2 touch-pan-y',
          isUnread
            ? 'bg-violet-500/10 border-l-violet-500'
            : 'bg-transparent border-l-transparent opacity-70',
          'hover:bg-violet-500/15 cursor-pointer'
        )}
        style={{ touchAction: 'pan-y' }}
      >
      <div className="flex gap-2.5">
        {/* Icono */}
        <div className="flex-shrink-0 text-lg" role="img" aria-label={notification.type}>
          {config.icon}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Título y prioridad */}
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                'text-[11px] font-medium truncate',
                isUnread ? 'text-violet-200' : 'text-gray-400'
              )}
            >
              {notification.title}
            </h4>
            {showPriorityBadge && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                style={{
                  backgroundColor: `${priorityColor}20`,
                  color: priorityColor,
                }}
              >
                {notification.priority === 'urgent' ? 'urgente' : 'alta'}
              </span>
            )}
          </div>

          {/* Mensaje (truncado a 2 líneas) */}
          <p
            className={cn(
              'text-[10px] mt-0.5 line-clamp-2',
              isUnread ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            {notification.message}
          </p>

          {/* Footer: timestamp y acción */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-gray-600">
              {formatRelativeTime(notification.timestamp)}
            </span>

            {notification.actionLabel && notification.actionRoute && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction();
                }}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded',
                  'text-[9px] font-medium',
                  'bg-violet-500/20 text-violet-300',
                  'hover:bg-violet-500/30 transition-colors'
                )}
              >
                {notification.actionLabel}
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Botón dismiss (visible en hover) */}
        {/* Botón dismiss (visible en hover, más grande para touch) */}
        <button
          onClick={handleDismiss}
          className={cn(
            'absolute top-1 right-1',
            'w-8 h-8 rounded-sm flex items-center justify-center',
            'text-gray-500 hover:text-foreground',
            'bg-transparent hover:bg-red-500/20',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'min-w-[44px] min-h-[44px]' // WCAG touch target
          )}
          title="Descartar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO VACÍO
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      {/* Mini KIRO emoji */}
      <div className="text-4xl mb-3">🤖</div>
      <p className="text-gray-400 text-sm">Todo tranquilo por acá</p>
      <p className="text-gray-600 text-xs mt-1">😎</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA EL PANEL
// ═══════════════════════════════════════════════════════════════════════════

interface KiroNotificationPanelProps {
  /** Función para otorgar puntos por leer notificaciones */
  awardPoints?: (sourceKey: string, description?: string) => Promise<AwardResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function KiroNotificationPanel({ awardPoints }: KiroNotificationPanelProps = {}) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    addChatMessage,
    agentic,
  } = useKiro();

  // Platform sync state (Phase 9)
  const { platformSyncState, forceSync, platformUnreadCount } = agentic;
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle manual sync
  const handleForceSync = useCallback(async () => {
    setIsSyncing(true);
    kiroSounds.play('action_click');
    try {
      await forceSync();
    } finally {
      setIsSyncing(false);
    }
  }, [forceSync]);

  // Estado del toast de puntos
  const [pointsToast, setPointsToast] = useState<{
    show: boolean;
    points: number;
    key: number;
  } | null>(null);

  // Handler para otorgar puntos al leer una notificación
  const handleAwardPoints = useCallback(async () => {
    if (awardPoints) {
      const result = await awardPoints('kiro_notification_read', 'Leer notificación');
      if (result.awarded) {
        setPointsToast({
          show: true,
          points: result.points,
          key: Date.now(),
        });

        setTimeout(() => {
          setPointsToast(null);
        }, 1500);
      }
    }
  }, [awardPoints]);

  // Filtrar notificaciones no descartadas
  const visibleNotifications = notifications.filter((n) => !n.dismissed);

  // Handler para navegación desde una notificación
  const handleNavigate = useCallback(
    (route: string, label: string) => {
      // Agregar mensaje al chat
      addChatMessage({
        text: `Abriendo ${label}...`,
        isKiro: true,
        zone: 'general',
      });

      // Navegar a la ruta
      navigate(route);
    },
    [navigate, addChatMessage]
  );

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/10">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-violet-300">Notificaciones</h3>
          {unreadCount > 0 && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                'bg-red-500 text-white'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Platform sync indicator (Phase 9) */}
          <div className="flex items-center gap-1">
            {platformSyncState.connectionStatus === 'connected' && (
              <Wifi className="w-3 h-3 text-green-400" title="Conectado" />
            )}
            {platformSyncState.connectionStatus === 'connecting' && (
              <Wifi className="w-3 h-3 text-amber-400 animate-pulse" title="Conectando..." />
            )}
            {platformSyncState.connectionStatus === 'disconnected' && (
              <WifiOff className="w-3 h-3 text-gray-500" title="Desconectado" />
            )}
            {platformSyncState.connectionStatus === 'error' && (
              <AlertCircle className="w-3 h-3 text-red-400" title={platformSyncState.error || 'Error de conexión'} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Sync button (Phase 9) */}
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className={cn(
              'p-1.5 rounded-sm',
              'text-gray-500 hover:text-violet-400',
              'hover:bg-violet-500/10 transition-colors',
              isSyncing && 'animate-spin'
            )}
            title="Sincronizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => {
                kiroSounds.play('action_click');
                markAllAsRead();
              }}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-sm min-h-[44px]',
                'text-xs text-violet-400',
                'hover:bg-violet-500/10 transition-colors'
              )}
              title="Marcar todas como leídas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar leídas
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LISTA DE NOTIFICACIONES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-violet-500/20 scrollbar-track-transparent">
        {visibleNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDismiss={dismissNotification}
                onNavigate={handleNavigate}
                onAwardPoints={handleAwardPoints}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER: LIMPIAR TODO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {visibleNotifications.length > 5 && (
        <div className="px-3 py-2 border-t border-violet-500/10">
          <button
            onClick={() => {
              kiroSounds.play('action_click');
              clearAllNotifications();
            }}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-2 rounded-sm min-h-[44px]',
              'text-xs text-red-400',
              'bg-red-500/10 border border-red-500/20',
              'hover:bg-red-500/20 transition-colors'
            )}
          >
            <Trash2 className="w-4 h-4" />
            Limpiar todo
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOAST DE PUNTOS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {pointsToast?.show && (
        <div
          key={pointsToast.key}
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'flex items-center gap-1 px-2.5 py-1 rounded-full',
            'bg-cyan-500/90 text-white text-xs font-medium',
            'shadow-lg shadow-cyan-500/30'
          )}
          style={{
            animation: 'kiro-notif-pop 1.5s ease-out forwards',
          }}
        >
          <span>+{pointsToast.points} UP</span>
          <span>✨</span>
        </div>
      )}

      {/* Estilos de animación */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes kiro-notif-pop {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(0.8);
            }
            30% {
              transform: translate(-50%, -50%) scale(1.1);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -80%) scale(0.9);
            }
          }
        `
      }} />
    </div>
  );
}
