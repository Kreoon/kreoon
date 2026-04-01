// =====================================================
// Profile Builder Types
// =====================================================

export type BlockType =
  // Obligatorios
  | 'hero_banner'
  // Core (ocultables, no eliminables)
  | 'about'
  | 'portfolio'
  | 'services'
  | 'stats'
  | 'reviews'
  | 'pricing'
  | 'contact'
  // Opcionales
  | 'text_block'
  | 'video_embed'
  | 'image_gallery'
  | 'social_links'
  | 'faq'
  | 'testimonials'
  | 'brands'
  | 'skills'
  | 'timeline'
  | 'divider'
  | 'spacer';

export type BlockCategory = 'required' | 'core' | 'content' | 'media' | 'layout';

export interface BlockStyles {
  backgroundColor?: string;
  textColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  width?: 'full' | 'wide' | 'normal' | 'narrow';
}

export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  category: BlockCategory;
  isRequired: boolean;
  isDeletable: boolean;
  maxInstances: number; // 0 = ilimitadas
  defaultConfig: Record<string, unknown>;
  defaultStyles: BlockStyles;
}

export interface ProfileBlock {
  id: string;
  type: BlockType;
  orderIndex: number;
  isVisible: boolean;
  isDraft: boolean;
  config: Record<string, unknown>;
  styles: BlockStyles;
  content: Record<string, unknown>;
}

export interface BuilderConfig {
  theme: 'light' | 'dark';
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  spacing: 'compact' | 'normal' | 'relaxed';
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
  showKreoonBranding: boolean;
}

export interface ProfileBuilderData {
  profile: {
    id: string;
    user_id: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    builder_config: BuilderConfig;
    builder_template: string | null;
    builder_has_draft: boolean;
  };
  blocks: ProfileBlock[];
}

// Estado del builder
export interface BuilderState {
  blocks: ProfileBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  builderConfig: BuilderConfig;
}

export type BuilderAction =
  | { type: 'SET_BLOCKS'; payload: ProfileBlock[] }
  | { type: 'ADD_BLOCK'; payload: { block: ProfileBlock; atIndex?: number } }
  | { type: 'REMOVE_BLOCK'; payload: string }
  | { type: 'UPDATE_BLOCK'; payload: { id: string; updates: Partial<ProfileBlock> } }
  | { type: 'REORDER_BLOCKS'; payload: { activeId: string; overId: string } }
  | { type: 'SELECT_BLOCK'; payload: string | null }
  | { type: 'SET_PREVIEW_DEVICE'; payload: 'desktop' | 'tablet' | 'mobile' }
  | { type: 'SET_BUILDER_CONFIG'; payload: Partial<BuilderConfig> }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'TOGGLE_BLOCK_VISIBILITY'; payload: string };

// Templates
export type TemplateName = 'minimalista' | 'creativo' | 'profesional' | 'influencer' | 'freelancer';

export interface ProfileTemplate {
  name: TemplateName;
  label: string;
  description: string;
  preview: string; // URL de preview
  blocks: Omit<ProfileBlock, 'id' | 'isDraft'>[];
  config: BuilderConfig;
}

// Props para componentes de bloques
export interface BlockProps {
  block: ProfileBlock;
  isEditing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}

export interface BlockWrapperProps {
  block: ProfileBlock;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onToggleVisibility: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
}

