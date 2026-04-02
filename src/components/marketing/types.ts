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
  campaign_type: 'engage' | 'solution' | 'remarketing' | 'fidelize';
  sphere_phase: 'engage' | 'solution' | 'remarketing' | 'fidelize';
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
  { value: 'meta_ads', label: 'Meta Ads', color: 'bg-blue-600' },
  { value: 'google_ads', label: 'Google Ads', color: 'bg-yellow-500' },
  { value: 'tiktok_ads', label: 'TikTok Ads', color: 'bg-black' },
  { value: 'youtube_ads', label: 'YouTube Ads', color: 'bg-red-600' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads', color: 'bg-blue-700' },
  { value: 'twitter_ads', label: 'X Ads', color: 'bg-gray-900' },
];

// Tipos de campaña específicos por plataforma de tráfico
export const PLATFORM_CAMPAIGN_TYPES: Record<string, { value: string; label: string }[]> = {
  meta_ads: [
    { value: 'awareness', label: 'Reconocimiento' },
    { value: 'traffic', label: 'Tráfico' },
    { value: 'engagement', label: 'Interacción' },
    { value: 'leads', label: 'Clientes potenciales' },
    { value: 'app_promotion', label: 'Promoción de app' },
    { value: 'sales', label: 'Ventas' },
  ],
  google_ads: [
    { value: 'search', label: 'Búsqueda' },
    { value: 'display', label: 'Display' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'video', label: 'Video' },
    { value: 'performance_max', label: 'Performance Max' },
    { value: 'demand_gen', label: 'Demand Gen' },
  ],
  tiktok_ads: [
    { value: 'reach', label: 'Alcance' },
    { value: 'traffic', label: 'Tráfico' },
    { value: 'video_views', label: 'Reproducciones de video' },
    { value: 'community', label: 'Interacción con comunidad' },
    { value: 'conversions', label: 'Conversiones web' },
    { value: 'lead_gen', label: 'Generación de leads' },
  ],
  youtube_ads: [
    { value: 'video_views', label: 'Visualizaciones de video' },
    { value: 'brand_awareness', label: 'Conocimiento de marca' },
    { value: 'reach', label: 'Alcance' },
    { value: 'consideration', label: 'Consideración' },
    { value: 'action', label: 'Acción' },
  ],
  linkedin_ads: [
    { value: 'brand_awareness', label: 'Conocimiento de marca' },
    { value: 'website_visits', label: 'Visitas al sitio web' },
    { value: 'engagement', label: 'Interacción' },
    { value: 'video_views', label: 'Visualizaciones de video' },
    { value: 'lead_gen', label: 'Generación de leads' },
    { value: 'conversions', label: 'Conversiones' },
  ],
  twitter_ads: [
    { value: 'reach', label: 'Alcance' },
    { value: 'video_views', label: 'Visualizaciones de video' },
    { value: 'engagements', label: 'Interacciones' },
    { value: 'website_traffic', label: 'Tráfico web' },
    { value: 'conversions', label: 'Conversiones' },
    { value: 'app_installs', label: 'Instalaciones de app' },
  ],
};

