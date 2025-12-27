/**
 * AI GOVERNANCE LAYER - ModuleKeys Oficiales (ESTÁNDAR DE PLATAFORMA)
 * 
 * Estos moduleKey son canónicos y NO se renombran por organización.
 * Sirven para: control, auditoría, pricing IA, escalabilidad.
 */

// ============================================
// TABLERO
// ============================================
export const BOARD_AI_MODULES = {
  CARDS: 'board.cards.ai',      // IA sobre tarjetas individuales
  STATES: 'board.states.ai',    // IA sobre estados del tablero
  FLOWS: 'board.flows.ai',      // IA sobre flujo completo
} as const;

// ============================================
// CONTENT DETAIL DIALOG
// ============================================
export const CONTENT_AI_MODULES = {
  SCRIPT: 'content.script.ai',        // IA de generación/análisis de guiones
  EDITOR: 'content.editor.ai',        // IA para editor (estructura, ritmo, cortes)
  STRATEGIST: 'content.strategist.ai', // IA estratégica (embudo, hipótesis)
  DESIGNER: 'content.designer.ai',    // IA para lineamientos visuales
  TRAFFICKER: 'content.trafficker.ai', // IA para copies, ads, KPI
  ADMIN: 'content.admin.ai',          // IA operativa / PM
} as const;

// ============================================
// SISTEMA UP (Gamificación)
// ============================================
export const UP_AI_MODULES = {
  EVENTS: 'up.events.ai',             // Detección de eventos
  QUALITY: 'up.quality.ai',           // Quality score
  RECOMMENDATIONS: 'up.recommendations.ai', // Reglas / misiones
  ANTIFRAUD: 'up.antifraud.ai',       // Fraude / abuso
} as const;

// ============================================
// TALENT SYSTEM
// ============================================
export const TALENT_AI_MODULES = {
  MATCHING: 'talent.matching.ai',       // Asignación inteligente
  QUALITY: 'talent.quality.ai',         // Scoring de calidad
  RISK: 'talent.risk.ai',               // Riesgo de retraso/burnout
  REPUTATION: 'talent.reputation.ai',   // Reputación y embajadores
  AMBASSADOR: 'talent.ambassador.ai',   // Evaluación y gestión de embajadores
} as const;

// ============================================
// LIVE COMMERCE (Futuro)
// ============================================
export const LIVE_AI_MODULES = {
  CONTROL: 'live.control.ai',
  PRODUCTS: 'live.products.ai',
  ANALYTICS: 'live.analytics.ai',
} as const;

// ============================================
// DEFINICIÓN COMPLETA DE MÓDULOS
// ============================================
export interface AIModuleDefinition {
  key: string;
  name: string;
  description: string;
  category: 'board' | 'content' | 'up' | 'live' | 'talent' | 'general';
  icon?: string;
}

