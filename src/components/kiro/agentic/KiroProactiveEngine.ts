/**
 * KiroProactiveEngine.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * Motor de comportamiento proactivo de KIRO.
 * Evalúa patrones de uso, métricas y contexto para generar sugerencias
 * proactivas sin que el usuario las solicite explícitamente.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { KiroZone, KiroState } from '@/contexts/KiroContext';
import type { KiroNotification, NewKiroNotification } from '../types/notifications';
import type { SuggestedAction } from './KiroIntentDetector';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de sugerencias proactivas que KIRO puede hacer
 */
export type ProactiveSuggestionType =
  | 'pending_review'        // Hay contenido pendiente de revisión
  | 'overdue_content'       // Contenido pasó su fecha límite
  | 'idle_creator'          // Un creador no ha tenido actividad
  | 'metric_alert'          // Alerta de métricas (bajo engagement, etc.)
  | 'scheduled_reminder'    // Recordatorio de contenido programado
  | 'workflow_suggestion'   // Sugerencia de flujo de trabajo
  | 'break_reminder'        // Recordatorio de descanso
  | 'achievement_close'     // Cerca de un logro
  | 'tip_of_the_day'        // Consejo del día
  | 'onboarding_step';      // Paso de onboarding pendiente

/**
 * Contexto del usuario para evaluación proactiva
 */
export interface UserContext {
  /** ID del usuario */
  userId: string;
  /** ID de la organización */
  organizationId: string;
  /** Zona actual donde está el usuario */
  currentZone: KiroZone;
  /** Roles del usuario */
  roles: string[];
  /** Tiempo en la sesión actual (ms) */
  sessionDuration: number;
  /** Última interacción con KIRO (timestamp) */
  lastKiroInteraction: number;
  /** Hora local del usuario */
  localHour: number;
  /** Si es horario laboral (9-18) */
  isWorkHours: boolean;
  /** Si es fin de semana */
  isWeekend: boolean;
}

/**
 * Métricas del dashboard para evaluación
 */
export interface DashboardMetrics {
  /** Contenidos pendientes de revisión */
  pendingReviews: number;
  /** Contenidos atrasados */
  overdueContent: number;
  /** Creadores sin actividad (últimos 7 días) */
  idleCreators: number;
  /** Contenidos programados para hoy */
  scheduledToday: number;
  /** Notificaciones no leídas */
  unreadNotifications: number;
  /** Tareas asignadas al usuario */
  assignedTasks: number;
  /** Nivel de gamificación actual */
  gamificationLevel: number;
  /** Puntos actuales */
  currentPoints: number;
  /** Puntos para siguiente nivel */
  pointsToNextLevel: number;
}

/**
 * Sugerencia proactiva generada
 */
export interface ProactiveSuggestion {
  /** ID único de la sugerencia */
  id: string;
  /** Tipo de sugerencia */
  type: ProactiveSuggestionType;
  /** Título de la sugerencia */
  title: string;
  /** Mensaje de KIRO */
  message: string;
  /** Prioridad */
  priority: 'low' | 'medium' | 'high';
  /** Zona relacionada */
  zone: KiroZone;
  /** Acciones sugeridas */
  actions: SuggestedAction[];
  /** Si debe mostrarse como notificación */
  showAsNotification: boolean;
  /** Timestamp de generación */
  timestamp: number;
  /** Datos contextuales */
  data?: Record<string, unknown>;
}

/**
 * Regla de evaluación proactiva
 */
export interface ProactiveRule {
  /** ID de la regla */
  id: string;
  /** Tipo de sugerencia que genera */
  type: ProactiveSuggestionType;
  /** Función de evaluación */
  evaluate: (context: UserContext, metrics: DashboardMetrics) => ProactiveSuggestion | null;
  /** Cooldown mínimo entre activaciones (ms) */
  cooldownMs: number;
  /** Si la regla está habilitada */
  enabled: boolean;
}

/**
 * Opciones del motor proactivo
 */
