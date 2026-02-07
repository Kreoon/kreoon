/**
 * KiroIntentDetector.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * Sistema de detección de intenciones del usuario basado en el texto del chat.
 * Usa detección local por keywords para respuesta instantánea (<5ms).
 * Permite que KIRO entienda qué quiere hacer el usuario y ofrezca acciones.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { KiroZone } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de intención que KIRO puede detectar
 */
export type KiroIntent =
  | 'create_brief'        // Crear un brief de contenido
  | 'find_creator'        // Buscar un creador
  | 'check_status'        // Ver estado de contenido/producción
  | 'generate_hook'       // Generar hooks creativos
  | 'analyze_metrics'     // Analizar métricas
  | 'schedule_content'    // Programar contenido
  | 'review_content'      // Revisar contenido pendiente
  | 'assign_task'         // Asignar tarea a alguien
  | 'navigate'            // Navegar a una sección
  | 'help'                // Pedir ayuda
  | 'play_game'           // Jugar mini-juego
  | 'greeting'            // Saludo
  | 'unknown';            // No se pudo detectar

/**
 * Resultado de la detección de intención
 */
export interface IntentDetectionResult {
  /** Intención detectada */
  intent: KiroIntent;
  /** Confianza de la detección (0-1) */
  confidence: number;
  /** Entidades extraídas del texto */
  entities: IntentEntities;
  /** Keywords que dispararon la detección */
  matchedKeywords: string[];
  /** Zona relacionada con la intención */
  suggestedZone: KiroZone;
  /** Acciones sugeridas para esta intención */
  suggestedActions: SuggestedAction[];
  /** Tiempo de procesamiento en ms */
  processingTime: number;
}

/**
 * Entidades extraídas del mensaje
 */
export interface IntentEntities {
  /** Nombre de creador mencionado */
  creatorName?: string;
  /** Nombre de cliente mencionado */
  clientName?: string;
  /** Nombre de campaña mencionado */
  campaignName?: string;
  /** Fechas mencionadas */
  dates?: string[];
  /** Números mencionados (IDs, cantidades) */
  numbers?: number[];
  /** Estado mencionado */
  status?: string;
  /** Tipo de contenido mencionado */
  contentType?: string;
  /** Sección/página mencionada */
  section?: string;
}

/**
 * Acción sugerida por KIRO
 */
