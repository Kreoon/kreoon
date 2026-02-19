import type { AdPlatform, AdObjective, AdCampaignStatus } from './types/marketing.types';

// ── Platform Configuration ─────────────────────────────────────────────────

export interface AdPlatformConfig {
  id: AdPlatform;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  supportedObjectives: AdObjective[];
  maxDailyBudget: number;
  minDailyBudget: number;
  supportedPlacements: string[];
  hasAudienceNetwork: boolean;
}

export const AD_PLATFORMS: Record<AdPlatform, AdPlatformConfig> = {
  meta: {
    id: 'meta',
    name: 'Meta Ads',
    color: '#1877F2',
    bgColor: '#1877F2/10',
    icon: 'meta',
    supportedObjectives: [
      'awareness', 'traffic', 'engagement', 'leads', 'sales',
      'app_installs', 'video_views', 'reach', 'conversions',
    ],
    maxDailyBudget: 50000,
    minDailyBudget: 1,
    supportedPlacements: [
      'facebook_feed', 'facebook_stories', 'facebook_reels',
      'instagram_feed', 'instagram_stories', 'instagram_reels', 'instagram_explore',
      'audience_network', 'messenger',
    ],
    hasAudienceNetwork: true,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Ads',
    color: '#000000',
    bgColor: '#EE1D52/10',
    icon: 'tiktok',
    supportedObjectives: [
      'awareness', 'traffic', 'engagement', 'leads', 'sales',
      'app_installs', 'video_views', 'conversions',
    ],
    maxDailyBudget: 50000,
    minDailyBudget: 20,
    supportedPlacements: [
      'tiktok_feed', 'tiktok_search', 'pangle',
    ],
    hasAudienceNetwork: true,
  },
  google: {
    id: 'google',
    name: 'Google Ads',
    color: '#4285F4',
    bgColor: '#4285F4/10',
    icon: 'google',
    supportedObjectives: [
      'awareness', 'traffic', 'engagement', 'leads', 'sales',
      'app_installs', 'video_views', 'conversions',
    ],
    maxDailyBudget: 100000,
    minDailyBudget: 1,
    supportedPlacements: [
      'search', 'display', 'youtube_instream', 'youtube_discovery',
      'youtube_shorts', 'shopping', 'performance_max',
    ],
    hasAudienceNetwork: true,
  },
};

export const AD_PLATFORM_LIST = Object.values(AD_PLATFORMS);

// ── Objective Labels ───────────────────────────────────────────────────────

export const OBJECTIVE_LABELS: Record<AdObjective, string> = {
  awareness: 'Reconocimiento',
  traffic: 'Tráfico',
  engagement: 'Interacción',
  leads: 'Clientes potenciales',
  sales: 'Ventas',
  app_installs: 'Instalaciones',
  video_views: 'Reproducciones de video',
  reach: 'Alcance',
  conversions: 'Conversiones',
};

export const OBJECTIVE_DESCRIPTIONS: Record<AdObjective, string> = {
  awareness: 'Aumenta el reconocimiento de tu marca',
  traffic: 'Dirige tráfico a tu sitio web o app',
  engagement: 'Genera más interacciones con tu contenido',
  leads: 'Captura leads y clientes potenciales',
  sales: 'Impulsa ventas y transacciones',
  app_installs: 'Promociona instalaciones de tu app',
  video_views: 'Maximiza las reproducciones de tu video',
  reach: 'Llega a la mayor cantidad de personas',
  conversions: 'Optimiza para acciones específicas',
};

// ── Campaign Status Labels ─────────────────────────────────────────────────

export const CAMPAIGN_STATUS_LABELS: Record<AdCampaignStatus, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  rejected: 'Rechazada',
  archived: 'Archivada',
};

export const CAMPAIGN_STATUS_COLORS: Record<AdCampaignStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  pending_review: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-green-500/20 text-green-400',
  paused: 'bg-orange-500/20 text-orange-400',
  completed: 'bg-blue-500/20 text-blue-400',
  rejected: 'bg-red-500/20 text-red-400',
  archived: 'bg-gray-500/20 text-gray-500',
};

// ── Bid Strategies ─────────────────────────────────────────────────────────

