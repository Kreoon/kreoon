// src/lib/marketing/kreoon-method.ts
// Método C·O·N·V·E·R·T — Marco estratégico de marketing de Kreoon
// Basado en: Schwartz, Cialdini, Miller, Hormozi, Brunson, Hopkins, Ogilvy, Berger

// ============================================================
// C — CONCIENCIA: Los 5 niveles de conciencia del consumidor
// (Eugene Schwartz — Breakthrough Advertising)
// ============================================================

export type ConsciousnessLevel =
  | 'dormido'       // Nivel 1 — No sabe que tiene el problema
  | 'despertando'   // Nivel 2 — Siente el dolor, no sabe la causa
  | 'buscando'      // Nivel 3 — Sabe que hay soluciones, no cuál
  | 'comparando'    // Nivel 4 — Conoce tu oferta, evalúa opciones
  | 'listo'         // Nivel 5 — Solo necesita la oferta correcta

export const CONSCIOUSNESS_LABELS: Record<ConsciousnessLevel, string> = {
  dormido:      'Dormido — No conoce el problema',
  despertando:  'Despertando — Siente el dolor',
  buscando:     'Buscando — Conoce soluciones',
  comparando:   'Comparando — Evalúa opciones',
  listo:        'Listo — Solo necesita la oferta',
};

export const CONSCIOUSNESS_CONTENT_STRATEGY: Record<ConsciousnessLevel, {
  objective: string;
  tone: string;
  formats: string[];
  avoid: string[];
  hook_type: string;
}> = {
  dormido: {
    objective: 'Interrumpir y hacer reconocer el problema',
    tone: 'Evocador, intrigante, sin mencionar el producto',
    formats: ['TikTok viral', 'Reel de tendencia', 'Meme educativo', 'POV'],
    avoid: ['Mencionar el producto', 'Precios', 'CTAs de compra', 'Jerga técnica'],
    hook_type: 'Pattern interrupt — algo inesperado o contraintuitivo',
  },
  despertando: {
    objective: 'Validar el dolor y nombrar la causa real',
    tone: 'Empático, cercano, sin juzgar',
    formats: ['Story personal', 'Video confesión', 'Carrusel identificación', 'Pregunta directa'],
    avoid: ['Vender', 'Comparar productos', 'Estadísticas frías'],
    hook_type: 'Identificación — "¿Te ha pasado que...?"',
  },
  buscando: {
    objective: 'Educar sobre el camino correcto (no sobre el producto)',
    tone: 'Educativo, de autoridad, generoso',
    formats: ['Tutorial', 'Comparación de métodos', 'Caso de estudio', 'FAQ'],
    avoid: ['Vender directamente', 'Presionar urgencia prematura'],
    hook_type: 'Promesa de valor — "Lo que nadie te dice sobre X"',
  },
  comparando: {
    objective: 'Demostrar por qué esta es la mejor opción',
    tone: 'Directo, con evidencia, confiado',
    formats: ['Testimonial específico', 'Demo en vivo', 'Comparación vs alternativas', 'Garantía'],
    avoid: ['Exageraciones', 'Atacar competencia directamente'],
    hook_type: 'Prueba social — "Así lo logró [persona similar a ti]"',
  },
  listo: {
    objective: 'Cerrar con fricción mínima',
    tone: 'Urgente pero sin desesperación, claro y simple',
    formats: ['Oferta limitada', 'Bonus stack', 'Historia de transformación', 'Garantía destacada'],
    avoid: ['Más información', 'Distracciones', 'Links que saquen del funnel'],
    hook_type: 'Urgencia real — escasez o deadline verificable',
  },
};

// Backward compatible con sphere_phase existente en BD
export const CONSCIOUSNESS_TO_SPHERE: Record<ConsciousnessLevel, string> = {
  dormido:      'engage',
  despertando:  'engage',
  buscando:     'solution',
  comparando:   'remarketing',
  listo:        'remarketing',
};

export const SPHERE_TO_CONSCIOUSNESS: Record<string, ConsciousnessLevel[]> = {
  engage:      ['dormido', 'despertando'],
  solution:    ['buscando'],
  remarketing: ['comparando', 'listo'],
  fidelize:    ['listo'],
};


