// src/lib/talent-dna/constants.ts

export interface TalentDNAQuestion {
  id: number;
  block: string;
  question: string;
  hint?: string;
}

/**
 * 7 preguntas para generar el ADN de Talento
 * El creador responde todas en un solo audio (~3-5 minutos)
 */
export const TALENT_DNA_QUESTIONS: TalentDNAQuestion[] = [
  {
    id: 1,
    block: 'Tu Historia',
    question: '¿Quién eres y cómo empezaste a crear contenido? ¿Qué te motivó?',
    hint: 'Cuéntanos tu origen, qué te apasiona y por qué decidiste ser creador'
  },
  {
    id: 2,
    block: 'Tu Experiencia',
    question: '¿Cuántos años llevas creando contenido y cuáles han sido tus logros más importantes?',
    hint: 'Menciona proyectos destacados, marcas con las que has trabajado, métricas relevantes'
  },
  {
    id: 3,
    block: 'Tu Especialidad',
    question: '¿En qué nichos o industrias te especializas? ¿Qué tipo de contenido creas mejor?',
    hint: 'Belleza, tech, fitness, lifestyle... y los formatos: Reels, TikTok, YouTube, etc.'
  },
  {
    id: 4,
    block: 'Tu Estilo',
    question: '¿Cómo describirías tu estilo de contenido? ¿Qué te hace diferente de otros creadores?',
    hint: 'Tu estética, tono, personalidad única, lo que te distingue'
  },
  {
    id: 5,
    block: 'Tu Proceso',
    question: '¿Cómo es tu proceso creativo desde el brief hasta la entrega final?',
    hint: 'Tu flujo de trabajo, herramientas que usas, tiempos de entrega típicos'
  },
  {
    id: 6,
    block: 'Tus Plataformas',
    question: '¿En qué plataformas creas contenido y en qué idiomas puedes trabajar?',
    hint: 'Instagram, TikTok, YouTube, etc. y los idiomas que dominas'
  },
  {
    id: 7,
    block: 'Tus Metas',
    question: '¿Cuáles son tus metas profesionales? ¿Con qué marcas sueñas colaborar?',
    hint: 'Tus objetivos a corto y largo plazo, marcas o tipos de proyectos ideales'
  }
];

/**
 * Niveles de experiencia
 */
export const EXPERIENCE_LEVELS = {
  beginner: {
    label: 'Principiante',
    description: 'Menos de 1 año creando contenido',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  intermediate: {
    label: 'Intermedio',
    description: '1-3 años de experiencia',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  advanced: {
    label: 'Avanzado',
    description: '3-5 años de experiencia',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  expert: {
    label: 'Experto',
    description: 'Más de 5 años de experiencia',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  }
} as const;

/**
 * Estilos de contenido predefinidos
 */
export const CONTENT_STYLES = [
  { id: 'minimalist', label: 'Minimalista', emoji: '✨' },
  { id: 'energetic', label: 'Energético', emoji: '⚡' },
  { id: 'educational', label: 'Educativo', emoji: '📚' },
  { id: 'entertaining', label: 'Entretenido', emoji: '🎬' },
  { id: 'aesthetic', label: 'Estético', emoji: '🎨' },
  { id: 'professional', label: 'Profesional', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'funny', label: 'Divertido', emoji: '😂' },
  { id: 'inspirational', label: 'Inspiracional', emoji: '💫' },
  { id: 'raw', label: 'Auténtico/Raw', emoji: '🎯' }
] as const;

/**
 * Roles de marketplace disponibles
 */
export const MARKETPLACE_ROLES = [
  { id: 'ugc_creator', label: 'Creador UGC', description: 'Contenido generado por usuarios para marcas' },
  { id: 'influencer', label: 'Influencer', description: 'Promoción en redes sociales propias' },
  { id: 'content_creator', label: 'Creador de Contenido', description: 'Producción de contenido para marcas' },
  { id: 'video_editor', label: 'Editor de Video', description: 'Edición y postproducción' },
  { id: 'photographer', label: 'Fotógrafo', description: 'Fotografía de producto o lifestyle' },
  { id: 'copywriter', label: 'Copywriter', description: 'Redacción publicitaria y guiones' },
  { id: 'social_media_manager', label: 'Social Media Manager', description: 'Gestión de redes sociales' },
  { id: 'brand_ambassador', label: 'Embajador de Marca', description: 'Representación a largo plazo' },
  { id: 'live_streamer', label: 'Streamer', description: 'Transmisiones en vivo' },
  { id: 'podcast_host', label: 'Podcaster', description: 'Creación de contenido en audio' }
] as const;

/**
 * Plataformas de contenido
 */
export const CONTENT_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'youtube_shorts', label: 'YouTube Shorts', icon: '📱' },
  { id: 'facebook', label: 'Facebook', icon: '👤' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌' },
  { id: 'twitch', label: 'Twitch', icon: '🎮' },
  { id: 'snapchat', label: 'Snapchat', icon: '👻' }
] as const;

/**
 * Formatos de contenido
 */
export const CONTENT_FORMATS = [
  { id: 'reels', label: 'Reels', platform: 'instagram' },
  { id: 'tiktok_video', label: 'TikTok Video', platform: 'tiktok' },
  { id: 'youtube_video', label: 'Video YouTube', platform: 'youtube' },
  { id: 'youtube_shorts', label: 'Shorts', platform: 'youtube' },
  { id: 'stories', label: 'Stories', platform: 'instagram' },
  { id: 'carousel', label: 'Carrusel', platform: 'instagram' },
  { id: 'photo', label: 'Fotografía', platform: 'all' },
  { id: 'unboxing', label: 'Unboxing', platform: 'all' },
  { id: 'tutorial', label: 'Tutorial', platform: 'all' },
  { id: 'review', label: 'Review/Reseña', platform: 'all' },
  { id: 'vlog', label: 'Vlog', platform: 'youtube' },
  { id: 'live', label: 'En Vivo', platform: 'all' },
  { id: 'podcast', label: 'Podcast', platform: 'audio' }
] as const;

/**
 * Idiomas soportados
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'Inglés', flag: '🇺🇸' },
  { code: 'pt', label: 'Portugués', flag: '🇧🇷' },
  { code: 'fr', label: 'Francés', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'de', label: 'Alemán', flag: '🇩🇪' }
] as const;