export interface SuggestedAction {
  /** ID único de la acción */
  id: string;
  /** Texto del botón */
  label: string;
  /** Descripción corta */
  description: string;
  /** Icono (emoji) */
  icon: string;
  /** Tipo de acción */
  type: 'navigation' | 'command' | 'wizard' | 'quick';
  /** Ruta de navegación (si type es 'navigation') */
  route?: string;
  /** Comando a ejecutar (si type es 'command') */
  command?: string;
  /** Datos adicionales */
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE KEYWORDS POR INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════

interface IntentKeywordConfig {
  /** Keywords primarias (alta confianza) */
  primary: string[];
  /** Keywords secundarias (confianza media) */
  secondary: string[];
  /** Zona relacionada */
  zone: KiroZone;
  /** Acciones sugeridas */
  actions: SuggestedAction[];
}

const INTENT_KEYWORDS: Record<KiroIntent, IntentKeywordConfig> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Creación de Contenido
  // ─────────────────────────────────────────────────────────────────────────
  create_brief: {
    primary: ['crear brief', 'nuevo brief', 'brief de', 'hacer brief', 'generar brief'],
    secondary: ['brief', 'crear contenido', 'nuevo contenido', 'nueva campaña', 'empezar campaña'],
    zone: 'sala-de-control',
    actions: [
      {
        id: 'create-brief-wizard',
        label: 'Crear Brief',
        description: 'Abrir asistente de creación de brief',
        icon: '📝',
        type: 'wizard',
        route: '/briefs/new',
      },
      {
        id: 'view-briefs',
        label: 'Ver Briefs',
        description: 'Ver briefs existentes',
        icon: '📋',
        type: 'navigation',
        route: '/briefs',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Búsqueda de Creadores
  // ─────────────────────────────────────────────────────────────────────────
  find_creator: {
    primary: ['buscar creador', 'encontrar creador', 'buscar talento', 'encontrar talento'],
    secondary: ['creador', 'creadores', 'talento', 'influencer', 'casting', 'quién puede'],
    zone: 'casting',
    actions: [
      {
        id: 'open-casting',
        label: 'Ir a Casting',
        description: 'Buscar creadores disponibles',
        icon: '🎭',
        type: 'navigation',
        route: '/creators',
      },
      {
        id: 'ai-match',
        label: 'Match con IA',
        description: 'KIRO sugiere creadores ideales',
        icon: '🤖',
        type: 'command',
        command: 'ai_creator_match',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Estado de Producción
  // ─────────────────────────────────────────────────────────────────────────
  check_status: {
    primary: ['estado de', 'cómo va', 'cómo está', 'ver estado', 'revisar estado'],
    secondary: ['estado', 'progreso', 'avance', 'pendiente', 'pendientes', 'atrasado', 'entregado'],
    zone: 'sala-de-control',
    actions: [
      {
        id: 'view-board',
        label: 'Ver Tablero',
        description: 'Ir al tablero de contenido',
        icon: '📊',
        type: 'navigation',
        route: '/content-board',
      },
      {
        id: 'pending-review',
        label: 'Pendientes de Revisión',
        description: 'Ver contenido por revisar',
        icon: '👀',
        type: 'navigation',
        route: '/content-board?filter=review',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Generación de Hooks
  // ─────────────────────────────────────────────────────────────────────────
  generate_hook: {
    primary: ['generar hook', 'crear hook', 'hook para', 'hooks para', 'dame hooks'],
    secondary: ['hook', 'hooks', 'guión', 'script', 'idea creativa', 'ideas para'],
    zone: 'sala-de-edicion',
    actions: [
      {
        id: 'hook-generator',
        label: 'Generador de Hooks',
        description: 'Crear hooks con IA',
        icon: '💡',
        type: 'wizard',
        command: 'generate_hooks',
      },
      {
        id: 'script-ai',
        label: 'Asistente de Guiones',
        description: 'Generar guiones creativos',
        icon: '🎬',
        type: 'command',
        command: 'script_assistant',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Análisis de Métricas
  // ─────────────────────────────────────────────────────────────────────────
  analyze_metrics: {
    primary: ['analizar métricas', 'ver métricas', 'métricas de', 'estadísticas de'],
    secondary: ['métricas', 'estadísticas', 'rendimiento', 'performance', 'analytics', 'datos'],
    zone: 'sala-de-control',
    actions: [
      {
        id: 'view-analytics',
        label: 'Ver Analytics',
        description: 'Dashboard de métricas',
        icon: '📈',
        type: 'navigation',
        route: '/analytics',
      },
      {
        id: 'ai-insights',
        label: 'Insights con IA',
        description: 'KIRO analiza tus métricas',
        icon: '🧠',
        type: 'command',
        command: 'ai_analytics',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Programación de Contenido
  // ─────────────────────────────────────────────────────────────────────────
  schedule_content: {
    primary: ['programar contenido', 'agendar contenido', 'calendario de', 'programar publicación'],
    secondary: ['programar', 'agendar', 'calendario', 'fecha de', 'cuándo publicar'],
    zone: 'sala-de-control',
    actions: [
      {
        id: 'open-calendar',
        label: 'Calendario',
        description: 'Ver calendario de publicaciones',
        icon: '📅',
        type: 'navigation',
        route: '/calendar',
      },
      {
        id: 'schedule-wizard',
        label: 'Programar',
        description: 'Asistente de programación',
        icon: '⏰',
        type: 'wizard',
        command: 'schedule_wizard',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Revisión de Contenido
  // ─────────────────────────────────────────────────────────────────────────
  review_content: {
    primary: ['revisar contenido', 'aprobar contenido', 'ver entregas', 'contenido pendiente'],
    secondary: ['revisar', 'aprobar', 'rechazar', 'feedback', 'entrega', 'entregas'],
    zone: 'sala-de-edicion',
    actions: [
      {
        id: 'pending-reviews',
        label: 'Por Revisar',
        description: 'Contenido esperando aprobación',
        icon: '✅',
        type: 'navigation',
        route: '/content-board?status=review',
      },
      {
        id: 'recent-deliveries',
        label: 'Entregas Recientes',
        description: 'Ver últimas entregas',
        icon: '📦',
        type: 'navigation',
        route: '/content-board?sort=recent',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Asignación de Tareas
  // ─────────────────────────────────────────────────────────────────────────
  assign_task: {
    primary: ['asignar a', 'asignar tarea', 'dar tarea a', 'encargale a'],
    secondary: ['asignar', 'delegar', 'encargar', 'tarea para', 'trabajo para'],
    zone: 'casting',
    actions: [
      {
        id: 'quick-assign',
        label: 'Asignación Rápida',
        description: 'Asignar contenido a creador',
        icon: '🎯',
        type: 'wizard',
        command: 'quick_assign',
      },
      {
        id: 'team-view',
        label: 'Ver Equipo',
        description: 'Ver cargas de trabajo',
        icon: '👥',
        type: 'navigation',
        route: '/team',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Navegación
  // ─────────────────────────────────────────────────────────────────────────
  navigate: {
    primary: ['ir a', 'llévame a', 'abrir', 'mostrar', 'ver'],
    secondary: ['tablero', 'dashboard', 'inicio', 'configuración', 'perfil', 'chat'],
    zone: 'general',
    actions: [], // Se genera dinámicamente basado en la sección detectada
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Ayuda
  // ─────────────────────────────────────────────────────────────────────────
  help: {
    primary: ['ayuda', 'ayúdame', 'cómo hago', 'cómo puedo', 'no sé cómo'],
    secondary: ['help', 'tutorial', 'explicame', 'qué es', 'para qué sirve'],
    zone: 'escuela',
    actions: [
      {
        id: 'help-center',
        label: 'Centro de Ayuda',
        description: 'Ver tutoriales y guías',
        icon: '❓',
        type: 'navigation',
        route: '/help',
      },
      {
        id: 'kiro-tutorial',
        label: 'Tutorial KIRO',
        description: 'KIRO te explica',
        icon: '🎓',
        type: 'command',
        command: 'kiro_tutorial',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Mini-Juego
  // ─────────────────────────────────────────────────────────────────────────
  play_game: {
    primary: ['jugar', 'quiero jugar', 'mini juego', 'minijuego', 'jueguemos'],
    secondary: ['juego', 'divertirme', 'descanso', 'tokens', 'puntos'],
    zone: 'general',
    actions: [
      {
        id: 'play-kiro-game',
        label: 'Jugar',
        description: 'Iniciar mini-juego de tokens',
        icon: '🎮',
        type: 'command',
        command: 'open_game',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Saludo
  // ─────────────────────────────────────────────────────────────────────────
  greeting: {
    primary: ['hola', 'hey', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches'],
    secondary: ['qué tal', 'cómo estás', 'hi', 'hello'],
    zone: 'general',
    actions: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Desconocido
  // ─────────────────────────────────────────────────────────────────────────
  unknown: {
    primary: [],
    secondary: [],
    zone: 'general',
    actions: [
      {
        id: 'ask-kiro',
        label: 'Preguntar a KIRO',
        description: 'KIRO intentará ayudarte',
        icon: '💬',
        type: 'command',
        command: 'ai_chat',
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAPEO DE SECCIONES PARA NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const SECTION_ROUTES: Record<string, { route: string; label: string; icon: string }> = {
  // Dashboard
  dashboard: { route: '/dashboard', label: 'Dashboard', icon: '🏠' },
  inicio: { route: '/dashboard', label: 'Inicio', icon: '🏠' },

  // Content Board
  tablero: { route: '/content-board', label: 'Tablero de Contenido', icon: '📊' },
  contenido: { route: '/content-board', label: 'Contenido', icon: '📊' },
  board: { route: '/content-board', label: 'Board', icon: '📊' },

  // Creadores
  creadores: { route: '/creators', label: 'Creadores', icon: '🎭' },
  casting: { route: '/creators', label: 'Casting', icon: '🎭' },
  talentos: { route: '/creators', label: 'Talentos', icon: '🎭' },

  // Clientes
  clientes: { route: '/clients', label: 'Clientes', icon: '👔' },

  // Equipo
  equipo: { route: '/team', label: 'Equipo', icon: '👥' },
  team: { route: '/team', label: 'Team', icon: '👥' },

  // Chat
  chat: { route: '/chat', label: 'Chat', icon: '💬' },
  mensajes: { route: '/chat', label: 'Mensajes', icon: '💬' },

  // Calendario
  calendario: { route: '/calendar', label: 'Calendario', icon: '📅' },

  // Configuración
  configuración: { route: '/settings', label: 'Configuración', icon: '⚙️' },
  config: { route: '/settings', label: 'Configuración', icon: '⚙️' },
  ajustes: { route: '/settings', label: 'Ajustes', icon: '⚙️' },

  // Perfil
  perfil: { route: '/profile', label: 'Perfil', icon: '👤' },
  profile: { route: '/profile', label: 'Profile', icon: '👤' },

  // Live
  live: { route: '/live', label: 'Live', icon: '📺' },
  streaming: { route: '/live', label: 'Streaming', icon: '📺' },

  // Analytics
  analytics: { route: '/analytics', label: 'Analytics', icon: '📈' },
  métricas: { route: '/analytics', label: 'Métricas', icon: '📈' },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACCIÓN DE ENTIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patrones para extraer entidades del texto
 */
const ENTITY_PATTERNS = {
  // Nombres propios (capitalizados)
  properName: /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?\b/g,

  // Fechas
  date: /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\s+de\s+\w+)\b/gi,

  // Números
  number: /\b\d+\b/g,

  // Estados de contenido
  status: /\b(pendiente|aprobado|rechazado|en\s+revisión|entregado|borrador|publicado)\b/gi,

  // Tipos de contenido
  contentType: /\b(video|reel|story|stories|post|carrusel|tiktok|short|live)\b/gi,
};

/**
 * Extrae entidades del texto del mensaje
 */
function extractEntities(text: string): IntentEntities {
  const entities: IntentEntities = {};
  const normalizedText = text.toLowerCase();

  // Extraer nombres propios
  const names = text.match(ENTITY_PATTERNS.properName);
  if (names && names.length > 0) {
    // Heurística: el primer nombre podría ser creador, el segundo cliente
    entities.creatorName = names[0];
    if (names.length > 1) {
      entities.clientName = names[1];
    }
  }

  // Extraer fechas
  const dates = text.match(ENTITY_PATTERNS.date);
  if (dates) {
    entities.dates = dates;
  }

  // Extraer números
  const numbers = text.match(ENTITY_PATTERNS.number);
  if (numbers) {
    entities.numbers = numbers.map(Number);
  }

  // Extraer estado
  const statusMatch = normalizedText.match(ENTITY_PATTERNS.status);
  if (statusMatch) {
    entities.status = statusMatch[0];
  }

  // Extraer tipo de contenido
  const contentTypeMatch = normalizedText.match(ENTITY_PATTERNS.contentType);
  if (contentTypeMatch) {
    entities.contentType = contentTypeMatch[0];
  }

  // Extraer sección para navegación
  for (const [key] of Object.entries(SECTION_ROUTES)) {
    if (normalizedText.includes(key)) {
      entities.section = key;
      break;
    }
  }

  return entities;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL DE DETECCIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta la intención del usuario a partir del texto del mensaje.
 * Diseñado para ser extremadamente rápido (<5ms) usando matching local.
 */
export function detectIntent(text: string): IntentDetectionResult {
  const startTime = performance.now();

  const normalizedText = text.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  let detectedIntent: KiroIntent = 'unknown';
  let maxConfidence = 0;

  // Buscar en cada intención
  for (const [intent, config] of Object.entries(INTENT_KEYWORDS) as [KiroIntent, IntentKeywordConfig][]) {
    if (intent === 'unknown') continue;

    let confidence = 0;
    const intentMatches: string[] = [];

    // Buscar keywords primarias (alta confianza)
    for (const keyword of config.primary) {
      if (normalizedText.includes(keyword)) {
        confidence = Math.max(confidence, 0.9);
        intentMatches.push(keyword);
      }
    }

    // Buscar keywords secundarias (confianza media)
    for (const keyword of config.secondary) {
      if (normalizedText.includes(keyword)) {
        confidence = Math.max(confidence, 0.6);
        intentMatches.push(keyword);
      }
    }

    // Boost de confianza por múltiples matches
    if (intentMatches.length > 1) {
      confidence = Math.min(1, confidence + 0.1 * (intentMatches.length - 1));
    }

    // Actualizar si esta intención tiene mayor confianza
    if (confidence > maxConfidence) {
      maxConfidence = confidence;
      detectedIntent = intent;
      matchedKeywords.length = 0;
      matchedKeywords.push(...intentMatches);
    }
  }

  // Extraer entidades
  const entities = extractEntities(text);

  // Obtener configuración de la intención detectada
  const intentConfig = INTENT_KEYWORDS[detectedIntent];

  // Generar acciones sugeridas
  let suggestedActions = [...intentConfig.actions];

  // Si es navegación, generar acción dinámica basada en la sección detectada
  if (detectedIntent === 'navigate' && entities.section) {
    const sectionInfo = SECTION_ROUTES[entities.section];
    if (sectionInfo) {
      suggestedActions = [
        {
          id: `nav-${entities.section}`,
          label: `Ir a ${sectionInfo.label}`,
          description: sectionInfo.label,
          icon: sectionInfo.icon,
          type: 'navigation',
          route: sectionInfo.route,
        },
      ];
    }
  }

  const processingTime = performance.now() - startTime;

  return {
    intent: detectedIntent,
    confidence: maxConfidence,
    entities,
    matchedKeywords,
    suggestedZone: intentConfig.zone,
    suggestedActions,
    processingTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica si el texto es un saludo
 */
export function isGreeting(text: string): boolean {
  return detectIntent(text).intent === 'greeting';
}

/**
 * Verifica si se detectó una intención ejecutable
 */
export function hasExecutableIntent(result: IntentDetectionResult): boolean {
  return result.intent !== 'unknown' && result.intent !== 'greeting' && result.confidence >= 0.6;
}

/**
 * Obtiene la acción principal sugerida (si hay)
 */
export function getPrimaryAction(result: IntentDetectionResult): SuggestedAction | null {
  return result.suggestedActions[0] || null;
}

/**
 * Genera un mensaje de KIRO explicando qué detectó
 */
export function getDetectionExplanation(result: IntentDetectionResult): string {
  const explanations: Record<KiroIntent, string> = {
    create_brief: '¡Veo que quieres crear un nuevo brief! Te ayudo con eso.',
    find_creator: '¿Buscando el talento perfecto? ¡Soy bueno en eso!',
    check_status: 'Vamos a ver cómo van las cosas por aquí...',
    generate_hook: '¡Hora de ser creativos! Generemos algunos hooks.',
    analyze_metrics: 'Déjame revisar los números para ti.',
    schedule_content: 'Organicemos el calendario de publicaciones.',
    review_content: 'Hay contenido esperando tu aprobación.',
    assign_task: 'Te ayudo a delegar esa tarea.',
    navigate: 'Te llevo ahí enseguida.',
    help: '¡Estoy aquí para ayudarte! ¿Qué necesitas saber?',
    play_game: '¡Eso! Un descanso bien merecido. ¡A jugar!',
    greeting: '¡Hola! ¿En qué puedo ayudarte hoy?',
    unknown: 'No estoy seguro de qué necesitas, pero intentaré ayudarte.',
  };

  return explanations[result.intent];
}

/**
 * Obtiene todos los intents disponibles con sus keywords
 */
export function getAvailableIntents(): { intent: KiroIntent; description: string }[] {
  return [
    { intent: 'create_brief', description: 'Crear un nuevo brief de contenido' },
    { intent: 'find_creator', description: 'Buscar creadores/talentos' },
    { intent: 'check_status', description: 'Ver estado de producciones' },
    { intent: 'generate_hook', description: 'Generar hooks creativos' },
    { intent: 'analyze_metrics', description: 'Analizar métricas' },
    { intent: 'schedule_content', description: 'Programar contenido' },
    { intent: 'review_content', description: 'Revisar entregas pendientes' },
    { intent: 'assign_task', description: 'Asignar tareas' },
    { intent: 'navigate', description: 'Navegar a una sección' },
    { intent: 'help', description: 'Obtener ayuda' },
    { intent: 'play_game', description: 'Jugar mini-juego' },
  ];
}