// ============================================================
// O — ORIGEN: Framework StoryBrand SB7
// (Donald Miller — Building a StoryBrand)
// ============================================================

export interface StorybrandScript {
  hero_desire: string;          // Qué quiere el cliente (1 cosa)
  external_problem: string;     // El problema situacional visible
  internal_problem: string;     // Cómo se siente internamente
  philosophical_problem: string; // Por qué es injusto que exista ese problema
  guide_empathy: string;        // Cómo la marca entiende ese dolor
  guide_authority: string;      // Por qué la marca puede ayudar
  plan_step_1: string;          // Primer paso simple y claro
  plan_step_2: string;          // Segundo paso
  plan_step_3: string;          // Tercer paso (máximo 3)
  direct_cta: string;           // Acción directa ("Compra ahora", "Aplica aquí")
  transitional_cta: string;     // Primer paso gratuito ("Descarga gratis", "Agenda llamada")
  failure_stakes: string;       // Qué pierde si NO actúa
  success_vision: string;       // La vida específica que tendrá SI actúa
}

export const SB7_BRAND_ROLES = {
  WRONG: 'La marca como héroe — habla de sí misma, sus logros, su historia',
  RIGHT: 'La marca como guía — habla del cliente, su problema, su transformación',
} as const;


// ============================================================
// N — NECESIDAD: Jobs To Be Done + Gatillos de Cialdini
// (Christensen JTBD + Cialdini Influence)
// ============================================================

export interface JobsToBeDone {
  functional: {
    situation: string;          // Cuándo/dónde ocurre la necesidad
    desired_outcome: string;    // Qué quiere lograr objetivamente
    current_alternatives: string[]; // Qué usa actualmente
    jtbd_statement: string;     // "Cuando X, quiero Y, para Z"
  };
  emotional: {
    during_use: string;         // Cómo quiere sentirse usándolo
    after_result: string;       // Cómo quiere sentirse después
    underlying_fear: string;    // Miedo profundo que lo mueve
    underlying_hope: string;    // Esperanza que lo motiva
  };
  social: {
    desired_perception: string; // Cómo quiere ser visto por otros
    identity_statement: string; // En quién quiere convertirse
    belonging_group: string;    // A qué grupo quiere pertenecer
  };
}

export type CialdiniTrigger =
  | 'reciprocidad'    // Da valor antes de pedir
  | 'prueba_social'   // Casos reales de personas similares
  | 'autoridad'       // Credenciales específicas
  | 'escasez'         // Solo si es REAL
  | 'similitud'       // "Alguien como tú ya lo logró"
  | 'compromiso';     // Micro-acciones que crean consistencia

export const CIALDINI_APPLICATION: Record<CialdiniTrigger, {
  how_to_use: string;
  latam_warning: string;
  content_example: string;
}> = {
  reciprocidad: {
    how_to_use: 'Dar contenido de alto valor antes de cualquier CTA de compra',
    latam_warning: 'En LATAM la desconfianza es alta — da más de lo esperado en el primer contacto',
    content_example: 'Mini-curso gratuito, guía descargable, consulta sin costo',
  },
  prueba_social: {
    how_to_use: 'Mostrar resultados de personas específicas y similares al avatar',
    latam_warning: 'Los testimonios genéricos no funcionan — necesitan ciudad, nombre, número concreto',
    content_example: '"María de Medellín aumentó sus ventas de $2M a $8M en 90 días"',
  },
  autoridad: {
    how_to_use: 'Credencial específica ligada al resultado, no al ego',
    latam_warning: 'Evitar autoridad vacía ("experto", "gurú") — mostrar resultados concretos',
    content_example: '"He ayudado a 847 emprendedores LATAM a superar $5K/mes"',
  },
  escasez: {
    how_to_use: 'Solo cuando es genuinamente limitado — cupos reales, tiempo real',
    latam_warning: 'CRÍTICO: La escasez falsa destruye confianza permanentemente en LATAM',
    content_example: '"Quedan 7 cupos para el cohort de junio" (verificable)',
  },
  similitud: {
    how_to_use: 'El avatar se identifica con quien ya tuvo el éxito',
    latam_warning: 'El referente debe ser de la misma región, mismo contexto económico',
    content_example: '"Antes era empleado en Bogotá ganando $1.8M/mes, hoy factura $15M desde casa"',
  },
  compromiso: {
    how_to_use: 'Pedir micro-acciones que creen consistencia antes de la venta',
    latam_warning: 'No pedir demasiado de golpe — escalar: guardar → comentar → DM → comprar',
    content_example: '"Comenta SI si quieres la guía completa" → DM con la guía → CTA de oferta',
  },
};