// Definiciones de bloques
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  hero_banner: {
    type: 'hero_banner',
    label: 'Banner Principal',
    icon: 'Image',
    description: 'Banner superior con avatar, nombre y bio',
    category: 'required',
    isRequired: true,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Contactar',
      layout: 'centered',
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'none',
    },
  },
  about: {
    type: 'about',
    label: 'Acerca de',
    icon: 'User',
    description: 'Bio extendida con formato de texto',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {},
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  portfolio: {
    type: 'portfolio',
    label: 'Portfolio',
    icon: 'Grid3X3',
    description: 'Galeria de trabajos y proyectos',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      layout: 'grid',
      columns: 3,
      showTitles: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  services: {
    type: 'services',
    label: 'Servicios',
    icon: 'Briefcase',
    description: 'Lista de servicios ofrecidos',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      layout: 'cards',
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  stats: {
    type: 'stats',
    label: 'Estadisticas',
    icon: 'BarChart3',
    description: 'Metricas y numeros destacados',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      showFollowers: true,
      showProjects: true,
      showRating: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  reviews: {
    type: 'reviews',
    label: 'Resenas',
    icon: 'Star',
    description: 'Resenas y testimonios de clientes',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      layout: 'carousel',
      maxItems: 5,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  pricing: {
    type: 'pricing',
    label: 'Precios',
    icon: 'DollarSign',
    description: 'Paquetes y precios de servicios',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      layout: 'cards',
      showCurrency: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  contact: {
    type: 'contact',
    label: 'Contacto',
    icon: 'Mail',
    description: 'Seccion de contacto y CTA',
    category: 'core',
    isRequired: false,
    isDeletable: false,
    maxInstances: 1,
    defaultConfig: {
      showEmail: true,
      showButton: true,
      buttonText: 'Enviar mensaje',
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'md',
    },
  },
  text_block: {
    type: 'text_block',
    label: 'Texto',
    icon: 'Type',
    description: 'Bloque de texto libre con formato',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {},
    defaultStyles: {
      padding: 'md',
      margin: 'sm',
    },
  },
  video_embed: {
    type: 'video_embed',
    label: 'Video',
    icon: 'Video',
    description: 'Video de YouTube, Vimeo o Bunny',
    category: 'media',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      autoplay: false,
      muted: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
      borderRadius: 'md',
    },
  },
  image_gallery: {
    type: 'image_gallery',
    label: 'Galeria',
    icon: 'Images',
    description: 'Galeria de imagenes adicional',
    category: 'media',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      columns: 3,
      gap: 'md',
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  social_links: {
    type: 'social_links',
    label: 'Redes Sociales',
    icon: 'Share2',
    description: 'Links a redes sociales',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 1,
    defaultConfig: {
      layout: 'horizontal',
      showLabels: false,
    },
    defaultStyles: {
      padding: 'sm',
      margin: 'sm',
    },
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    icon: 'HelpCircle',
    description: 'Preguntas frecuentes',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 1,
    defaultConfig: {
      allowMultipleOpen: false,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonios',
    icon: 'MessageSquare',
    description: 'Testimonios destacados',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 1,
    defaultConfig: {
      layout: 'grid',
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  brands: {
    type: 'brands',
    label: 'Marcas',
    icon: 'Building',
    description: 'Logos de marcas colaboradoras',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 1,
    defaultConfig: {
      grayscale: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  skills: {
    type: 'skills',
    label: 'Habilidades',
    icon: 'Sparkles',
    description: 'Habilidades con barras de progreso',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 1,
    defaultConfig: {
      showPercentage: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  timeline: {
    type: 'timeline',
    label: 'Timeline',
    icon: 'Clock',
    description: 'Linea de tiempo / experiencia',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 1,
    defaultConfig: {
      layout: 'vertical',
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },
  divider: {
    type: 'divider',
    label: 'Divisor',
    icon: 'Minus',
    description: 'Linea separadora',
    category: 'layout',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      style: 'solid',
      width: 'full',
    },
    defaultStyles: {
      margin: 'md',
    },
  },
  spacer: {
    type: 'spacer',
    label: 'Espacio',
    icon: 'Square',
    description: 'Espacio en blanco',
    category: 'layout',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      height: 'md',
    },
    defaultStyles: {},
  },
};

// Helper para obtener bloques por categoria
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return Object.values(BLOCK_DEFINITIONS).filter(b => b.category === category);
}

// Helper para crear bloque nuevo
export function createBlock(type: BlockType, orderIndex: number): ProfileBlock {
  const definition = BLOCK_DEFINITIONS[type];
  return {
    id: crypto.randomUUID(),
    type,
    orderIndex,
    isVisible: true,
    isDraft: false,
    config: { ...definition.defaultConfig },
    styles: { ...definition.defaultStyles },
    content: {},
  };
}

// Default builder config
export const DEFAULT_BUILDER_CONFIG: BuilderConfig = {
  theme: 'dark',
  accentColor: '#8B5CF6',
  fontHeading: 'inter',
  fontBody: 'inter',
  spacing: 'normal',
  borderRadius: 'md',
  showKreoonBranding: true,
};

// Constante de limite de bloques
export const MAX_BLOCKS = 15;
