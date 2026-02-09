/**
 * KiroNotificationBridge.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * Puente que conecta el sistema de notificaciones de la plataforma con KIRO.
 * Transforma las notificaciones de la plataforma (user_notifications) en
 * notificaciones de KIRO (KiroNotification) con personalidad y contexto.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { KiroZone, KiroReactionType } from '@/contexts/KiroContext';
import type {
  KiroNotification,
  KiroNotificationType,
  KiroNotificationPriority,
} from '../types/notifications';
import type { UserNotification } from '@/hooks/useUserNotifications';
import { generateNotificationId } from '../types/notifications';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de notificaciones de la plataforma (user_notifications)
 */
export type PlatformNotificationType = UserNotification['type'];

/**
 * Configuración de mapeo para cada tipo de notificación de plataforma
 */
/** Emociones de voz disponibles para TTS */
export type KiroVoiceEmotion = 'neutral' | 'happy' | 'excited' | 'thinking';

export interface PlatformNotificationConfig {
  /** Tipo de notificación KIRO correspondiente */
  kiroType: KiroNotificationType;
  /** Zona KIRO relacionada */
  zone: KiroZone;
  /** Prioridad por defecto */
  priority: KiroNotificationPriority;
  /** Reacción de KIRO al recibir esta notificación */
  reaction: KiroReactionType;
  /** Plantilla del mensaje de KIRO (con variables) */
  kiroMessageTemplate: string;
  /** Etiqueta del botón de acción */
  actionLabel?: string;
  /** Si debe hacer vibrar la antena */
  vibrateAntenna: boolean;
  /** Si debe disparar confetti (para celebraciones) */
  confettiType?: 'celebration' | 'mini' | 'sparkle';
  /** Mensaje de voz para KIRO TTS (null = sin voz) */
  voiceMessage?: string | null;
  /** Emoción de voz para TTS */
  voiceEmotion?: KiroVoiceEmotion;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPA DE CONFIGURACIÓN DE NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapeo completo de tipos de notificación de plataforma a configuración KIRO.
 * Cada tipo de notificación tiene una personalidad y comportamiento específico.
 */
export const PLATFORM_NOTIFICATION_MAP: Record<PlatformNotificationType, PlatformNotificationConfig> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Actualizaciones de Contenido
  // ─────────────────────────────────────────────────────────────────────────
  content_update: {
    kiroType: 'production_delivered',
    zone: 'sala-de-edicion',
    priority: 'medium',
    reaction: 'bounce',
    kiroMessageTemplate: '¡Hey! {title}. {message}',
    actionLabel: 'Ver contenido',
    vibrateAntenna: true,
    confettiType: 'sparkle',
    voiceMessage: 'Hay una actualización en tu contenido',
    voiceEmotion: 'neutral',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Menciones
  // ─────────────────────────────────────────────────────────────────────────
  mention: {
    kiroType: 'mention',
    zone: 'sala-de-control',
    priority: 'high',
    reaction: 'wiggle',
    kiroMessageTemplate: '¡Psst! Te mencionaron: {title}',
    actionLabel: 'Ver mención',
    vibrateAntenna: true,
    voiceMessage: 'Alguien te mencionó en un comentario',
    voiceEmotion: 'happy',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Mensajes
  // ─────────────────────────────────────────────────────────────────────────
  message: {
    kiroType: 'mention',
    zone: 'sala-de-prensa',
    priority: 'medium',
    reaction: 'nod',
    kiroMessageTemplate: '¡Nuevo mensaje! {title}',
    actionLabel: 'Abrir chat',
    vibrateAntenna: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Asignaciones
  // ─────────────────────────────────────────────────────────────────────────
  assignment: {
    kiroType: 'creator_assigned',
    zone: 'casting',
    priority: 'high',
    reaction: 'bounce',
    kiroMessageTemplate: '¡Tienes nueva tarea! {title}',
    actionLabel: 'Ver asignación',
    vibrateAntenna: true,
    confettiType: 'mini',
    voiceMessage: 'Tienes un nuevo proyecto asignado',
    voiceEmotion: 'excited',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Cambios de Estado
  // ─────────────────────────────────────────────────────────────────────────
  status_change: {
    kiroType: 'review_pending',
    zone: 'sala-de-control',
    priority: 'medium',
    reaction: 'nod',
    kiroMessageTemplate: 'Actualización: {title}',
    actionLabel: 'Ver detalles',
    vibrateAntenna: true,
    voiceMessage: 'Hay un cambio de estado en tu producción',
    voiceEmotion: 'neutral',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Reclutamiento
  // ─────────────────────────────────────────────────────────────────────────
  recruitment_request: {
    kiroType: 'creator_assigned',
    zone: 'casting',
    priority: 'high',
    reaction: 'bounce',
    kiroMessageTemplate: '¡Te quieren reclutar! {title}',
    actionLabel: 'Ver invitación',
    vibrateAntenna: true,
    confettiType: 'celebration',
    voiceMessage: 'Tienes una invitación de reclutamiento',
    voiceEmotion: 'excited',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPEO DE ENTITY_TYPE A ZONA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapea el entity_type de la notificación a una zona KIRO específica.
 * Permite mayor precisión en la navegación contextual.
 */
const ENTITY_TYPE_TO_ZONE: Record<string, KiroZone> = {
  // Contenido y Producciones
  content: 'sala-de-edicion',
  production: 'sala-de-edicion',
  video: 'sala-de-edicion',

  // Creadores y Casting
  creator: 'casting',
  talent: 'casting',
  profile: 'camerino',

  // Campañas y Proyectos
  campaign: 'sala-de-control',
  project: 'sala-de-control',
  board: 'sala-de-control',

  // Comunicación
  chat: 'sala-de-prensa',
  message: 'sala-de-prensa',
  comment: 'sala-de-prensa',

  // Live y Streaming
  stream: 'live-stage',
  live: 'live-stage',

  // Educación
  course: 'escuela',
  lesson: 'escuela',
  tutorial: 'escuela',

  // Reclutamiento
  recruitment: 'casting',

  // Default
  system: 'general',
};

// ═══════════════════════════════════════════════════════════════════════════
// MENSAJES VARIADOS DE KIRO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prefijos variados que KIRO usa para dar personalidad a los mensajes.
 * Se selecciona uno aleatorio para evitar repetición.
 */
const KIRO_MESSAGE_PREFIXES: Record<PlatformNotificationType, string[]> = {
  content_update: [
    '¡Hey! ',
    '¡Mira esto! ',
    '¡Buenas noticias! ',
    '¡Atención! ',
    '¡Ey! ',
  ],
  mention: [
    '¡Psst! ',
    '¡Oye! ',
    '¡Te buscan! ',
    '¡Noticia! ',
    '¡Ding ding! ',
  ],
  message: [
    '¡Nuevo mensaje! ',
    '¡Tienes correo! ',
    '¡Alguien te escribió! ',
    '¡Mensaje entrante! ',
  ],
  assignment: [
    '¡Tienes trabajo! ',
    '¡Nueva misión! ',
    '¡Te asignaron algo! ',
    '¡Hora de brillar! ',
  ],
  status_change: [
    'Actualización: ',
    'Cambio detectado: ',
    'Movimiento: ',
    'Novedades: ',
  ],
  recruitment_request: [
    '¡Te quieren reclutar! ',
    '¡Nueva oportunidad! ',
    '¡Una org te busca! ',
    '¡Invitación especial! ',
  ],
};

/**
 * Selecciona un prefijo aleatorio para un tipo de notificación.
 */
function getRandomPrefix(type: PlatformNotificationType): string {
  const prefixes = KIRO_MESSAGE_PREFIXES[type] || ['¡Atención! '];
  return prefixes[Math.floor(Math.random() * prefixes.length)];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE TRANSFORMACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transforma una notificación de plataforma (UserNotification) a
 * una notificación de KIRO (KiroNotification) con personalidad.
 */
export function transformPlatformNotification(
  platformNotification: UserNotification
): KiroNotification {
  const config = PLATFORM_NOTIFICATION_MAP[platformNotification.type];

  // Determinar la zona basada en entity_type si está disponible
  let zone = config.zone;
  if (platformNotification.entity_type) {
    const entityZone = ENTITY_TYPE_TO_ZONE[platformNotification.entity_type.toLowerCase()];
    if (entityZone) {
      zone = entityZone;
    }
  }

  // Generar mensaje con personalidad de KIRO
  const prefix = getRandomPrefix(platformNotification.type);
  const message = platformNotification.message
    ? `${prefix}${platformNotification.title}. ${platformNotification.message}`
    : `${prefix}${platformNotification.title}`;

  // Generar ruta de acción si hay entity_id
  let actionRoute: string | undefined;
  if (platformNotification.entity_id && platformNotification.entity_type) {
    actionRoute = generateActionRoute(
      platformNotification.entity_type,
      platformNotification.entity_id
    );
  }

  return {
    id: platformNotification.id, // Mantener el mismo ID para sincronización
    type: config.kiroType,
    title: platformNotification.title,
    message,
    zone,
    priority: config.priority,
    read: platformNotification.is_read,
    dismissed: false,
    timestamp: new Date(platformNotification.created_at).getTime(),
    actionLabel: config.actionLabel,
    actionRoute,
    metadata: {
      platformId: platformNotification.id,
      platformType: platformNotification.type,
      entityType: platformNotification.entity_type,
      entityId: platformNotification.entity_id,
      organizationId: platformNotification.organization_id,
    },
  };
}

/**
 * Transforma múltiples notificaciones de plataforma.
 */
export function transformPlatformNotifications(
  platformNotifications: UserNotification[]
): KiroNotification[] {
  return platformNotifications.map(transformPlatformNotification);
}

/**
 * Genera la ruta de navegación basada en el tipo y ID de entidad.
 */
function generateActionRoute(entityType: string, entityId: string): string {
  const type = entityType.toLowerCase();

  switch (type) {
    case 'content':
    case 'production':
    case 'video':
      return `/content-board?content=${entityId}`;
    case 'creator':
    case 'talent':
      return `/creators/${entityId}`;
    case 'campaign':
    case 'project':
      return `/campaigns/${entityId}`;
    case 'board':
      return `/content-board`;
    case 'chat':
    case 'message':
      return `/chat/${entityId}`;
    case 'stream':
    case 'live':
      return `/live/${entityId}`;
    case 'profile':
      return `/profile/${entityId}`;
    default:
      return `/dashboard`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE REACCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la reacción de KIRO para un tipo de notificación de plataforma.
 */
export function getKiroReactionForNotification(
  type: PlatformNotificationType
): KiroReactionType {
  return PLATFORM_NOTIFICATION_MAP[type]?.reaction || 'nod';
}

/**
 * Determina si una notificación debe hacer vibrar la antena de KIRO.
 */
export function shouldVibrateAntenna(type: PlatformNotificationType): boolean {
  return PLATFORM_NOTIFICATION_MAP[type]?.vibrateAntenna ?? false;
}

/**
 * Obtiene el tipo de confetti para una notificación (si aplica).
 */
export function getConfettiType(
  type: PlatformNotificationType
): 'celebration' | 'mini' | 'sparkle' | null {
  return PLATFORM_NOTIFICATION_MAP[type]?.confettiType || null;
}

/**
 * Obtiene la configuración completa para un tipo de notificación.
 */
export function getPlatformNotificationConfig(
  type: PlatformNotificationType
): PlatformNotificationConfig {
  return PLATFORM_NOTIFICATION_MAP[type];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE PRIORIDAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ajusta la prioridad basada en contexto adicional.
 * Por ejemplo, si hay múltiples notificaciones del mismo tipo, aumentar prioridad.
 */
export function adjustPriority(
  basePriority: KiroNotificationPriority,
  context: {
    /** Cantidad de notificaciones no leídas del mismo tipo */
    unreadSameType?: number;
    /** Si el usuario está activo en esa zona */
    userInZone?: boolean;
    /** Si es horario laboral */
    isWorkHours?: boolean;
  }
): KiroNotificationPriority {
  const priorities: KiroNotificationPriority[] = ['low', 'medium', 'high', 'urgent'];
  let index = priorities.indexOf(basePriority);

  // Aumentar si hay muchas del mismo tipo sin leer
  if (context.unreadSameType && context.unreadSameType >= 3) {
    index = Math.min(index + 1, 3);
  }

  // Reducir si el usuario está en otra zona
  if (context.userInZone === false) {
    index = Math.max(index - 1, 0);
  }

  // Reducir prioridad fuera de horario laboral para notificaciones no urgentes
  if (context.isWorkHours === false && basePriority !== 'urgent') {
    index = Math.max(index - 1, 0);
  }

  return priorities[index];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE AGRUPACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Agrupa notificaciones similares para evitar spam visual.
 * Retorna notificaciones agrupadas con contador.
 */
export function groupSimilarNotifications(
  notifications: KiroNotification[]
): (KiroNotification & { groupCount?: number })[] {
  const grouped: Map<string, KiroNotification & { groupCount: number }> = new Map();
  const result: (KiroNotification & { groupCount?: number })[] = [];

  for (const notification of notifications) {
    // Crear clave de agrupación basada en tipo y zona
    const groupKey = `${notification.type}-${notification.zone}`;

    // Solo agrupar notificaciones no leídas
    if (!notification.read) {
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.groupCount++;
        // Actualizar timestamp al más reciente
        if (notification.timestamp > existing.timestamp) {
          existing.timestamp = notification.timestamp;
          existing.title = notification.title;
          existing.message = `${notification.message} (+${existing.groupCount - 1} más)`;
        }
        continue;
      } else {
        const groupedNotification = { ...notification, groupCount: 1 };
        grouped.set(groupKey, groupedNotification);
        result.push(groupedNotification);
        continue;
      }
    }

    // Las notificaciones leídas no se agrupan
    result.push(notification);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE SINCRONIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene los IDs de plataforma de las notificaciones KIRO.
 * Útil para sincronización bidireccional.
 */
export function getPlatformIdsFromKiroNotifications(
  kiroNotifications: KiroNotification[]
): string[] {
  return kiroNotifications
    .filter(n => n.metadata?.platformId)
    .map(n => n.metadata!.platformId as string);
}

/**
 * Encuentra notificaciones que existen en plataforma pero no en KIRO.
 */
export function findMissingNotifications(
  platformNotifications: UserNotification[],
  kiroNotifications: KiroNotification[]
): UserNotification[] {
  const kiroIds = new Set(
    kiroNotifications
      .filter(n => n.metadata?.platformId)
      .map(n => n.metadata!.platformId as string)
  );

  return platformNotifications.filter(pn => !kiroIds.has(pn.id));
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE VOZ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determina si una notificación debe producir un anuncio de voz de KIRO
 * y retorna el texto y emoción correspondiente.
 */
export function getVoiceAnnouncementForNotification(
  platformNotification: UserNotification
): { text: string; emotion: KiroVoiceEmotion } | null {
  const config = PLATFORM_NOTIFICATION_MAP[platformNotification.type];
  if (!config) return null;

  // Caso especial: status_change → mensaje diferenciado según el estado
  if (platformNotification.type === 'status_change') {
    const msg = (platformNotification.message || '').toLowerCase();
    const title = (platformNotification.title || '').toLowerCase();
    const combined = msg + ' ' + title;

    if (combined.includes('entregad') || combined.includes('delivered')) {
      return { text: 'Tienes proyectos por revisar', emotion: 'happy' };
    }
    if (combined.includes('aprobad') || combined.includes('approved')) {
      return { text: 'Tu contenido fue aprobado', emotion: 'excited' };
    }
    if (combined.includes('rechazad') || combined.includes('rejected')) {
      return { text: 'Hay observaciones en tu contenido', emotion: 'neutral' };
    }
    if (combined.includes('en progreso') || combined.includes('in_progress') || combined.includes('en producción')) {
      return { text: 'Tu producción está en progreso', emotion: 'happy' };
    }
    if (combined.includes('revisión') || combined.includes('review')) {
      return { text: 'Tu contenido está en revisión', emotion: 'thinking' };
    }
    // Fallback genérico para cualquier otro cambio de estado
    return { text: 'Hay un cambio de estado en tu producción', emotion: 'neutral' };
  }

  // Mensajes de chat no usan voz (ya tienen su propio sistema de sonido)
  if (platformNotification.type === 'message') {
    return null;
  }

  // Para otros tipos, usar el voiceMessage configurado
  if (config.voiceMessage) {
    return { text: config.voiceMessage, emotion: config.voiceEmotion || 'neutral' };
  }

  return null;
}

/**
 * Sincroniza el estado de lectura entre plataforma y KIRO.
 */
export function syncReadStatus(
  kiroNotifications: KiroNotification[],
  platformNotifications: UserNotification[]
): KiroNotification[] {
  const platformReadMap = new Map(
    platformNotifications.map(pn => [pn.id, pn.is_read])
  );

  return kiroNotifications.map(kn => {
    const platformId = kn.metadata?.platformId as string | undefined;
    if (platformId && platformReadMap.has(platformId)) {
      const isReadOnPlatform = platformReadMap.get(platformId)!;
      if (isReadOnPlatform !== kn.read) {
        return { ...kn, read: isReadOnPlatform };
      }
    }
    return kn;
  });
}