// ============================================================
// V — VALOR: Ingeniería de Ofertas
// (Hormozi $100M Offers + Brunson DotCom Secrets + Kennedy)
// ============================================================

export interface ValueEquation {
  dream_clarity: string;        // Qué sueño específico promete
  probability_proof: string;    // Evidencia de que funciona
  time_to_result: string;       // Tiempo estimado para ver resultados
  effort_required: string;      // Qué tan fácil es para el cliente
  value_score: number;          // Score calculado 1-10
}

export interface ValueLadder {
  lead_magnet: {
    name: string;
    format: string;
    promise: string;
    delivery: string;
  };
  entry_offer: {
    name: string;
    price_usd: number;
    main_benefit: string;
  };
  core_offer: {
    name: string;
    price_usd: number;
    transformation: string;
  };
  premium_offer?: {
    name: string;
    price_usd: number;
    exclusive_element: string;
  };
  continuity?: {
    name: string;
    price_usd_monthly: number;
    retention_mechanism: string;
  };
}

export interface GrandSlamOffer {
  core_promise: string;
  bonuses: Array<{
    name: string;
    real_value_usd: number;
    how_it_helps: string;
  }>;
  guarantee: {
    type: 'reembolso' | 'resultado' | 'satisfaccion';
    conditions: string;
    duration_days: number;
  };
  urgency?: {
    type: 'tiempo' | 'cupos' | 'precio';
    is_real: boolean; // MUST be true — fake urgency destroys trust
    description: string;
  };
  price_anchoring: {
    problem_cost: string;       // Costo de NO resolver el problema
    alternatives_cost: string;  // Costo de alternativas
    offer_price: string;        // Tu precio (se ve pequeño en comparación)
  };
}


// ============================================================
// E — ENGAGEMENT: Funnel Unificado Orgánico + Paid
// (Hopkins + Ogilvy + Berger STEPPS)
// ============================================================

export type FunnelTemperature = 'frio' | 'tibio' | 'caliente';

export const FUNNEL_STRATEGY: Record<FunnelTemperature, {
  consciousness_levels: ConsciousnessLevel[];
  organic_formats: string[];
  paid_objective: string;
  paid_audience: string;
  primary_metric: string;
  content_ratio: string; // % del contenido total que debe ser este tipo
}> = {
  frio: {
    consciousness_levels: ['dormido', 'despertando'],
    organic_formats: ['TikTok viral', 'Reel entretenimiento', 'POV', 'Meme educativo', 'Tendencia + mensaje'],
    paid_objective: 'Alcance y video views',
    paid_audience: 'Intereses amplios + look-alike de clientes',
    primary_metric: 'Completion rate (>50%), Shares, Saves',
    content_ratio: '60% del contenido total',
  },
  tibio: {
    consciousness_levels: ['buscando', 'comparando'],
    organic_formats: ['Tutorial', 'Caso de estudio', 'FAQ', 'Comparación', 'Demo'],
    paid_objective: 'Tráfico y leads',
    paid_audience: 'Retargeting 7-30 días + intereses específicos',
    primary_metric: 'CTR, Costo por lead, Tasa de opt-in',
    content_ratio: '30% del contenido total',
  },
  caliente: {
    consciousness_levels: ['comparando', 'listo'],
    organic_formats: ['Testimonial', 'Garantía', 'Oferta con urgencia', 'Historia de transformación'],
    paid_objective: 'Conversiones directas',
    paid_audience: 'Retargeting 1-7 días + compradores similares',
    primary_metric: 'ROAS, CPA, Tasa de conversión',
    content_ratio: '10% del contenido total',
  },
};