export const SERVICE_TYPES = [
  { value: 'full_service', label: 'Servicio Completo', description: 'Estrategia + Tráfico + Contenido' },
  { value: 'strategy_only', label: 'Solo Estrategia', description: 'Planificación y consultoría' },
  { value: 'traffic_only', label: 'Solo Tráfico', description: 'Gestión de pauta publicitaria' },
  { value: 'social_media', label: 'Social Media', description: 'Gestión de redes sociales' },
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
// CONFIGURACIÓN DE TRAFFICKER - Opciones de Campaña
// =====================================================

export const BUDGET_OPTIMIZATION_TYPES = [
  { value: 'cbo', label: 'CBO (Campaign Budget Optimization)', description: 'El presupuesto se distribuye automáticamente entre conjuntos de anuncios' },
  { value: 'abo', label: 'ABO (Ad Set Budget Optimization)', description: 'Cada conjunto de anuncios tiene su propio presupuesto' },
];

export const BID_STRATEGIES = [
  { value: 'lowest_cost', label: 'Menor costo', description: 'Maximizar resultados al menor costo posible' },
  { value: 'cost_cap', label: 'Límite de costo', description: 'Mantener el costo por resultado bajo un límite' },
  { value: 'bid_cap', label: 'Límite de puja', description: 'Establecer puja máxima por subasta' },
  { value: 'target_cost', label: 'Costo objetivo', description: 'Mantener un costo promedio estable' },
];

export const OPTIMIZATION_GOALS = [
  { value: 'conversions', label: 'Conversiones' },
  { value: 'landing_page_views', label: 'Vistas de página destino' },
  { value: 'link_clicks', label: 'Clics en enlace' },
  { value: 'impressions', label: 'Impresiones' },
  { value: 'reach', label: 'Alcance' },
  { value: 'video_views', label: 'Reproducciones de video' },
  { value: 'lead_generation', label: 'Generación de leads' },
  { value: 'app_installs', label: 'Instalaciones de app' },
  { value: 'purchases', label: 'Compras' },
];

export const ATTRIBUTION_WINDOWS = [
  { value: '1d_click', label: '1 día clic' },
  { value: '7d_click', label: '7 días clic' },
  { value: '1d_view', label: '1 día visualización' },
  { value: '7d_click_1d_view', label: '7 días clic, 1 día visualización' },
  { value: '28d_click', label: '28 días clic' },
];

export const AUDIENCE_TYPES = [
  { value: 'broad', label: 'Amplia', description: 'Targeting automático basado en intereses' },
  { value: 'custom', label: 'Personalizada', description: 'Audiencia basada en datos propios (pixel, listas)' },
  { value: 'lookalike', label: 'Similar (Lookalike)', description: 'Audiencia similar a clientes existentes' },
  { value: 'saved', label: 'Guardada', description: 'Audiencia previamente guardada' },
];

export const SCHEDULE_TYPES = [
  { value: 'continuous', label: 'Continuo', description: 'Anuncios corren todo el tiempo' },
  { value: 'scheduled', label: 'Programado', description: 'Anuncios corren en horarios específicos' },
];

export const AD_PLACEMENTS = [
  { value: 'feed', label: 'Feed' },
  { value: 'stories', label: 'Stories' },
  { value: 'reels', label: 'Reels' },
  { value: 'explore', label: 'Explorar' },
  { value: 'search', label: 'Búsqueda' },
  { value: 'right_column', label: 'Columna derecha' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'audience_network', label: 'Audience Network' },
  { value: 'in_stream', label: 'In-Stream' },
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
  detailedObjective: string;
  audience: string;
  tone: string;
  contentTypes: string[];
  techniques: string[];
  keywords: string[];
  ctaStyle: string;
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
    detailedObjective: 'Viralidad, enganche, disrupción, educar. Que las personas conozcan el producto o servicio y se den cuenta que tienen el problema.',
    audience: 'Audiencia FRÍA - personas que nunca han interactuado con la marca, no conocen el producto ni saben que tienen un problema',
    tone: 'Disruptivo, viral, llamativo, sorprendente. Romper patrones, generar curiosidad extrema.',
    contentTypes: ['Hooks disruptivos', 'Problemas visibles', 'Patrones rotos'],
    techniques: [
      'Hooks ultra potentes en los primeros 1-3 segundos',
      'Pattern interrupts (romper patrones visuales/auditivos)',
      'Declaraciones controversiales o contraintuitivas',
      'Preguntas que despiertan curiosidad',
      'Mostrar el problema de forma dramatizada',
      'Contenido educativo que revele un problema oculto'
    ],
    keywords: ['¿Sabías que...?', 'Esto es lo que nadie te cuenta', 'Error #1', 'Por qué no funciona', 'La verdad sobre', 'Descubrí que'],
    ctaStyle: 'Suave - invitar a seguir, comentar, guardar. NO vender directamente.',
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
    detailedObjective: 'Venta directa, persuadir para comprar, ser el mejor vendiendo. Mostrar que el producto ES la solución perfecta.',
    audience: 'Audiencia TIBIA - personas que ya saben que tienen el problema y buscan activamente una solución',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación. Venta directa pero no agresiva.',
    contentTypes: ['Casos de uso', 'Demostraciones', 'Storytelling de transformación'],
    techniques: [
      'Demostración del producto en acción',
      'Antes y después transformacionales',
      'Testimonios de clientes reales',
      'Comparación sutil con alternativas',
      'Storytelling de éxito',
      'Beneficios específicos y cuantificables'
    ],
    keywords: ['La solución es', 'Esto cambió todo', 'Finalmente', 'Por eso creamos', 'Resultados garantizados', 'Funciona porque'],
    ctaStyle: 'Directo - invitar a comprar, probar, registrarse. Link en bio, desliza arriba.',
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
    detailedObjective: 'Mostrar lo que se está perdiendo, crear urgencia, superar objeciones finales. Cerrar la venta.',
    audience: 'Audiencia CALIENTE - personas que ya vieron el producto, visitaron el sitio, agregaron al carrito pero NO compraron',
    tone: 'Urgente, resolutivo, enfocado en pérdida (FOMO). Atacar objeciones directamente.',
    contentTypes: ['Prueba social', 'Objeciones', 'Comparativas'],
    techniques: [
      'Escasez real (stock limitado, tiempo limitado)',
      'Social proof masivo (X personas ya compraron)',
      'Responder objeciones comunes',
      'Garantías y eliminación de riesgo',
      'Comparación de precio vs valor',
      'Recordatorio de beneficios clave'
    ],
    keywords: ['Últimas unidades', 'Se acaba en', 'No te pierdas', 'Mientras lees esto', 'Si no ahora, cuándo', 'Otros ya lo tienen'],
    ctaStyle: 'Urgente - comprar ahora, última oportunidad, no esperes más.',
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
    detailedObjective: 'Entregar valor y confianza, buscar que nos refieran y recompren. Crear comunidad y lealtad.',
    audience: 'CLIENTES existentes - personas que ya compraron y queremos que vuelvan a comprar y nos recomienden',
    tone: 'Cercano, exclusivo, valorando al cliente. Contenido de alto valor, tips, comunidad.',
    contentTypes: ['Educación', 'Comunidad', 'Upsells', 'Referidos'],
    techniques: [
      'Contenido exclusivo para clientes',
      'Tips de uso avanzado del producto',
      'Historias de otros clientes exitosos',
      'Ofertas exclusivas para clientes',
      'Invitación a programas de referidos',
      'Behind the scenes y contenido humano'
    ],
    keywords: ['Para ti que ya eres cliente', 'Tip exclusivo', 'Gracias por confiar', 'Comparte con', 'Tu experiencia importa', 'Familia [marca]'],
    ctaStyle: 'Comunitario - compartir, etiquetar amigos, dejar reseña, referir.',
    metrics: ['Recompra', 'Engagement recurrente', 'Retención'],
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    icon: 'Heart',
  },
];

