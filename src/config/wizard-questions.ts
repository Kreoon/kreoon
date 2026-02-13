// ============================================================================
// PRODUCT DNA WIZARD - INTELLIGENT QUESTION SYSTEM V3
// Goals are now specific to each service group
// ============================================================================

import {
  Eye, ClipboardList, DollarSign, Heart, BookOpen, Sparkles,
  Globe, Smartphone, Bot, GraduationCap, HelpCircle, Briefcase,
  Film, Play, Mic, Palette, Radio,
  Target, Zap, Settings, Search,
  CalendarDays, Megaphone, Gem, Rocket, TrendingUp, Users,
} from 'lucide-react';

// ============================================================================
// TIPOS BASE
// ============================================================================

export type QuestionType =
  | 'single_select'
  | 'multi_select'
  | 'text'
  | 'textarea'
  | 'url_list'
  | 'audio'
  | 'range'
  | 'chips'
  | 'scale'
  | 'budget_slider';

export type GoalType =
  // Content Creation
  | 'brand_awareness' | 'lead_generation' | 'sales' | 'engagement' | 'education' | 'other_content'
  // Strategy & Marketing
  | 'content_strategy' | 'paid_ads' | 'brand_strategy' | 'launch_campaign' | 'growth_consulting' | 'community_management'
  // Legacy (backward compat)
  | 'other'
  // Technology
  | 'mvp' | 'full_app' | 'landing_page' | 'ecommerce' | 'redesign' | 'integration'
  // Post-Production
  | 'social_video' | 'corporate_video' | 'commercial' | 'documentary' | 'animation' | 'podcast_audio'
  // Education & Training
  | 'online_course' | 'workshop' | 'webinar' | 'learning_materials' | 'coaching_program' | 'corporate_training'
  // General
  | 'consulting' | 'audit' | 'ongoing_support' | 'one_time_project' | 'custom_request';

export type ServiceGroup =
  | 'content_creation'
  | 'post_production'
  | 'strategy_marketing'
  | 'technology'
  | 'education_training'
  | 'general_services';

// ============================================================================
// INTERFACES
// ============================================================================

export interface GoalOption {
  id: GoalType;
  icon: string; // emoji
  label: string;
  description: string;
  questionCount: number;
  complexity: 'simple' | 'moderate' | 'detailed';
  color: string; // gradient
}

export interface WizardQuestion {
  id: string;
  type: QuestionType;
  title: string;
  subtitle?: string;
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  validation?: { min?: number; max?: number; pattern?: string; minLength?: number; maxLength?: number };
  showIf?: ConditionalRule[];
  aiHint?: string;
  weight?: number;
  helpText?: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  icon?: any;
  emoji?: string;
  recommended?: boolean;
  leadsTo?: string[];
  numericValue?: number;
}

export type ConditionalOperator =
  | 'equals' | 'not_equals' | 'includes' | 'not_includes'
  | 'any_of' | 'all_of' | 'greater_than' | 'less_than';

export interface ConditionalRule {
  logic?: 'AND' | 'OR';
  conditions: Condition[];
}

export interface Condition {
  questionId: string;
  operator: ConditionalOperator;
  value: string | string[] | number;
}

// ============================================================================
// CONDITIONAL LOGIC HELPERS
// ============================================================================

export function evaluateCondition(condition: Condition, responses: Record<string, any>): boolean {
  const response = responses[condition.questionId];
  if (response === undefined || response === null) return false;
  switch (condition.operator) {
    case 'equals': return response === condition.value;
    case 'not_equals': return response !== condition.value;
    case 'includes':
      return Array.isArray(response) ? response.includes(condition.value as string) : response === condition.value;
    case 'not_includes':
      return Array.isArray(response) ? !response.includes(condition.value as string) : response !== condition.value;
    case 'any_of':
      if (Array.isArray(condition.value)) {
        return Array.isArray(response) ? condition.value.some(v => response.includes(v)) : condition.value.includes(response);
      }
      return false;
    case 'all_of':
      return Array.isArray(condition.value) && Array.isArray(response) && condition.value.every(v => response.includes(v));
    case 'greater_than': return typeof response === 'number' && response > (condition.value as number);
    case 'less_than': return typeof response === 'number' && response < (condition.value as number);
    default: return false;
  }
}

export function shouldShowQuestion(
  question: WizardQuestion,
  responses: Record<string, any>,
  selectedServices: string[],
  selectedGoal: GoalType | null
): boolean {
  if (!question.showIf || question.showIf.length === 0) return true;
  return question.showIf.some(ruleGroup => {
    const logic = ruleGroup.logic || 'AND';
    return logic === 'AND'
      ? ruleGroup.conditions.every(c => evaluateCondition(c, responses))
      : ruleGroup.conditions.some(c => evaluateCondition(c, responses));
  });
}

// ============================================================================
// GOALS PER SERVICE GROUP
// ============================================================================

const CONTENT_CREATION_GOALS: GoalOption[] = [
  { id: 'brand_awareness', icon: '👁️', label: 'Reconocimiento de Marca', description: 'Dar a conocer mi marca o producto', questionCount: 6, complexity: 'moderate', color: 'from-violet-500 to-purple-500' },
  { id: 'lead_generation', icon: '📋', label: 'Generación de Leads', description: 'Captar prospectos y datos de contacto', questionCount: 7, complexity: 'detailed', color: 'from-blue-500 to-cyan-500' },
  { id: 'sales', icon: '💰', label: 'Ventas Directas', description: 'Impulsar conversiones y ventas', questionCount: 8, complexity: 'detailed', color: 'from-green-500 to-emerald-500' },
  { id: 'engagement', icon: '❤️', label: 'Engagement', description: 'Aumentar interacción con la audiencia', questionCount: 6, complexity: 'moderate', color: 'from-rose-500 to-pink-500' },
  { id: 'education', icon: '📚', label: 'Educación', description: 'Informar y educar a mi audiencia', questionCount: 6, complexity: 'moderate', color: 'from-amber-500 to-orange-500' },
  { id: 'other_content', icon: '✨', label: 'Otro Objetivo', description: 'Tengo un objetivo diferente', questionCount: 3, complexity: 'simple', color: 'from-gray-500 to-slate-500' },
];

const STRATEGY_MARKETING_GOALS: GoalOption[] = [
  { id: 'content_strategy', icon: '📅', label: 'Estrategia de Contenido', description: 'Plan editorial y calendario', questionCount: 7, complexity: 'detailed', color: 'from-violet-500 to-purple-500' },
  { id: 'paid_ads', icon: '📣', label: 'Publicidad Pagada', description: 'Campañas Meta, Google, TikTok Ads', questionCount: 8, complexity: 'detailed', color: 'from-blue-500 to-cyan-500' },
  { id: 'brand_strategy', icon: '💎', label: 'Estrategia de Marca', description: 'Posicionamiento y diferenciación', questionCount: 8, complexity: 'detailed', color: 'from-amber-500 to-orange-500' },
  { id: 'launch_campaign', icon: '🚀', label: 'Lanzamiento / Campaña', description: 'Campaña específica con fecha límite', questionCount: 7, complexity: 'detailed', color: 'from-green-500 to-emerald-500' },
  { id: 'growth_consulting', icon: '📈', label: 'Consultoría de Crecimiento', description: 'Diagnóstico y plan de acción', questionCount: 6, complexity: 'moderate', color: 'from-rose-500 to-pink-500' },
  { id: 'community_management', icon: '👥', label: 'Community Management', description: 'Gestión de comunidad y redes', questionCount: 6, complexity: 'moderate', color: 'from-indigo-500 to-violet-500' },
];

const TECHNOLOGY_GOALS: GoalOption[] = [
  { id: 'mvp', icon: '🚀', label: 'MVP / Prototipo', description: 'Validar idea con versión mínima funcional', questionCount: 7, complexity: 'detailed', color: 'from-blue-500 to-cyan-500' },
  { id: 'full_app', icon: '📱', label: 'Aplicación Completa', description: 'Desarrollo de app móvil o web completa', questionCount: 8, complexity: 'detailed', color: 'from-purple-500 to-pink-500' },
  { id: 'landing_page', icon: '🎯', label: 'Landing Page', description: 'Página de aterrizaje para conversión', questionCount: 6, complexity: 'moderate', color: 'from-green-500 to-emerald-500' },
  { id: 'ecommerce', icon: '🛒', label: 'E-commerce / Tienda', description: 'Tienda online con catálogo y pagos', questionCount: 8, complexity: 'detailed', color: 'from-orange-500 to-amber-500' },
  { id: 'redesign', icon: '✨', label: 'Rediseño / Mejora', description: 'Actualizar proyecto existente', questionCount: 6, complexity: 'moderate', color: 'from-rose-500 to-pink-500' },
  { id: 'integration', icon: '🔗', label: 'Integración / API', description: 'Conectar sistemas o servicios externos', questionCount: 5, complexity: 'moderate', color: 'from-indigo-500 to-violet-500' },
];

const POST_PRODUCTION_GOALS: GoalOption[] = [
  { id: 'social_video', icon: '📱', label: 'Video para Redes', description: 'Reels, TikToks, Stories optimizados', questionCount: 6, complexity: 'moderate', color: 'from-pink-500 to-rose-500' },
  { id: 'corporate_video', icon: '🏢', label: 'Video Corporativo', description: 'Presentación empresarial profesional', questionCount: 7, complexity: 'detailed', color: 'from-blue-500 to-indigo-500' },
  { id: 'commercial', icon: '📺', label: 'Comercial / Ad', description: 'Anuncio publicitario para campañas', questionCount: 8, complexity: 'detailed', color: 'from-amber-500 to-orange-500' },
  { id: 'documentary', icon: '🎬', label: 'Documental / Testimonial', description: 'Historia o caso de éxito en profundidad', questionCount: 6, complexity: 'moderate', color: 'from-emerald-500 to-teal-500' },
  { id: 'animation', icon: '✨', label: 'Animación / Motion', description: 'Motion graphics o animación 2D/3D', questionCount: 7, complexity: 'detailed', color: 'from-purple-500 to-violet-500' },
  { id: 'podcast_audio', icon: '🎙️', label: 'Podcast / Audio', description: 'Edición de podcast o contenido de audio', questionCount: 5, complexity: 'moderate', color: 'from-cyan-500 to-blue-500' },
];

const EDUCATION_GOALS: GoalOption[] = [
  { id: 'online_course', icon: '🎓', label: 'Curso Online', description: 'Programa completo grabado', questionCount: 8, complexity: 'detailed', color: 'from-blue-500 to-indigo-500' },
  { id: 'workshop', icon: '🛠️', label: 'Workshop / Taller', description: 'Sesión práctica intensiva', questionCount: 6, complexity: 'moderate', color: 'from-amber-500 to-orange-500' },
  { id: 'webinar', icon: '📡', label: 'Webinar / Masterclass', description: 'Sesión en vivo educativa', questionCount: 6, complexity: 'moderate', color: 'from-green-500 to-emerald-500' },
  { id: 'learning_materials', icon: '📚', label: 'Material Didáctico', description: 'Guías, ebooks, workbooks', questionCount: 5, complexity: 'moderate', color: 'from-purple-500 to-violet-500' },
  { id: 'coaching_program', icon: '🎯', label: 'Programa de Coaching', description: 'Mentoría estructurada', questionCount: 7, complexity: 'detailed', color: 'from-rose-500 to-pink-500' },
  { id: 'corporate_training', icon: '🏢', label: 'Capacitación Corporativa', description: 'Formación para equipos/empresas', questionCount: 7, complexity: 'detailed', color: 'from-cyan-500 to-blue-500' },
];

const GENERAL_SERVICES_GOALS: GoalOption[] = [
  { id: 'consulting', icon: '💡', label: 'Consultoría', description: 'Asesoría experta en área específica', questionCount: 5, complexity: 'moderate', color: 'from-amber-500 to-orange-500' },
  { id: 'audit', icon: '🔍', label: 'Auditoría / Diagnóstico', description: 'Análisis profundo de situación actual', questionCount: 5, complexity: 'moderate', color: 'from-blue-500 to-cyan-500' },
  { id: 'ongoing_support', icon: '🔄', label: 'Soporte Continuo', description: 'Acompañamiento mensual/recurrente', questionCount: 5, complexity: 'moderate', color: 'from-green-500 to-emerald-500' },
  { id: 'one_time_project', icon: '📌', label: 'Proyecto Puntual', description: 'Entregable específico con inicio y fin', questionCount: 4, complexity: 'simple', color: 'from-purple-500 to-violet-500' },
  { id: 'custom_request', icon: '✨', label: 'Solicitud Personalizada', description: 'Necesidad que no encaja en otras categorías', questionCount: 3, complexity: 'simple', color: 'from-gray-500 to-slate-500' },
];

const GOALS_BY_SERVICE_GROUP: Record<ServiceGroup, GoalOption[]> = {
  content_creation: CONTENT_CREATION_GOALS,
  strategy_marketing: STRATEGY_MARKETING_GOALS,
  post_production: POST_PRODUCTION_GOALS,
  technology: TECHNOLOGY_GOALS,
  education_training: EDUCATION_GOALS,
  general_services: GENERAL_SERVICES_GOALS,
};

export function getGoalsForServiceGroup(group: ServiceGroup): GoalOption[] {
  return GOALS_BY_SERVICE_GROUP[group] || GENERAL_SERVICES_GOALS;
}

// Backward compat alias
export const getGoalsForGroup = (groupId: string): GoalOption[] =>
  getGoalsForServiceGroup(groupId as ServiceGroup);

// ============================================================================
// MARKETING GOAL QUESTIONS (content_creation, strategy_marketing)
// ============================================================================

