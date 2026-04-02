// =====================================================
// Profile Templates - Plantillas predefinidas por tier
// =====================================================

import type { ProfileTemplate, ProfileBlock, BuilderConfig, BlockType, BlockStyles } from '../types/profile-builder';
import { BLOCK_DEFINITIONS } from '../types/profile-builder';

// Helper para crear bloques de plantilla con estilos heredados de BLOCK_DEFINITIONS
function createTemplateBlock(
  type: BlockType,
  orderIndex: number,
  config: Record<string, unknown> = {},
  content: Record<string, unknown> = {},
  customStyles: Partial<BlockStyles> = {}
): Omit<ProfileBlock, 'id' | 'isDraft'> | null {
  const definition = BLOCK_DEFINITIONS[type];

  // Si el bloque no existe en BLOCK_DEFINITIONS, retornar null
  if (!definition) {
    console.warn(`[ProfileTemplates] Block type "${type}" not found in BLOCK_DEFINITIONS, skipping`);
    return null;
  }

  return {
    type,
    orderIndex,
    isVisible: true,
    // Merge: defaultConfig de BLOCK_DEFINITIONS + config de plantilla
    config: { ...definition.defaultConfig, ...config },
    // Merge: defaultStyles de BLOCK_DEFINITIONS + estilos custom de plantilla
    styles: { ...definition.defaultStyles, ...customStyles },
    content,
  };
}

// =====================================================
// PLANTILLAS FREE
// =====================================================

export const TEMPLATE_MINIMALISTA: ProfileTemplate = {
  name: 'minimalista',
  label: 'Minimalista',
  description: 'Perfil limpio y elegante. Ideal para profesionales que valoran la simplicidad.',
  preview: '/templates/minimalista.png',
  config: {
    theme: 'dark',
    accentColor: '#8B5CF6',
    fontHeading: 'inter',
    fontBody: 'inter',
    spacing: 'relaxed',
    borderRadius: 'lg',
    showKreoonBranding: true,
  },
  blocks: [
    createTemplateBlock('hero_banner', 0, {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Ver servicios',
      layout: 'centered',
    }),
    createTemplateBlock('about', 1, {}, {
      title: 'Sobre mi',
      text: 'Profesional apasionado por crear experiencias excepcionales.',
    }),
    createTemplateBlock('portfolio', 2, {
      layout: 'grid',
      columns: 3,
      showTitles: true,
    }),
    createTemplateBlock('services', 3, {
      layout: 'cards',
    }),
    createTemplateBlock('pricing', 4, {
      layout: 'cards',
      showCurrency: true,
    }),
    createTemplateBlock('faq', 5, {
      allowMultipleOpen: false,
    }),
    createTemplateBlock('recommended_talent', 6, {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    }),
  ],
};

export const TEMPLATE_CREATIVO: ProfileTemplate = {
  name: 'creativo',
  label: 'Creativo',
  description: 'Perfil vibrante y dinamico. Perfecto para artistas y creativos.',
  preview: '/templates/creativo.png',
  config: {
    theme: 'dark',
    accentColor: '#EC4899', // Pink accent
    fontHeading: 'poppins',
    fontBody: 'inter',
    spacing: 'normal',
    borderRadius: 'lg',
    showKreoonBranding: true,
  },
  blocks: [
    createTemplateBlock('hero_banner', 0, {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Trabajemos juntos',
      layout: 'left',
    }),
    createTemplateBlock('video_embed', 1, {
      autoplay: false,
      muted: true,
    }, {
      title: 'Mi showreel',
    }),
    createTemplateBlock('about', 2, {}, {
      title: 'Mi historia',
      text: 'Creador de contenido apasionado por contar historias visuales.',
    }),
    createTemplateBlock('portfolio', 3, {
      layout: 'masonry',
      columns: 2,
      showTitles: true,
    }),
    createTemplateBlock('stats', 4, {
      showFollowers: true,
      showProjects: true,
      showRating: true,
    }),
    createTemplateBlock('services', 5, {
      layout: 'list',
    }),
    createTemplateBlock('testimonials', 6, {
      layout: 'carousel',
    }),
    createTemplateBlock('pricing', 7, {
      layout: 'cards',
      showCurrency: true,
    }),
    createTemplateBlock('brands', 8, {
      grayscale: false,
    }),
    createTemplateBlock('faq', 9, {
      allowMultipleOpen: true,
    }),
    createTemplateBlock('recommended_talent', 10, {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    }),
  ],
};

