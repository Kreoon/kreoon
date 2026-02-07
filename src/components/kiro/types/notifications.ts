import type { KiroState, KiroExpression, KiroZone } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE NOTIFICACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de notificaciones que KIRO puede mostrar.
 * Cada tipo tiene una configuración diferente de visualización y reacción.
 */
export type KiroNotificationType =
  | 'production_delivered'   // Un creador entregó contenido
  | 'production_overdue'     // Una producción pasó la fecha límite
  | 'review_pending'         // Contenido esperando revisión
  | 'creator_assigned'       // Un creador fue asignado
  | 'campaign_started'       // Una campaña arrancó
  | 'campaign_completed'     // Una campaña se completó
  | 'level_up'               // El usuario subió de nivel
  | 'badge_earned'           // El usuario ganó un badge
  | 'payment_received'       // Pago recibido
  | 'mention'                // Alguien mencionó al usuario
  | 'system_alert'           // Alerta del sistema
  | 'kiro_tip';              // KIRO tiene un consejo proactivo

/**
 * Niveles de prioridad de las notificaciones.
 */
export type KiroNotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Estructura completa de una notificación de KIRO.
 */
export interface KiroNotification {
  /** UUID único de la notificación */
  id: string;
  /** Tipo de notificación */
  type: KiroNotificationType;
  /** Título corto: "Nueva entrega pendiente" */
  title: string;
  /** Detalle: "El creador @sofia entregó 3 videos para la campaña X" */
  message: string;
  /** Zona relacionada: 'sala-de-edicion', 'casting', etc. */
  zone: KiroZone;
  /** Nivel de prioridad */
  priority: KiroNotificationPriority;
  /** Si el usuario ya leyó esta notificación */
  read: boolean;
  /** Si el usuario descartó esta notificación */
  dismissed: boolean;
  /** Timestamp de creación (Date.now()) */
  timestamp: number;
  /** Texto del botón de acción: "Ver entrega" (opcional) */
  actionLabel?: string;
  /** Ruta a navegar: "/productions/123" (opcional) */
  actionRoute?: string;
  /** Datos extra para uso interno (opcional) */
  metadata?: Record<string, unknown>;
}

/**
 * Datos necesarios para crear una nueva notificación.
 * Omite los campos que se generan automáticamente.
 */
export type NewKiroNotification = Omit<
  KiroNotification,
  'id' | 'read' | 'dismissed' | 'timestamp'
>;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN POR TIPO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuración de visualización y comportamiento de KIRO por tipo de notificación.
 */
export interface NotificationConfig {
  /** Emoji para mostrar en la UI */
  icon: string;
  /** Expresión facial de KIRO al recibir este tipo */
  kiroExpression: KiroExpression;
  /** Estado temporal de KIRO al recibir este tipo */
  kiroState: KiroState;
  /** Nombre del sonido (preparado para Fase 7) */
  sound?: string;
  /** Auto-dismiss en N segundos (null = no auto-dismiss) */
  autoDismissSeconds: number | null;
  /** Color de acento para la UI */
  accentColor?: string;
}

/**
 * Mapa de configuración por cada tipo de notificación.
 * Define cómo KIRO reacciona y cómo se visualiza cada tipo.
 */