export const BRAND_AWARENESS_QUESTIONS: WizardQuestion[] = [
  { id: 'awareness_focus', type: 'single_select', title: '¿Qué quieres que la gente recuerde de tu marca?', required: true, options: [
    { id: 'quality', label: 'Calidad Premium', emoji: '⭐', description: 'Productos/servicios de alta gama' },
    { id: 'innovation', label: 'Innovación', emoji: '🚀', description: 'Soluciones únicas y disruptivas' },
    { id: 'price', label: 'Mejor Precio', emoji: '💎', description: 'Mejor relación calidad-precio' },
    { id: 'trust', label: 'Confianza', emoji: '🤝', description: 'Trayectoria y credibilidad' },
    { id: 'experience', label: 'Experiencia', emoji: '✨', description: 'Vivencia única con la marca' },
    { id: 'values', label: 'Valores', emoji: '💚', description: 'Propósito y responsabilidad social' },
  ]},
  { id: 'brand_tone', type: 'single_select', title: '¿Qué tono de comunicación representa tu marca?', required: true, options: [
    { id: 'professional', label: 'Profesional', emoji: '👔', description: 'Corporativo, formal, experto' },
    { id: 'friendly', label: 'Amigable', emoji: '😊', description: 'Casual, cálido, accesible' },
    { id: 'bold', label: 'Audaz', emoji: '🔥', description: 'Provocador, diferente, arriesgado' },
    { id: 'inspirational', label: 'Inspiracional', emoji: '🌟', description: 'Motivador, aspiracional' },
    { id: 'educational', label: 'Educativo', emoji: '📖', description: 'Didáctico, claro' },
    { id: 'playful', label: 'Divertido', emoji: '🎨', description: 'Humor, creatividad' },
  ]},
  { id: 'awareness_content_type', type: 'multi_select', title: '¿Qué tipo de contenido conectará mejor?', subtitle: 'Selecciona hasta 3', required: true, validation: { max: 3 }, options: [
    { id: 'storytelling', label: 'Historias de Marca', emoji: '📖' },
    { id: 'behind_scenes', label: 'Behind the Scenes', emoji: '🎬' },
    { id: 'testimonials', label: 'Testimoniales', emoji: '💬' },
    { id: 'educational', label: 'Contenido Educativo', emoji: '🎓' },
    { id: 'entertainment', label: 'Entretenimiento', emoji: '🎭' },
    { id: 'lifestyle', label: 'Estilo de Vida', emoji: '🌴' },
  ]},
  { id: 'awareness_platforms', type: 'multi_select', title: '¿En qué plataformas quieres mayor alcance?', required: true, validation: { max: 4 }, options: [
    { id: 'instagram', label: 'Instagram', emoji: '📸' },
    { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
    { id: 'facebook', label: 'Facebook', emoji: '👥' },
    { id: 'youtube', label: 'YouTube', emoji: '▶️' },
    { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
    { id: 'twitter', label: 'X (Twitter)', emoji: '🐦' },
  ]},
  { id: 'awareness_frequency', type: 'single_select', title: '¿Con qué frecuencia planeas publicar?', required: true, options: [
    { id: 'daily', label: 'Diario', emoji: '📅', description: '1+ publicaciones por día' },
    { id: 'regular', label: 'Regular', emoji: '📆', description: '3-5 veces por semana', recommended: true },
    { id: 'moderate', label: 'Moderado', emoji: '📋', description: '1-2 veces por semana' },
    { id: 'occasional', label: 'Ocasional', emoji: '🗓️', description: 'Según necesidad' },
  ]},
  { id: 'awareness_kpis', type: 'multi_select', title: '¿Qué métricas son más importantes?', validation: { max: 3 }, required: true, options: [
    { id: 'reach', label: 'Alcance', emoji: '📡' },
    { id: 'impressions', label: 'Impresiones', emoji: '👁️' },
    { id: 'followers', label: 'Seguidores', emoji: '👥' },
    { id: 'brand_mentions', label: 'Menciones', emoji: '💬' },
    { id: 'share_of_voice', label: 'Share of Voice', emoji: '📊' },
    { id: 'brand_searches', label: 'Búsquedas', emoji: '🔍' },
  ]},
];

export const LEAD_GENERATION_QUESTIONS: WizardQuestion[] = [
  { id: 'lead_type', type: 'single_select', title: '¿Qué tipo de leads necesitas captar?', required: true, options: [
    { id: 'b2b', label: 'Empresas (B2B)', emoji: '🏢' },
    { id: 'b2c', label: 'Consumidores (B2C)', emoji: '👤' },
    { id: 'professionals', label: 'Profesionales', emoji: '👔' },
    { id: 'entrepreneurs', label: 'Emprendedores', emoji: '🚀' },
    { id: 'students', label: 'Estudiantes', emoji: '🎓' },
    { id: 'mixed', label: 'Mixto', emoji: '🎯' },
  ]},
  { id: 'lead_temperature', type: 'single_select', title: '¿En qué etapa del proceso de compra están?', required: true, options: [
    { id: 'cold', label: 'Fríos', emoji: '❄️', description: 'No conocen mi solución' },
    { id: 'warm', label: 'Tibios', emoji: '🌡️', description: 'Saben que tienen un problema', recommended: true },
    { id: 'hot', label: 'Calientes', emoji: '🔥', description: 'Buscan activamente solución' },
  ]},
  { id: 'lead_magnet', type: 'single_select', title: '¿Qué usarás como lead magnet?', required: true, options: [
    { id: 'ebook', label: 'Ebook / Guía', emoji: '📚' },
    { id: 'webinar', label: 'Webinar / Masterclass', emoji: '🎥' },
    { id: 'trial', label: 'Prueba Gratuita', emoji: '🎁' },
    { id: 'consultation', label: 'Consulta Gratis', emoji: '📞' },
    { id: 'discount', label: 'Descuento / Cupón', emoji: '💸' },
    { id: 'quiz', label: 'Quiz / Diagnóstico', emoji: '📝' },
    { id: 'none', label: 'No tengo definido', emoji: '🤔' },
  ]},
  { id: 'lead_data_needed', type: 'multi_select', title: '¿Qué información necesitas del lead?', validation: { max: 5 }, required: true, options: [
    { id: 'email', label: 'Email', emoji: '📧' },
    { id: 'phone', label: 'Teléfono', emoji: '📱' },
    { id: 'name', label: 'Nombre', emoji: '👤' },
    { id: 'company', label: 'Empresa', emoji: '🏢' },
    { id: 'position', label: 'Cargo', emoji: '💼' },
    { id: 'budget', label: 'Presupuesto', emoji: '💰' },
  ]},
  { id: 'lead_followup', type: 'single_select', title: '¿Cómo harás seguimiento a los leads?', required: true, options: [
    { id: 'email_sequence', label: 'Secuencia de Emails', emoji: '📧' },
    { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
    { id: 'call', label: 'Llamadas', emoji: '📞' },
    { id: 'retargeting', label: 'Retargeting', emoji: '🎯' },
    { id: 'mixed', label: 'Estrategia Mixta', emoji: '🔄', recommended: true },
    { id: 'undefined', label: 'No tengo proceso', emoji: '🤔' },
  ]},
  { id: 'lead_volume_goal', type: 'single_select', title: '¿Cuántos leads mensuales esperas?', required: true, options: [
    { id: 'small', label: '10-50 leads', emoji: '🌱' },
    { id: 'medium', label: '50-200 leads', emoji: '🌿' },
    { id: 'large', label: '200-500 leads', emoji: '🌳' },
    { id: 'enterprise', label: '500+ leads', emoji: '🏔️' },
  ]},
  { id: 'lead_kpis', type: 'multi_select', title: '¿Qué métricas usarás para medir el éxito?', validation: { max: 3 }, required: true, options: [
    { id: 'cpl', label: 'Costo por Lead', emoji: '💵' },
    { id: 'conversion_rate', label: 'Tasa de Conversión', emoji: '📈' },
    { id: 'lead_quality', label: 'Calidad del Lead', emoji: '⭐' },
    { id: 'sql_rate', label: 'MQL a SQL', emoji: '🎯' },
    { id: 'close_rate', label: 'Tasa de Cierre', emoji: '🏆' },
  ]},
];

export const SALES_QUESTIONS: WizardQuestion[] = [
  { id: 'product_service_type', type: 'single_select', title: '¿Qué tipo de producto o servicio vendes?', required: true, options: [
    { id: 'physical', label: 'Producto Físico', emoji: '📦' },
    { id: 'digital', label: 'Producto Digital', emoji: '💻' },
    { id: 'service', label: 'Servicio', emoji: '🛠️' },
    { id: 'subscription', label: 'Suscripción', emoji: '🔄' },
    { id: 'course', label: 'Curso / Formación', emoji: '🎓' },
    { id: 'mixed', label: 'Combinado', emoji: '🎯' },
  ]},
  { id: 'price_range', type: 'single_select', title: '¿Cuál es el rango de precio?', required: true, options: [
    { id: 'low', label: '$1-$50', emoji: '💵' },
    { id: 'medium', label: '$50-$200', emoji: '💰' },
    { id: 'high', label: '$200-$1000', emoji: '💎' },
    { id: 'premium', label: '$1000+', emoji: '👑' },
  ]},
  { id: 'sales_urgency', type: 'single_select', title: '¿Qué tipo de urgencia puedes usar?', required: true, options: [
    { id: 'time_limited', label: 'Tiempo Limitado', emoji: '⏰' },
    { id: 'quantity_limited', label: 'Stock Limitado', emoji: '📊' },
    { id: 'exclusive', label: 'Acceso Exclusivo', emoji: '🔐' },
    { id: 'seasonal', label: 'Temporada', emoji: '🗓️' },
    { id: 'none', label: 'No aplico urgencia', emoji: '🤷' },
  ]},
  { id: 'sales_objections', type: 'multi_select', title: '¿Principales objeciones de tus clientes?', validation: { max: 4 }, required: true, options: [
    { id: 'price', label: 'Es muy caro', emoji: '💰' },
    { id: 'trust', label: 'No confío', emoji: '🤔' },
    { id: 'time', label: 'No tengo tiempo', emoji: '⏰' },
    { id: 'need', label: 'No lo necesito ahora', emoji: '🙅' },
    { id: 'comparison', label: 'Hay otras opciones', emoji: '⚖️' },
    { id: 'authority', label: 'Debo consultarlo', emoji: '👥' },
  ]},
  { id: 'sales_proof', type: 'multi_select', title: '¿Qué prueba social tienes?', validation: { max: 4 }, required: true, options: [
    { id: 'testimonials', label: 'Testimonios', emoji: '💬' },
    { id: 'reviews', label: 'Reseñas', emoji: '⭐' },
    { id: 'case_studies', label: 'Casos de Éxito', emoji: '📈' },
    { id: 'numbers', label: 'Números', emoji: '📊' },
    { id: 'certifications', label: 'Certificaciones', emoji: '🏆' },
    { id: 'media', label: 'Prensa / Medios', emoji: '📰' },
  ]},
  { id: 'sales_funnel_stage', type: 'single_select', title: '¿Dónde necesitas más ayuda en el funnel?', required: true, options: [
    { id: 'tofu', label: 'Atraer (TOFU)', emoji: '🌊' },
    { id: 'mofu', label: 'Considerar (MOFU)', emoji: '🤔' },
    { id: 'bofu', label: 'Convertir (BOFU)', emoji: '🎯' },
    { id: 'retention', label: 'Retener', emoji: '🔄' },
    { id: 'full_funnel', label: 'Todo el Funnel', emoji: '📊' },
  ]},
  { id: 'sales_goal_monthly', type: 'single_select', title: '¿Meta de ventas mensual?', required: true, options: [
    { id: 'starter', label: '$1,000-$5,000', emoji: '🌱' },
    { id: 'growth', label: '$5,000-$20,000', emoji: '🌿' },
    { id: 'scale', label: '$20,000-$50,000', emoji: '🌳' },
    { id: 'enterprise', label: '$50,000+', emoji: '🏔️' },
  ]},
  { id: 'sales_kpis', type: 'multi_select', title: '¿Métricas más importantes?', validation: { max: 3 }, required: true, options: [
    { id: 'roas', label: 'ROAS', emoji: '💹' },
    { id: 'cpa', label: 'CPA', emoji: '💵' },
    { id: 'aov', label: 'AOV', emoji: '🛒' },
    { id: 'conversion', label: 'Conversión', emoji: '📈' },
    { id: 'ltv', label: 'LTV', emoji: '♾️' },
  ]},
];

export const ENGAGEMENT_QUESTIONS: WizardQuestion[] = [
  { id: 'engagement_type', type: 'multi_select', title: '¿Qué tipo de interacción quieres aumentar?', validation: { max: 3 }, required: true, options: [
    { id: 'comments', label: 'Comentarios', emoji: '💬' },
    { id: 'shares', label: 'Compartidos', emoji: '🔄' },
    { id: 'saves', label: 'Guardados', emoji: '📌' },
    { id: 'dms', label: 'Mensajes Directos', emoji: '✉️' },
    { id: 'ugc', label: 'UGC', emoji: '📸' },
    { id: 'mentions', label: 'Menciones', emoji: '🏷️' },
  ]},
  { id: 'community_stage', type: 'single_select', title: '¿En qué etapa está tu comunidad?', required: true, options: [
    { id: 'starting', label: 'Empezando', emoji: '🌱', description: 'Menos de 1K' },
    { id: 'growing', label: 'Creciendo', emoji: '🌿', description: '1K-10K' },
    { id: 'established', label: 'Establecida', emoji: '🌳', description: '10K-100K' },
    { id: 'large', label: 'Grande', emoji: '🏔️', description: '100K+' },
  ]},
  { id: 'engagement_challenge', type: 'single_select', title: '¿Mayor desafío con el engagement?', required: true, options: [
    { id: 'low_reach', label: 'Poco alcance', emoji: '📉' },
    { id: 'silent_audience', label: 'Audiencia silenciosa', emoji: '🤫' },
    { id: 'inconsistent', label: 'Resultados inconsistentes', emoji: '📊' },
    { id: 'fake_engagement', label: 'Engagement superficial', emoji: '👻' },
    { id: 'community_building', label: 'Construir comunidad', emoji: '👥' },
  ]},
  { id: 'content_interaction_style', type: 'multi_select', title: '¿Qué formato genera más interacción?', validation: { max: 3 }, required: true, options: [
    { id: 'polls', label: 'Encuestas', emoji: '📊' },
    { id: 'questions', label: 'Preguntas abiertas', emoji: '❓' },
    { id: 'challenges', label: 'Retos/Challenges', emoji: '🏆' },
    { id: 'giveaways', label: 'Sorteos', emoji: '🎁' },
    { id: 'lives', label: 'Lives', emoji: '🔴' },
    { id: 'collabs', label: 'Colaboraciones', emoji: '🤝' },
  ]},
  { id: 'response_time', type: 'single_select', title: '¿En cuánto tiempo respondes a tu audiencia?', required: true, options: [
    { id: 'instant', label: 'Casi inmediato', emoji: '⚡' },
    { id: 'same_day', label: 'Mismo día', emoji: '📅' },
    { id: 'next_day', label: 'Siguiente día', emoji: '📆' },
    { id: 'slow', label: 'Cuando puedo', emoji: '🐢' },
    { id: 'rarely', label: 'Casi nunca', emoji: '😅' },
  ]},
  { id: 'engagement_kpis', type: 'multi_select', title: '¿Métricas de engagement más importantes?', validation: { max: 3 }, required: true, options: [
    { id: 'engagement_rate', label: 'Engagement Rate', emoji: '📈' },
    { id: 'comments_per_post', label: 'Comentarios/Post', emoji: '💬' },
    { id: 'saves_shares', label: 'Saves + Shares', emoji: '📌' },
    { id: 'story_replies', label: 'Respuestas Stories', emoji: '✉️' },
    { id: 'community_growth', label: 'Crecimiento', emoji: '📊' },
  ]},
];

export const EDUCATION_CONTENT_QUESTIONS: WizardQuestion[] = [
  { id: 'education_topic', type: 'single_select', title: '¿Qué tipo de contenido educativo quieres crear?', required: true, options: [
    { id: 'how_to', label: 'Tutoriales', emoji: '📖' },
    { id: 'tips', label: 'Tips y Consejos', emoji: '💡' },
    { id: 'deep_dive', label: 'Contenido Profundo', emoji: '🎓' },
    { id: 'news', label: 'Novedades del Sector', emoji: '📰' },
    { id: 'case_study', label: 'Casos de Estudio', emoji: '🔍' },
    { id: 'myths', label: 'Mitos y Verdades', emoji: '🤔' },
  ]},
  { id: 'audience_knowledge_level', type: 'single_select', title: '¿Nivel de conocimiento de tu audiencia?', required: true, options: [
    { id: 'beginner', label: 'Principiantes', emoji: '🌱' },
    { id: 'intermediate', label: 'Intermedios', emoji: '🌿' },
    { id: 'advanced', label: 'Avanzados', emoji: '🌳' },
    { id: 'mixed', label: 'Mixto', emoji: '🎯' },
  ]},
  { id: 'education_format', type: 'multi_select', title: '¿Qué formato funciona mejor?', validation: { max: 3 }, required: true, options: [
    { id: 'carousels', label: 'Carruseles', emoji: '📑' },
    { id: 'short_videos', label: 'Videos Cortos', emoji: '🎬' },
    { id: 'long_videos', label: 'Videos Largos', emoji: '▶️' },
    { id: 'infographics', label: 'Infografías', emoji: '📊' },
    { id: 'threads', label: 'Threads/Hilos', emoji: '🧵' },
    { id: 'lives', label: 'Lives/Webinars', emoji: '🔴' },
  ]},
  { id: 'education_outcome', type: 'single_select', title: '¿Qué logra tu audiencia tras consumir tu contenido?', required: true, options: [
    { id: 'apply', label: 'Aplicar lo aprendido', emoji: '🛠️' },
    { id: 'understand', label: 'Entender un concepto', emoji: '🧠' },
    { id: 'change_mindset', label: 'Cambiar perspectiva', emoji: '💡' },
    { id: 'make_decision', label: 'Tomar una decisión', emoji: '🎯' },
    { id: 'stay_updated', label: 'Mantenerse actualizado', emoji: '📡' },
  ]},
  { id: 'education_frequency', type: 'single_select', title: '¿Frecuencia de publicación educativa?', required: true, options: [
    { id: 'daily', label: 'Diario', emoji: '📅' },
    { id: 'weekly', label: '2-3 veces/semana', emoji: '📆', recommended: true },
    { id: 'weekly_deep', label: '1 vez/semana', emoji: '📚' },
    { id: 'biweekly', label: 'Quincenal', emoji: '🗓️' },
  ]},
  { id: 'education_cta', type: 'single_select', title: '¿CTA principal de tu contenido educativo?', required: true, options: [
    { id: 'follow', label: 'Seguir para más', emoji: '➕' },
    { id: 'save', label: 'Guardar el post', emoji: '📌' },
    { id: 'comment', label: 'Comentar dudas', emoji: '💬' },
    { id: 'link', label: 'Ir al link', emoji: '🔗' },
    { id: 'share', label: 'Compartir', emoji: '🔄' },
  ]},
];

export const OTHER_GOAL_QUESTIONS: WizardQuestion[] = [
  { id: 'custom_goal_description', type: 'textarea', title: '¿Cuál es tu objetivo específico?', subtitle: 'Describe con detalle qué quieres lograr', placeholder: 'Ej: Quiero lanzar un podcast y necesito contenido promocional...', required: true, validation: { minLength: 50, maxLength: 500 } },
  { id: 'custom_success_definition', type: 'textarea', title: '¿Cómo defines el éxito para este proyecto?', placeholder: 'Ej: Que cada episodio tenga al menos 1000 reproducciones...', required: true, validation: { minLength: 30, maxLength: 300 } },
  { id: 'custom_timeline', type: 'single_select', title: '¿En cuánto tiempo esperas resultados?', required: true, options: [
    { id: 'immediate', label: '1-2 semanas', emoji: '⚡' },
    { id: 'short', label: '1 mes', emoji: '📅' },
    { id: 'medium', label: '2-3 meses', emoji: '📆' },
    { id: 'long', label: '3+ meses', emoji: '🗓️' },
  ]},
];

// ============================================================================
// STRATEGY & MARKETING GOAL QUESTIONS
// ============================================================================

export const CONTENT_STRATEGY_QUESTIONS: WizardQuestion[] = [
  { id: 'strategy_platforms', type: 'multi_select', title: '¿Plataformas prioritarias?', required: true, validation: { max: 4 }, options: [
    { id: 'instagram', label: 'Instagram', emoji: '📸' },
    { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
    { id: 'youtube', label: 'YouTube', emoji: '▶️' },
    { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
    { id: 'facebook', label: 'Facebook', emoji: '👥' },
    { id: 'twitter', label: 'X (Twitter)', emoji: '🐦' },
    { id: 'blog', label: 'Blog / Web', emoji: '📝' },
  ]},
  { id: 'strategy_frequency', type: 'single_select', title: '¿Frecuencia de publicación deseada?', required: true, options: [
    { id: 'daily', label: 'Diario', emoji: '📅' },
    { id: '3_5_week', label: '3-5 veces/semana', emoji: '📆', recommended: true },
    { id: '1_2_week', label: '1-2 veces/semana', emoji: '🗓️' },
    { id: 'biweekly', label: 'Quincenal', emoji: '📋' },
  ]},
  { id: 'strategy_resources', type: 'single_select', title: '¿Recursos internos para crear contenido?', required: true, options: [
    { id: 'full_team', label: 'Equipo completo interno', emoji: '👥' },
    { id: 'partial', label: 'Algunas personas disponibles', emoji: '👤' },
    { id: 'solo', label: 'Solo yo', emoji: '🙋' },
    { id: 'none', label: 'Necesito todo externo', emoji: '🆕' },
  ]},
  { id: 'strategy_pillars', type: 'single_select', title: '¿Pilares de contenido definidos?', required: true, options: [
    { id: 'defined', label: 'Sí, claros y documentados', emoji: '✅' },
    { id: 'some_ideas', label: 'Tengo ideas generales', emoji: '📋' },
    { id: 'none', label: 'No, necesito definirlos', emoji: '💡' },
  ]},
  { id: 'strategy_competitors', type: 'textarea', title: '¿Competidores a analizar?', subtitle: 'Menciona marcas o cuentas de referencia', placeholder: 'Ej: @competidor1, @competidor2, marca X...', required: false, validation: { maxLength: 300 } },
  { id: 'strategy_kpis', type: 'multi_select', title: '¿KPIs principales?', required: true, validation: { max: 3 }, options: [
    { id: 'followers', label: 'Crecimiento de seguidores', emoji: '📈' },
    { id: 'engagement', label: 'Engagement rate', emoji: '❤️' },
    { id: 'reach', label: 'Alcance / Impresiones', emoji: '👁️' },
    { id: 'traffic', label: 'Tráfico web', emoji: '🌐' },
    { id: 'leads', label: 'Generación de leads', emoji: '📋' },
    { id: 'sales', label: 'Ventas directas', emoji: '💰' },
  ]},
  { id: 'strategy_horizon', type: 'single_select', title: '¿Horizonte de planificación?', required: true, options: [
    { id: '1_month', label: '1 mes', emoji: '📅' },
    { id: '3_months', label: '3 meses', emoji: '📆', recommended: true },
    { id: '6_months', label: '6 meses', emoji: '🗓️' },
    { id: '12_months', label: '12 meses', emoji: '📋' },
  ]},
];

export const PAID_ADS_QUESTIONS: WizardQuestion[] = [
  { id: 'ads_platforms', type: 'multi_select', title: '¿Plataformas publicitarias?', required: true, validation: { max: 4 }, options: [
    { id: 'meta', label: 'Meta (Facebook/Instagram)', emoji: '📸', recommended: true },
    { id: 'google', label: 'Google Ads', emoji: '🔍' },
    { id: 'tiktok', label: 'TikTok Ads', emoji: '🎵' },
    { id: 'linkedin', label: 'LinkedIn Ads', emoji: '💼' },
    { id: 'youtube', label: 'YouTube Ads', emoji: '▶️' },
    { id: 'programmatic', label: 'Programática', emoji: '🤖' },
  ]},
  { id: 'ads_budget', type: 'single_select', title: '¿Presupuesto mensual de pauta?', required: true, options: [
    { id: 'micro', label: 'Menos de $500 USD', emoji: '🌱' },
    { id: 'small', label: '$500 - $2,000 USD', emoji: '🌿' },
    { id: 'medium', label: '$2,000 - $10,000 USD', emoji: '🌳', recommended: true },
    { id: 'large', label: '$10,000 - $50,000 USD', emoji: '🏔️' },
    { id: 'enterprise', label: '$50,000+ USD', emoji: '🚀' },
  ]},
  { id: 'ads_objective', type: 'single_select', title: '¿Objetivo principal de las campañas?', required: true, options: [
    { id: 'traffic', label: 'Tráfico web', emoji: '🌐' },
    { id: 'conversions', label: 'Conversiones / Ventas', emoji: '💰', recommended: true },
    { id: 'leads', label: 'Generación de Leads', emoji: '📋' },
    { id: 'awareness', label: 'Brand Awareness', emoji: '👁️' },
    { id: 'app_installs', label: 'Descargas de app', emoji: '📱' },
  ]},
  { id: 'ads_tracking', type: 'single_select', title: '¿Tienes pixel/tracking instalado?', required: true, options: [
    { id: 'all_setup', label: 'Sí, todo configurado', emoji: '✅' },
    { id: 'partial', label: 'Parcialmente', emoji: '📋' },
    { id: 'no', label: 'No, necesito instalación', emoji: '🔧' },
    { id: 'unsure', label: 'No estoy seguro', emoji: '🤷' },
  ]},
  { id: 'ads_creatives', type: 'single_select', title: '¿Creativos disponibles o necesitas?', required: true, options: [
    { id: 'have_all', label: 'Tengo creativos listos', emoji: '✅' },
    { id: 'some', label: 'Tengo algunos, necesito más', emoji: '📋' },
    { id: 'need_all', label: 'Necesito todos los creativos', emoji: '🎨' },
  ]},
  { id: 'ads_audiences', type: 'single_select', title: '¿Audiencias definidas?', required: true, options: [
    { id: 'detailed', label: 'Sí, con segmentación detallada', emoji: '🎯' },
    { id: 'basic', label: 'Idea general del público', emoji: '📋' },
    { id: 'no', label: 'Necesito definir audiencias', emoji: '🔍' },
  ]},
  { id: 'ads_history', type: 'single_select', title: '¿Historial de campañas anteriores?', required: true, options: [
    { id: 'extensive', label: 'Sí, con data histórica', emoji: '📊' },
    { id: 'some', label: 'Algunas campañas previas', emoji: '📋' },
    { id: 'none', label: 'Primera vez', emoji: '🆕' },
  ]},
  { id: 'ads_account', type: 'single_select', title: '¿Cuenta publicitaria existente?', required: true, options: [
    { id: 'yes_verified', label: 'Sí, verificada y activa', emoji: '✅' },
    { id: 'yes_basic', label: 'Sí, pero sin verificar', emoji: '📋' },
    { id: 'no', label: 'No, necesito crear cuenta', emoji: '🆕' },
  ]},
];

export const BRAND_STRATEGY_QUESTIONS: WizardQuestion[] = [
  { id: 'brand_stage', type: 'single_select', title: '¿Etapa actual de la marca?', required: true, options: [
    { id: 'new', label: 'Nueva / Por crear', emoji: '🌱', description: 'Marca desde cero' },
    { id: 'rebranding', label: 'Rebranding', emoji: '🔄', description: 'Renovación de marca existente' },
    { id: 'expansion', label: 'Expansión', emoji: '🚀', description: 'Marca establecida en crecimiento' },
    { id: 'repositioning', label: 'Reposicionamiento', emoji: '🎯', description: 'Cambio de percepción' },
  ]},
  { id: 'brand_book', type: 'single_select', title: '¿Tienes brand book/guía de marca?', required: true, options: [
    { id: 'complete', label: 'Sí, completo y actualizado', emoji: '✅' },
    { id: 'basic', label: 'Básico (logo y colores)', emoji: '🎨' },
    { id: 'outdated', label: 'Tengo pero está desactualizado', emoji: '📋' },
    { id: 'none', label: 'No tengo', emoji: '🆕' },
  ]},
  { id: 'brand_value_prop', type: 'single_select', title: '¿Propuesta de valor definida?', required: true, options: [
    { id: 'clear', label: 'Sí, clara y diferenciada', emoji: '💎' },
    { id: 'draft', label: 'Tengo borrador, necesita refinamiento', emoji: '📋' },
    { id: 'no', label: 'No, necesito definirla', emoji: '💡' },
  ]},
  { id: 'brand_competitors', type: 'textarea', title: '¿Competencia directa identificada?', placeholder: 'Lista tus 3-5 competidores principales y qué los diferencia...', required: true, validation: { minLength: 20, maxLength: 400 } },
  { id: 'brand_differentiators', type: 'textarea', title: '¿Diferenciadores actuales?', subtitle: '¿Qué te hace único frente a la competencia?', placeholder: 'Ej: Tecnología propia, servicio personalizado, precio competitivo...', required: true, validation: { minLength: 15, maxLength: 300 } },
  { id: 'brand_perception', type: 'textarea', title: '¿Percepción actual vs deseada?', subtitle: 'Cómo te ven hoy vs cómo quieres que te vean', placeholder: 'Actual: "barato y accesible" → Deseada: "premium pero accesible"', required: true, validation: { minLength: 20, maxLength: 400 } },
  { id: 'brand_archetype', type: 'single_select', title: '¿Arquetipos de marca considerados?', required: true, options: [
    { id: 'hero', label: 'El Héroe', emoji: '🦸', description: 'Valiente, determinado, inspirador' },
    { id: 'creator', label: 'El Creador', emoji: '🎨', description: 'Innovador, imaginativo, visionario' },
    { id: 'caregiver', label: 'El Cuidador', emoji: '💛', description: 'Protector, generoso, empático' },
    { id: 'explorer', label: 'El Explorador', emoji: '🧭', description: 'Aventurero, independiente, audaz' },
    { id: 'sage', label: 'El Sabio', emoji: '🎓', description: 'Experto, confiable, objetivo' },
    { id: 'rebel', label: 'El Rebelde', emoji: '🔥', description: 'Disruptivo, provocador, libre' },
    { id: 'unsure', label: 'No lo tengo definido', emoji: '🤷' },
  ]},
  { id: 'brand_tone', type: 'single_select', title: '¿Tono de voz definido?', required: true, options: [
    { id: 'professional', label: 'Profesional', emoji: '👔', description: 'Corporativo, formal' },
    { id: 'friendly', label: 'Amigable', emoji: '😊', description: 'Cercano, cálido' },
    { id: 'bold', label: 'Audaz', emoji: '🔥', description: 'Directo, provocador' },
    { id: 'inspirational', label: 'Inspiracional', emoji: '🌟', description: 'Motivador, aspiracional' },
    { id: 'playful', label: 'Divertido', emoji: '🎉', description: 'Humor, creatividad' },
    { id: 'need_definition', label: 'Necesito definirlo', emoji: '💡' },
  ]},
];

export const LAUNCH_CAMPAIGN_QUESTIONS: WizardQuestion[] = [
  { id: 'launch_what', type: 'single_select', title: '¿Qué se lanza?', required: true, options: [
    { id: 'product', label: 'Producto', emoji: '📦' },
    { id: 'service', label: 'Servicio', emoji: '💼' },
    { id: 'brand', label: 'Marca', emoji: '💎' },
    { id: 'event', label: 'Evento', emoji: '🎤' },
    { id: 'campaign', label: 'Campaña / Promoción', emoji: '🎯' },
  ]},
  { id: 'launch_date', type: 'single_select', title: '¿Fecha de lanzamiento?', required: true, options: [
    { id: 'asap', label: 'Lo antes posible', emoji: '🚨' },
    { id: '2_weeks', label: 'En 2 semanas', emoji: '📅' },
    { id: '1_month', label: 'En 1 mes', emoji: '📆' },
    { id: '2_3_months', label: 'En 2-3 meses', emoji: '🗓️' },
    { id: 'flexible', label: 'Fecha flexible', emoji: '🤷' },
  ]},
  { id: 'launch_budget', type: 'single_select', title: '¿Presupuesto total de campaña?', required: true, options: [
    { id: 'low', label: 'Menos de $1,000 USD', emoji: '🌱' },
    { id: 'medium', label: '$1,000 - $5,000 USD', emoji: '🌿' },
    { id: 'high', label: '$5,000 - $20,000 USD', emoji: '🌳', recommended: true },
    { id: 'premium', label: '$20,000+ USD', emoji: '🏔️' },
  ]},
  { id: 'launch_channels', type: 'multi_select', title: '¿Canales prioritarios?', required: true, validation: { max: 4 }, options: [
    { id: 'social', label: 'Redes sociales', emoji: '📱' },
    { id: 'email', label: 'Email marketing', emoji: '📧' },
    { id: 'paid', label: 'Publicidad pagada', emoji: '📣' },
    { id: 'pr', label: 'PR / Prensa', emoji: '📰' },
    { id: 'influencers', label: 'Influencers', emoji: '⭐' },
    { id: 'events', label: 'Eventos', emoji: '🎤' },
  ]},
  { id: 'launch_influencers', type: 'single_select', title: '¿Influencers/aliados considerados?', required: true, options: [
    { id: 'yes_confirmed', label: 'Sí, ya confirmados', emoji: '✅' },
    { id: 'in_contact', label: 'En negociación', emoji: '📋' },
    { id: 'need_help', label: 'Necesito ayuda para encontrar', emoji: '🔍' },
    { id: 'no', label: 'No incluiré influencers', emoji: '❌' },
  ]},
  { id: 'launch_offer', type: 'textarea', title: '¿Oferta de lanzamiento?', subtitle: 'Descuento, bonus, early bird, etc.', placeholder: 'Ej: 30% descuento primeros 100, acceso anticipado, regalo bonus...', required: false, validation: { maxLength: 300 } },
  { id: 'launch_metrics', type: 'multi_select', title: '¿Métricas de éxito?', required: true, validation: { max: 3 }, options: [
    { id: 'sales_units', label: 'Unidades vendidas', emoji: '📦' },
    { id: 'revenue', label: 'Ingreso generado', emoji: '💰' },
    { id: 'signups', label: 'Registros / Leads', emoji: '📋' },
    { id: 'reach', label: 'Alcance / Impresiones', emoji: '👁️' },
    { id: 'attendees', label: 'Asistentes', emoji: '👥' },
    { id: 'downloads', label: 'Descargas', emoji: '📱' },
  ]},
];

export const GROWTH_CONSULTING_QUESTIONS: WizardQuestion[] = [
  { id: 'growth_pain', type: 'single_select', title: '¿Área de mayor dolor?', required: true, options: [
    { id: 'acquisition', label: 'No llegan clientes nuevos', emoji: '🎯' },
    { id: 'retention', label: 'Clientes no regresan', emoji: '🔄' },
    { id: 'conversion', label: 'Visitas pero no compran', emoji: '💰' },
    { id: 'positioning', label: 'No nos conocen', emoji: '👁️' },
    { id: 'scaling', label: 'No puedo escalar', emoji: '📈' },
    { id: 'multiple', label: 'Varios problemas', emoji: '🔥' },
  ]},
  { id: 'growth_metrics', type: 'single_select', title: '¿Métricas actuales conocidas?', required: true, options: [
    { id: 'detailed', label: 'Sí, tengo dashboards y data', emoji: '📊' },
    { id: 'basic', label: 'Conozco lo básico (ventas, seguidores)', emoji: '📋' },
    { id: 'minimal', label: 'Casi nada medido', emoji: '🤷' },
  ]},
  { id: 'growth_previous', type: 'textarea', title: '¿Intentos previos de solución?', subtitle: '¿Qué has intentado hasta ahora?', placeholder: 'Ej: Invertí en Facebook Ads pero no funcionó, contraté community manager...', required: true, validation: { minLength: 15, maxLength: 400 } },
  { id: 'growth_resources', type: 'single_select', title: '¿Recursos disponibles para implementar?', required: true, options: [
    { id: 'team_budget', label: 'Equipo + presupuesto', emoji: '✅' },
    { id: 'budget_only', label: 'Solo presupuesto', emoji: '💰' },
    { id: 'team_only', label: 'Solo equipo', emoji: '👥' },
    { id: 'limited', label: 'Muy limitados', emoji: '🌱' },
  ]},
  { id: 'growth_timeline', type: 'single_select', title: '¿Timeline para ver resultados?', required: true, options: [
    { id: 'immediate', label: '1 mes', emoji: '⚡' },
    { id: 'short', label: '1-3 meses', emoji: '📅', recommended: true },
    { id: 'medium', label: '3-6 meses', emoji: '📆' },
    { id: 'long', label: '6+ meses', emoji: '🗓️' },
  ]},
  { id: 'growth_analytics', type: 'single_select', title: '¿Acceso a data/analytics?', required: true, options: [
    { id: 'full', label: 'Google Analytics + redes + CRM', emoji: '📊' },
    { id: 'partial', label: 'Solo analytics de redes sociales', emoji: '📱' },
    { id: 'basic', label: 'Solo métricas básicas de plataformas', emoji: '📋' },
    { id: 'none', label: 'Sin herramientas de analytics', emoji: '🆕' },
  ]},
];

export const COMMUNITY_MANAGEMENT_QUESTIONS: WizardQuestion[] = [
  { id: 'community_platforms', type: 'multi_select', title: '¿Plataformas a gestionar?', required: true, validation: { max: 5 }, options: [
    { id: 'instagram', label: 'Instagram', emoji: '📸' },
    { id: 'facebook', label: 'Facebook', emoji: '👥' },
    { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
    { id: 'twitter', label: 'X (Twitter)', emoji: '🐦' },
    { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
    { id: 'whatsapp', label: 'WhatsApp Business', emoji: '💬' },
    { id: 'discord', label: 'Discord / Telegram', emoji: '🤖' },
  ]},
  { id: 'community_volume', type: 'single_select', title: '¿Volumen de mensajes/comentarios diarios?', required: true, options: [
    { id: 'low', label: 'Menos de 20', emoji: '🌱' },
    { id: 'medium', label: '20-50', emoji: '🌿' },
    { id: 'high', label: '50-200', emoji: '🌳' },
    { id: 'very_high', label: '200+', emoji: '🏔️' },
  ]},
  { id: 'community_hours', type: 'single_select', title: '¿Horarios de atención requeridos?', required: true, options: [
    { id: 'business', label: 'Horario oficina (9-18)', emoji: '🏢' },
    { id: 'extended', label: 'Horario extendido (8-22)', emoji: '📅' },
    { id: '24_7', label: '24/7', emoji: '🔄' },
    { id: 'flexible', label: 'Flexible, sin horario fijo', emoji: '🤷' },
  ]},
  { id: 'community_tone', type: 'single_select', title: '¿Tono de respuesta definido?', required: true, options: [
    { id: 'defined', label: 'Sí, con guía de tono', emoji: '✅' },
    { id: 'general', label: 'Idea general pero sin documentar', emoji: '📋' },
    { id: 'no', label: 'No, necesito definirlo', emoji: '💡' },
  ]},
  { id: 'community_crisis', type: 'single_select', title: '¿Protocolo de crisis definido?', required: true, options: [
    { id: 'yes', label: 'Sí, documentado', emoji: '✅' },
    { id: 'informal', label: 'Informal, sabemos qué hacer', emoji: '📋' },
    { id: 'no', label: 'No, necesito crear uno', emoji: '🚨' },
  ]},
  { id: 'community_tools', type: 'single_select', title: '¿Herramientas actuales?', required: true, options: [
    { id: 'professional', label: 'Hootsuite, Sprout, etc.', emoji: '🔧' },
    { id: 'basic', label: 'Solo las plataformas nativas', emoji: '📱' },
    { id: 'none', label: 'Sin herramientas específicas', emoji: '🆕' },
  ]},
];

// ============================================================================
// TECHNOLOGY GOAL QUESTIONS
// ============================================================================

export const MVP_QUESTIONS: WizardQuestion[] = [
  { id: 'mvp_problem', type: 'textarea', title: '¿Qué problema resuelve tu producto?', placeholder: 'Describe el problema principal que tu producto soluciona...', required: true, validation: { minLength: 30, maxLength: 500 } },
  { id: 'mvp_user', type: 'textarea', title: '¿Quién es tu usuario principal?', placeholder: 'Describe a tu usuario ideal: edad, perfil, necesidades...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'mvp_features', type: 'textarea', title: '¿Cuáles son las 3-5 funcionalidades core?', subtitle: 'Solo las esenciales para validar tu idea', placeholder: 'Ej: 1. Registro de usuarios\n2. Catálogo de productos\n3. Carrito de compras...', required: true, validation: { minLength: 30, maxLength: 500 } },
  { id: 'mvp_has_designs', type: 'single_select', title: '¿Tienes diseños o wireframes?', required: true, options: [
    { id: 'yes_figma', label: 'Sí, en Figma/Sketch', emoji: '🎨' },
    { id: 'yes_basic', label: 'Sí, bocetos básicos', emoji: '✏️' },
    { id: 'no', label: 'No, necesito todo', emoji: '🆕' },
    { id: 'reference', label: 'Tengo referencias', emoji: '🔗' },
  ]},
  { id: 'mvp_platform', type: 'multi_select', title: '¿Qué plataforma necesitas?', validation: { max: 3 }, required: true, options: [
    { id: 'web', label: 'Web App', emoji: '🌐' },
    { id: 'ios', label: 'iOS', emoji: '🍎' },
    { id: 'android', label: 'Android', emoji: '🤖' },
    { id: 'pwa', label: 'PWA', emoji: '📱', recommended: true },
    { id: 'desktop', label: 'Desktop', emoji: '🖥️' },
  ]},
  { id: 'mvp_backend', type: 'single_select', title: '¿Tienes backend existente?', required: true, options: [
    { id: 'none', label: 'Necesito todo desde cero', emoji: '🆕' },
    { id: 'partial', label: 'Tengo algo parcial', emoji: '🔧' },
    { id: 'api_ready', label: 'Tengo API lista', emoji: '✅' },
    { id: 'baas', label: 'Quiero usar BaaS (Supabase/Firebase)', emoji: '☁️', recommended: true },
  ]},
  { id: 'mvp_validation_timeline', type: 'single_select', title: '¿Timeline para validar tu idea?', required: true, options: [
    { id: '2_weeks', label: '2 semanas', emoji: '⚡' },
    { id: '1_month', label: '1 mes', emoji: '📅', recommended: true },
    { id: '2_months', label: '2 meses', emoji: '📆' },
    { id: 'flexible', label: 'Flexible', emoji: '🗓️' },
  ]},
];

export const FULL_APP_QUESTIONS: WizardQuestion[] = [
  { id: 'app_type', type: 'single_select', title: '¿Qué tipo de aplicación?', required: true, options: [
    { id: 'social', label: 'Social / Red', emoji: '👥' },
    { id: 'marketplace', label: 'Marketplace', emoji: '🛒' },
    { id: 'saas', label: 'SaaS', emoji: '☁️' },
    { id: 'utility', label: 'Utilidad', emoji: '🔧' },
    { id: 'fintech', label: 'Fintech', emoji: '💳' },
    { id: 'health', label: 'Salud / Bienestar', emoji: '❤️' },
    { id: 'education', label: 'Educación', emoji: '📚' },
    { id: 'other', label: 'Otro', emoji: '✨' },
  ]},
  { id: 'app_features', type: 'multi_select', title: '¿Funcionalidades principales?', subtitle: 'Selecciona todas las que apliquen', required: true, options: [
    { id: 'auth', label: 'Autenticación', emoji: '🔐' },
    { id: 'payments', label: 'Pagos', emoji: '💳' },
    { id: 'chat', label: 'Chat / Mensajería', emoji: '💬' },
    { id: 'notifications', label: 'Notificaciones Push', emoji: '🔔' },
    { id: 'maps', label: 'Mapas / Ubicación', emoji: '📍' },
    { id: 'analytics', label: 'Analytics', emoji: '📊' },
    { id: 'media', label: 'Media (foto/video)', emoji: '📸' },
    { id: 'search', label: 'Búsqueda avanzada', emoji: '🔍' },
  ]},
  { id: 'app_integrations', type: 'multi_select', title: '¿Integraciones necesarias?', required: false, options: [
    { id: 'stripe', label: 'Pasarela de pago', emoji: '💰' },
    { id: 'maps_api', label: 'Google Maps', emoji: '🗺️' },
    { id: 'analytics', label: 'Analytics (GA, Mixpanel)', emoji: '📈' },
    { id: 'email', label: 'Email (SendGrid, etc.)', emoji: '📧' },
    { id: 'social_auth', label: 'Login Social', emoji: '👤' },
    { id: 'storage', label: 'Cloud Storage', emoji: '☁️' },
  ]},
  { id: 'app_admin_panel', type: 'single_select', title: '¿Necesitas panel de administración?', required: true, options: [
    { id: 'yes_full', label: 'Sí, completo', emoji: '🖥️', description: 'CRUD, métricas, gestión' },
    { id: 'yes_basic', label: 'Sí, básico', emoji: '📋', description: 'Solo gestión esencial' },
    { id: 'no', label: 'No necesito', emoji: '❌' },
  ]},
  { id: 'app_scale', type: 'single_select', title: '¿Escalabilidad esperada?', required: true, options: [
    { id: 'small', label: 'Menos de 1K usuarios', emoji: '🌱' },
    { id: 'medium', label: '1K-10K usuarios', emoji: '🌿' },
    { id: 'large', label: '10K-100K usuarios', emoji: '🌳' },
    { id: 'massive', label: '100K+ usuarios', emoji: '🏔️' },
  ]},
  { id: 'app_branding', type: 'single_select', title: '¿Tienes branding/diseño definido?', required: true, options: [
    { id: 'complete', label: 'Branding completo', emoji: '✅' },
    { id: 'partial', label: 'Logo y colores', emoji: '🎨' },
    { id: 'none', label: 'Necesito todo', emoji: '🆕' },
  ]},
  { id: 'app_backend_pref', type: 'single_select', title: '¿Preferencia de backend?', required: true, options: [
    { id: 'supabase', label: 'Supabase', emoji: '⚡', recommended: true },
    { id: 'firebase', label: 'Firebase', emoji: '🔥' },
    { id: 'custom', label: 'Backend Custom', emoji: '🛠️' },
    { id: 'no_preference', label: 'Sin preferencia', emoji: '🤷' },
  ]},
  { id: 'app_native_pwa', type: 'single_select', title: '¿App nativa o PWA?', required: true, options: [
    { id: 'native', label: 'Nativa (App Store/Play Store)', emoji: '📱' },
    { id: 'pwa', label: 'PWA', emoji: '🌐', recommended: true },
    { id: 'both', label: 'Ambas', emoji: '🎯' },
    { id: 'undecided', label: 'No sé aún', emoji: '🤔' },
  ]},
];

export const LANDING_PAGE_QUESTIONS: WizardQuestion[] = [
  { id: 'landing_objective', type: 'single_select', title: '¿Objetivo principal de la landing?', required: true, options: [
    { id: 'leads', label: 'Captar leads', emoji: '📋' },
    { id: 'sell', label: 'Vender producto/servicio', emoji: '💰' },
    { id: 'inform', label: 'Informar', emoji: '📖' },
    { id: 'waitlist', label: 'Waitlist / Lanzamiento', emoji: '🚀' },
    { id: 'event', label: 'Registro a evento', emoji: '🎫' },
  ]},
  { id: 'landing_copy', type: 'single_select', title: '¿Tienes los textos definidos?', required: true, options: [
    { id: 'yes', label: 'Sí, todo listo', emoji: '✅' },
    { id: 'partial', label: 'Parcialmente', emoji: '📝' },
    { id: 'no', label: 'Necesito copywriting', emoji: '✍️' },
  ]},
  { id: 'landing_integrations', type: 'multi_select', title: '¿Qué integraciones necesitas?', required: false, options: [
    { id: 'form', label: 'Formulario de contacto', emoji: '📋' },
    { id: 'crm', label: 'CRM (HubSpot, etc.)', emoji: '💼' },
    { id: 'email', label: 'Email marketing', emoji: '📧' },
    { id: 'analytics', label: 'Google Analytics', emoji: '📊' },
    { id: 'payment', label: 'Pasarela de pago', emoji: '💳' },
    { id: 'chat', label: 'Chat en vivo', emoji: '💬' },
  ]},
  { id: 'landing_hosting', type: 'single_select', title: '¿Dominio y hosting?', required: true, options: [
    { id: 'have_both', label: 'Tengo dominio y hosting', emoji: '✅' },
    { id: 'have_domain', label: 'Solo tengo dominio', emoji: '🌐' },
    { id: 'need_all', label: 'Necesito todo', emoji: '🆕' },
  ]},
  { id: 'landing_sections', type: 'multi_select', title: '¿Qué secciones necesitas?', required: true, options: [
    { id: 'hero', label: 'Hero / Header', emoji: '🏠' },
    { id: 'benefits', label: 'Beneficios', emoji: '✨' },
    { id: 'testimonials', label: 'Testimonios', emoji: '💬' },
    { id: 'pricing', label: 'Precios', emoji: '💰' },
    { id: 'faq', label: 'FAQ', emoji: '❓' },
    { id: 'cta', label: 'CTA / Formulario', emoji: '🎯' },
    { id: 'gallery', label: 'Galería', emoji: '📸' },
  ]},
  { id: 'landing_seo', type: 'single_select', title: '¿Necesitas SEO optimizado?', required: true, options: [
    { id: 'yes', label: 'Sí, es importante', emoji: '🔍' },
    { id: 'basic', label: 'Solo lo básico', emoji: '📋' },
    { id: 'no', label: 'No, es tráfico pagado', emoji: '💰' },
  ]},
];

export const ECOMMERCE_QUESTIONS: WizardQuestion[] = [
  { id: 'ecom_product_count', type: 'single_select', title: '¿Cuántos productos aproximadamente?', required: true, options: [
    { id: 'small', label: '1-20 productos', emoji: '📦' },
    { id: 'medium', label: '20-100 productos', emoji: '🏪' },
    { id: 'large', label: '100-500 productos', emoji: '🏬' },
    { id: 'massive', label: '500+ productos', emoji: '🏭' },
  ]},
  { id: 'ecom_variants', type: 'single_select', title: '¿Tus productos tienen variantes?', required: true, options: [
    { id: 'none', label: 'No, productos simples', emoji: '📦' },
    { id: 'few', label: 'Sí, pocas (talla, color)', emoji: '🎨' },
    { id: 'many', label: 'Sí, muchas combinaciones', emoji: '🔢' },
  ]},
  { id: 'ecom_payment', type: 'multi_select', title: '¿Pasarelas de pago?', required: true, options: [
    { id: 'stripe', label: 'Stripe', emoji: '💳' },
    { id: 'paypal', label: 'PayPal', emoji: '🅿️' },
    { id: 'mercadopago', label: 'MercadoPago', emoji: '💚' },
    { id: 'bank_transfer', label: 'Transferencia', emoji: '🏦' },
    { id: 'crypto', label: 'Cripto', emoji: '₿' },
    { id: 'undecided', label: 'No sé aún', emoji: '🤔' },
  ]},
  { id: 'ecom_inventory', type: 'single_select', title: '¿Necesitas gestión de inventario?', required: true, options: [
    { id: 'yes', label: 'Sí, completo', emoji: '📊' },
    { id: 'basic', label: 'Básico (stock sí/no)', emoji: '📋' },
    { id: 'no', label: 'No aplica (digital)', emoji: '💻' },
  ]},
  { id: 'ecom_shipping', type: 'single_select', title: '¿Integraciones logísticas?', required: true, options: [
    { id: 'local', label: 'Envío local propio', emoji: '🚚' },
    { id: 'national', label: 'Courier nacional', emoji: '📦' },
    { id: 'international', label: 'Internacional', emoji: '🌍' },
    { id: 'digital', label: 'Solo digital', emoji: '💻' },
    { id: 'undecided', label: 'No sé aún', emoji: '🤔' },
  ]},
  { id: 'ecom_features', type: 'multi_select', title: '¿Funcionalidades extra?', required: false, options: [
    { id: 'coupons', label: 'Cupones/Descuentos', emoji: '🎟️' },
    { id: 'loyalty', label: 'Programa de lealtad', emoji: '⭐' },
    { id: 'reviews', label: 'Reseñas de productos', emoji: '💬' },
    { id: 'wishlist', label: 'Lista de deseos', emoji: '❤️' },
    { id: 'multi_currency', label: 'Multi-moneda', emoji: '💱' },
    { id: 'multi_language', label: 'Multi-idioma', emoji: '🌐' },
  ]},
  { id: 'ecom_platform', type: 'single_select', title: '¿Plataforma preferida?', required: true, options: [
    { id: 'shopify', label: 'Shopify', emoji: '🛍️' },
    { id: 'woocommerce', label: 'WooCommerce', emoji: '🔌' },
    { id: 'custom', label: 'Custom (React/Next)', emoji: '⚡' },
    { id: 'no_preference', label: 'Sin preferencia', emoji: '🤷' },
  ]},
  { id: 'ecom_marketing', type: 'multi_select', title: '¿Integraciones de marketing?', required: false, options: [
    { id: 'ga', label: 'Google Analytics', emoji: '📊' },
    { id: 'pixel', label: 'Meta Pixel', emoji: '📱' },
    { id: 'email', label: 'Email Marketing', emoji: '📧' },
    { id: 'seo', label: 'SEO', emoji: '🔍' },
  ]},
];

export const REDESIGN_QUESTIONS: WizardQuestion[] = [
  { id: 'redesign_url', type: 'text', title: '¿URL o acceso al proyecto actual?', placeholder: 'https://tuproyecto.com', required: true },
  { id: 'redesign_problems', type: 'textarea', title: '¿Qué problemas tiene actualmente?', placeholder: 'Describe los problemas principales: lento, diseño viejo, no convierte...', required: true, validation: { minLength: 30, maxLength: 500 } },
  { id: 'redesign_keep', type: 'textarea', title: '¿Qué debe mantenerse vs cambiar?', placeholder: 'Ej: Mantener estructura de navegación, cambiar todo el diseño visual...', required: true, validation: { minLength: 20, maxLength: 400 } },
  { id: 'redesign_migration', type: 'single_select', title: '¿Migración de datos necesaria?', required: true, options: [
    { id: 'none', label: 'No, empezar limpio', emoji: '🆕' },
    { id: 'partial', label: 'Solo algunos datos', emoji: '📋' },
    { id: 'full', label: 'Migración completa', emoji: '📦' },
    { id: 'unsure', label: 'No estoy seguro', emoji: '🤔' },
  ]},
  { id: 'redesign_stack', type: 'single_select', title: '¿Nuevo stack tecnológico o mantener?', required: true, options: [
    { id: 'keep', label: 'Mantener el actual', emoji: '🔧' },
    { id: 'modernize', label: 'Modernizar', emoji: '⚡' },
    { id: 'full_change', label: 'Cambio completo', emoji: '🔄' },
    { id: 'unsure', label: 'Necesito asesoría', emoji: '🤔' },
  ]},
  { id: 'redesign_timeline', type: 'single_select', title: '¿Timeline crítico?', required: true, options: [
    { id: 'urgent', label: 'Urgente (2 semanas)', emoji: '🚨' },
    { id: 'normal', label: 'Normal (1-2 meses)', emoji: '📅' },
    { id: 'flexible', label: 'Flexible', emoji: '🗓️' },
  ]},
];

export const INTEGRATION_QUESTIONS: WizardQuestion[] = [
  { id: 'integration_systems', type: 'textarea', title: '¿Qué sistemas necesitas conectar?', placeholder: 'Ej: Conectar mi CRM (HubSpot) con mi tienda (Shopify) y mi email (Mailchimp)...', required: true, validation: { minLength: 20, maxLength: 400 } },
  { id: 'integration_apis', type: 'single_select', title: '¿APIs disponibles o necesitas scraping?', required: true, options: [
    { id: 'apis_ready', label: 'APIs documentadas', emoji: '✅' },
    { id: 'partial', label: 'Algunas APIs, otras no', emoji: '📋' },
    { id: 'no_apis', label: 'Sin APIs, necesito scraping', emoji: '🕷️' },
    { id: 'unsure', label: 'No estoy seguro', emoji: '🤔' },
  ]},
  { id: 'integration_docs', type: 'single_select', title: '¿Documentación existente?', required: true, options: [
    { id: 'complete', label: 'Documentación completa', emoji: '📚' },
    { id: 'partial', label: 'Documentación parcial', emoji: '📝' },
    { id: 'none', label: 'Sin documentación', emoji: '❌' },
  ]},
  { id: 'integration_frequency', type: 'single_select', title: '¿Frecuencia de sincronización?', required: true, options: [
    { id: 'realtime', label: 'Tiempo real', emoji: '⚡' },
    { id: 'hourly', label: 'Cada hora', emoji: '🕐' },
    { id: 'daily', label: 'Diario', emoji: '📅' },
    { id: 'on_demand', label: 'Bajo demanda', emoji: '🔘' },
  ]},
  { id: 'integration_volume', type: 'single_select', title: '¿Volumen de datos?', required: true, options: [
    { id: 'low', label: 'Bajo (<1K registros/día)', emoji: '📊' },
    { id: 'medium', label: 'Medio (1K-10K)', emoji: '📈' },
    { id: 'high', label: 'Alto (10K-100K)', emoji: '🔥' },
    { id: 'massive', label: 'Masivo (100K+)', emoji: '🏔️' },
  ]},
];

// ============================================================================
// POST-PRODUCTION GOAL QUESTIONS
// ============================================================================

export const SOCIAL_VIDEO_QUESTIONS: WizardQuestion[] = [
  { id: 'social_platform', type: 'single_select', title: '¿Plataforma principal?', required: true, options: [
    { id: 'tiktok', label: 'TikTok', emoji: '🎵', recommended: true },
    { id: 'instagram', label: 'Instagram Reels', emoji: '📸' },
    { id: 'youtube_shorts', label: 'YouTube Shorts', emoji: '▶️' },
    { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  ]},
  { id: 'social_format', type: 'single_select', title: '¿Formato?', required: true, options: [
    { id: 'vertical', label: 'Vertical (9:16)', emoji: '📱', description: 'Reels, TikTok, Shorts', recommended: true },
    { id: 'square', label: 'Cuadrado (1:1)', emoji: '⬛', description: 'Feed Instagram, Facebook' },
    { id: 'horizontal', label: 'Horizontal (16:9)', emoji: '🖥️', description: 'YouTube, presentaciones' },
  ]},
  { id: 'social_duration', type: 'single_select', title: '¿Duración objetivo?', required: true, options: [
    { id: '15s', label: '15 segundos', emoji: '⚡' },
    { id: '30s', label: '30 segundos', emoji: '📏', recommended: true },
    { id: '60s', label: '60 segundos', emoji: '📐' },
    { id: '90s_plus', label: '90 segundos+', emoji: '🎬' },
  ]},
  { id: 'social_footage', type: 'single_select', title: '¿Tienes material grabado o necesitas stock?', required: true, options: [
    { id: 'own_footage', label: 'Tengo material propio', emoji: '✅' },
    { id: 'need_stock', label: 'Necesito stock/b-roll', emoji: '🎥' },
    { id: 'mix', label: 'Mix de ambos', emoji: '🔄' },
    { id: 'record', label: 'Necesito grabación nueva', emoji: '📹' },
  ]},
  { id: 'social_style', type: 'single_select', title: '¿Estilo de edición?', required: true, options: [
    { id: 'dynamic', label: 'Dinámico / Trendy', emoji: '🔥', description: 'Efectos populares, transiciones rápidas' },
    { id: 'minimal', label: 'Minimalista', emoji: '✨', description: 'Elegante, sin excesos' },
    { id: 'viral', label: 'Tendencia viral', emoji: '📈', description: 'Formato trending del momento' },
    { id: 'educational', label: 'Educativo', emoji: '📚', description: 'Paso a paso, tutorial' },
  ]},
  { id: 'social_subtitles', type: 'single_select', title: '¿Subtítulos/captions incluidos?', required: true, options: [
    { id: 'yes_animated', label: 'Sí, animados/estilizados', emoji: '✨', recommended: true },
    { id: 'yes_simple', label: 'Sí, simples', emoji: '📝' },
    { id: 'no', label: 'No necesito', emoji: '❌' },
  ]},
];

export const CORPORATE_VIDEO_QUESTIONS: WizardQuestion[] = [
  { id: 'corp_purpose', type: 'single_select', title: '¿Propósito del video?', required: true, options: [
    { id: 'company_intro', label: 'Presentación empresa', emoji: '🏢', description: 'Quiénes somos' },
    { id: 'onboarding', label: 'Onboarding', emoji: '👋', description: 'Bienvenida nuevos miembros' },
    { id: 'investors', label: 'Inversionistas / Pitch', emoji: '💼', description: 'Presentación para inversores' },
    { id: 'event', label: 'Evento', emoji: '🎤', description: 'Apertura, cierre o cobertura' },
    { id: 'internal', label: 'Comunicación interna', emoji: '📣', description: 'Para equipo o colaboradores' },
  ]},
  { id: 'corp_duration', type: 'single_select', title: '¿Duración estimada?', required: true, options: [
    { id: 'short', label: '30 seg - 1 min', emoji: '⚡' },
    { id: 'medium', label: '1-3 minutos', emoji: '📏', recommended: true },
    { id: 'long', label: '3-10 minutos', emoji: '📐' },
    { id: 'extended', label: '10+ minutos', emoji: '🎬' },
  ]},
  { id: 'corp_script', type: 'single_select', title: '¿Tienes guion o necesitas ayuda con narrativa?', required: true, options: [
    { id: 'have_it', label: 'Ya tengo guión completo', emoji: '📝' },
    { id: 'outline', label: 'Tengo idea general, necesito pulir', emoji: '📋' },
    { id: 'need_it', label: 'Necesito guión desde cero', emoji: '✍️' },
  ]},
  { id: 'corp_footage', type: 'single_select', title: '¿Material disponible?', required: true, options: [
    { id: 'interviews', label: 'Entrevistas grabadas', emoji: '🎙️' },
    { id: 'broll', label: 'B-roll y material visual', emoji: '🎥' },
    { id: 'graphics', label: 'Gráficos y presentaciones', emoji: '📊' },
    { id: 'all', label: 'Todo lo anterior', emoji: '✅' },
    { id: 'none', label: 'Sin material, necesito todo', emoji: '🆕' },
  ]},
  { id: 'corp_music', type: 'single_select', title: '¿Música con licencia o necesitas?', required: true, options: [
    { id: 'licensed', label: 'Ya tengo música con licencia', emoji: '✅' },
    { id: 'need_licensed', label: 'Necesito música con licencia', emoji: '🎵' },
    { id: 'custom', label: 'Composición original', emoji: '🎼' },
    { id: 'no_preference', label: 'Sin preferencia específica', emoji: '🤷' },
  ]},
  { id: 'corp_languages', type: 'single_select', title: '¿Idiomas/subtítulos?', required: true, options: [
    { id: 'spanish_only', label: 'Solo español', emoji: '🇪🇸' },
    { id: 'english_only', label: 'Solo inglés', emoji: '🇺🇸' },
    { id: 'bilingual', label: 'Bilingüe (ES/EN)', emoji: '🌐' },
    { id: 'multi', label: 'Múltiples idiomas', emoji: '🗣️' },
  ]},
  { id: 'corp_deadline', type: 'single_select', title: '¿Fecha límite de entrega?', required: true, options: [
    { id: 'urgent', label: 'Menos de 1 semana', emoji: '🚨' },
    { id: 'standard', label: '1-2 semanas', emoji: '📅', recommended: true },
    { id: 'relaxed', label: '2-4 semanas', emoji: '📆' },
    { id: 'flexible', label: 'Sin fecha fija', emoji: '🤷' },
  ]},
];

export const COMMERCIAL_QUESTIONS: WizardQuestion[] = [
  { id: 'commercial_placement', type: 'multi_select', title: '¿Dónde se pautará?', subtitle: 'Selecciona los canales', required: true, validation: { max: 4 }, options: [
    { id: 'tv', label: 'TV / Streaming', emoji: '📺' },
    { id: 'digital', label: 'Digital (web/apps)', emoji: '💻' },
    { id: 'social', label: 'Redes sociales', emoji: '📱', recommended: true },
    { id: 'cinema', label: 'Cine', emoji: '🎬' },
  ]},
  { id: 'commercial_duration', type: 'single_select', title: '¿Duración?', required: true, options: [
    { id: '6s', label: '6 segundos (bumper)', emoji: '⚡' },
    { id: '15s', label: '15 segundos', emoji: '📏' },
    { id: '30s', label: '30 segundos', emoji: '📐', recommended: true },
    { id: '60s', label: '60 segundos', emoji: '🎬' },
  ]},
  { id: 'commercial_concept', type: 'single_select', title: '¿Concepto creativo definido?', required: true, options: [
    { id: 'ready', label: 'Sí, tengo concepto completo', emoji: '✅' },
    { id: 'partial', label: 'Tengo idea general', emoji: '📋' },
    { id: 'need', label: 'Necesito desarrollo creativo', emoji: '💡' },
  ]},
  { id: 'commercial_product', type: 'textarea', title: '¿Producto/servicio a destacar?', placeholder: 'Describe brevemente el producto o servicio protagonista del anuncio...', required: true, validation: { minLength: 10, maxLength: 300 } },
  { id: 'commercial_cta', type: 'textarea', title: '¿Call to action principal?', placeholder: 'Ej: "Descarga gratis", "Compra ahora con 20% OFF", "Visita nuestra tienda"...', required: true, validation: { minLength: 5, maxLength: 200 } },
  { id: 'commercial_tone', type: 'single_select', title: '¿Tono del comercial?', required: true, options: [
    { id: 'emotional', label: 'Emocional', emoji: '💛', description: 'Conecta con sentimientos' },
    { id: 'funny', label: 'Divertido', emoji: '😄', description: 'Humor y entretenimiento' },
    { id: 'informative', label: 'Informativo', emoji: '📊', description: 'Datos y beneficios claros' },
    { id: 'premium', label: 'Premium', emoji: '✨', description: 'Lujo, aspiracional' },
  ]},
  { id: 'commercial_restrictions', type: 'textarea', title: '¿Restricciones de marca?', subtitle: 'Colores, palabras, elementos que NO deben usarse', placeholder: 'Ej: No usar color rojo, no mencionar precio, evitar comparaciones directas...', required: false, validation: { maxLength: 300 } },
  { id: 'commercial_versions', type: 'single_select', title: '¿Versiones necesarias?', subtitle: 'Diferentes duraciones o formatos', required: true, options: [
    { id: 'single', label: 'Una sola versión', emoji: '1️⃣' },
    { id: 'duration_cuts', label: 'Múltiples duraciones (6s, 15s, 30s)', emoji: '✂️', recommended: true },
    { id: 'format_variants', label: 'Múltiples formatos (vertical + horizontal)', emoji: '🔄' },
    { id: 'full_package', label: 'Paquete completo (duraciones + formatos)', emoji: '📦' },
  ]},
];

export const DOCUMENTARY_QUESTIONS: WizardQuestion[] = [
  { id: 'doc_theme', type: 'textarea', title: '¿Tema central?', placeholder: 'Describe el tema principal, la historia o el caso que quieres documentar...', required: true, validation: { minLength: 30, maxLength: 400 } },
  { id: 'doc_duration', type: 'single_select', title: '¿Duración estimada?', required: true, options: [
    { id: 'short', label: '5-15 minutos', emoji: '📏', description: 'Mini-documental' },
    { id: 'medium', label: '15-30 minutos', emoji: '📐', description: 'Documental medio' },
    { id: 'feature', label: '30-60 minutos', emoji: '🎬', description: 'Largometraje documental' },
    { id: 'series', label: 'Serie (múltiples episodios)', emoji: '📺' },
  ]},
  { id: 'doc_interviews', type: 'single_select', title: '¿Entrevistas grabadas o por grabar?', required: true, options: [
    { id: 'recorded', label: 'Ya tengo entrevistas grabadas', emoji: '✅' },
    { id: 'to_record', label: 'Necesito grabar entrevistas', emoji: '🎙️' },
    { id: 'mix', label: 'Algunas grabadas, otras pendientes', emoji: '🔄' },
    { id: 'no_interviews', label: 'Sin entrevistas, solo narración', emoji: '🗣️' },
  ]},
  { id: 'doc_style', type: 'single_select', title: '¿Estilo narrativo?', required: true, options: [
    { id: 'journalistic', label: 'Periodístico', emoji: '📰', description: 'Objetivo, investigativo' },
    { id: 'emotional', label: 'Emotivo', emoji: '💛', description: 'Conecta con emociones' },
    { id: 'inspirational', label: 'Inspiracional', emoji: '🌟', description: 'Motiva y eleva' },
    { id: 'educational', label: 'Educativo', emoji: '📚', description: 'Enseña y explica' },
  ]},
  { id: 'doc_archive', type: 'single_select', title: '¿Archivo/material histórico disponible?', required: true, options: [
    { id: 'have_archive', label: 'Sí, tengo material de archivo', emoji: '📁' },
    { id: 'need_research', label: 'Necesito buscar/licenciar', emoji: '🔍' },
    { id: 'no_archive', label: 'No aplica', emoji: '❌' },
  ]},
  { id: 'doc_narration', type: 'single_select', title: '¿Narración en off?', required: true, options: [
    { id: 'yes_professional', label: 'Sí, con locutor profesional', emoji: '🎙️' },
    { id: 'yes_own', label: 'Sí, con voz propia/del protagonista', emoji: '👤' },
    { id: 'no', label: 'No, solo entrevistas y ambientes', emoji: '🎥' },
  ]},
];

export const ANIMATION_QUESTIONS: WizardQuestion[] = [
  { id: 'anim_type', type: 'single_select', title: '¿Tipo de animación?', required: true, options: [
    { id: 'motion', label: 'Motion Graphics', emoji: '✨', description: 'Gráficos en movimiento', recommended: true },
    { id: '2d_character', label: '2D Character', emoji: '🎨', description: 'Personajes animados 2D' },
    { id: '3d', label: 'Animación 3D', emoji: '🧊', description: 'Modelado y animación 3D' },
    { id: 'whiteboard', label: 'Whiteboard', emoji: '📝', description: 'Dibujo en pizarra' },
    { id: 'isometric', label: 'Isométrico', emoji: '🔷', description: 'Perspectiva isométrica' },
  ]},
  { id: 'anim_duration', type: 'single_select', title: '¿Duración?', required: true, options: [
    { id: 'micro', label: '5-15 segundos', emoji: '⚡', description: 'Logo, bumper, transición' },
    { id: 'short', label: '15-60 segundos', emoji: '📏', description: 'Intro, explainer corto' },
    { id: 'medium', label: '1-3 minutos', emoji: '📐', description: 'Explainer completo', recommended: true },
    { id: 'long', label: '3+ minutos', emoji: '🎬', description: 'Video largo animado' },
  ]},
  { id: 'anim_script', type: 'single_select', title: '¿Tienes guion/storyboard?', required: true, options: [
    { id: 'storyboard', label: 'Guión + Storyboard listo', emoji: '📐' },
    { id: 'script_only', label: 'Solo guión escrito', emoji: '📝' },
    { id: 'outline', label: 'Tengo idea general', emoji: '📋' },
    { id: 'need', label: 'Necesito todo desde cero', emoji: '✍️' },
  ]},
  { id: 'anim_assets', type: 'single_select', title: '¿Assets de marca disponibles?', required: true, options: [
    { id: 'brand_kit', label: 'Brand kit completo', emoji: '✅', description: 'Logo, colores, tipografías, iconos' },
    { id: 'partial', label: 'Solo logo y colores', emoji: '🎨' },
    { id: 'none', label: 'Crear todo desde cero', emoji: '🆕' },
  ]},
  { id: 'anim_style_ref', type: 'textarea', title: '¿Estilo visual de referencia?', subtitle: 'Describe o menciona ejemplos que te gusten', placeholder: 'Ej: "Estilo similar a Kurzgesagt", "Colores neón sobre fondo oscuro", "Flat design corporativo"...', required: true, validation: { minLength: 10, maxLength: 300 } },
  { id: 'anim_voiceover', type: 'single_select', title: '¿Locución incluida?', required: true, options: [
    { id: 'yes_professional', label: 'Sí, locutor profesional', emoji: '🎙️' },
    { id: 'yes_own', label: 'Sí, tengo mi propia grabación', emoji: '👤' },
    { id: 'music_only', label: 'Solo música', emoji: '🎵' },
    { id: 'no_audio', label: 'Sin audio / mudo', emoji: '🔇' },
  ]},
  { id: 'anim_complexity', type: 'single_select', title: '¿Complejidad de animación?', required: true, options: [
    { id: 'simple', label: 'Simple', emoji: '🌱', description: 'Transiciones, texto animado, íconos' },
    { id: 'moderate', label: 'Moderada', emoji: '🌿', description: 'Personajes simples, escenas', recommended: true },
    { id: 'complex', label: 'Compleja', emoji: '🌳', description: 'Personajes detallados, múltiples escenas' },
    { id: 'premium', label: 'Premium', emoji: '💎', description: 'Animación cinematográfica, 3D detallado' },
  ]},
];

export const PODCAST_QUESTIONS: WizardQuestion[] = [
  { id: 'podcast_format', type: 'single_select', title: '¿Formato del podcast?', required: true, options: [
    { id: 'solo', label: 'Solo (monólogo)', emoji: '🎙️' },
    { id: 'interview', label: 'Entrevista', emoji: '👥', recommended: true },
    { id: 'panel', label: 'Panel (varios hosts)', emoji: '🗣️' },
    { id: 'storytelling', label: 'Narrativo', emoji: '📖' },
  ]},
  { id: 'podcast_duration', type: 'single_select', title: '¿Duración por episodio?', required: true, options: [
    { id: 'micro', label: '5-15 minutos', emoji: '⚡' },
    { id: 'short', label: '15-30 minutos', emoji: '📏' },
    { id: 'standard', label: '30-60 minutos', emoji: '📐', recommended: true },
    { id: 'long', label: '60+ minutos', emoji: '🎬' },
  ]},
  { id: 'podcast_editing_level', type: 'single_select', title: '¿Edición básica o producción completa?', required: true, options: [
    { id: 'basic', label: 'Edición básica', emoji: '✂️', description: 'Cortes, limpieza de silencios' },
    { id: 'standard', label: 'Producción estándar', emoji: '🎛️', description: 'Edición + mezcla + intro/outro', recommended: true },
    { id: 'full', label: 'Producción completa', emoji: '🎚️', description: 'Todo + SFX + música + mastering' },
  ]},
  { id: 'podcast_intro_outro', type: 'single_select', title: '¿Intro/outro necesarios?', required: true, options: [
    { id: 'have_it', label: 'Ya tengo intro/outro', emoji: '✅' },
    { id: 'need_it', label: 'Necesito crear intro/outro', emoji: '🎵' },
    { id: 'no', label: 'No necesito', emoji: '❌' },
  ]},
  { id: 'podcast_audio_cleanup', type: 'single_select', title: '¿Limpieza de audio requerida?', required: true, options: [
    { id: 'clean', label: 'Audio ya está limpio', emoji: '✅' },
    { id: 'light', label: 'Leve ruido de fondo', emoji: '🔉' },
    { id: 'heavy', label: 'Mucho ruido, necesita trabajo', emoji: '🔊' },
    { id: 'unknown', label: 'No estoy seguro', emoji: '🤷' },
  ]},
];

// ============================================================================
// EDUCATION & TRAINING GOAL QUESTIONS
// ============================================================================

export const ONLINE_COURSE_QUESTIONS: WizardQuestion[] = [
  { id: 'course_topic', type: 'textarea', title: '¿Tema del curso?', placeholder: 'Describe el tema principal y subtemas...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'course_level', type: 'single_select', title: '¿Nivel del curso?', required: true, options: [
    { id: 'beginner', label: 'Principiante', emoji: '🌱' },
    { id: 'intermediate', label: 'Intermedio', emoji: '🌿' },
    { id: 'advanced', label: 'Avanzado', emoji: '🌳' },
    { id: 'all_levels', label: 'Todos los niveles', emoji: '🎯' },
  ]},
  { id: 'course_duration', type: 'single_select', title: '¿Duración total estimada?', required: true, options: [
    { id: 'mini', label: '1-3 horas', emoji: '⚡', description: 'Mini-curso' },
    { id: 'standard', label: '3-10 horas', emoji: '📏', description: 'Curso estándar', recommended: true },
    { id: 'comprehensive', label: '10-30 horas', emoji: '📐', description: 'Curso completo' },
    { id: 'bootcamp', label: '30+ horas', emoji: '🏋️', description: 'Bootcamp/Programa' },
  ]},
  { id: 'course_modules', type: 'single_select', title: '¿Número de módulos?', required: true, options: [
    { id: 'few', label: '3-5 módulos', emoji: '📚' },
    { id: 'standard', label: '5-10 módulos', emoji: '📖', recommended: true },
    { id: 'many', label: '10-20 módulos', emoji: '📕' },
    { id: 'extensive', label: '20+ módulos', emoji: '📗' },
  ]},
  { id: 'course_format', type: 'single_select', title: '¿Formato principal?', required: true, options: [
    { id: 'recorded_video', label: 'Video grabado', emoji: '🎥' },
    { id: 'live_video', label: 'Video en vivo', emoji: '📡' },
    { id: 'mixed', label: 'Mixto (grabado + vivo)', emoji: '🔄', recommended: true },
    { id: 'text_only', label: 'Solo texto/lectura', emoji: '📖' },
  ]},
  { id: 'course_certification', type: 'single_select', title: '¿Incluye certificación?', required: true, options: [
    { id: 'yes', label: 'Sí, con certificado', emoji: '🏆' },
    { id: 'optional', label: 'Opcional (pago extra)', emoji: '💰' },
    { id: 'no', label: 'No incluye', emoji: '❌' },
  ]},
  { id: 'course_platform', type: 'single_select', title: '¿Plataforma?', required: true, options: [
    { id: 'own', label: 'Mi propia web', emoji: '🌐' },
    { id: 'udemy', label: 'Udemy', emoji: '📚' },
    { id: 'teachable', label: 'Teachable/Thinkific', emoji: '🎓' },
    { id: 'hotmart', label: 'Hotmart', emoji: '🔥' },
    { id: 'undecided', label: 'No decidido', emoji: '🤔' },
  ]},
  { id: 'course_resources', type: 'multi_select', title: '¿Recursos complementarios?', required: false, options: [
    { id: 'pdfs', label: 'PDFs/Guías', emoji: '📄' },
    { id: 'templates', label: 'Plantillas', emoji: '📋' },
    { id: 'quizzes', label: 'Quizzes', emoji: '✏️' },
    { id: 'assignments', label: 'Tareas prácticas', emoji: '📝' },
    { id: 'community', label: 'Comunidad/Foro', emoji: '👥' },
  ]},
];

export const WORKSHOP_QUESTIONS: WizardQuestion[] = [
  { id: 'workshop_topic', type: 'textarea', title: '¿Tema del workshop?', placeholder: 'Describe el tema y los objetivos de aprendizaje...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'workshop_duration', type: 'single_select', title: '¿Duración?', required: true, options: [
    { id: 'half_day', label: '2-4 horas', emoji: '⏰' },
    { id: 'full_day', label: '6-8 horas', emoji: '📅' },
    { id: 'multi_day', label: 'Varios días', emoji: '📆' },
    { id: 'weekly', label: 'Sesiones semanales', emoji: '🔄' },
  ]},
  { id: 'workshop_modality', type: 'single_select', title: '¿Presencial o virtual?', required: true, options: [
    { id: 'in_person', label: 'Presencial', emoji: '🏢' },
    { id: 'virtual', label: 'Virtual (Zoom, etc.)', emoji: '💻' },
    { id: 'hybrid', label: 'Híbrido', emoji: '🔄' },
  ]},
  { id: 'workshop_participants', type: 'single_select', title: '¿Número de participantes?', required: true, options: [
    { id: 'small', label: '5-15 personas', emoji: '👥' },
    { id: 'medium', label: '15-50 personas', emoji: '🏫' },
    { id: 'large', label: '50-200 personas', emoji: '🏟️' },
    { id: 'massive', label: '200+ personas', emoji: '🌍' },
  ]},
  { id: 'workshop_materials', type: 'multi_select', title: '¿Material necesario?', required: true, options: [
    { id: 'presentation', label: 'Presentación', emoji: '📊' },
    { id: 'workbook', label: 'Workbook/Guía', emoji: '📓' },
    { id: 'exercises', label: 'Ejercicios prácticos', emoji: '✏️' },
    { id: 'recording', label: 'Grabación', emoji: '🎥' },
    { id: 'certificate', label: 'Certificado', emoji: '🏆' },
  ]},
  { id: 'workshop_outcome', type: 'textarea', title: '¿Resultado tangible para el participante?', placeholder: 'Ej: Los participantes saldrán con un plan de marketing digital listo...', required: true, validation: { minLength: 20, maxLength: 300 } },
];

export const WEBINAR_QUESTIONS: WizardQuestion[] = [
  { id: 'webinar_objective', type: 'textarea', title: '¿Objetivo del webinar?', placeholder: 'Describe el objetivo principal y el valor que entregarás...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'webinar_duration', type: 'single_select', title: '¿Duración?', required: true, options: [
    { id: 'short', label: '30-45 minutos', emoji: '⏰' },
    { id: 'standard', label: '45-90 minutos', emoji: '📏', recommended: true },
    { id: 'long', label: '90+ minutos', emoji: '📐' },
  ]},
  { id: 'webinar_interaction', type: 'multi_select', title: '¿Tipo de interacción?', required: true, options: [
    { id: 'qa', label: 'Q&A', emoji: '❓' },
    { id: 'polls', label: 'Encuestas', emoji: '📊' },
    { id: 'breakout', label: 'Breakout rooms', emoji: '👥' },
    { id: 'chat', label: 'Chat en vivo', emoji: '💬' },
    { id: 'none', label: 'Solo presentación', emoji: '📺' },
  ]},
  { id: 'webinar_recording', type: 'single_select', title: '¿Necesitas grabación?', required: true, options: [
    { id: 'yes_edited', label: 'Sí, editada', emoji: '🎬' },
    { id: 'yes_raw', label: 'Sí, sin editar', emoji: '📹' },
    { id: 'no', label: 'No', emoji: '❌' },
  ]},
  { id: 'webinar_platform', type: 'single_select', title: '¿Plataforma?', required: true, options: [
    { id: 'zoom', label: 'Zoom', emoji: '📹' },
    { id: 'meet', label: 'Google Meet', emoji: '🎥' },
    { id: 'teams', label: 'Microsoft Teams', emoji: '💼' },
    { id: 'youtube_live', label: 'YouTube Live', emoji: '▶️' },
    { id: 'custom', label: 'Plataforma propia', emoji: '🌐' },
  ]},
  { id: 'webinar_offer', type: 'single_select', title: '¿Oferta al final del webinar?', required: true, options: [
    { id: 'product', label: 'Venta de producto/servicio', emoji: '💰' },
    { id: 'lead_magnet', label: 'Lead magnet / recurso gratis', emoji: '🎁' },
    { id: 'consultation', label: 'Consulta gratuita', emoji: '📞' },
    { id: 'none', label: 'Sin oferta (solo valor)', emoji: '🎓' },
  ]},
];

export const LEARNING_MATERIALS_QUESTIONS: WizardQuestion[] = [
  { id: 'material_type', type: 'multi_select', title: '¿Tipo de material?', required: true, options: [
    { id: 'pdf', label: 'PDF / Ebook', emoji: '📄' },
    { id: 'video', label: 'Videos educativos', emoji: '🎥' },
    { id: 'infographic', label: 'Infografías', emoji: '📊' },
    { id: 'slides', label: 'Presentaciones', emoji: '📑' },
    { id: 'exercises', label: 'Ejercicios/Workbooks', emoji: '✏️' },
    { id: 'interactive', label: 'Material interactivo', emoji: '🖱️' },
  ]},
  { id: 'material_purpose', type: 'textarea', title: '¿Propósito del material?', placeholder: 'Describe el propósito y a quién va dirigido...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'material_length', type: 'single_select', title: '¿Extensión del material?', required: true, options: [
    { id: 'short', label: 'Breve (1-5 páginas)', emoji: '📄' },
    { id: 'medium', label: 'Medio (5-20 páginas)', emoji: '📑', recommended: true },
    { id: 'long', label: 'Extenso (20-50 páginas)', emoji: '📚' },
    { id: 'comprehensive', label: 'Completo (50+ páginas)', emoji: '📖' },
  ]},
  { id: 'material_design', type: 'single_select', title: '¿Nivel de diseño?', required: true, options: [
    { id: 'full', label: 'Diseño completo con mi marca', emoji: '🎨' },
    { id: 'minimal', label: 'Solo logo', emoji: '📎' },
    { id: 'white_label', label: 'White label', emoji: '⬜' },
    { id: 'template', label: 'Usar plantilla existente', emoji: '📋' },
  ]},
  { id: 'material_delivery', type: 'single_select', title: '¿Formato de entrega?', required: true, options: [
    { id: 'download', label: 'Descargable', emoji: '⬇️' },
    { id: 'online', label: 'Online / Web', emoji: '🌐' },
    { id: 'print', label: 'Impreso', emoji: '🖨️' },
    { id: 'mixed', label: 'Múltiples formatos', emoji: '🔄' },
  ]},
];

export const COACHING_PROGRAM_QUESTIONS: WizardQuestion[] = [
  { id: 'coaching_type', type: 'single_select', title: '¿Individual o grupal?', required: true, options: [
    { id: 'individual', label: 'Individual (1:1)', emoji: '👤' },
    { id: 'small_group', label: 'Grupo pequeño (2-5)', emoji: '👥' },
    { id: 'group', label: 'Grupal (6-20)', emoji: '🏫' },
    { id: 'mixed', label: 'Mixto (individual + grupal)', emoji: '🔄' },
  ]},
  { id: 'coaching_duration', type: 'single_select', title: '¿Duración del programa?', required: true, options: [
    { id: 'short', label: '1-4 semanas', emoji: '📅' },
    { id: 'medium', label: '1-3 meses', emoji: '📆', recommended: true },
    { id: 'long', label: '3-6 meses', emoji: '🗓️' },
    { id: 'ongoing', label: '6+ meses / continuo', emoji: '♾️' },
  ]},
  { id: 'coaching_frequency', type: 'single_select', title: '¿Frecuencia de sesiones?', required: true, options: [
    { id: 'weekly', label: 'Semanal', emoji: '📅', recommended: true },
    { id: 'biweekly', label: 'Quincenal', emoji: '📆' },
    { id: 'monthly', label: 'Mensual', emoji: '🗓️' },
    { id: 'intensive', label: 'Diario (intensivo)', emoji: '🔥' },
  ]},
  { id: 'coaching_methodology', type: 'textarea', title: '¿Metodología o enfoque?', placeholder: 'Describe tu metodología, framework o enfoque principal...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'coaching_tools', type: 'multi_select', title: '¿Herramientas incluidas?', required: true, options: [
    { id: 'workbooks', label: 'Workbooks/Guías', emoji: '📓' },
    { id: 'templates', label: 'Plantillas', emoji: '📋' },
    { id: 'assessments', label: 'Evaluaciones/Tests', emoji: '📝' },
    { id: 'recordings', label: 'Grabaciones de sesiones', emoji: '🎥' },
    { id: 'slack', label: 'Soporte por chat (Slack, etc.)', emoji: '💬' },
  ]},
  { id: 'coaching_community', type: 'single_select', title: '¿Incluye comunidad?', required: true, options: [
    { id: 'yes_private', label: 'Sí, grupo privado', emoji: '🔒' },
    { id: 'yes_open', label: 'Sí, comunidad abierta', emoji: '🌐' },
    { id: 'no', label: 'No incluye comunidad', emoji: '❌' },
  ]},
  { id: 'coaching_guarantee', type: 'single_select', title: '¿Ofreces garantía?', required: true, options: [
    { id: 'money_back', label: 'Devolución de dinero', emoji: '💰' },
    { id: 'results', label: 'Garantía de resultados', emoji: '🎯' },
    { id: 'trial', label: 'Sesión de prueba gratis', emoji: '🆓' },
    { id: 'none', label: 'Sin garantía', emoji: '❌' },
  ]},
];

export const CORPORATE_TRAINING_QUESTIONS: WizardQuestion[] = [
  { id: 'training_topic', type: 'textarea', title: '¿Tema de la capacitación?', placeholder: 'Describe el tema y competencias a desarrollar...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'training_team_size', type: 'single_select', title: '¿Tamaño del equipo?', required: true, options: [
    { id: 'small', label: '5-15 personas', emoji: '👥' },
    { id: 'medium', label: '15-50 personas', emoji: '🏢' },
    { id: 'large', label: '50-200 personas', emoji: '🏟️' },
    { id: 'enterprise', label: '200+ personas', emoji: '🌍' },
  ]},
  { id: 'training_modality', type: 'single_select', title: '¿Modalidad?', required: true, options: [
    { id: 'in_person', label: 'Presencial', emoji: '🏢' },
    { id: 'virtual', label: 'Virtual (sincrónico)', emoji: '💻' },
    { id: 'elearning', label: 'E-learning (asincrónico)', emoji: '📱' },
    { id: 'blended', label: 'Blended (mixto)', emoji: '🔄', recommended: true },
  ]},
  { id: 'training_measurement', type: 'multi_select', title: '¿Cómo medir resultados?', required: true, options: [
    { id: 'pre_post_test', label: 'Pre/Post evaluación', emoji: '📝' },
    { id: 'kpis', label: 'KPIs de negocio', emoji: '📊' },
    { id: 'surveys', label: 'Encuestas de satisfacción', emoji: '⭐' },
    { id: 'practical', label: 'Evaluación práctica', emoji: '🔧' },
    { id: 'certification', label: 'Certificación interna', emoji: '🏆' },
  ]},
  { id: 'training_frequency', type: 'single_select', title: '¿Frecuencia?', required: true, options: [
    { id: 'one_time', label: 'Evento único', emoji: '📍' },
    { id: 'weekly', label: 'Sesiones semanales', emoji: '📅' },
    { id: 'monthly', label: 'Sesiones mensuales', emoji: '📆' },
    { id: 'quarterly', label: 'Programa trimestral', emoji: '🗓️' },
  ]},
  { id: 'training_customization', type: 'single_select', title: '¿Nivel de personalización?', required: true, options: [
    { id: 'standard', label: 'Contenido estándar', emoji: '📦' },
    { id: 'adapted', label: 'Adaptado a mi industria', emoji: '🔧' },
    { id: 'custom', label: 'Totalmente personalizado', emoji: '🎨', recommended: true },
    { id: 'co_created', label: 'Co-creado con mi equipo', emoji: '🤝' },
  ]},
  { id: 'training_certification', type: 'single_select', title: '¿Requiere certificación?', required: true, options: [
    { id: 'internal', label: 'Certificación interna', emoji: '🏢' },
    { id: 'external', label: 'Certificación externa', emoji: '🌐' },
    { id: 'both', label: 'Ambas', emoji: '🏆' },
    { id: 'none', label: 'No requiere', emoji: '❌' },
  ]},
];

// ============================================================================
// GENERAL GOAL QUESTIONS
// ============================================================================

export const CONSULTING_QUESTIONS: WizardQuestion[] = [
  { id: 'consult_area', type: 'textarea', title: '¿Área de consultoría?', placeholder: 'Describe el área específica de consultoría que necesitas...', required: true, validation: { minLength: 20, maxLength: 300 } },
  { id: 'consult_duration', type: 'single_select', title: '¿Duración del proyecto?', required: true, options: [
    { id: 'one_time', label: 'Sesión única', emoji: '📍' },
    { id: 'short', label: '1-4 semanas', emoji: '📅' },
    { id: 'medium', label: '1-3 meses', emoji: '📆' },
    { id: 'long', label: '3+ meses', emoji: '🗓️' },
  ]},
  { id: 'consult_deliverables', type: 'multi_select', title: '¿Entregables esperados?', required: true, options: [
    { id: 'report', label: 'Informe/Reporte', emoji: '📊' },
    { id: 'strategy', label: 'Plan estratégico', emoji: '🗺️' },
    { id: 'training', label: 'Capacitación al equipo', emoji: '👥' },
    { id: 'implementation', label: 'Implementación guiada', emoji: '🔧' },
    { id: 'templates', label: 'Plantillas/Herramientas', emoji: '📋' },
  ]},
  { id: 'consult_team', type: 'single_select', title: '¿Quién participará de tu lado?', required: true, options: [
    { id: 'solo', label: 'Solo yo', emoji: '👤' },
    { id: 'small_team', label: 'Equipo pequeño (2-5)', emoji: '👥' },
    { id: 'department', label: 'Departamento completo', emoji: '🏢' },
    { id: 'executive', label: 'Nivel directivo', emoji: '👔' },
  ]},
  { id: 'consult_urgency', type: 'single_select', title: '¿Urgencia?', required: true, options: [
    { id: 'critical', label: 'Crítico (esta semana)', emoji: '🚨' },
    { id: 'soon', label: 'Pronto (2-4 semanas)', emoji: '📅' },
    { id: 'planned', label: 'Planificado (1-2 meses)', emoji: '📆' },
    { id: 'flexible', label: 'Flexible', emoji: '🗓️' },
  ]},
];

export const AUDIT_QUESTIONS: WizardQuestion[] = [
  { id: 'audit_scope', type: 'textarea', title: '¿Qué necesitas auditar?', placeholder: 'Ej: Presencia digital completa, SEO del sitio web, estrategia de redes sociales...', required: true, validation: { minLength: 20, maxLength: 400 } },
  { id: 'audit_depth', type: 'single_select', title: '¿Alcance de la auditoría?', required: true, options: [
    { id: 'quick', label: 'Diagnóstico rápido', emoji: '⚡', description: 'Visión general' },
    { id: 'standard', label: 'Auditoría estándar', emoji: '📋', description: 'Análisis completo', recommended: true },
    { id: 'deep', label: 'Auditoría profunda', emoji: '🔬', description: 'Análisis exhaustivo' },
  ]},
  { id: 'audit_standards', type: 'single_select', title: '¿Estándares o frameworks de referencia?', required: true, options: [
    { id: 'industry', label: 'Mejores prácticas del sector', emoji: '📊' },
    { id: 'competitors', label: 'Benchmark vs competidores', emoji: '⚖️' },
    { id: 'custom', label: 'Criterios propios', emoji: '📝' },
    { id: 'unsure', label: 'Necesito recomendación', emoji: '🤔' },
  ]},
  { id: 'audit_access', type: 'multi_select', title: '¿Qué accesos puedes proporcionar?', required: true, options: [
    { id: 'analytics', label: 'Analytics/métricas', emoji: '📊' },
    { id: 'social', label: 'Redes sociales', emoji: '📱' },
    { id: 'website', label: 'CMS/Website', emoji: '🌐' },
    { id: 'ads', label: 'Plataformas de ads', emoji: '💰' },
    { id: 'crm', label: 'CRM', emoji: '💼' },
  ]},
  { id: 'audit_timeline', type: 'single_select', title: '¿Cuándo necesitas resultados?', required: true, options: [
    { id: 'urgent', label: '1 semana', emoji: '🚨' },
    { id: 'standard', label: '2-3 semanas', emoji: '📅', recommended: true },
    { id: 'flexible', label: '1 mes+', emoji: '🗓️' },
  ]},
];

export const ONGOING_SUPPORT_QUESTIONS: WizardQuestion[] = [
  { id: 'support_type', type: 'multi_select', title: '¿Tipo de soporte?', required: true, options: [
    { id: 'technical', label: 'Soporte técnico', emoji: '🔧' },
    { id: 'content', label: 'Gestión de contenido', emoji: '📝' },
    { id: 'maintenance', label: 'Mantenimiento web/app', emoji: '🛠️' },
    { id: 'monitoring', label: 'Monitoreo y alertas', emoji: '📊' },
    { id: 'updates', label: 'Actualizaciones', emoji: '🔄' },
  ]},
  { id: 'support_hours', type: 'single_select', title: '¿Horario de soporte?', required: true, options: [
    { id: 'business', label: 'Horario laboral', emoji: '🕐' },
    { id: 'extended', label: 'Horario extendido', emoji: '🕐' },
    { id: '24_7', label: '24/7', emoji: '🌍' },
    { id: 'on_demand', label: 'Bajo demanda', emoji: '🔘' },
  ]},
  { id: 'support_sla', type: 'single_select', title: '¿Tiempo de respuesta esperado?', required: true, options: [
    { id: 'immediate', label: 'Menos de 1 hora', emoji: '⚡' },
    { id: 'same_day', label: 'Mismo día', emoji: '📅' },
    { id: 'next_day', label: '24 horas', emoji: '📆' },
    { id: 'standard', label: '48 horas', emoji: '🗓️' },
  ]},
  { id: 'support_tools', type: 'multi_select', title: '¿Herramientas actuales?', required: false, options: [
    { id: 'jira', label: 'Jira', emoji: '📋' },
    { id: 'slack', label: 'Slack', emoji: '💬' },
    { id: 'email', label: 'Email', emoji: '📧' },
    { id: 'whatsapp', label: 'WhatsApp', emoji: '📱' },
    { id: 'ticketing', label: 'Sistema de tickets', emoji: '🎫' },
  ]},
  { id: 'support_budget', type: 'single_select', title: '¿Presupuesto mensual de soporte?', required: true, options: [
    { id: 'basic', label: '$200-$500/mes', emoji: '🌱' },
    { id: 'standard', label: '$500-$1500/mes', emoji: '🌿' },
    { id: 'premium', label: '$1500-$3000/mes', emoji: '🌳' },
    { id: 'enterprise', label: '$3000+/mes', emoji: '🏔️' },
  ]},
];

export const ONE_TIME_PROJECT_QUESTIONS: WizardQuestion[] = [
  { id: 'project_description', type: 'textarea', title: '¿Descripción del proyecto?', placeholder: 'Describe el proyecto, alcance y objetivos principales...', required: true, validation: { minLength: 30, maxLength: 500 } },
  { id: 'project_deliverables', type: 'textarea', title: '¿Entregables esperados?', placeholder: 'Lista los entregables concretos que esperas recibir...', required: true, validation: { minLength: 20, maxLength: 400 } },
  { id: 'project_timeline', type: 'single_select', title: '¿Timeline del proyecto?', required: true, options: [
    { id: 'rush', label: '1-2 semanas', emoji: '🚨' },
    { id: 'standard', label: '2-4 semanas', emoji: '📅', recommended: true },
    { id: 'extended', label: '1-2 meses', emoji: '📆' },
    { id: 'flexible', label: 'Flexible', emoji: '🗓️' },
  ]},
  { id: 'project_revisions', type: 'single_select', title: '¿Rondas de revisión?', required: true, options: [
    { id: 'one', label: '1 revisión', emoji: '1️⃣' },
    { id: 'two', label: '2 revisiones', emoji: '2️⃣', recommended: true },
    { id: 'unlimited', label: 'Hasta quedar satisfecho', emoji: '♾️' },
  ]},
];

export const CUSTOM_REQUEST_QUESTIONS: WizardQuestion[] = [
  { id: 'custom_description', type: 'textarea', title: '¿Qué necesitas?', placeholder: 'Describe tu necesidad lo más detalladamente posible...', required: true, validation: { minLength: 30, maxLength: 500 } },
  { id: 'custom_timeline', type: 'single_select', title: '¿Cuándo lo necesitas?', required: true, options: [
    { id: 'asap', label: 'Lo antes posible', emoji: '🚨' },
    { id: 'weeks', label: '2-4 semanas', emoji: '📅' },
    { id: 'months', label: '1-3 meses', emoji: '📆' },
    { id: 'flexible', label: 'Sin prisa', emoji: '🗓️' },
  ]},
  { id: 'custom_budget', type: 'single_select', title: '¿Presupuesto estimado?', required: true, options: [
    { id: 'small', label: 'Menos de $500', emoji: '🌱' },
    { id: 'medium', label: '$500-$2000', emoji: '🌿' },
    { id: 'large', label: '$2000-$5000', emoji: '🌳' },
    { id: 'enterprise', label: '$5000+', emoji: '🏔️' },
    { id: 'unsure', label: 'Necesito cotización', emoji: '🤔' },
  ]},
];

// ============================================================================
// COMMON QUESTIONS
// ============================================================================

export const AUDIENCE_QUESTIONS: WizardQuestion[] = [
  { id: 'target_age', type: 'multi_select', title: '¿Rango de edad de tu audiencia?', subtitle: 'Selecciona hasta 3', required: true, validation: { max: 3 }, options: [
    { id: '13-17', label: '13-17', emoji: '🎮' },
    { id: '18-24', label: '18-24', emoji: '📱' },
    { id: '25-34', label: '25-34', emoji: '💼' },
    { id: '35-44', label: '35-44', emoji: '🏠' },
    { id: '45-54', label: '45-54', emoji: '📊' },
    { id: '55+', label: '55+', emoji: '🎯' },
  ]},
  { id: 'target_gender', type: 'single_select', title: '¿A qué género te diriges?', required: true, options: [
    { id: 'female', label: 'Mujeres', emoji: '👩' },
    { id: 'male', label: 'Hombres', emoji: '👨' },
    { id: 'all', label: 'Todos', emoji: '👥', recommended: true },
  ]},
  { id: 'target_interests', type: 'chips', title: '¿Intereses principales de tu audiencia?', subtitle: 'Selecciona hasta 5', required: true, validation: { max: 5 }, options: [
    { id: 'fashion', label: 'Moda' }, { id: 'beauty', label: 'Belleza' },
    { id: 'fitness', label: 'Fitness' }, { id: 'food', label: 'Comida' },
    { id: 'technology', label: 'Tecnología' }, { id: 'business', label: 'Negocios' },
    { id: 'travel', label: 'Viajes' }, { id: 'entertainment', label: 'Entretenimiento' },
    { id: 'home', label: 'Hogar' }, { id: 'health', label: 'Salud' },
    { id: 'education', label: 'Educación' }, { id: 'finance', label: 'Finanzas' },
    { id: 'sports', label: 'Deportes' }, { id: 'gaming', label: 'Gaming' },
    { id: 'parenting', label: 'Maternidad/Paternidad' },
  ]},
];

// ============================================================================
// GOAL → QUESTIONS MAPPING
// ============================================================================

const GOAL_QUESTIONS_MAP: Record<GoalType, WizardQuestion[]> = {
  // Content Creation
  brand_awareness: BRAND_AWARENESS_QUESTIONS,
  lead_generation: LEAD_GENERATION_QUESTIONS,
  sales: SALES_QUESTIONS,
  engagement: ENGAGEMENT_QUESTIONS,
  education: EDUCATION_CONTENT_QUESTIONS,
  other_content: OTHER_GOAL_QUESTIONS,
  // Strategy & Marketing
  content_strategy: CONTENT_STRATEGY_QUESTIONS,
  paid_ads: PAID_ADS_QUESTIONS,
  brand_strategy: BRAND_STRATEGY_QUESTIONS,
  launch_campaign: LAUNCH_CAMPAIGN_QUESTIONS,
  growth_consulting: GROWTH_CONSULTING_QUESTIONS,
  community_management: COMMUNITY_MANAGEMENT_QUESTIONS,
  // Legacy
  other: OTHER_GOAL_QUESTIONS,
  // Technology
  mvp: MVP_QUESTIONS,
  full_app: FULL_APP_QUESTIONS,
  landing_page: LANDING_PAGE_QUESTIONS,
  ecommerce: ECOMMERCE_QUESTIONS,
  redesign: REDESIGN_QUESTIONS,
  integration: INTEGRATION_QUESTIONS,
  // Post-Production
  social_video: SOCIAL_VIDEO_QUESTIONS,
  corporate_video: CORPORATE_VIDEO_QUESTIONS,
  commercial: COMMERCIAL_QUESTIONS,
  documentary: DOCUMENTARY_QUESTIONS,
  animation: ANIMATION_QUESTIONS,
  podcast_audio: PODCAST_QUESTIONS,
  // Education & Training
  online_course: ONLINE_COURSE_QUESTIONS,
  workshop: WORKSHOP_QUESTIONS,
  webinar: WEBINAR_QUESTIONS,
  learning_materials: LEARNING_MATERIALS_QUESTIONS,
  coaching_program: COACHING_PROGRAM_QUESTIONS,
  corporate_training: CORPORATE_TRAINING_QUESTIONS,
  // General
  consulting: CONSULTING_QUESTIONS,
  audit: AUDIT_QUESTIONS,
  ongoing_support: ONGOING_SUPPORT_QUESTIONS,
  one_time_project: ONE_TIME_PROJECT_QUESTIONS,
  custom_request: CUSTOM_REQUEST_QUESTIONS,
};

export function getGoalQuestions(goal: GoalType): WizardQuestion[] {
  return GOAL_QUESTIONS_MAP[goal] || [];
}

// Full question path: goal questions + audience, filtered by conditional rules
export function getQuestionsForPath(
  group: ServiceGroup,
  goalId: GoalType,
  responses: Record<string, any> = {},
  selectedServices: string[] = [],
): WizardQuestion[] {
  const goalQuestions = GOAL_QUESTIONS_MAP[goalId] || [];
  const commonQuestions = AUDIENCE_QUESTIONS;

  return [...goalQuestions, ...commonQuestions].filter(q =>
    shouldShowQuestion(q, responses, selectedServices, goalId)
  );
}

// ============================================================================
// HELPERS
// ============================================================================

export function getGoalColor(goal: GoalType): string {
  const allGoals = [...CONTENT_CREATION_GOALS, ...STRATEGY_MARKETING_GOALS, ...TECHNOLOGY_GOALS, ...POST_PRODUCTION_GOALS, ...EDUCATION_GOALS, ...GENERAL_SERVICES_GOALS];
  return allGoals.find(g => g.id === goal)?.color || 'from-purple-500 to-pink-500';
}

export function getGoalIcon(goal: GoalType): any {
  const icons: Partial<Record<GoalType, any>> = {
    brand_awareness: Eye, lead_generation: ClipboardList, sales: DollarSign,
    engagement: Heart, education: BookOpen, other: Sparkles, other_content: Sparkles,
    content_strategy: CalendarDays, paid_ads: Megaphone, brand_strategy: Gem,
    launch_campaign: Rocket, growth_consulting: TrendingUp, community_management: Users,
    mvp: Zap, full_app: Smartphone, landing_page: Target,
    ecommerce: Globe, redesign: Settings, integration: Bot,
    social_video: Play, corporate_video: Film, commercial: Film,
    documentary: Film, animation: Palette, podcast_audio: Mic,
    online_course: GraduationCap, workshop: Settings, webinar: Radio,
    learning_materials: BookOpen, coaching_program: Users, corporate_training: Briefcase,
    consulting: Briefcase, audit: Search, ongoing_support: Settings,
    one_time_project: Target, custom_request: Sparkles,
  };
  return icons[goal] || Sparkles;
}

export function getProgressForGoal(goal: GoalType): number {
  const allGoals = [...CONTENT_CREATION_GOALS, ...STRATEGY_MARKETING_GOALS, ...TECHNOLOGY_GOALS, ...POST_PRODUCTION_GOALS, ...EDUCATION_GOALS, ...GENERAL_SERVICES_GOALS];
  return allGoals.find(g => g.id === goal)?.questionCount || 5;
}

export interface PathSummary {
  goal: GoalType;
  goalLabel: string;
  totalQuestions: number;
  keyFocusAreas: string[];
  suggestedCreatorTypes: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

const PATH_SUMMARIES: Partial<Record<GoalType, Omit<PathSummary, 'goal'>>> = {
  brand_awareness: { goalLabel: 'Reconocimiento de Marca', totalQuestions: 6, keyFocusAreas: ['Posicionamiento', 'Identidad', 'Storytelling', 'Alcance'], suggestedCreatorTypes: ['lifestyle', 'storytelling'], estimatedComplexity: 'moderate' },
  lead_generation: { goalLabel: 'Generación de Leads', totalQuestions: 7, keyFocusAreas: ['Lead magnets', 'Funnels', 'CTAs', 'Nurturing'], suggestedCreatorTypes: ['educational', 'expert'], estimatedComplexity: 'complex' },
  sales: { goalLabel: 'Ventas Directas', totalQuestions: 8, keyFocusAreas: ['Conversión', 'Ofertas', 'Urgencia', 'Prueba social'], suggestedCreatorTypes: ['ugc', 'review', 'demo'], estimatedComplexity: 'complex' },
  engagement: { goalLabel: 'Engagement', totalQuestions: 6, keyFocusAreas: ['Interacción', 'Comunidad', 'Viralidad'], suggestedCreatorTypes: ['entertainment', 'lifestyle'], estimatedComplexity: 'moderate' },
  education: { goalLabel: 'Contenido Educativo', totalQuestions: 6, keyFocusAreas: ['Valor', 'Claridad', 'Formatos'], suggestedCreatorTypes: ['expert', 'tutorial'], estimatedComplexity: 'moderate' },
  other_content: { goalLabel: 'Otro Objetivo', totalQuestions: 3, keyFocusAreas: ['Personalizado'], suggestedCreatorTypes: ['varies'], estimatedComplexity: 'simple' },
  content_strategy: { goalLabel: 'Estrategia de Contenido', totalQuestions: 7, keyFocusAreas: ['Plataformas', 'Frecuencia', 'Pilares', 'KPIs'], suggestedCreatorTypes: ['strategist', 'content_creator'], estimatedComplexity: 'complex' },
  paid_ads: { goalLabel: 'Publicidad Pagada', totalQuestions: 8, keyFocusAreas: ['Plataformas', 'Presupuesto', 'Audiencias', 'Creativos'], suggestedCreatorTypes: ['trafficker', 'designer'], estimatedComplexity: 'complex' },
  brand_strategy: { goalLabel: 'Estrategia de Marca', totalQuestions: 8, keyFocusAreas: ['Posicionamiento', 'Propuesta de valor', 'Arquetipos', 'Tono'], suggestedCreatorTypes: ['strategist', 'branding'], estimatedComplexity: 'complex' },
  launch_campaign: { goalLabel: 'Lanzamiento / Campaña', totalQuestions: 7, keyFocusAreas: ['Fecha', 'Canales', 'Presupuesto', 'Métricas'], suggestedCreatorTypes: ['strategist', 'content_creator', 'trafficker'], estimatedComplexity: 'complex' },
  growth_consulting: { goalLabel: 'Consultoría de Crecimiento', totalQuestions: 6, keyFocusAreas: ['Diagnóstico', 'Recursos', 'Analytics', 'Timeline'], suggestedCreatorTypes: ['consultant', 'analyst'], estimatedComplexity: 'moderate' },
  community_management: { goalLabel: 'Community Management', totalQuestions: 6, keyFocusAreas: ['Plataformas', 'Volumen', 'Horarios', 'Crisis'], suggestedCreatorTypes: ['community_manager'], estimatedComplexity: 'moderate' },
  other: { goalLabel: 'Personalizado', totalQuestions: 3, keyFocusAreas: ['Personalizado'], suggestedCreatorTypes: ['varies'], estimatedComplexity: 'simple' },
  mvp: { goalLabel: 'MVP / Prototipo', totalQuestions: 7, keyFocusAreas: ['Validación', 'Features core', 'Plataforma', 'Backend'], suggestedCreatorTypes: ['developer', 'designer'], estimatedComplexity: 'complex' },
  full_app: { goalLabel: 'Aplicación Completa', totalQuestions: 8, keyFocusAreas: ['Arquitectura', 'Integraciones', 'Escalabilidad', 'UX'], suggestedCreatorTypes: ['developer', 'designer', 'devops'], estimatedComplexity: 'complex' },
  landing_page: { goalLabel: 'Landing Page', totalQuestions: 6, keyFocusAreas: ['Conversión', 'Copy', 'SEO', 'Integraciones'], suggestedCreatorTypes: ['developer', 'copywriter'], estimatedComplexity: 'moderate' },
  ecommerce: { goalLabel: 'E-commerce', totalQuestions: 8, keyFocusAreas: ['Catálogo', 'Pagos', 'Logística', 'Marketing'], suggestedCreatorTypes: ['developer', 'designer'], estimatedComplexity: 'complex' },
  redesign: { goalLabel: 'Rediseño', totalQuestions: 6, keyFocusAreas: ['Diagnóstico', 'UX/UI', 'Migración', 'Stack'], suggestedCreatorTypes: ['developer', 'designer'], estimatedComplexity: 'moderate' },
  integration: { goalLabel: 'Integración / API', totalQuestions: 5, keyFocusAreas: ['APIs', 'Sincronización', 'Volumen', 'Documentación'], suggestedCreatorTypes: ['developer'], estimatedComplexity: 'moderate' },
  social_video: { goalLabel: 'Video para Redes', totalQuestions: 6, keyFocusAreas: ['Plataforma', 'Formato', 'Estilo', 'Volumen'], suggestedCreatorTypes: ['editor', 'creator'], estimatedComplexity: 'moderate' },
  corporate_video: { goalLabel: 'Video Corporativo', totalQuestions: 7, keyFocusAreas: ['Guión', 'Producción', 'Estilo', 'Audio'], suggestedCreatorTypes: ['videographer', 'editor'], estimatedComplexity: 'complex' },
  commercial: { goalLabel: 'Comercial / Ad', totalQuestions: 8, keyFocusAreas: ['Concepto', 'Target', 'Plataforma', 'CTA', 'Producción'], suggestedCreatorTypes: ['director', 'editor', 'copywriter'], estimatedComplexity: 'complex' },
  documentary: { goalLabel: 'Documental / Testimonial', totalQuestions: 6, keyFocusAreas: ['Narrativa', 'Producción', 'Distribución'], suggestedCreatorTypes: ['filmmaker', 'editor'], estimatedComplexity: 'moderate' },
  animation: { goalLabel: 'Animación / Motion', totalQuestions: 7, keyFocusAreas: ['Tipo', 'Estilo', 'Assets', 'Guión'], suggestedCreatorTypes: ['animator', 'motion_designer'], estimatedComplexity: 'complex' },
  podcast_audio: { goalLabel: 'Podcast / Audio', totalQuestions: 5, keyFocusAreas: ['Formato', 'Post-producción', 'Distribución'], suggestedCreatorTypes: ['audio_engineer', 'editor'], estimatedComplexity: 'moderate' },
  online_course: { goalLabel: 'Curso Online', totalQuestions: 7, keyFocusAreas: ['Contenido', 'Plataforma', 'Estructura', 'Material'], suggestedCreatorTypes: ['instructional_designer', 'videographer'], estimatedComplexity: 'complex' },
  workshop: { goalLabel: 'Workshop', totalQuestions: 6, keyFocusAreas: ['Tema', 'Formato', 'Material', 'Participantes'], suggestedCreatorTypes: ['trainer', 'designer'], estimatedComplexity: 'moderate' },
  webinar: { goalLabel: 'Webinar', totalQuestions: 5, keyFocusAreas: ['Tema', 'Plataforma', 'Interacción'], suggestedCreatorTypes: ['presenter', 'designer'], estimatedComplexity: 'simple' },
  learning_materials: { goalLabel: 'Material Didáctico', totalQuestions: 5, keyFocusAreas: ['Tipo', 'Propósito', 'Diseño', 'Formato'], suggestedCreatorTypes: ['instructional_designer'], estimatedComplexity: 'moderate' },
  coaching_program: { goalLabel: 'Programa de Coaching', totalQuestions: 7, keyFocusAreas: ['Metodología', 'Frecuencia', 'Herramientas', 'Comunidad'], suggestedCreatorTypes: ['coach', 'trainer'], estimatedComplexity: 'complex' },
  corporate_training: { goalLabel: 'Capacitación Corporativa', totalQuestions: 7, keyFocusAreas: ['Modalidad', 'Medición', 'Personalización', 'Certificación'], suggestedCreatorTypes: ['trainer', 'instructional_designer'], estimatedComplexity: 'complex' },
  consulting: { goalLabel: 'Consultoría', totalQuestions: 5, keyFocusAreas: ['Área', 'Entregables', 'Equipo'], suggestedCreatorTypes: ['consultant'], estimatedComplexity: 'moderate' },
  audit: { goalLabel: 'Auditoría', totalQuestions: 5, keyFocusAreas: ['Alcance', 'Estándares', 'Accesos'], suggestedCreatorTypes: ['analyst'], estimatedComplexity: 'moderate' },
  ongoing_support: { goalLabel: 'Soporte Continuo', totalQuestions: 5, keyFocusAreas: ['Tipo', 'Horario', 'SLA'], suggestedCreatorTypes: ['support_specialist'], estimatedComplexity: 'moderate' },
  one_time_project: { goalLabel: 'Proyecto Puntual', totalQuestions: 4, keyFocusAreas: ['Alcance', 'Entregables', 'Timeline'], suggestedCreatorTypes: ['varies'], estimatedComplexity: 'simple' },
  custom_request: { goalLabel: 'Solicitud Personalizada', totalQuestions: 3, keyFocusAreas: ['Descripción', 'Timeline', 'Presupuesto'], suggestedCreatorTypes: ['varies'], estimatedComplexity: 'simple' },
};

export function getPathSummary(goal: GoalType): PathSummary {
  const summary = PATH_SUMMARIES[goal];
  if (summary) return { goal, ...summary };
  return { goal, goalLabel: goal, totalQuestions: 5, keyFocusAreas: ['General'], suggestedCreatorTypes: ['varies'], estimatedComplexity: 'moderate' };
}
