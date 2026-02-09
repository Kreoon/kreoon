// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE GAMIFICACIÓN PARA KIRO
// Sistema de UP Points integrado con la mascota IA
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Definición de un nivel en el sistema de gamificación.
 */
export interface KiroLevel {
  /** Número del nivel (1-7) */
  level: number;
  /** Nombre del nivel en español */
  name: string;
  /** Puntos mínimos para alcanzar este nivel */
  minPoints: number;
  /** Puntos máximos antes de subir al siguiente (Infinity para el último) */
  maxPoints: number;
  /** Emoji representativo del nivel */
  emoji: string;
  /** Color del nivel para UI (hex) */
  color: string;
  /** Mensaje que KIRO dice al subir a este nivel */
  kiroMessage: string;
}

/**
 * Fuente de puntos desde interacciones con KIRO.
 */
export interface PointSource {
  /** Identificador único de la fuente */
  key: string;
  /** Etiqueta para mostrar en UI */
  label: string;
  /** Puntos otorgados por esta acción */
  points: number;
  /** Minutos de cooldown entre otorgamientos (null = sin cooldown) */
  cooldownMinutes: number | null;
  /** Máximo de veces que se puede otorgar por día */
  maxPerDay: number;
  /** Descripción de la acción */
  description: string;
}

/**
 * Progreso hacia el siguiente nivel.
 */