export const NOTIFICATION_CONFIGS: Record<KiroNotificationType, NotificationConfig> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Producciones y Entregas
  // ─────────────────────────────────────────────────────────────────────────
  'production_delivered': {
    icon: '📦',
    kiroExpression: 'happy',
    kiroState: 'celebrating',
    autoDismissSeconds: null,
    accentColor: '#22c55e', // green-500
  },
  'production_overdue': {
    icon: '⚠️',
    kiroExpression: 'surprised',
    kiroState: 'speaking',
    autoDismissSeconds: null,
    accentColor: '#f97316', // orange-500
  },
  'review_pending': {
    icon: '👀',
    kiroExpression: 'thinking',
    kiroState: 'thinking',
    autoDismissSeconds: null,
    accentColor: '#8b5cf6', // violet-500
  },
  'creator_assigned': {
    icon: '🎭',
    kiroExpression: 'happy',
    kiroState: 'speaking',
    autoDismissSeconds: 10,
    accentColor: '#8b5cf6', // violet-500
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Campañas
  // ─────────────────────────────────────────────────────────────────────────
  'campaign_started': {
    icon: '🚀',
    kiroExpression: 'happy',
    kiroState: 'celebrating',
    autoDismissSeconds: 10,
    accentColor: '#3b82f6', // blue-500
  },
  'campaign_completed': {
    icon: '🏆',
    kiroExpression: 'happy',
    kiroState: 'celebrating',
    autoDismissSeconds: null,
    accentColor: '#eab308', // yellow-500
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Logros y Recompensas
  // ─────────────────────────────────────────────────────────────────────────
  'level_up': {
    icon: '⬆️',
    kiroExpression: 'surprised',
    kiroState: 'celebrating',
    autoDismissSeconds: null,
    accentColor: '#22c55e', // green-500
  },
  'badge_earned': {
    icon: '🏅',
    kiroExpression: 'happy',
    kiroState: 'celebrating',
    autoDismissSeconds: 15,
    accentColor: '#eab308', // yellow-500
  },
  'payment_received': {
    icon: '💰',
    kiroExpression: 'happy',
    kiroState: 'celebrating',
    autoDismissSeconds: 10,
    accentColor: '#22c55e', // green-500
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Social y Sistema
  // ─────────────────────────────────────────────────────────────────────────
  'mention': {
    icon: '💬',
    kiroExpression: 'surprised',
    kiroState: 'listening',
    autoDismissSeconds: 15,
    accentColor: '#3b82f6', // blue-500
  },
  'system_alert': {
    icon: '🔔',
    kiroExpression: 'neutral',
    kiroState: 'speaking',
    autoDismissSeconds: null,
    accentColor: '#6b7280', // gray-500
  },
  'kiro_tip': {
    icon: '💡',
    kiroExpression: 'thinking',
    kiroState: 'thinking',
    autoDismissSeconds: 20,
    accentColor: '#a78bfa', // violet-400
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la configuración de un tipo de notificación.
 * Si el tipo no existe, retorna configuración por defecto.
 */
export function getNotificationConfig(type: KiroNotificationType): NotificationConfig {
  return NOTIFICATION_CONFIGS[type] ?? NOTIFICATION_CONFIGS.system_alert;
}

/**
 * Genera un ID único para una notificación.
 */
export function generateNotificationId(): string {
  // Usar crypto.randomUUID si está disponible, sino fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `kiro-notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Formatea un timestamp a texto relativo en español.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'ahora';
  }
  if (minutes < 60) {
    return `hace ${minutes}min`;
  }
  if (hours < 24) {
    return `hace ${hours}h`;
  }
  if (days < 7) {
    return `hace ${days} día${days > 1 ? 's' : ''}`;
  }

  // Más de 6 días: fecha corta
  const date = new Date(timestamp);
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

/**
 * Filtra notificaciones antiguas (más de 7 días).
 */
export function filterOldNotifications(notifications: KiroNotification[]): KiroNotification[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return notifications.filter((n) => n.timestamp > sevenDaysAgo);
}

/**
 * Obtiene el color de prioridad para la UI.
 */
export function getPriorityColor(priority: KiroNotificationPriority): string {
  switch (priority) {
    case 'urgent':
      return '#ef4444'; // red-500
    case 'high':
      return '#f97316'; // orange-500
    case 'medium':
      return '#8b5cf6'; // violet-500
    case 'low':
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Determina si una notificación debe mostrar toast.
 */
export function shouldShowToast(priority: KiroNotificationPriority): boolean {
  return priority === 'medium' || priority === 'high' || priority === 'urgent';
}
