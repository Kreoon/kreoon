import type { ResearchRun } from '@/types/research';

/**
 * Traductor de JSON → lenguaje de cliente.
 *
 * El ADN y la estrategia se guardan como jsonb con nombres técnicos
 * (`value_proposition`, `ideal_customer.pain_points`…). El cliente NUNCA
 * debe ver eso. Aquí se convierte a secciones legibles: título en español
 * cotidiano + párrafos y listas.
 *
 * Regla: si aparece una llave que no conocemos, no se rompe ni se muestra
 * cruda — se humaniza (`content_pillars` → "Content pillars" → diccionario).
 * Si no hay nada que mostrar, se devuelve un array vacío y la UI pinta su
 * propio estado de "todavía no hay nada".
 */

export interface ReadableBlock {
  label?: string;
  /** Párrafo suelto */
  text?: string;
  /** Lista de viñetas */
  items?: string[];
}

export interface ReadableSection {
  id: string;
  title: string;
  blocks: ReadableBlock[];
}

// ── Diccionario de llaves → español cotidiano ─────────────────────────
const KEY_LABELS: Record<string, string> = {
  // Identidad
  name: 'Nombre',
  description: 'En pocas palabras',
  industry: 'Sector',
  sub_industry: 'Especialidad',
  business_model: 'Cómo vendes',
  years_in_market: 'Tiempo en el mercado',
  origin_story: 'Cómo empezó todo',
  mission: 'Para qué existes',
  unique_factor: 'Lo que solo tú tienes',
  competitive_landscape: 'Con quién compites',

  // Propuesta de valor
  main_usp: 'Tu gran ventaja',
  brand_promise: 'Lo que le prometes a tu cliente',
  differentiators: 'En qué eres diferente',
  proof_points: 'Pruebas de que funciona',
  main_problem_solved: 'El problema que resuelves',
  solution_description: 'Cómo lo resuelves',
  key_benefits: 'Lo que gana tu cliente',
  transformation_promise: 'El cambio que logras en él',

  // Cliente ideal
  age_range: 'Edad',
  gender: 'Género',
  location: 'Dónde vive',
  income_level: 'Cuánto gana',
  occupation: 'A qué se dedica',
  values: 'Qué valora',
  interests: 'Qué le interesa',
  personality_traits: 'Cómo es',
  lifestyle: 'Cómo vive',
  pain_points: 'Qué le duele hoy',
  desires: 'Qué quiere lograr',
  objections: 'Qué lo frena para comprar',
  buying_triggers: 'Qué lo empuja a comprar',

  // Oferta
  price_range: 'Rango de precio',
  price: 'Precio',
  main_benefit: 'Beneficio principal',
  price_justification: 'Por qué vale ese precio',
  included_features: 'Qué incluye',
  guarantees: 'Garantías',
  urgency_elements: 'Motivos para no dejarlo para después',
  funnel_role: 'Para qué sirve dentro de tu negocio',

  // Marca
  brand_archetype: 'La personalidad de tu marca',
  tone_of_voice: 'Cómo hablas',
  communication_style: 'Tu estilo al comunicar',
  tagline_suggestions: 'Frases que te representan',
  key_messages: 'Lo que siempre hay que decir',
  elevator_pitch: 'Tu presentación en 30 segundos',
  tagline: 'Frase de marca',
  do_say: 'Palabras que sí usamos',
  dont_say: 'Palabras que evitamos',
  tone: 'Tono',

  // Visual
  primary_colors: 'Colores principales',
  secondary_colors: 'Colores de apoyo',
  brand_colors: 'Colores de tu marca',
  color_psychology: 'Qué transmiten esos colores',
  color_meaning: 'Qué transmiten esos colores',
  typography_style: 'Estilo de letra',
  imagery_style: 'Estilo de las fotos y videos',
  photography_style: 'Estilo de las fotos',
  visual_style: 'Estilo visual',
  mood_keywords: 'Sensación que buscamos',
  mood: 'Sensación que buscamos',
  content_themes: 'Temas de tu contenido',

  // Estrategia
  content_pillars: 'Los temas de los que vas a hablar',
  content_ideas: 'Ideas de contenido',
  recommended_platforms: 'Dónde vamos a publicar',
  content_formats: 'Formatos que vamos a usar',
  posting_frequency: 'Cada cuánto publicamos',
  engagement_tactics: 'Cómo vamos a generar conversación',
  primary_objective: 'El objetivo principal',
  secondary_objectives: 'Otros objetivos',
  main_cta: 'Qué le vamos a pedir a la gente',
  channels: 'Canales',
  funnel_strategy: 'El camino que recorre tu cliente',
  strategy: 'La estrategia',
  priority: 'Importancia',
  content_types: 'Tipos de contenido',

  // Producto / research
  sales_angles: 'Ángulos de venta',
  sales_angles_data: 'Ángulos de venta',
  avatar_profiles: 'Perfiles de tu cliente',
  ideal_avatar: 'Tu cliente ideal',
  market_research: 'Lo que encontramos del mercado',
  competitor_analysis: 'Qué hace tu competencia',
  content_strategy: 'Tu plan de contenido',
  content_calendar: 'Tu calendario de contenido',
  launch_strategy: 'Cómo lo vamos a lanzar',
  hook_suggestions: 'Frases para enganchar',
  headline: 'Titular',
  body: 'Texto',
  cta: 'Llamado a la acción',
  angle_name: 'Ángulo',
  summary: 'Resumen',
  insight: 'Hallazgo',
  insights: 'Hallazgos',
  recommendations: 'Recomendaciones',
  opportunities: 'Oportunidades',
  risks: 'Riesgos',
  keywords: 'Palabras clave',
  platform: 'Plataforma',
  frequency: 'Frecuencia',
  title: 'Título',
  goal: 'Objetivo',
  audience: 'Audiencia',
  format: 'Formato',
  message: 'Mensaje',
  notes: 'Notas',

  // ADN de Mercado (research_runs.result.adn_mercado)
  competidores: 'Tu competencia',
  posicionamiento: 'Cómo se posiciona',
  seguidores: 'Seguidores',
  frecuencia_real: 'Cada cuánto publica',
  engagement_medio: 'Interacción media',
  que_esta_pautando: 'Lo que está pautando',
  ads_30_dias: 'Anuncios con más de 30 días corriendo',
  funnel: 'Su camino de venta',
  arma_secreta: 'Su as bajo la manga',
  tabla_comparativa: 'Comparación con tu competencia',
  criterio: 'Punto de comparación',
  lider: 'Quién va ganando',
  detalle: 'Detalle',
  huecos_de_mercado: 'Oportunidades sin explotar',
  hueco: 'Oportunidad',
  por_que_esta_libre: 'Por qué nadie la está aprovechando',
  como_atacarlo: 'Cómo aprovecharla',
  que_no_copiar: 'Lo que no te conviene copiar',
  practica: 'Práctica',
  razon: 'Por qué',
  alcance: 'Qué tan completo es esto',

  // ADN Viral del nicho (research_runs.result.adn_viral)
  hooks_dominantes: 'Lo que más engancha',
  taxonomia: 'Tipo de gancho',
  porcentaje_del_top: 'Qué tan frecuente es',
  ejemplos: 'Ejemplos reales',
  por_que_funciona: 'Por qué funciona',
  estructura_ganadora: 'La estructura que gana',
  descripcion: 'Cómo es',
  re_enganches_literales: 'Frases que reenganchan',
  evidencia: 'Evidencia',
  ctas: 'Cómo piden la acción',
  tipos_usados: 'Tipos que usan',
  gating_normalizado: 'Piden comentar para dar la info',
  duracion: 'Duración',
  moda_segundos: 'Duración típica (segundos)',
  rango: 'Rango de duración',
  mezcla_tutorial_vs_emocion: 'Tutorial vs. emocional',
  angulos_de_ads_ganadores: 'Ángulos de anuncios que ganan',
  angulo: 'Ángulo',
  dias_corriendo: 'Días corriendo',
  gaps: 'Lo que nadie está usando',
  oportunidad: 'Oportunidad',
  por_que_nadie_lo_usa: 'Por qué nadie lo usa',

  // Anuncios y métricas
  pagina: 'Página',
  activo: 'Activo',
  inicio: 'Empezó a correr',
  plataformas: 'Plataformas',
  top: 'Lo más visto',
  handle: 'Cuenta',
  score: 'Qué tan viral',
  vistas: 'Vistas',
  metricas_por_cuenta: 'Números por cuenta',
  publicaciones: 'Publicaciones',
  vistas_medias: 'Vistas promedio',
  publicaciones_por_semana: 'Publicaciones por semana',
};