export interface ProactiveEngineOptions {
  /** Si el motor está habilitado */
  enabled?: boolean;
  /** Intervalo de evaluación (ms) */
  evaluationIntervalMs?: number;
  /** Máximo de sugerencias simultáneas */
  maxSuggestions?: number;
  /** Callback cuando se genera una sugerencia */
  onSuggestion?: (suggestion: ProactiveSuggestion) => void;
  /** Callback para obtener métricas actuales */
  getMetrics?: () => DashboardMetrics | null;
  /** Callback para obtener contexto del usuario */
  getUserContext?: () => UserContext | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_EVALUATION_INTERVAL = 5 * 60 * 1000; // 5 minutos
const DEFAULT_MAX_SUGGESTIONS = 3;
const BREAK_REMINDER_INTERVAL = 90 * 60 * 1000; // 90 minutos

// ═══════════════════════════════════════════════════════════════════════════
// MENSAJES DE KIRO
// ═══════════════════════════════════════════════════════════════════════════

const KIRO_MESSAGES: Record<ProactiveSuggestionType, string[]> = {
  pending_review: [
    '¡Hey! Tienes {count} contenidos esperando tu revisión.',
    'Hay {count} entregas listas para que les eches un ojo.',
    '¡No olvides! {count} piezas esperan tu aprobación.',
  ],
  overdue_content: [
    '¡Alerta! Hay {count} contenidos pasados de fecha.',
    'Tenemos {count} entregas atrasadas que necesitan atención.',
    '¡Ojo! {count} contenidos superaron su deadline.',
  ],
  idle_creator: [
    '{name} no ha tenido actividad en una semana. ¿Todo bien?',
    'Hace días que no veo a {name} por aquí.',
    '¿Deberíamos contactar a {name}? Lleva tiempo sin actividad.',
  ],
  metric_alert: [
    'Detecté una caída en las métricas. ¿Revisamos?',
    'Hay algunos números que deberías ver.',
    'Las métricas muestran algo interesante.',
  ],
  scheduled_reminder: [
    'Tienes {count} publicaciones programadas para hoy.',
    '¡Hoy toca publicar! {count} contenidos listos.',
    'Recordatorio: {count} posts se publican hoy.',
  ],
  workflow_suggestion: [
    '¿Sabías que puedes automatizar eso?',
    'Tengo una idea para mejorar tu flujo de trabajo.',
    'Podríamos optimizar este proceso.',
  ],
  break_reminder: [
    'Llevas un rato trabajando. ¿Un descanso? ☕',
    '¡Hey! Un break de 5 minutos no le hace mal a nadie.',
    'Tus ojos me lo agradecerán: ¡tomate un respiro!',
  ],
  achievement_close: [
    '¡Estás a {points} puntos del siguiente nivel!',
    'Un poco más y subes de nivel. ¡Vamos!',
    '¡Casi lo logras! Te faltan {points} UP para el siguiente nivel.',
  ],
  tip_of_the_day: [
    '¿Sabías que puedes usar atajos de teclado?',
    'Consejo: Las plantillas ahorran mucho tiempo.',
    'Pro tip: Organiza tu tablero por prioridad.',
  ],
  onboarding_step: [
    'Aún no has completado tu perfil. ¡Hagámoslo!',
    'Te falta configurar algunas cosas. ¿Te ayudo?',
    'Completemos tu onboarding para desbloquear todo.',
  ],
};

/**
 * Obtiene un mensaje aleatorio para un tipo de sugerencia
 */
function getRandomMessage(type: ProactiveSuggestionType, vars: Record<string, string | number> = {}): string {
  const messages = KIRO_MESSAGES[type];
  let message = messages[Math.floor(Math.random() * messages.length)];

  // Reemplazar variables
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(`{${key}}`, String(value));
  }