export const TEMPLATE_PROFESIONAL: ProfileTemplate = {
  name: 'profesional',
  label: 'Profesional B2B',
  description: 'Perfil corporativo y confiable. Ideal para consultores y agencias.',
  preview: '/templates/profesional.png',
  config: {
    theme: 'dark',
    accentColor: '#10B981', // Green accent
    fontHeading: 'inter',
    fontBody: 'inter',
    spacing: 'normal',
    borderRadius: 'md',
    showKreoonBranding: true,
  },
  blocks: [
    createTemplateBlock('hero_banner', 0, {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Solicitar cotizacion',
      layout: 'centered',
    }),
    createTemplateBlock('stats', 1, {
      showFollowers: false,
      showProjects: true,
      showRating: true,
      showClients: true,
      showYears: true,
    }),
    createTemplateBlock('about', 2, {}, {
      title: 'Nuestra propuesta de valor',
    }),
    createTemplateBlock('services', 3, {
      layout: 'cards',
    }),
    createTemplateBlock('portfolio', 4, {
      layout: 'grid',
      columns: 3,
      showTitles: true,
      showClients: true,
    }),
    createTemplateBlock('reviews', 5, {
      layout: 'grid',
      maxItems: 6,
    }),
    createTemplateBlock('brands', 6, {
      grayscale: true,
    }),
    createTemplateBlock('pricing', 7, {
      layout: 'cards',
      showCurrency: true,
    }),
    createTemplateBlock('faq', 8, {
      allowMultipleOpen: false,
    }),
    createTemplateBlock('recommended_talent', 9, {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    }),
  ],
};

// =====================================================
// PLANTILLAS PRO
// =====================================================

export const TEMPLATE_INFLUENCER: ProfileTemplate = {
  name: 'influencer',
  label: 'Influencer PRO',
  description: 'Landing page para influencers con CTA, WhatsApp y social proof.',
  preview: '/templates/influencer.png',
  config: {
    theme: 'dark',
    accentColor: '#F59E0B', // Amber accent
    fontHeading: 'poppins',
    fontBody: 'inter',
    spacing: 'normal',
    borderRadius: 'lg',
    showKreoonBranding: true,
  },
  blocks: [
    createTemplateBlock('hero_banner', 0, {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Colaboremos',
      layout: 'centered',
      showBadge: true,
    }),
    createTemplateBlock('stats', 1, {
      showFollowers: true,
      showProjects: true,
      showRating: true,
      showReach: true,
      showEngagement: true,
    }),
    // NUEVO: Headline con gradiente
    createTemplateBlock('headline', 2, {
      text: 'Transforma tu marca con contenido viral',
      size: 'xl',
      tag: 'h2',
      gradient: true,
      gradientColors: ['#F59E0B', '#EC4899'],
    }),
    createTemplateBlock('video_embed', 3, {
      autoplay: false,
      muted: true,
    }, {
      title: 'Mi mejor contenido',
    }),
    // NUEVO: Lista de beneficios con iconos
    createTemplateBlock('icon_list', 4, {
      items: [
        { id: '1', icon: 'Zap', text: 'Contenido viral optimizado para algoritmos' },
        { id: '2', icon: 'Users', text: '+1M de alcance combinado en redes' },
        { id: '3', icon: 'Target', text: 'Estrategia personalizada para tu marca' },
      ],
      iconColor: '#F59E0B',
      layout: 'vertical',
    }),
    createTemplateBlock('about', 5, {}, {
      title: 'Quien soy',
    }),
    createTemplateBlock('portfolio', 6, {
      layout: 'masonry',
      columns: 3,
      showTitles: true,
      showMetrics: true,
    }),
    // NUEVO: CTA Banner de conversion
    createTemplateBlock('cta_banner', 7, {
      headline: 'Listo para hacer viral tu marca?',
      subtext: 'Contactame hoy y creemos contenido increible juntos',
      buttonText: 'Agendar llamada',
      buttonUrl: '#contact',
      showSecondaryButton: true,
      secondaryButtonText: 'Ver portfolio',
      secondaryButtonUrl: '#portfolio',
    }),
    createTemplateBlock('services', 8, {
      layout: 'cards',
    }),
    // NUEVO: Social proof con logos
    createTemplateBlock('social_proof', 9, {
      headline: 'Marcas que confian en mi',
      layout: 'horizontal',
      grayscale: false,
      showTestimonials: true,
    }),
    createTemplateBlock('testimonials', 10, {
      layout: 'carousel',
    }),
    createTemplateBlock('pricing', 11, {
      layout: 'cards',
      showCurrency: true,
    }),
    createTemplateBlock('faq', 12, {
      allowMultipleOpen: true,
    }),
    // WhatsApp removido - solo disponible en PREMIUM
    createTemplateBlock('recommended_talent', 13, {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    }),
  ],
};

