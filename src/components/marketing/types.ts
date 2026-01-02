export interface MarketingClient {
  id: string;
  organization_id: string;
  client_id: string;
  strategist_id: string | null;
  is_active: boolean;
  service_type: 'full_service' | 'strategy_only' | 'traffic_only' | 'social_media';
  started_at: string | null;
  ended_at: string | null;
  monthly_budget: number;
  budget_currency: string;
  platforms: string[];
  objectives: MarketingObjective[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  client?: {
    id: string;
    name: string;
    logo_url: string | null;
    contact_email: string | null;
  };
  strategist?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface MarketingObjective {
  type: 'reach' | 'impressions' | 'clicks' | 'conversions' | 'sales' | 'leads' | 'engagement';
  target: number;
  current?: number;
}

export interface MarketingCampaign {
  id: string;
  organization_id: string;
  marketing_client_id: string;
  name: string;
  description: string | null;
  campaign_type: 'awareness' | 'engagement' | 'conversion' | 'retention' | 'traffic';
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget: number;
  spent: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  platforms: string[];
  objectives: MarketingObjective[];
  metrics: CampaignMetrics;
  strategist_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  marketing_client?: MarketingClient;
}

export interface CampaignMetrics {
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  conversion_rate?: number;
  cost_per_conversion?: number;
  spend?: number;
  leads?: number;
}

export interface MarketingCalendarItem {
  id: string;
  organization_id: string;
  marketing_client_id: string;
  campaign_id: string | null;
  title: string;
  description: string | null;
  content_type: 'post' | 'story' | 'reel' | 'video' | 'ad' | 'carousel' | 'live';
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'planned' | 'in_progress' | 'ready' | 'published' | 'cancelled';
  platform: string;
  content_id: string | null;
  media_urls: string[];
  copy_text: string | null;
  hashtags: string[];
  published_at: string | null;
  published_url: string | null;
  performance: ContentPerformance;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  marketing_client?: MarketingClient;
  campaign?: MarketingCampaign;
}

export interface ContentPerformance {
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  engagement_rate?: number;
}

export interface MarketingReport {
  id: string;
  organization_id: string;
  marketing_client_id: string;
  title: string;
  report_type: 'weekly' | 'monthly' | 'quarterly' | 'campaign' | 'custom';
  period_start: string;
  period_end: string;
  metrics: CampaignMetrics;
  platforms_data: Record<string, CampaignMetrics>;
  campaign_ids: string[];
  highlights: string[];
  status: 'draft' | 'published';
  published_at: string | null;
  notes: string | null;
  recommendations: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  marketing_client?: MarketingClient;
}

export const PLATFORMS = [
  { value: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
  { value: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { value: 'youtube', label: 'YouTube', color: 'bg-red-600' },
  { value: 'google_ads', label: 'Google Ads', color: 'bg-yellow-500' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700' },
  { value: 'twitter', label: 'X (Twitter)', color: 'bg-gray-900' },
];

export const SERVICE_TYPES = [
  { value: 'full_service', label: 'Servicio Completo', description: 'Estrategia + Tráfico + Contenido' },
  { value: 'strategy_only', label: 'Solo Estrategia', description: 'Planificación y consultoría' },
  { value: 'traffic_only', label: 'Solo Tráfico', description: 'Gestión de pauta publicitaria' },
  { value: 'social_media', label: 'Social Media', description: 'Gestión de redes sociales' },
];

export const CAMPAIGN_TYPES = [
  { value: 'awareness', label: 'Reconocimiento', color: 'bg-purple-500' },
  { value: 'engagement', label: 'Interacción', color: 'bg-blue-500' },
  { value: 'conversion', label: 'Conversión', color: 'bg-green-500' },
  { value: 'retention', label: 'Retención', color: 'bg-orange-500' },
  { value: 'traffic', label: 'Tráfico', color: 'bg-cyan-500' },
];

export const CAMPAIGN_STATUSES = [
  { value: 'planning', label: 'Planificación', color: 'bg-gray-500' },
  { value: 'active', label: 'Activa', color: 'bg-green-500' },
  { value: 'paused', label: 'Pausada', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completada', color: 'bg-blue-500' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-500' },
];

export const CONTENT_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
  { value: 'video', label: 'Video' },
  { value: 'ad', label: 'Anuncio' },
  { value: 'carousel', label: 'Carrusel' },
  { value: 'live', label: 'En Vivo' },
];

// =====================================================
// MÉTODO ESFERA - Fases y Configuración
// =====================================================

export type SpherePhase = 'engage' | 'solution' | 'remarketing' | 'fidelize';

export interface SpherePhaseConfig {
  value: SpherePhase;
  label: string;
  labelEs: string;
  objective: string;
  contentTypes: string[];
  metrics: string[];
  color: string;
  bgColor: string;
  icon: string;
}

export const SPHERE_PHASES: SpherePhaseConfig[] = [
  {
    value: 'engage',
    label: 'ENGANCHAR',
    labelEs: 'Enganchar',
    objective: 'Captar atención y generar clic',
    contentTypes: ['Hooks disruptivos', 'Problemas visibles', 'Patrones rotos'],
    metrics: ['CTR', 'Scroll', 'Retención inicial'],
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900',
    icon: 'Zap',
  },
  {
    value: 'solution',
    label: 'SOLUCIÓN',
    labelEs: 'Solución',
    objective: 'Demostrar que el producto elimina el dolor',
    contentTypes: ['Casos de uso', 'Demostraciones', 'Storytelling de transformación'],
    metrics: ['Leads', 'Watch time', 'Intención'],
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    icon: 'Lightbulb',
  },
  {
    value: 'remarketing',
    label: 'REMARKETING',
    labelEs: 'Remarketing',
    objective: 'Reimpactar usuarios tibios',
    contentTypes: ['Prueba social', 'Objeciones', 'Comparativas'],
    metrics: ['Conversión', 'CPA', 'ROAS'],
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    icon: 'RefreshCw',
  },
  {
    value: 'fidelize',
    label: 'FIDELIZAR',
    labelEs: 'Fidelizar',
    objective: 'Aumentar LTV y comunidad',
    contentTypes: ['Educación', 'Comunidad', 'Upsells', 'Referidos'],
    metrics: ['Recompra', 'Engagement recurrente', 'Retención'],
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    icon: 'Heart',
  },
];

export const getSpherePhaseConfig = (phase: SpherePhase): SpherePhaseConfig => {
  return SPHERE_PHASES.find(p => p.value === phase) || SPHERE_PHASES[0];
};

export interface EsferaPhaseData {
  description: string;
  objective: string;
  content_types: string[];
  metrics: string[];
  tactics: string[];
  angles: string[];
}