export const AI_MODULE_DEFINITIONS: AIModuleDefinition[] = [
  // TABLERO
  {
    key: BOARD_AI_MODULES.CARDS,
    name: 'Tablero – Tarjetas',
    description: 'Análisis de tarjetas, riesgo de atraso, siguiente estado recomendado, reasignación sugerida',
    category: 'board',
  },
  {
    key: BOARD_AI_MODULES.STATES,
    name: 'Tablero – Estados',
    description: 'Detección de estados saturados, recomendación de división/fusión, optimización de nombres y reglas',
    category: 'board',
  },
  {
    key: BOARD_AI_MODULES.FLOWS,
    name: 'Tablero – Flujos',
    description: 'Análisis del flujo completo, cuellos de botella, reglas automáticas sugeridas',
    category: 'board',
  },
  
  // CONTENT DETAIL
  {
    key: CONTENT_AI_MODULES.SCRIPT,
    name: 'Content – Guión',
    description: 'Creación y análisis de guiones, estructuración de hooks, CTAs y storytelling',
    category: 'content',
  },
  {
    key: CONTENT_AI_MODULES.EDITOR,
    name: 'Content – Editor',
    description: 'Optimización de estructura de edición, ritmo, cortes y storytelling visual',
    category: 'content',
  },
  {
    key: CONTENT_AI_MODULES.STRATEGIST,
    name: 'Content – Estratega',
    description: 'Análisis estratégico de embudo, hipótesis de conversión, ángulos de venta',
    category: 'content',
  },
  {
    key: CONTENT_AI_MODULES.DESIGNER,
    name: 'Content – Diseñador',
    description: 'Generación de lineamientos visuales, paletas, estilos de miniatura',
    category: 'content',
  },
  {
    key: CONTENT_AI_MODULES.TRAFFICKER,
    name: 'Content – Trafficker',
    description: 'Copies para ads, segmentación sugerida, KPIs esperados',
    category: 'content',
  },
  {
    key: CONTENT_AI_MODULES.ADMIN,
    name: 'Content – Admin',
    description: 'Gestión operativa, seguimiento PM, alertas de timeline',
    category: 'content',
  },
  
  // SISTEMA UP
  {
    key: UP_AI_MODULES.EVENTS,
    name: 'UP – Eventos',
    description: 'Detección automática de eventos para asignación de puntos',
    category: 'up',
  },
  {
    key: UP_AI_MODULES.QUALITY,
    name: 'UP – Quality Score',
    description: 'Evaluación de calidad de contenido para gamificación',
    category: 'up',
  },
  {
    key: UP_AI_MODULES.RECOMMENDATIONS,
    name: 'UP – Recomendaciones',
    description: 'Sugerencias de reglas, misiones y ajustes de sistema',
    category: 'up',
  },
  {
    key: UP_AI_MODULES.ANTIFRAUD,
    name: 'UP – Anti-Fraude',
    description: 'Detección de patrones de abuso o manipulación',
    category: 'up',
  },
  
  // TALENT SYSTEM
  {
    key: TALENT_AI_MODULES.MATCHING,
    name: 'Talent – Matching',
    description: 'Asignación inteligente de creadores y editores basada en carga, calidad y disponibilidad',
    category: 'talent',
  },
  {
    key: TALENT_AI_MODULES.QUALITY,
    name: 'Talent – Quality',
    description: 'Evaluación automática de calidad de trabajo y scoring de talento',
    category: 'talent',
  },
  {
    key: TALENT_AI_MODULES.RISK,
    name: 'Talent – Risk',
    description: 'Detección de riesgo de retraso, burnout o sobrecarga de trabajo',
    category: 'talent',
  },
  {
    key: TALENT_AI_MODULES.REPUTATION,
    name: 'Talent – Reputation',
    description: 'Análisis de reputación, recomendaciones de nivel y potencial de embajador',
    category: 'talent',
  },
  {
    key: TALENT_AI_MODULES.AMBASSADOR,
    name: 'Talent – Ambassador',
    description: 'Evaluación de embajadores, métricas de red, ascensos/descensos y alertas',
    category: 'talent',
  },
  
  // LIVE COMMERCE (Futuro)
  {
    key: LIVE_AI_MODULES.CONTROL,
    name: 'Live – Control',
    description: 'Control en tiempo real de transmisiones en vivo',
    category: 'live',
  },
  {
    key: LIVE_AI_MODULES.PRODUCTS,
    name: 'Live – Productos',
    description: 'Gestión y recomendación de productos en live',
    category: 'live',
  },
  {
    key: LIVE_AI_MODULES.ANALYTICS,
    name: 'Live – Analytics',
    description: 'Métricas y análisis de rendimiento de lives',
    category: 'live',
  },
];

// Helper para obtener definición de módulo por key
export function getModuleDefinition(key: string): AIModuleDefinition | undefined {
  return AI_MODULE_DEFINITIONS.find(m => m.key === key);
}

// Helper para obtener módulos por categoría
export function getModulesByCategory(category: AIModuleDefinition['category']): AIModuleDefinition[] {
  return AI_MODULE_DEFINITIONS.filter(m => m.category === category);
}

// Categorías con labels
export const AI_MODULE_CATEGORIES = {
  board: { label: 'Tablero', icon: 'LayoutDashboard' },
  content: { label: 'Contenido', icon: 'FileVideo' },
  up: { label: 'Sistema UP', icon: 'Trophy' },
  talent: { label: 'Talento', icon: 'Users' },
  live: { label: 'Live Commerce', icon: 'Radio' },
  general: { label: 'General', icon: 'Bot' },
} as const;

// LEGACY MAPPINGS - Para compatibilidad con código existente
export const LEGACY_MODULE_MAPPINGS: Record<string, string> = {
  'board_cards': BOARD_AI_MODULES.CARDS,
  'board_states': BOARD_AI_MODULES.STATES,
  'board_flows': BOARD_AI_MODULES.FLOWS,
  'content_detail': CONTENT_AI_MODULES.SCRIPT, // Mapea al módulo de guión
  'scripts': CONTENT_AI_MODULES.SCRIPT,
  'thumbnails': CONTENT_AI_MODULES.DESIGNER,
  'sistema_up': UP_AI_MODULES.QUALITY, // Mapea al quality score por defecto
};

// Type for all valid module keys
export type AIModuleKey = 
  | typeof BOARD_AI_MODULES[keyof typeof BOARD_AI_MODULES]
  | typeof CONTENT_AI_MODULES[keyof typeof CONTENT_AI_MODULES]
  | typeof UP_AI_MODULES[keyof typeof UP_AI_MODULES]
  | typeof TALENT_AI_MODULES[keyof typeof TALENT_AI_MODULES]
  | typeof LIVE_AI_MODULES[keyof typeof LIVE_AI_MODULES];

// All module keys as array
export const ALL_AI_MODULE_KEYS: AIModuleKey[] = [
  ...Object.values(BOARD_AI_MODULES),
  ...Object.values(CONTENT_AI_MODULES),
  ...Object.values(UP_AI_MODULES),
  ...Object.values(TALENT_AI_MODULES),
  ...Object.values(LIVE_AI_MODULES),
];