/** Llaves que nunca se le muestran al cliente (ruido técnico). */
const HIDDEN_KEYS = new Set([
  'id', 'client_id', 'product_id', 'organization_id', 'user_id', 'version',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'is_active', 'status',
  'raw', 'raw_response', 'prompt', 'model', 'tokens', 'usage', 'metadata',
  'sources', 'citations', 'urls', 'url', 'slug', 'score', 'confidence',
  'ai_confidence_score', 'research_progress', 'research_v3_progress',
]);

const PRIORITY_WORDS: Record<string, string> = {
  high: 'alta',
  medium: 'media',
  low: 'baja',
};

/**
 * Taxonomía de hooks del ADN Viral (`hooks_dominantes[].taxonomia`,
 * `synthesis.ts` en research-engine). Son códigos internos del prompt de
 * IA — el cliente jamás debe ver "kill-shot" en su pantalla.
 */
const HOOK_TAXONOMY_LABELS: Record<string, string> = {
  'inclusivo-perdida': 'Le hablas directo a lo que está perdiendo',
  'kill-shot': 'Golpe directo desde el primer segundo',
  'noticia-shock': 'Una noticia que sorprende',
  'experimento-resultado': 'Un experimento con resultado a la vista',
  'anclaje-precio': 'Comparación de precio',
  'historia-demostrativa': 'Una historia que demuestra el punto',
  'personalidad-cruda': 'Personalidad sin filtro',
  brecha: 'Una brecha que genera curiosidad',
};