export interface LevelProgress {
  /** Nivel actual del usuario */
  current: KiroLevel;
  /** Siguiente nivel (null si está en el máximo) */
  next: KiroLevel | null;
  /** Porcentaje de progreso hacia el siguiente nivel (0-100) */
  progress: number;
  /** Puntos que faltan para el siguiente nivel */
  pointsNeeded: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFINICIÓN DE NIVELES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Niveles del sistema de gamificación de Kreoon.
 * Terminología cinematográfica en español.
 */
export const KIRO_LEVELS: KiroLevel[] = [
  {
    level: 1,
    name: 'Pasante',
    minPoints: 0,
    maxPoints: 99,
    emoji: '🎬',
    color: '#9ca3af',
    kiroMessage: '¡Bienvenido al estudio! Vamos a crear cosas increíbles juntos 🎬',
  },
  {
    level: 2,
    name: 'Asistente de Set',
    minPoints: 100,
    maxPoints: 499,
    emoji: '🎯',
    color: '#60a5fa',
    kiroMessage: '¡Subiste a Asistente de Set! Ya estás tomando ritmo 🎯',
  },
  {
    level: 3,
    name: 'Camarógrafo',
    minPoints: 500,
    maxPoints: 1499,
    emoji: '📸',
    color: '#34d399',
    kiroMessage: '¡Ahora eres Camarógrafo! Tu ojo creativo se nota 📸',
  },
  {
    level: 4,
    name: 'Editor',
    minPoints: 1500,
    maxPoints: 3999,
    emoji: '✂️',
    color: '#a78bfa',
    kiroMessage: '¡Nivel Editor desbloqueado! Estás dando forma al contenido como un pro ✂️',
  },
  {
    level: 5,
    name: 'Director',
    minPoints: 4000,
    maxPoints: 9999,
    emoji: '🎬',
    color: '#f59e0b',
    kiroMessage: '¡Director! Tú mandas en el set ahora. ¡Qué nivel! 🎬',
  },
  {
    level: 6,
    name: 'Productor Ejecutivo',
    minPoints: 10000,
    maxPoints: 24999,
    emoji: '🏆',
    color: '#f97316',
    kiroMessage: '¡Productor Ejecutivo! Ya eres parte del top del estudio 🏆',
  },
  {
    level: 7,
    name: 'Leyenda del Estudio',
    minPoints: 25000,
    maxPoints: Infinity,
    emoji: '👑',
    color: '#eab308',
    kiroMessage: '👑 ¡LEYENDA DEL ESTUDIO! No hay palabras. Eres inspiración pura.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FUENTES DE PUNTOS DESDE KIRO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Acciones que otorgan UP Points a través de KIRO.
 */
export const KIRO_POINT_SOURCES: PointSource[] = [
  {
    key: 'kiro_game_play',
    label: 'Jugar mini-juego',
    points: 5,
    cooldownMinutes: 30,
    maxPerDay: 6,
    description: 'Completar una partida del juego de KIRO',
  },
  {
    key: 'kiro_game_high_score',
    label: 'Puntaje alto en juego',
    points: 15,
    cooldownMinutes: 60,
    maxPerDay: 3,
    description: 'Obtener más de 20 puntos en una partida',
  },
  {
    key: 'kiro_chat_feedback',
    label: 'Dar feedback',
    points: 2,
    cooldownMinutes: 5,
    maxPerDay: 20,
    description: 'Dar feedback positivo o negativo a una respuesta',
  },
  {
    key: 'kiro_daily_greeting',
    label: 'Saludo diario',
    points: 3,
    cooldownMinutes: null,
    maxPerDay: 1,
    description: 'Interactuar con KIRO por primera vez en el día',
  },
  {
    key: 'kiro_action_executed',
    label: 'Ejecutar acción rápida',
    points: 2,
    cooldownMinutes: 2,
    maxPerDay: 15,
    description: 'Usar una acción rápida contextual',
  },
  {
    key: 'kiro_notification_read',
    label: 'Leer notificación',
    points: 1,
    cooldownMinutes: null,
    maxPerDay: 30,
    description: 'Marcar una notificación como leída',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el nivel correspondiente a una cantidad de puntos.
 */
export function getLevelForPoints(points: number): KiroLevel {
  // Buscar de mayor a menor para encontrar el nivel correcto
  for (let i = KIRO_LEVELS.length - 1; i >= 0; i--) {
    if (points >= KIRO_LEVELS[i].minPoints) {
      return KIRO_LEVELS[i];
    }
  }
  // Por defecto, retornar nivel 1
  return KIRO_LEVELS[0];
}

/**
 * Calcula el progreso hacia el siguiente nivel.
 */
export function getProgressToNextLevel(points: number): LevelProgress {
  const current = getLevelForPoints(points);
  const nextIndex = KIRO_LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = nextIndex < KIRO_LEVELS.length ? KIRO_LEVELS[nextIndex] : null;

  // Si ya está en el nivel máximo
  if (!next) {
    return {
      current,
      next: null,
      progress: 100,
      pointsNeeded: 0,
    };
  }

  // Calcular progreso
  const pointsInCurrentLevel = points - current.minPoints;
  const pointsRequiredForLevel = next.minPoints - current.minPoints;
  const progress = Math.min(100, Math.floor((pointsInCurrentLevel / pointsRequiredForLevel) * 100));
  const pointsNeeded = next.minPoints - points;

  return {
    current,
    next,
    progress,
    pointsNeeded,
  };
}

/**
 * Verifica si hubo un level up al sumar puntos.
 * @returns El nuevo nivel si subió, null si no hubo cambio
 */
export function didLevelUp(previousPoints: number, newPoints: number): KiroLevel | null {
  const previousLevel = getLevelForPoints(previousPoints);
  const newLevel = getLevelForPoints(newPoints);

  if (newLevel.level > previousLevel.level) {
    return newLevel;
  }

  return null;
}

/**
 * Obtiene una fuente de puntos por su key.
 */
export function getPointSource(key: string): PointSource | undefined {
  return KIRO_POINT_SOURCES.find((source) => source.key === key);
}

/**
 * Formatea un número con separador de miles (formato colombiano).
 */
export function formatPoints(points: number): string {
  return points.toLocaleString('es-CO');
}

// ─────────────────────────────────────────────────────────────────────────────
// FRASES MOTIVACIONALES PARA EL JUEGO
// ─────────────────────────────────────────────────────────────────────────────

export const KIRO_GAME_PHRASES = [
  '¡A atrapar tokens! 🎯',
  '¿Listo para batir tu récord? 💪',
  'Los tokens UP te esperan ⭐',
  '¡Hoy es tu día de suerte! 🍀',
  '¡Muestra tus reflejos! ⚡',
  '¡Vamos por esos puntos! 🚀',
];

/**
 * Obtiene una frase motivacional aleatoria para el juego.
 */
export function getRandomGamePhrase(): string {
  return KIRO_GAME_PHRASES[Math.floor(Math.random() * KIRO_GAME_PHRASES.length)];
}