export const TEMPLATE_FREELANCER: ProfileTemplate = {
  name: 'freelancer',
  label: 'Freelancer PRO',
  description: 'Perfil profesional para freelancers. Muestra tu experiencia y habilidades.',
  preview: '/templates/freelancer.png',
  config: {
    theme: 'dark',
    accentColor: '#8B5CF6',
    fontHeading: 'inter',
    fontBody: 'inter',
    spacing: 'normal',
    borderRadius: 'md',
    showKreoonBranding: true,
  },
  blocks: [
    createTemplateBlock('hero_banner', 0, {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Solicitar cotizacion',
      layout: 'centered',
      showBadge: true,
    }),
    createTemplateBlock('about', 1, {}, {
      title: 'Mi especialidad',
    }),
    createTemplateBlock('portfolio', 2, {
      layout: 'grid',
      columns: 3,
      showTitles: true,
      showClients: true,
    }),
    createTemplateBlock('services', 3, {
      layout: 'cards',
    }),
    createTemplateBlock('stats', 4, {
      showFollowers: false,
      showProjects: true,
      showRating: true,
      showClients: true,
      showResponseTime: true,
    }),
    createTemplateBlock('pricing', 5, {
      layout: 'cards',
      showCurrency: true,
    }),
    createTemplateBlock('reviews', 6, {
      layout: 'carousel',
      maxItems: 5,
    }),
    createTemplateBlock('skills', 7, {
      showPercentage: true,
    }),
    createTemplateBlock('timeline', 8, {
      layout: 'vertical',
    }, {
      title: 'Mi experiencia',
    }),
    createTemplateBlock('brands', 9, {
      grayscale: true,
    }),
    createTemplateBlock('faq', 10, {
      allowMultipleOpen: false,
    }),
    createTemplateBlock('recommended_talent', 11, {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    }),
  ],
};

// =====================================================
// PLANTILLA PREMIUM
// =====================================================

export const TEMPLATE_AGENCIA: ProfileTemplate = {
  name: 'agencia' as any, // Extended template name
  label: 'Agencia Premium',
  description: 'Landing page completa tipo Webflow. Todos los bloques, formularios, y sin branding.',
  preview: '/templates/agencia.png',
  config: {
    theme: 'dark',
    accentColor: '#F59E0B', // Gold accent
    fontHeading: 'poppins',
    fontBody: 'inter',
    spacing: 'normal',
    borderRadius: 'lg',
    showKreoonBranding: false, // Premium puede ocultar
  },
  blocks: [
    createTemplateBlock('hero_banner', 0, {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Solicitar propuesta',
      layout: 'centered',
      showBadge: true,
      badgeType: 'premium',
    }),
    // NUEVO: Headline impactante
    createTemplateBlock('headline', 1, {
      text: 'Creamos contenido que convierte',
      size: '2xl',
      tag: 'h2',
      gradient: true,
      gradientColors: ['#F59E0B', '#EF4444'],
    }),
    createTemplateBlock('video_embed', 2, {
      autoplay: false,
      muted: true,
    }, {
      title: 'Showreel de la agencia',
    }),
    createTemplateBlock('stats', 3, {
      showFollowers: true,
      showProjects: true,
      showRating: true,
      showClients: true,
      showYears: true,
      showTeamSize: true,
    }),
    // NUEVO: Lista de beneficios
    createTemplateBlock('icon_list', 4, {
      items: [
        { id: '1', icon: 'Shield', text: 'Equipo certificado en Meta y Google Ads' },
        { id: '2', icon: 'Zap', text: 'Contenido entregado en 48-72 horas' },
        { id: '3', icon: 'Target', text: 'ROI garantizado o te devolvemos el dinero' },
        { id: '4', icon: 'Award', text: '+500 campanas exitosas ejecutadas' },
      ],
      iconColor: '#F59E0B',
      layout: 'grid',
      columns: 2,
    }),
    createTemplateBlock('about', 5, {}, {
      title: 'Nuestra mision',
    }),
    // NUEVO: CTA Banner mid-page
    createTemplateBlock('cta_banner', 6, {
      headline: 'Agenda una llamada estrategica gratis',
      subtext: 'Te mostramos como podemos escalar tu marca en 30 minutos',
      buttonText: 'Agendar ahora',
      buttonUrl: '#contact',
      showSecondaryButton: false,
    }),
    createTemplateBlock('portfolio', 7, {
      layout: 'masonry',
      columns: 3,
      showTitles: true,
      showClients: true,
      showMetrics: true,
    }),
    // NUEVO: Carrusel de casos de exito
    createTemplateBlock('carousel', 8, {
      autoplay: true,
      autoplayInterval: 5000,
      showDots: true,
      showArrows: true,
      loop: true,
      slidesPerView: 1,
    }),
    createTemplateBlock('services', 9, {
      layout: 'cards',
    }),
    // NUEVO: Social proof
    createTemplateBlock('social_proof', 10, {
      headline: 'Confian en nosotros',
      layout: 'horizontal',
      grayscale: true,
      showTestimonials: true,
    }),
    createTemplateBlock('pricing', 11, {
      layout: 'cards',
      showCurrency: true,
    }),
    // NUEVO: Countdown para urgencia
    createTemplateBlock('countdown', 12, {
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
      completedText: 'Oferta terminada',
      style: 'cards',
    }),
    createTemplateBlock('testimonials', 13, {
      layout: 'grid',
    }),
    createTemplateBlock('reviews', 14, {
      layout: 'carousel',
      maxItems: 8,
    }),
    createTemplateBlock('brands', 15, {
      grayscale: false,
    }),
    createTemplateBlock('timeline', 16, {
      layout: 'vertical',
    }, {
      title: 'Nuestra historia',
    }),
    // PREMIUM: Formulario de captura
    createTemplateBlock('lead_form', 17, {
      fields: [
        { id: '1', type: 'text', label: 'Nombre', required: true },
        { id: '2', type: 'email', label: 'Email corporativo', required: true },
        { id: '3', type: 'text', label: 'Empresa', required: true },
        { id: '4', type: 'textarea', label: 'Cuentanos sobre tu proyecto', required: false },
      ],
      submitText: 'Solicitar propuesta',
      successMessage: 'Gracias! Te contactaremos en menos de 24 horas.',
    }),
    // PREMIUM: Contact block
    createTemplateBlock('contact', 18, {
      showEmail: true,
      showPhone: true,
      showWhatsApp: true,
      showAddress: true,
      showButton: true,
      buttonText: 'Enviar mensaje',
    }),
    // PREMIUM: Social links clickeables
    createTemplateBlock('social_links', 19, {
      layout: 'horizontal',
      showLabels: true,
      showFollowers: true,
    }),
    createTemplateBlock('faq', 20, {
      allowMultipleOpen: true,
    }),
    // PREMIUM: WhatsApp flotante
    createTemplateBlock('whatsapp_button', 21, {
      phone: '',
      message: 'Hola! Quiero saber mas sobre los servicios de la agencia',
      position: 'bottom-right',
      showOnMobile: true,
      showOnDesktop: true,
      pulseAnimation: true,
    }),
    createTemplateBlock('recommended_talent', 22, {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    }),
  ],
};