export function humanizeKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const spaced = key.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Traduce el código de taxonomía de un hook a una frase que se entiende. */
export function humanizeHookTaxonomy(taxonomia: string | null | undefined): string {
  if (!taxonomia) return 'Gancho';
  return HOOK_TAXONOMY_LABELS[taxonomia] ?? humanizeKey(taxonomia);
}

function humanizeValue(value: unknown): string {
  if (typeof value === 'string') return PRIORITY_WORDS[value] ?? value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return '';
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmpty);
  if (typeof value === 'object') return Object.values(value as object).every(isEmpty);
  return false;
}

/** Convierte un objeto/array anidado en una sola línea legible. */
function flattenToLine(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return humanizeValue(value);
  if (Array.isArray(value)) {
    return value.map(flattenToLine).filter(Boolean).join(' · ');
  }
  return Object.entries(value as Record<string, unknown>)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && !isEmpty(v))
    .map(([k, v]) => {
      const line = flattenToLine(v);
      if (!line) return '';
      // El primer campo suele ser el nombre; no lo etiquetamos.
      return k === 'name' || k === 'title' ? line : `${humanizeKey(k)}: ${line}`;
    })
    .filter(Boolean)
    .join(' — ');
}

/** Convierte cualquier valor JSON en bloques legibles (párrafos y listas). */
export function toBlocks(value: unknown, label?: string): ReadableBlock[] {
  if (isEmpty(value)) return [];

  if (typeof value !== 'object') {
    return [{ label, text: humanizeValue(value) }];
  }

  if (Array.isArray(value)) {
    const items = value.map(flattenToLine).filter(Boolean);
    return items.length ? [{ label, items }] : [];
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([k, v]) => !HIDDEN_KEYS.has(k) && !isEmpty(v));

  const blocks: ReadableBlock[] = [];
  for (const [key, val] of entries) {
    const childLabel = humanizeKey(key);
    if (typeof val !== 'object') {
      blocks.push({ label: childLabel, text: humanizeValue(val) });
    } else if (Array.isArray(val)) {
      const items = val.map(flattenToLine).filter(Boolean);
      if (items.length) blocks.push({ label: childLabel, items });
    } else {
      // Objeto anidado: se aplana a una lista "Etiqueta: valor"
      const items = Object.entries(val as Record<string, unknown>)
        .filter(([k, v]) => !HIDDEN_KEYS.has(k) && !isEmpty(v))
        .map(([k, v]) => {
          const line = flattenToLine(v);
          return line ? `${humanizeKey(k)}: ${line}` : '';
        })
        .filter(Boolean);
      if (items.length) blocks.push({ label: childLabel, items });
    }
  }

  return blocks;
}

// ── ADN de la marca ───────────────────────────────────────────────────

/**
 * Secciones curadas del ADN, en el orden en que tienen sentido para el
 * cliente. `ads_targeting` se omite a propósito: es material interno del
 * equipo de pauta y solo genera ruido en el portal.
 */
const DNA_SECTIONS: { key: string; title: string }[] = [
  { key: 'business_identity', title: 'Quién eres' },
  { key: 'value_proposition', title: 'Lo que te hace diferente' },
  { key: 'ideal_customer', title: 'A quién le hablamos' },
  { key: 'flagship_offer', title: 'Tu oferta principal' },
  { key: 'brand_identity', title: 'Cómo suena tu marca' },
  { key: 'visual_identity', title: 'Cómo se ve tu marca' },
  { key: 'marketing_strategy', title: 'Por dónde vamos a contarlo' },
];