// STEPPS de Berger — Por qué el contenido se comparte
export const STEPPS_CHECKLIST = {
  social_currency: '¿Hace quedar bien a quien lo comparte?',
  triggers: '¿Está anclado a algo del día a día del avatar?',
  emotion: '¿Activa una emoción intensa (asombro, rabia, alegría, esperanza)?',
  public: '¿Es visible y fácil de compartir?',
  practical_value: '¿Es útil para alguien más en la audiencia?',
  stories: '¿Tiene una narrativa con inicio, conflicto y resolución?',
} as const;


// ============================================================
// R — RETENCIÓN: Flywheel + Post-compra
// (HubSpot + Pirate Metrics AARRR)
// ============================================================

export const RETENTION_FRAMEWORK = {
  aha_moment: 'El momento exacto donde el cliente siente el valor por primera vez',
  onboarding_goal: 'Llevar al cliente al aha_moment lo más rápido posible',
  retention_metrics: {
    day_1: 'Tasa de activación (completó el primer paso)',
    day_7: 'Tasa de retorno (volvió a usar/interactuar)',
    day_30: 'Retención mensual',
    day_90: 'LTV proyectado',
  },
  advocacy_triggers: [
    'Resultado visible y compartible',
    'Reconocimiento público (badge, mención, ranking)',
    'Programa de referidos con incentivo real',
    'Comunidad donde puede mostrar su progreso',
  ],
} as const;


// ============================================================
// T — TRACCIÓN: Framework de Testing
// (Hopkins Scientific Advertising)
// ============================================================

export const TESTING_FRAMEWORK = {
  organic_test: {
    cost: '$0',
    duration: '3-7 días',
    success_criteria: 'Completion rate >50% o Save rate >5%',
    what_to_test: 'Ángulo / Hook / Concepto',
  },
  paid_concept_test: {
    budget_usd_daily: '$5-15',
    duration: '3-5 días',
    success_criteria: 'CTR >2% o CPM <$5 USD',
    what_to_test: 'Creative ganador orgánico → validar paid',
  },
  paid_offer_test: {
    budget_usd_daily: '$20-50',
    duration: '5-7 días',
    success_criteria: 'CPA < 30% del valor del producto',
    what_to_test: 'Combinación oferta + copy + landing',
  },
  scale_criteria: {
    when_to_scale: 'CPA < target por 3 días consecutivos',
    scale_increment: 'Máximo 20% de aumento de budget por día',
    when_to_kill: 'CPA > 2x target después de 3 días',
  },
} as const;


// ============================================================
// EXPORT PRINCIPAL: El método completo
// ============================================================

export const KREOON_CONVERT_METHOD = {
  name: 'Método C·O·N·V·E·R·T',
  version: '1.0.0',
  description: 'Marco estratégico de marketing para la economía creativa de LATAM',
  layers: {
    C: 'Conciencia — Niveles de awareness del consumidor',
    O: 'Origen — Historia de marca centrada en el cliente (SB7)',
    N: 'Necesidad — Jobs To Be Done + gatillos de influencia',
    V: 'Valor — Arquitectura de oferta irresistible',
    E: 'Engagement — Funnel unificado orgánico + paid',
    R: 'Retención — Flywheel post-compra y referidos',
    T: 'Tracción — Sistema de testing y optimización',
  },
  sources: [
    'Eugene Schwartz — Breakthrough Advertising (Conciencia)',
    'Donald Miller — StoryBrand SB7 (Origen)',
    'Clayton Christensen — Jobs To Be Done (Necesidad)',
    'Robert Cialdini — Influence (Necesidad)',
    'Alex Hormozi — $100M Offers (Valor)',
    'Russell Brunson — DotCom Secrets (Valor + Engagement)',
    'Dan Kennedy — Magnetic Marketing (Valor)',
    'Claude Hopkins — Scientific Advertising (Engagement + Tracción)',
    'David Ogilvy — Confessions of an Advertising Man (Engagement)',
    'Jonah Berger — Contagious STEPPS (Engagement)',
    'HubSpot — Flywheel Model (Retención)',
    'Dave McClure — Pirate Metrics AARRR (Tracción)',
  ],
} as const;

export default KREOON_CONVERT_METHOD;