export function getSpherePhaseConfig(phase: SpherePhase): SpherePhaseConfig {
  return SPHERE_PHASES.find(p => p.value === phase) || SPHERE_PHASES[0];
}

export interface EsferaPhaseData {
  description: string;
  objective: string;
  content_types: string[];
  metrics: string[];
  tactics: string[];
  angles: string[];
}

// =====================================================
// LINKEDIN ADS INTEGRATION TYPES
// =====================================================

export interface LinkedInAdAccount {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  currency: string;
  reference?: string;
}

export interface LinkedInCampaign {
  id?: string;
  name: string;
  account_id: string;
  objective_type: LinkedInObjectiveType;
  status: LinkedInCampaignStatus;
  daily_budget?: LinkedInMoney;
  total_budget?: LinkedInMoney;
  targeting?: LinkedInTargeting;
  start_date?: string;
  end_date?: string;
}

export type LinkedInObjectiveType =
  | 'BRAND_AWARENESS'
  | 'ENGAGEMENT'
  | 'LEAD_GENERATION'
  | 'WEBSITE_CONVERSIONS'
  | 'VIDEO_VIEWS';

export type LinkedInCampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';

export interface LinkedInMoney {
  amount: string;
  currency_code: string;
}

export interface LinkedInTargeting {
  locations?: string[];
  job_titles?: string[];
  industries?: string[];
  company_sizes?: string[];
  seniorities?: string[];
  skills?: string[];
  member_groups?: string[];
  job_functions?: string[];
}