export function dnaToSections(dnaData: unknown): ReadableSection[] {
  if (!dnaData || typeof dnaData !== 'object') return [];
  const data = dnaData as Record<string, unknown>;

  const sections: ReadableSection[] = [];

  for (const { key, title } of DNA_SECTIONS) {
    const blocks = toBlocks(data[key]);
    if (blocks.length) sections.push({ id: key, title, blocks });
  }

  // Cualquier bloque nuevo que aparezca en el ADN y no esté en la lista
  // curada se muestra igual, con su título humanizado.
  const known = new Set([...DNA_SECTIONS.map(s => s.key), 'ads_targeting']);
  for (const [key, value] of Object.entries(data)) {
    if (known.has(key) || HIDDEN_KEYS.has(key)) continue;
    const blocks = toBlocks(value);
    if (blocks.length) sections.push({ id: key, title: humanizeKey(key), blocks });
  }

  return sections;
}

// ── Estrategia (vive en la fila de `products`) ────────────────────────

const STRATEGY_SECTIONS: { key: string; title: string }[] = [
  { key: 'strategy', title: 'La idea en una frase' },
  { key: 'ideal_avatar', title: 'Tu cliente ideal' },
  { key: 'avatar_profiles', title: 'A quién le vamos a hablar' },
  { key: 'content_strategy', title: 'Tu plan de contenido' },
  { key: 'sales_angles_data', title: 'Cómo vamos a vender' },
  { key: 'sales_angles', title: 'Cómo vamos a vender' },
  { key: 'content_calendar', title: 'Cuándo publicamos' },
  { key: 'launch_strategy', title: 'Cómo lo vamos a lanzar' },
  { key: 'competitor_analysis', title: 'Qué hace tu competencia' },
  { key: 'market_research', title: 'Lo que encontramos del mercado' },
];

export function strategyToSections(product: Record<string, unknown> | null): ReadableSection[] {
  if (!product) return [];

  const sections: ReadableSection[] = [];
  const used = new Set<string>();

  for (const { key, title } of STRATEGY_SECTIONS) {
    if (used.has(title)) continue;
    const blocks = toBlocks(product[key]);
    if (blocks.length) {
      sections.push({ id: key, title, blocks });
      used.add(title);
    }
  }

  return sections;
}

// ── Investigación de mercado (research_runs) ──────────────────────────

/**
 * Traduce `research_runs.stage.fase` a una frase que un cliente entiende.
 * `fase` es lo único que se actualiza en vivo mientras la corrida avanza
 * (verificado en `research-engine/index.ts`: las etapas A/B/D con
 * `{status, motivo}` solo se anotan una vez, al crear la corrida).
 */
const FASE_LABELS: Record<string, string> = {
  base: 'Estamos viendo tu perfil y tus últimas publicaciones',
  descubrimiento: 'Estamos buscando quién es tu competencia',
  competidores: 'Estamos viendo qué publica tu competencia',
  ads: 'Estamos revisando qué anuncios está pautando tu gremio',
  ranking: 'Estamos viendo qué contenido es el que más funciona',
  transcripcion: 'Estamos leyendo lo que dicen los videos que mejor funcionan',
  sintesis: 'Estamos armando el resumen de todo esto',
  fin: 'Ya casi terminamos',
};

/** Orden real de las fases del motor (sin contar "fin"), para la barra de progreso. */
const FASE_ORDER = ['base', 'descubrimiento', 'competidores', 'ads', 'ranking', 'transcripcion', 'sintesis'];

/** Texto "en cristiano" de qué se está haciendo mientras la corrida está `running`. */
export function researchWorkingText(researchRun: ResearchRun | null): string {
  const fase = researchRun?.stage?.fase;
  if (fase && FASE_LABELS[fase]) return FASE_LABELS[fase];
  return 'Estamos investigando tu mercado';
}

/** Porcentaje 0–100 para la barra de progreso, o null si no hay nada que mostrar. */
export function researchProgressPercent(researchRun: ResearchRun | null): number | null {
  const fase = researchRun?.stage?.fase;
  if (!fase) return null;
  if (fase === 'fin') return 100;
  const idx = FASE_ORDER.indexOf(fase);
  if (idx === -1) return null;
  return Math.round(((idx + 1) / FASE_ORDER.length) * 100);
}
