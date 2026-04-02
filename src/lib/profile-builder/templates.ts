import type { ProfileTemplate, BuilderConfig, ProfileBlock } from '@/components/profile-builder/types/profile-builder';

// Default builder configs for each template
const MINIMALISTA_CONFIG: BuilderConfig = {
  theme: 'dark',
  accentColor: '#FFFFFF',
  fontHeading: 'inter',
  fontBody: 'inter',
  spacing: 'relaxed',
  borderRadius: 'sm',
  showKreoonBranding: true,
};

const CREATIVO_CONFIG: BuilderConfig = {
  theme: 'dark',
  accentColor: '#EC4899', // pink
  fontHeading: 'inter',
  fontBody: 'inter',
  spacing: 'normal',
  borderRadius: 'lg',
  showKreoonBranding: true,
};

const PROFESIONAL_CONFIG: BuilderConfig = {
  theme: 'dark',
  accentColor: '#10B981', // green (como en el plan original)
  fontHeading: 'inter',
  fontBody: 'inter',
  spacing: 'normal',
  borderRadius: 'md',
  showKreoonBranding: true,
};

const INFLUENCER_CONFIG: BuilderConfig = {
  theme: 'dark',
  accentColor: '#8B5CF6', // purple
  fontHeading: 'inter',
  fontBody: 'inter',
  spacing: 'compact',
  borderRadius: 'md',
  showKreoonBranding: true,
};

const FREELANCER_CONFIG: BuilderConfig = {
  theme: 'dark',
  accentColor: '#10B981', // green
  fontHeading: 'inter',
  fontBody: 'inter',
  spacing: 'normal',
  borderRadius: 'md',
  showKreoonBranding: true,
};

// Template block configurations
type TemplateBlock = Omit<ProfileBlock, 'id' | 'isDraft'>;

const MINIMALISTA_BLOCKS: TemplateBlock[] = [
  {
    type: 'hero_banner',
    orderIndex: 0,
    isVisible: true,
    config: { showAvatar: true, showName: true, showBio: true, showCTA: true, ctaText: 'Contactar', layout: 'centered' },
    styles: { padding: 'xl' },
    content: {},
  },
  {
    type: 'portfolio',
    orderIndex: 1,
    isVisible: true,
    config: { layout: 'grid', columns: 3, showTitles: false },
    styles: { padding: 'lg', margin: 'lg' },
    content: {},
  },
  {
    type: 'contact',
    orderIndex: 2,
    isVisible: true,
    config: { showEmail: true, showButton: true, buttonText: 'Contactar', layout: 'centered' },
    styles: { padding: 'lg' },
    content: {},
  },
];

const CREATIVO_BLOCKS: TemplateBlock[] = [
  {
    type: 'hero_banner',
    orderIndex: 0,
    isVisible: true,
    config: { showAvatar: true, showName: true, showBio: true, showCTA: true, ctaText: 'Colaboremos', layout: 'centered' },
    styles: { padding: 'xl', borderRadius: 'lg' },
    content: {},
  },
  {
    type: 'about',
    orderIndex: 1,
    isVisible: true,
    config: {},
    styles: { padding: 'lg', margin: 'md', shadow: 'md' },
    content: { title: 'Mi Historia' },
  },
  {
    type: 'portfolio',
    orderIndex: 2,
    isVisible: true,
    config: { layout: 'masonry', columns: 3, showTitles: true },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'stats',
    orderIndex: 3,
    isVisible: true,
    config: { showFollowers: true, showProjects: true, showRating: true, layout: 'row' },
    styles: { padding: 'lg', margin: 'md' },
    content: {},
  },
  {
    type: 'divider',
    orderIndex: 4,
    isVisible: true,
    config: { style: 'gradient', width: 'wide', thickness: 'normal' },
    styles: { margin: 'lg' },
    content: {},
  },
  {
    type: 'contact',
    orderIndex: 5,
    isVisible: true,
    config: { showEmail: true, showButton: true, buttonText: 'Hablemos', layout: 'centered' },
    styles: { padding: 'xl' },
    content: {},
  },
];

const PROFESIONAL_BLOCKS: TemplateBlock[] = [
  {
    type: 'hero_banner',
    orderIndex: 0,
    isVisible: true,
    config: { showAvatar: true, showName: true, showBio: true, showCTA: true, ctaText: 'Ver Portafolio', ctaAction: 'scroll-portfolio', layout: 'centered' },
    styles: { padding: 'xl' },
    content: {},
  },
  {
    type: 'stats',
    orderIndex: 1,
    isVisible: true,
    config: { showProjects: true, showRating: true, showClients: true, layout: 'row' },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'about',
    orderIndex: 2,
    isVisible: true,
    config: {},
    styles: { padding: 'md', margin: 'md' },
    content: { title: 'Sobre Mi' },
  },
  {
    type: 'portfolio',
    orderIndex: 3,
    isVisible: true,
    config: { layout: 'grid', columns: 3, showTitles: true, maxItems: 6 },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'services',
    orderIndex: 4,
    isVisible: true,
    config: { layout: 'cards' },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'pricing',
    orderIndex: 5,
    isVisible: true,
    config: { layout: 'cards', showCurrency: true },
    styles: { padding: 'lg', margin: 'md' },
    content: {},
  },
  {
    type: 'reviews',
    orderIndex: 6,
    isVisible: true,
    config: { layout: 'grid', maxItems: 6 },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'faq',
    orderIndex: 7,
    isVisible: true,
    config: { allowMultipleOpen: false },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'recommended_talent',
    orderIndex: 8,
    isVisible: true,
    config: { maxItems: 4, layout: 'horizontal' },
    styles: { padding: 'lg' },
    content: {},
  },
];