export interface LinkedInCampaignMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpl: number;
}

export interface LinkedInConversionEvent {
  event_type: LinkedInEventType;
  conversion_id: string;
  user: {
    email?: string;
    linkedin_first_party_id?: string;
  };
  event_time: number;
  event_source_url?: string;
  value?: LinkedInMoney;
}

export type LinkedInEventType =
  | 'SIGNUP'
  | 'PURCHASE'
  | 'LEAD'
  | 'KEY_PAGE_VIEW'
  | 'ADD_TO_CART'
  | 'INSTALL'
  | 'OTHER';

export const LINKEDIN_OBJECTIVES: { value: LinkedInObjectiveType; label: string; description: string }[] = [
  { value: 'BRAND_AWARENESS', label: 'Conocimiento de marca', description: 'Aumentar visibilidad y reconocimiento' },
  { value: 'ENGAGEMENT', label: 'Interaccion', description: 'Generar likes, comentarios y compartidos' },
  { value: 'LEAD_GENERATION', label: 'Generacion de leads', description: 'Capturar leads con formularios nativos' },
  { value: 'WEBSITE_CONVERSIONS', label: 'Conversiones web', description: 'Dirigir trafico que convierte' },
  { value: 'VIDEO_VIEWS', label: 'Visualizaciones de video', description: 'Maximizar reproducciones de video' },
];

export const LINKEDIN_TARGETING_OPTIONS = {
  company_sizes: [
    { value: '1-10', label: '1-10 empleados' },
    { value: '11-50', label: '11-50 empleados' },
    { value: '51-200', label: '51-200 empleados' },
    { value: '201-500', label: '201-500 empleados' },
    { value: '501-1000', label: '501-1000 empleados' },
    { value: '1001-5000', label: '1001-5000 empleados' },
    { value: '5001-10000', label: '5001-10000 empleados' },
    { value: '10001+', label: 'Mas de 10000 empleados' },
  ],
  seniorities: [
    { value: 'entry', label: 'Nivel inicial' },
    { value: 'senior', label: 'Senior' },
    { value: 'manager', label: 'Manager' },
    { value: 'director', label: 'Director' },
    { value: 'vp', label: 'VP' },
    { value: 'cxo', label: 'C-Level' },
    { value: 'owner', label: 'Propietario' },
  ],
  industries: [
    { value: 'technology', label: 'Tecnologia' },
    { value: 'finance', label: 'Finanzas' },
    { value: 'healthcare', label: 'Salud' },
    { value: 'education', label: 'Educacion' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufactura' },
    { value: 'marketing', label: 'Marketing y Publicidad' },
    { value: 'consulting', label: 'Consultoria' },
    { value: 'real_estate', label: 'Bienes Raices' },
    { value: 'legal', label: 'Legal' },
  ],
};

// =====================================================
// CONTENT ANALYTICS TYPES
// =====================================================

export interface ContentAnalyticsMetrics {
  total_views: number;
  total_likes: number;
  total_content: number;
  avg_engagement: number;
  views_growth: number;
  content_growth: number;
}

export interface ContentDailyTrend {
  date: string;
  views: number;
  likes: number;
  content_created: number;
}

export interface ContentTypeDistribution {
  type: string;
  count: number;
  views: number;
  engagement_rate: number;
}

export interface TopPerformingContent {
  id: string;
  title: string;
  views: number;
  likes: number;
  engagement_rate: number;
  thumbnail_url: string | null;
  content_type: string;
  created_at: string;
}
