import type { TemplateCategory, VisualStyle } from './types/ad-generator.types';

export const ASPECT_RATIOS = [
  { value: '1:1', label: 'Cuadrado (Feed)' },
  { value: '4:5', label: 'Vertical (Feed)' },
  { value: '9:16', label: 'Story / Reel' },
  { value: '16:9', label: 'Horizontal (Landscape)' },
  { value: '3:2', label: 'Facebook Link Ad' },
] as const;

/** @deprecated Use ASPECT_RATIOS — kept for backward compat with old banner cards */
export const OUTPUT_SIZES = [
  { value: '1080x1080', label: '1080 x 1080 (Cuadrado)' },
  { value: '1080x1920', label: '1080 x 1920 (Story/Reel)' },
  { value: '1920x1080', label: '1920 x 1080 (Horizontal)' },
  { value: '800x800', label: '800 x 800 (Cuadrado compacto)' },
  { value: '1200x628', label: '1200 x 628 (Facebook Ad)' },
] as const;

export const COPY_LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
] as const;

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'fashion', label: 'Moda' },
  { value: 'food', label: 'Alimentos' },
  { value: 'tech', label: 'Tecnología' },
  { value: 'beauty', label: 'Belleza' },
  { value: 'services', label: 'Servicios' },
  { value: 'infoproduct', label: 'Infoproductos' },
  { value: 'general', label: 'General' },
];

export const STYLE_PRESETS: { value: VisualStyle; label: string }[] = [
  { value: 'professional', label: 'Profesional' },
  { value: 'minimal', label: 'Minimalista' },
  { value: 'vibrant', label: 'Vibrante' },
  { value: 'luxury', label: 'Premium' },
  { value: 'organic', label: 'Organico / Natural' },
  { value: 'custom', label: 'Personalizado' },
];

export const MAX_PRODUCT_IMAGES = 3;
export const MAX_IMAGE_SIZE_MB = 10;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const AD_GENERATOR_TOKEN_COST = 200;
export const AD_COPY_TOKEN_COST = 40;