const INFLUENCER_BLOCKS: TemplateBlock[] = [
  {
    type: 'hero_banner',
    orderIndex: 0,
    isVisible: true,
    config: { showAvatar: true, showName: true, showBio: true, showCTA: true, ctaText: 'Colaborar', layout: 'centered' },
    styles: { padding: 'xl' },
    content: {},
  },
  {
    type: 'stats',
    orderIndex: 1,
    isVisible: true,
    config: { showFollowers: true, showProjects: true, showRating: true, layout: 'grid' },
    styles: { padding: 'lg', margin: 'sm' },
    content: {},
  },
  {
    type: 'portfolio',
    orderIndex: 2,
    isVisible: true,
    config: { layout: 'featured', columns: 3, showTitles: true },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'brands',
    orderIndex: 3,
    isVisible: true,
    config: { grayscale: false },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'social_links',
    orderIndex: 4,
    isVisible: true,
    config: { layout: 'horizontal', showLabels: true },
    styles: { padding: 'sm', margin: 'md' },
    content: {},
  },
  {
    type: 'contact',
    orderIndex: 5,
    isVisible: true,
    config: { showEmail: true, showButton: true, buttonText: 'Contactar Manager', layout: 'centered' },
    styles: { padding: 'lg' },
    content: {},
  },
];

const FREELANCER_BLOCKS: TemplateBlock[] = [
  {
    type: 'hero_banner',
    orderIndex: 0,
    isVisible: true,
    config: { showAvatar: true, showName: true, showBio: true, showCTA: true, ctaText: 'Ver Disponibilidad', layout: 'centered' },
    styles: { padding: 'lg' },
    content: {},
  },
  {
    type: 'about',
    orderIndex: 1,
    isVisible: true,
    config: {},
    styles: { padding: 'md', margin: 'md' },
    content: { title: 'Quien Soy' },
  },
  {
    type: 'services',
    orderIndex: 2,
    isVisible: true,
    config: { layout: 'cards' },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'pricing',
    orderIndex: 3,
    isVisible: true,
    config: { layout: 'cards', showCurrency: true },
    styles: { padding: 'lg', margin: 'md', shadow: 'md' },
    content: {},
  },
  {
    type: 'portfolio',
    orderIndex: 4,
    isVisible: true,
    config: { layout: 'grid', columns: 3, showTitles: true },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'faq',
    orderIndex: 5,
    isVisible: true,
    config: { allowMultipleOpen: false },
    styles: { padding: 'md', margin: 'md' },
    content: {},
  },
  {
    type: 'contact',
    orderIndex: 6,
    isVisible: true,
    config: { showEmail: true, showButton: true, buttonText: 'Iniciar Proyecto', layout: 'centered' },
    styles: { padding: 'xl' },
    content: {},
  },
];

// Export templates
export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    name: 'minimalista',
    label: 'Minimalista',
    description: 'Diseno limpio y elegante, enfocado en tu portfolio',
    preview: '/templates/minimalista.png',
    blocks: MINIMALISTA_BLOCKS,
    config: MINIMALISTA_CONFIG,
  },
  {
    name: 'creativo',
    label: 'Creativo',
    description: 'Colores vibrantes y estilo artistico para destacar',
    preview: '/templates/creativo.png',
    blocks: CREATIVO_BLOCKS,
    config: CREATIVO_CONFIG,
  },
  {
    name: 'profesional',
    label: 'Profesional',
    description: 'Formal y estructurado, ideal para servicios B2B',
    preview: '/templates/profesional.png',
    blocks: PROFESIONAL_BLOCKS,
    config: PROFESIONAL_CONFIG,
  },
  {
    name: 'influencer',
    label: 'Influencer',
    description: 'Stats prominentes y redes sociales para creadores',
    preview: '/templates/influencer.png',
    blocks: INFLUENCER_BLOCKS,
    config: INFLUENCER_CONFIG,
  },
  {
    name: 'freelancer',
    label: 'Freelancer',
    description: 'Pricing, FAQ y servicios para profesionales independientes',
    preview: '/templates/freelancer.png',
    blocks: FREELANCER_BLOCKS,
    config: FREELANCER_CONFIG,
  },
];

// Helper to get template by name
export function getTemplateByName(name: string): ProfileTemplate | undefined {
  return PROFILE_TEMPLATES.find((t) => t.name === name);
}

// Helper to create blocks from template
export function createBlocksFromTemplate(template: ProfileTemplate): ProfileBlock[] {
  return template.blocks.map((block) => ({
    ...block,
    id: crypto.randomUUID(),
    isDraft: false,
  }));
}