  return message;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGLAS DE EVALUACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reglas predefinidas del motor proactivo
 */
const DEFAULT_RULES: ProactiveRule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Contenido pendiente de revisión
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pending-review',
    type: 'pending_review',
    cooldownMs: 30 * 60 * 1000, // 30 minutos
    enabled: true,
    evaluate: (context, metrics) => {
      if (metrics.pendingReviews < 3) return null;
      if (!context.isWorkHours) return null;

      // Solo para roles que pueden revisar
      const canReview = context.roles.some(r =>
        ['admin', 'team_leader', 'strategist'].includes(r)
      );
      if (!canReview) return null;

      return {
        id: `pending-review-${Date.now()}`,
        type: 'pending_review',
        title: 'Contenido por revisar',
        message: getRandomMessage('pending_review', { count: metrics.pendingReviews }),
        priority: metrics.pendingReviews > 5 ? 'high' : 'medium',
        zone: 'sala-de-edicion',
        showAsNotification: true,
        timestamp: Date.now(),
        actions: [
          {
            id: 'go-review',
            label: 'Ver pendientes',
            description: 'Ir a revisión',
            icon: '👀',
            type: 'navigation',
            route: '/content-board?status=review',
          },
        ],
        data: { count: metrics.pendingReviews },
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Contenido atrasado
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'overdue-content',
    type: 'overdue_content',
    cooldownMs: 60 * 60 * 1000, // 1 hora
    enabled: true,
    evaluate: (context, metrics) => {
      if (metrics.overdueContent === 0) return null;

      return {
        id: `overdue-${Date.now()}`,
        type: 'overdue_content',
        title: 'Contenido atrasado',
        message: getRandomMessage('overdue_content', { count: metrics.overdueContent }),
        priority: 'high',
        zone: 'sala-de-control',
        showAsNotification: true,
        timestamp: Date.now(),
        actions: [
          {
            id: 'view-overdue',
            label: 'Ver atrasados',
            description: 'Contenido pasado de fecha',
            icon: '⚠️',
            type: 'navigation',
            route: '/content-board?filter=overdue',
          },
        ],
        data: { count: metrics.overdueContent },
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Recordatorio de descanso
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'break-reminder',
    type: 'break_reminder',
    cooldownMs: BREAK_REMINDER_INTERVAL,
    enabled: true,
    evaluate: (context) => {
      // Solo si lleva más de 90 minutos en sesión
      if (context.sessionDuration < BREAK_REMINDER_INTERVAL) return null;

      // Solo en horario laboral
      if (!context.isWorkHours) return null;

      return {
        id: `break-${Date.now()}`,
        type: 'break_reminder',
        title: 'Hora de un descanso',
        message: getRandomMessage('break_reminder'),
        priority: 'low',
        zone: 'general',
        showAsNotification: false,
        timestamp: Date.now(),
        actions: [
          {
            id: 'play-game',
            label: 'Jugar un poco',
            description: 'Mini-juego de KIRO',
            icon: '🎮',
            type: 'command',
            command: 'open_game',
          },
        ],
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Cerca de subir de nivel
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'achievement-close',
    type: 'achievement_close',
    cooldownMs: 4 * 60 * 60 * 1000, // 4 horas
    enabled: true,
    evaluate: (context, metrics) => {
      // Si está a menos del 20% de subir de nivel
      const percentage = metrics.pointsToNextLevel > 0
        ? ((metrics.pointsToNextLevel - metrics.currentPoints % 100) / metrics.pointsToNextLevel) * 100
        : 0;

      if (percentage > 20) return null;
      if (metrics.pointsToNextLevel <= 0) return null;

      const pointsNeeded = metrics.pointsToNextLevel - (metrics.currentPoints % metrics.pointsToNextLevel);
      if (pointsNeeded > 50) return null;

      return {
        id: `achievement-${Date.now()}`,
        type: 'achievement_close',
        title: 'Casi subes de nivel',
        message: getRandomMessage('achievement_close', { points: pointsNeeded }),
        priority: 'low',
        zone: 'general',
        showAsNotification: false,
        timestamp: Date.now(),
        actions: [
          {
            id: 'play-game',
            label: 'Ganar puntos',
            description: 'Jugar mini-juego',
            icon: '🎮',
            type: 'command',
            command: 'open_game',
          },
        ],
        data: { pointsNeeded, currentLevel: metrics.gamificationLevel },
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Publicaciones programadas para hoy
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'scheduled-today',
    type: 'scheduled_reminder',
    cooldownMs: 2 * 60 * 60 * 1000, // 2 horas
    enabled: true,
    evaluate: (context, metrics) => {
      if (metrics.scheduledToday === 0) return null;
      if (!context.isWorkHours) return null;

      // Solo en horario de mañana (9-12)
      if (context.localHour < 9 || context.localHour > 12) return null;

      return {
        id: `scheduled-${Date.now()}`,
        type: 'scheduled_reminder',
        title: 'Publicaciones de hoy',
        message: getRandomMessage('scheduled_reminder', { count: metrics.scheduledToday }),
        priority: 'medium',
        zone: 'sala-de-control',
        showAsNotification: true,
        timestamp: Date.now(),
        actions: [
          {
            id: 'view-calendar',
            label: 'Ver calendario',
            description: 'Calendario de publicaciones',
            icon: '📅',
            type: 'navigation',
            route: '/calendar',
          },
        ],
        data: { count: metrics.scheduledToday },
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CLASE DEL MOTOR PROACTIVO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Motor de comportamiento proactivo de KIRO.
 * Evalúa reglas periódicamente y genera sugerencias contextuales.
 */
export class KiroProactiveEngine {
  private rules: ProactiveRule[];
  private enabled: boolean;
  private evaluationInterval: number;
  private maxSuggestions: number;
  private onSuggestion?: (suggestion: ProactiveSuggestion) => void;
  private getMetrics?: () => DashboardMetrics | null;
  private getUserContext?: () => UserContext | null;

  private intervalId: NodeJS.Timeout | null = null;
  private lastActivation: Map<string, number> = new Map();
  private activeSuggestions: ProactiveSuggestion[] = [];

  constructor(options: ProactiveEngineOptions = {}) {
    this.rules = [...DEFAULT_RULES];
    this.enabled = options.enabled ?? true;
    this.evaluationInterval = options.evaluationIntervalMs ?? DEFAULT_EVALUATION_INTERVAL;
    this.maxSuggestions = options.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS;
    this.onSuggestion = options.onSuggestion;
    this.getMetrics = options.getMetrics;
    this.getUserContext = options.getUserContext;
  }

  /**
   * Inicia el motor proactivo
   */
  start(): void {
    if (!this.enabled) return;
    if (this.intervalId) return;

    console.log('[KiroProactiveEngine] Starting...');

    // Evaluación inicial después de un pequeño delay
    setTimeout(() => this.evaluate(), 5000);

    // Evaluaciones periódicas
    this.intervalId = setInterval(() => {
      this.evaluate();
    }, this.evaluationInterval);
  }

  /**
   * Detiene el motor proactivo
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[KiroProactiveEngine] Stopped');
  }

  /**
   * Evalúa todas las reglas y genera sugerencias
   */
  evaluate(): ProactiveSuggestion[] {
    const context = this.getUserContext?.();
    const metrics = this.getMetrics?.();

    if (!context || !metrics) {
      console.log('[KiroProactiveEngine] Missing context or metrics, skipping evaluation');
      return [];
    }

    const newSuggestions: ProactiveSuggestion[] = [];
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Verificar cooldown
      const lastActive = this.lastActivation.get(rule.id) ?? 0;
      if (now - lastActive < rule.cooldownMs) continue;

      // Verificar límite de sugerencias activas
      if (this.activeSuggestions.length >= this.maxSuggestions) break;

      // Evaluar regla
      try {
        const suggestion = rule.evaluate(context, metrics);
        if (suggestion) {
          newSuggestions.push(suggestion);
          this.lastActivation.set(rule.id, now);
          this.activeSuggestions.push(suggestion);

          // Notificar callback
          this.onSuggestion?.(suggestion);

          console.log(`[KiroProactiveEngine] Generated suggestion: ${rule.type}`);
        }
      } catch (error) {
        console.error(`[KiroProactiveEngine] Error evaluating rule ${rule.id}:`, error);
      }
    }

    // Limpiar sugerencias antiguas (más de 1 hora)
    this.activeSuggestions = this.activeSuggestions.filter(
      s => now - s.timestamp < 60 * 60 * 1000
    );

    return newSuggestions;
  }

  /**
   * Fuerza una evaluación inmediata
   */
  forceEvaluate(): ProactiveSuggestion[] {
    return this.evaluate();
  }

  /**
   * Descarta una sugerencia
   */
  dismissSuggestion(suggestionId: string): void {
    this.activeSuggestions = this.activeSuggestions.filter(s => s.id !== suggestionId);
  }

  /**
   * Agrega una regla personalizada
   */
  addRule(rule: ProactiveRule): void {
    this.rules.push(rule);
  }

  /**
   * Habilita/deshabilita una regla
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Obtiene las sugerencias activas
   */
  getActiveSuggestions(): ProactiveSuggestion[] {
    return [...this.activeSuggestions];
  }

  /**
   * Configura callbacks
   */
  configure(options: Partial<ProactiveEngineOptions>): void {
    if (options.onSuggestion !== undefined) {
      this.onSuggestion = options.onSuggestion;
    }
    if (options.getMetrics !== undefined) {
      this.getMetrics = options.getMetrics;
    }
    if (options.getUserContext !== undefined) {
      this.getUserContext = options.getUserContext;
    }
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
      if (this.enabled && !this.intervalId) {
        this.start();
      } else if (!this.enabled && this.intervalId) {
        this.stop();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convierte una sugerencia proactiva a notificación de KIRO
 */
export function suggestionToNotification(suggestion: ProactiveSuggestion): NewKiroNotification {
  return {
    type: 'kiro_tip',
    title: suggestion.title,
    message: suggestion.message,
    zone: suggestion.zone,
    priority: suggestion.priority,
    actionLabel: suggestion.actions[0]?.label,
    actionRoute: suggestion.actions[0]?.route,
    metadata: {
      suggestionType: suggestion.type,
      ...suggestion.data,
    },
  };
}

/**
 * Crea contexto de usuario básico
 */
export function createUserContext(
  userId: string,
  organizationId: string,
  currentZone: KiroZone,
  roles: string[],
  sessionStart: number
): UserContext {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  return {
    userId,
    organizationId,
    currentZone,
    roles,
    sessionDuration: Date.now() - sessionStart,
    lastKiroInteraction: Date.now(),
    localHour: hour,
    isWorkHours: hour >= 9 && hour < 18,
    isWeekend: day === 0 || day === 6,
  };
}

/**
 * Crea métricas de dashboard vacías
 */
export function createEmptyMetrics(): DashboardMetrics {
  return {
    pendingReviews: 0,
    overdueContent: 0,
    idleCreators: 0,
    scheduledToday: 0,
    unreadNotifications: 0,
    assignedTasks: 0,
    gamificationLevel: 1,
    currentPoints: 0,
    pointsToNextLevel: 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCIA SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let proactiveEngineInstance: KiroProactiveEngine | null = null;

/**
 * Obtiene la instancia singleton del motor proactivo
 */
export function getProactiveEngine(): KiroProactiveEngine {
  if (!proactiveEngineInstance) {
    proactiveEngineInstance = new KiroProactiveEngine();
  }
  return proactiveEngineInstance;
}

/**
 * Inicializa el motor proactivo con opciones
 */
export function initProactiveEngine(options: ProactiveEngineOptions): KiroProactiveEngine {
  if (proactiveEngineInstance) {
    proactiveEngineInstance.stop();
  }
  proactiveEngineInstance = new KiroProactiveEngine(options);
  return proactiveEngineInstance;
}