// =====================================================
// EXPORT: Todas las plantillas organizadas por tier
// =====================================================

// Helper para filtrar bloques null (bloques que no existen en BLOCK_DEFINITIONS)
function filterValidBlocks(template: ProfileTemplate): ProfileTemplate {
  return {
    ...template,
    blocks: template.blocks.filter((block): block is Omit<ProfileBlock, 'id' | 'isDraft'> => block !== null),
  };
}

export const FREE_TEMPLATES: ProfileTemplate[] = [
  filterValidBlocks(TEMPLATE_MINIMALISTA),
  filterValidBlocks(TEMPLATE_CREATIVO),
  filterValidBlocks(TEMPLATE_PROFESIONAL),
];

export const PRO_TEMPLATES: ProfileTemplate[] = [
  filterValidBlocks(TEMPLATE_INFLUENCER),
  filterValidBlocks(TEMPLATE_FREELANCER),
];

export const PREMIUM_TEMPLATES: ProfileTemplate[] = [
  filterValidBlocks(TEMPLATE_AGENCIA),
];

export const ALL_TEMPLATES: ProfileTemplate[] = [
  ...FREE_TEMPLATES,
  ...PRO_TEMPLATES,
  ...PREMIUM_TEMPLATES,
];

// Helper para obtener plantillas disponibles segun tier
export function getTemplatesForTier(tier: 'creator_free' | 'creator_pro' | 'creator_premium'): ProfileTemplate[] {
  switch (tier) {
    case 'creator_premium':
      return ALL_TEMPLATES;
    case 'creator_pro':
      return [...FREE_TEMPLATES, ...PRO_TEMPLATES];
    default:
      return FREE_TEMPLATES;
  }
}

// Helper para obtener tier requerido para una plantilla
export function getRequiredTierForTemplate(templateName: string): 'creator_free' | 'creator_pro' | 'creator_premium' {
  if (PREMIUM_TEMPLATES.some(t => t.name === templateName)) {
    return 'creator_premium';
  }
  if (PRO_TEMPLATES.some(t => t.name === templateName)) {
    return 'creator_pro';
  }
  return 'creator_free';
}
