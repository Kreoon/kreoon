/**
 * Tipos del motor de investigación real (`research_runs`, edge function
 * `research-engine`). Una corrida investiga la competencia y el nicho de UN
 * cliente y deja el resultado en `result`: el ADN de Mercado (quién es tu
 * competencia) y el ADN Viral (qué funciona en tu nicho).
 *
 * Todo dentro de `result` es best-effort: sale de scrapers (pueden fallar
 * una cuenta puntual) y de una IA que sintetiza JSON (puede devolver una
 * llave de menos si se le corta la respuesta). Por eso casi todo aquí es
 * opcional — el componente que lo pinta SIEMPRE debe poder mostrar "todavía
 * no tenemos esto" en vez de reventar.
 *
 * Fuente de verdad (no tocar desde frontend): `supabase/functions/research-engine/`.
 */

export type ResearchRunStatus = 'pending' | 'running' | 'partial' | 'done' | 'error';

/**
 * Fase real que trae `research_runs.stage.fase` — es lo único que se
 * actualiza mientras la corrida avanza (las etapas A/B/D con
 * `{status, motivo}` solo se anotan al crear la corrida, no en cada paso).
 * Se usa para traducir "en qué va" a una frase en cristiano.
 */
export type ResearchFase =
  | 'base'
  | 'descubrimiento'
  | 'competidores'
  | 'ads'
  | 'ranking'
  | 'transcripcion'
  | 'sintesis'
  | 'fin';

/**
 * Progreso por etapa A–G (ver COMMENT ON COLUMN research_runs.stage en la
 * migración). En la práctica solo A/B/D se anotan al crear la corrida; el
 * resto del progreso vive en `fase`. Se tipa `unknown` a propósito: el
 * frontend nunca debe depender de que exista una llave concreta aquí.
 */
export interface ResearchStageProgress {
  status?: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  motivo?: string;
  [key: string]: unknown;
}

export interface ResearchStage {
  fase?: ResearchFase;
  cache_nicho?: boolean;
  [key: string]: unknown;
}

// ── ADN de Mercado (quién es tu competencia) ──────────────────────────────

export interface MarketCompetitor {
  handle: string;
  posicionamiento?: string | null;
  seguidores?: number | null;
  frecuencia_real?: string | null;
  engagement_medio?: number | null;
  que_esta_pautando?: string[];
  ads_30_dias?: number | null;
  funnel?: string | null;
  arma_secreta?: string | null;
}

export interface MarketComparisonRow {
  criterio: string;
  lider?: string | null;
  detalle?: string | null;
}

export interface MarketGap {
  hueco: string;
  por_que_esta_libre?: string | null;
  como_atacarlo?: string | null;
}

export interface MarketDontCopy {
  practica: string;
  razon?: string | null;
}

export interface AdnMercado {
  competidores?: MarketCompetitor[];
  tabla_comparativa?: MarketComparisonRow[];
  huecos_de_mercado?: MarketGap[];
  que_no_copiar?: MarketDontCopy[];
  alcance?: string | null;
}

// ── ADN Viral del nicho (qué funciona) ────────────────────────────────────

export interface HookExample {
  texto: string;
  url?: string | null;
}

export interface DominantHook {
  taxonomia: string;
  porcentaje_del_top?: number | null;
  ejemplos?: HookExample[];
  por_que_funciona?: string | null;
}

export interface WinningAdAngle {
  angulo: string;
  dias_corriendo?: number | null;
  url?: string | null;
}

export interface ContentGap {
  oportunidad: string;
  por_que_nadie_lo_usa?: string | null;
}

export interface ViralDuration {
  moda_segundos?: number | null;
  rango?: string | null;
  mezcla_tutorial_vs_emocion?: string | null;
}

export interface AdnViral {
  hooks_dominantes?: DominantHook[];
  estructura_ganadora?: {
    descripcion?: string | null;
    re_enganches_literales?: string[];
    evidencia?: string[];
  } | null;
  ctas?: {
    tipos_usados?: string[];
    gating_normalizado?: boolean;
    ejemplos?: string[];
  } | null;
  duracion?: ViralDuration | null;
  angulos_de_ads_ganadores?: WinningAdAngle[];
  gaps?: ContentGap[];
  alcance?: string | null;
}

// ── Anuncios reales (biblioteca de Meta) ──────────────────────────────────

export interface ResearchAd {
  id: string;
  pagina: string;
  texto: string;
  titulo?: string | null;
  url: string;
  activo?: boolean;
  inicio?: string | null;
  /** La señal reina del motor: nadie paga un mes de pauta por un anuncio que no vende. */
  dias_corriendo: number;
  plataformas?: string[];
}

// ── Top de viralidad y métricas por cuenta ────────────────────────────────

export interface ResearchTopPost {
  plataforma: string;
  url: string;
  handle: string;
  score: number;
  vistas: number;
  seguidores: number;
}

export interface AccountMetrics {
  publicaciones: number;
  vistas_medias: number;
  engagement_medio: number;
  publicaciones_por_semana: number;
}

export type MetricasPorCuenta = Record<string, AccountMetrics>;

// ── Resultado acumulado de la corrida ─────────────────────────────────────

export interface ResearchResult {
  adn_mercado?: AdnMercado | null;
  adn_viral?: AdnViral | null;
  ads?: ResearchAd[];
  top?: ResearchTopPost[];
  metricas_por_cuenta?: MetricasPorCuenta;
  /** El resto del `result` (own/competitors/niche/ranking crudo…) es interno
   *  del motor: el portal del cliente nunca lo necesita, pero tampoco debe
   *  romperse si aparece. */
  [key: string]: unknown;
}

export interface ResearchRun {
  id: string;
  status: ResearchRunStatus;
  stage: ResearchStage;
  cost_usd: number;
  result: ResearchResult;
  created_at: string;
  finished_at: string | null;
}