export const BID_STRATEGIES = [
  { id: 'lowest_cost', label: 'Menor costo', description: 'Gasta tu presupuesto al menor costo por resultado' },
  { id: 'cost_cap', label: 'Tope de costo', description: 'Mantiene el costo por resultado bajo un tope' },
  { id: 'bid_cap', label: 'Tope de puja', description: 'Controla el monto máximo por subasta' },
  { id: 'target_cost', label: 'Costo objetivo', description: 'Estabiliza el costo por resultado' },
  { id: 'maximize_conversions', label: 'Maximizar conversiones', description: 'Obtén la mayor cantidad de conversiones' },
  { id: 'maximize_value', label: 'Maximizar valor', description: 'Obtén el mayor valor de conversión' },
] as const;

// ── Metrics Config ─────────────────────────────────────────────────────────

export interface MetricDefinition {
  key: string;
  label: string;
  shortLabel: string;
  format: 'number' | 'currency' | 'percentage' | 'decimal';
  description: string;
  category: 'spend' | 'delivery' | 'engagement' | 'conversion' | 'video';
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: 'spend', label: 'Gasto', shortLabel: 'Gasto', format: 'currency', description: 'Total gastado', category: 'spend' },
  { key: 'impressions', label: 'Impresiones', shortLabel: 'Impr.', format: 'number', description: 'Veces que se mostró', category: 'delivery' },
  { key: 'reach', label: 'Alcance', shortLabel: 'Alc.', format: 'number', description: 'Personas únicas alcanzadas', category: 'delivery' },
  { key: 'clicks', label: 'Clics', shortLabel: 'Clics', format: 'number', description: 'Total de clics', category: 'delivery' },
  { key: 'ctr', label: 'CTR', shortLabel: 'CTR', format: 'percentage', description: 'Tasa de clics', category: 'delivery' },
  { key: 'cpc', label: 'CPC', shortLabel: 'CPC', format: 'currency', description: 'Costo por clic', category: 'spend' },
  { key: 'cpm', label: 'CPM', shortLabel: 'CPM', format: 'currency', description: 'Costo por mil impresiones', category: 'spend' },
  { key: 'conversions', label: 'Conversiones', shortLabel: 'Conv.', format: 'number', description: 'Acciones completadas', category: 'conversion' },
  { key: 'conversion_value', label: 'Valor de conversión', shortLabel: 'V. Conv.', format: 'currency', description: 'Valor total de conversiones', category: 'conversion' },
  { key: 'roas', label: 'ROAS', shortLabel: 'ROAS', format: 'decimal', description: 'Retorno sobre inversión publicitaria', category: 'conversion' },
  { key: 'cost_per_conversion', label: 'Costo por conversión', shortLabel: 'C/Conv.', format: 'currency', description: 'Costo promedio por conversión', category: 'spend' },
  { key: 'video_views', label: 'Reproducciones', shortLabel: 'Reprod.', format: 'number', description: 'Total de reproducciones', category: 'video' },
  { key: 'video_views_25', label: 'Video 25%', shortLabel: 'V25%', format: 'number', description: 'Reproducciones al 25%', category: 'video' },
  { key: 'video_views_50', label: 'Video 50%', shortLabel: 'V50%', format: 'number', description: 'Reproducciones al 50%', category: 'video' },
  { key: 'video_views_75', label: 'Video 75%', shortLabel: 'V75%', format: 'number', description: 'Reproducciones al 75%', category: 'video' },
  { key: 'video_views_100', label: 'Video 100%', shortLabel: 'V100%', format: 'number', description: 'Reproducciones completas', category: 'video' },
  { key: 'engagement', label: 'Interacciones', shortLabel: 'Inter.', format: 'number', description: 'Total de interacciones', category: 'engagement' },
  { key: 'likes', label: 'Likes', shortLabel: 'Likes', format: 'number', description: 'Me gusta recibidos', category: 'engagement' },
  { key: 'comments', label: 'Comentarios', shortLabel: 'Com.', format: 'number', description: 'Comentarios recibidos', category: 'engagement' },
  { key: 'shares', label: 'Compartidos', shortLabel: 'Comp.', format: 'number', description: 'Veces compartido', category: 'engagement' },
  { key: 'leads', label: 'Leads', shortLabel: 'Leads', format: 'number', description: 'Leads generados', category: 'conversion' },
  { key: 'cost_per_lead', label: 'CPL', shortLabel: 'CPL', format: 'currency', description: 'Costo por lead', category: 'spend' },
  { key: 'frequency', label: 'Frecuencia', shortLabel: 'Freq.', format: 'decimal', description: 'Promedio de veces visto por persona', category: 'delivery' },
];

export const DEFAULT_DASHBOARD_METRICS = ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'roas'];
