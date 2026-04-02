// =====================================================
// Profile Builder Types
// =====================================================

export type BlockType =
  // Obligatorios (fijos)
  | 'hero_banner'           // Fijo arriba - todos los planes
  | 'recommended_talent'    // Fijo abajo - FREE obligatorio, pagos pueden eliminar
  // Core (ocultables, no eliminables)
  | 'about'
  | 'portfolio'
  | 'services'
  | 'stats'
  | 'reviews'
  | 'verified_reviews'     // Reseñas verificadas de clientes reales
  | 'pricing'
  // Premium Only
  | 'contact'               // Solo Premium
  | 'social_links'          // Solo Premium
  // Opcionales (contenido basico)
  | 'text_block'
  | 'video_embed'
  | 'image_gallery'
  | 'faq'
  | 'testimonials'
  | 'brands'
  | 'skills'
  | 'timeline'
  | 'divider'
  | 'spacer'
  // === BLOQUES AVANZADOS v3 ===
  // Layout avanzado
  | 'section'               // Contenedor con fondo personalizable
  | 'columns'               // Grid de 2-6 columnas responsivas
  | 'container'             // Wrapper con ancho maximo
  // Contenido avanzado
  | 'headline'              // Titulo con animacion y gradiente
  | 'button'                // CTA personalizable
  | 'icon_list'             // Lista con iconos
  | 'countdown'             // Contador regresivo
  // Conversion (landing page)
  | 'cta_banner'            // Banner de llamada a accion
  | 'whatsapp_button'       // Boton flotante WhatsApp
  | 'case_study'            // Casos de exito con metricas (vertical)
  // Media avanzado
  | 'carousel';

export type BlockCategory = 'required' | 'core' | 'content' | 'media' | 'layout' | 'conversion';

export interface BlockStyles {
  // Layout basico
  backgroundColor?: string;
  textColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  width?: 'full' | 'wide' | 'normal' | 'narrow' | 'custom';
  customWidth?: string;
  maxWidth?: string;
  // Fondos avanzados (v3)
  backgroundType?: 'color' | 'gradient' | 'image';
  backgroundGradient?: string;
  backgroundImage?: string;
  backgroundOpacity?: number; // 0-100
  backgroundOverlay?: string; // Color del overlay
  backgroundOverlayStyle?: 'none' | 'full' | 'gradient-bottom' | 'gradient-top' | 'gradient-center';
  backgroundOverlayIntensity?: number; // 0-100
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundSize?: 'cover' | 'contain' | 'auto';
  // Texto avanzado
  textAlign?: 'left' | 'center' | 'right';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Bordes
  borderWidth?: string;
  borderColor?: string;
  // Animaciones (v3)
  animation?: string; // ID de animacion (fadeIn, slideUp, etc.)
  animationDelay?: number;
  animationDuration?: number;
  animationEasing?: string;
  animationTrigger?: 'load' | 'scroll' | 'hover';
  // Responsivo
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  mobileOrder?: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE BUILDER PRO - Herramientas de diseño avanzadas
  // ═══════════════════════════════════════════════════════════════════════════

  // Gradientes avanzados
  gradientType?: 'linear' | 'radial' | 'conic';
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; position: number }>;

  // Tipografia custom
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  lineHeight?: string;
  letterSpacing?: string;

  // Bordes avanzados
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidthCustom?: { top: string; right: string; bottom: string; left: string };
  borderRadiusCustom?: { tl: string; tr: string; br: string; bl: string };

  // Sombras multiples
  boxShadows?: Array<{
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    inset?: boolean;
  }>;

  // Spacing pixel-perfect
  paddingCustom?: { top: string; right: string; bottom: string; left: string };
  marginCustom?: { top: string; right: string; bottom: string; left: string };

  // Responsive overrides (solo para estilos)
  responsiveOverrides?: {
    mobile?: Partial<Omit<BlockStyles, 'responsiveOverrides'>>;
    tablet?: Partial<Omit<BlockStyles, 'responsiveOverrides'>>;
  };
}

// =====================================================
// Sistema Responsive por Dispositivo
// =====================================================

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

/**
 * Overrides completos por dispositivo
 * Permite personalizar config, content y styles para cada breakpoint
 */
export interface DeviceOverrides {
  tablet?: {
    config?: Record<string, unknown>;
    content?: Record<string, unknown>;
    styles?: Partial<BlockStyles>;
  };
  mobile?: {
    config?: Record<string, unknown>;
    content?: Record<string, unknown>;
    styles?: Partial<BlockStyles>;
  };
}

// Tipo para data bindings
export interface DataBinding {
  id: string;
  fieldPath: string;
  source: 'profile' | 'portfolio' | 'reviews' | 'marketplace' | 'reputation';
  sourceField: string;
  fallbackValue: string | number;
  format?: {
    type: 'number' | 'currency' | 'percentage' | 'date' | 'text';
    locale?: string;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
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
  // Nuevas propiedades v2
  isFixed?: boolean;              // No se puede mover de posición
  fixedPosition?: 'top' | 'bottom'; // Posición fija (si isFixed=true)
  requiresPlan?: 'creator_pro' | 'creator_premium'; // Plan mínimo requerido
  freeCanDelete?: boolean;        // Si FREE puede eliminar (default: true si isDeletable)
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
  dataBindings?: DataBinding[];
  /** Bloques anidados (para contenedores como columns, section) */
  children?: ProfileBlock[];
  /** ID del bloque padre (si esta anidado) */
  parentId?: string;
  /** Indice de columna dentro de un contenedor columns */
  columnIndex?: number;
  /** Overrides por dispositivo (tablet/mobile) */
  deviceOverrides?: DeviceOverrides;
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
    banner_url: string | null;
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
  | { type: 'TOGGLE_BLOCK_VISIBILITY'; payload: string }
  // Acciones para contenedores
  | { type: 'ADD_BLOCK_TO_CONTAINER'; payload: { parentId: string; block: ProfileBlock; columnIndex?: number } }
  | { type: 'REMOVE_FROM_CONTAINER'; payload: { parentId: string; blockId: string } }
  | { type: 'MOVE_BLOCK_TO_COLUMN'; payload: { parentId: string; blockId: string; newColumnIndex: number } };

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
  // Para MediaLibraryPicker
  userId?: string;
  creatorProfileId?: string;
  // Para contenedores (columns, container, section)
  renderChild?: (child: ProfileBlock) => React.ReactNode;
  onAddBlockToColumn?: (columnIndex: number) => void;
  onRemoveChild?: (childId: string) => void;
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
    maxInstances: 0, // Sin limite
    defaultConfig: {
      // Fondo
      backgroundType: 'color',
      backgroundColor: '#1a1a2e',
      backgroundOpacity: 100,
      // Layout
      layout: 'horizontal',
      avatarPosition: 'left',
      avatarSize: 'lg',
      avatarShape: 'rounded',
      contentAlign: 'left',
      minHeight: 'md',
      // Contenido opcional (avatar y nombre siempre visibles)
      showRole: true,
      showTagline: true,
      showCTA: true,
      showSocialLinks: false,
      // CTA
      ctaText: 'Ver Portfolio',
      ctaAction: 'scroll-portfolio',
      ctaStyle: 'solid',
      ctaUrl: '',
      ctaWhatsapp: '',
      ctaWhatsappMessage: 'Hola! Vi tu perfil en Kreoon',
      // Premium
      premiumCtaEnabled: false,
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'none',
    },
  },
  recommended_talent: {
    type: 'recommended_talent',
    label: 'Talento Similar',
    icon: 'Users',
    description: 'Muestra creadores similares - ayuda al descubrimiento',
    category: 'required',
    isRequired: true,
    isDeletable: true, // Técnicamente eliminable...
    maxInstances: 0, // Sin limite
    defaultConfig: {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'lg',
      backgroundColor: 'rgba(139, 92, 246, 0.05)',
      borderRadius: 'lg',
    },
    // Solo planes pagos pueden eliminar
    freeCanDelete: false,
  },
  about: {
    type: 'about',
    label: 'Acerca de',
    icon: 'User',
    description: 'Bio extendida con formato de texto',
    category: 'core',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    isDeletable: true,
    maxInstances: 0, // Sin limite
    defaultConfig: {
      showEmail: true,
      showButton: true,
      buttonText: 'Enviar mensaje',
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'md',
    },
    // v2: Solo Premium puede usar contacto directo
    requiresPlan: 'creator_premium',
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
    description: 'Links a redes sociales clickeables',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
    defaultConfig: {
      layout: 'horizontal',
      showLabels: false,
    },
    defaultStyles: {
      padding: 'sm',
      margin: 'sm',
    },
    // v2: Solo Premium puede mostrar links clickeables
    requiresPlan: 'creator_premium',
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    icon: 'HelpCircle',
    description: 'Preguntas frecuentes',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
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
    maxInstances: 0, // Sin limite
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
    maxInstances: 0, // Sin limite
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
    maxInstances: 0, // Sin limite
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
    maxInstances: 0, // Sin limite
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

  // =====================================================
  // BLOQUES AVANZADOS v3 - Layout
  // =====================================================

  section: {
    type: 'section',
    label: 'Seccion',
    icon: 'LayoutTemplate',
    description: 'Contenedor con fondo personalizable (imagen, video, gradiente)',
    category: 'layout',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      backgroundType: 'color', // color | gradient | image | video
      fullWidth: true,
      minHeight: 'auto',
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'none',
    },
    requiresPlan: 'creator_pro',
  },

  columns: {
    type: 'columns',
    label: 'Columnas',
    icon: 'Columns3',
    description: 'Grid de 2-6 columnas responsivas',
    category: 'layout',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      columns: 2,
      gap: 'md',
      mobileStack: true,
      equalHeight: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
    requiresPlan: 'creator_pro',
  },

  container: {
    type: 'container',
    label: 'Contenedor',
    icon: 'BoxSelect',
    description: 'Wrapper con ancho maximo centrado',
    category: 'layout',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      maxWidth: '1200px',
      centered: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'none',
    },
  },

  
  // =====================================================
  // BLOQUES AVANZADOS v3 - Contenido
  // =====================================================

  headline: {
    type: 'headline',
    label: 'Titulo Grande',
    icon: 'Heading1',
    description: 'Titulo destacado con animacion y gradiente opcional',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      text: 'Tu titulo aqui',
      size: 'xl', // sm | md | lg | xl | 2xl
      tag: 'h2', // h1 | h2 | h3
      gradient: false,
      gradientColors: ['#8B5CF6', '#EC4899'],
    },
    defaultStyles: {
      padding: 'md',
      margin: 'sm',
      textAlign: 'center',
      animation: 'fade-in',
    },
  },

  button: {
    type: 'button',
    label: 'Boton CTA',
    icon: 'MousePointerClick',
    description: 'Boton de accion personalizable con icono',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      text: 'Click aqui',
      url: '#',
      target: '_self', // _self | _blank
      variant: 'primary', // primary | secondary | outline | ghost
      size: 'md', // sm | md | lg
      icon: null, // nombre de icono Lucide
      iconPosition: 'left', // left | right
      fullWidth: false,
    },
    defaultStyles: {
      padding: 'sm',
      margin: 'sm',
      textAlign: 'center',
    },
  },

  icon_list: {
    type: 'icon_list',
    label: 'Lista con Iconos',
    icon: 'ListChecks',
    description: 'Lista de items con iconos personalizables',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      items: [
        { id: '1', icon: 'Check', text: 'Beneficio 1' },
        { id: '2', icon: 'Check', text: 'Beneficio 2' },
        { id: '3', icon: 'Check', text: 'Beneficio 3' },
      ],
      iconColor: '#8B5CF6',
      layout: 'vertical', // vertical | horizontal | grid
      columns: 1,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
  },

  countdown: {
    type: 'countdown',
    label: 'Contador',
    icon: 'Timer',
    description: 'Contador regresivo para urgencia',
    category: 'content',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
    defaultConfig: {
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
      completedText: 'Oferta terminada',
      style: 'cards', // cards | inline | minimal
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
      textAlign: 'center',
    },
    requiresPlan: 'creator_pro',
  },

  
  // =====================================================
  // BLOQUES AVANZADOS v3 - Conversion
  // =====================================================

  cta_banner: {
    type: 'cta_banner',
    label: 'Banner CTA',
    icon: 'Megaphone',
    description: 'Banner de llamada a accion con gradiente',
    category: 'conversion',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      headline: 'Listo para comenzar?',
      subtext: 'Contactame hoy y hagamos realidad tu proyecto',
      buttonText: 'Contactar ahora',
      buttonUrl: '#contact',
      showSecondaryButton: false,
      secondaryButtonText: 'Ver portfolio',
      secondaryButtonUrl: '#portfolio',
    },
    defaultStyles: {
      padding: 'xl',
      margin: 'lg',
      borderRadius: 'lg',
      backgroundGradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      textAlign: 'center',
    },
    requiresPlan: 'creator_pro',
  },

  
  whatsapp_button: {
    type: 'whatsapp_button',
    label: 'WhatsApp',
    icon: 'MessageCircle',
    description: 'Boton flotante de WhatsApp',
    category: 'conversion',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
    defaultConfig: {
      phone: '',
      message: 'Hola! Vi tu perfil en Kreoon y me gustaria contactarte',
      position: 'bottom-right', // bottom-right | bottom-left
      showOnMobile: true,
      showOnDesktop: true,
      pulseAnimation: true,
    },
    defaultStyles: {},
    requiresPlan: 'creator_premium',
  },

  
  case_study: {
    type: 'case_study',
    label: 'Casos de Exito',
    icon: 'Trophy',
    description: 'Muestra resultados con metricas y testimonios',
    category: 'conversion',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
    defaultConfig: {
      layout: 'carousel', // carousel | grid
      showMetrics: true,
      showTestimonials: true,
      autoplay: false,
      autoplayInterval: 5000,
    },
    defaultStyles: {
      padding: 'lg',
      margin: 'md',
    },
    requiresPlan: 'creator_pro',
  },

  verified_reviews: {
    type: 'verified_reviews',
    label: 'Reseñas Verificadas',
    icon: 'BadgeCheck',
    description: 'Reseñas reales de clientes verificados',
    category: 'conversion',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0, // Sin limite
    defaultConfig: {
      layout: 'grid', // grid | carousel | featured
      maxItems: 6,
      showStats: true,
      showCompany: true,
      showDate: true,
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
    requiresPlan: 'creator_pro',
  },

  // =====================================================
  // BLOQUES AVANZADOS v3 - Media
  // =====================================================

  carousel: {
    type: 'carousel',
    label: 'Carrusel',
    icon: 'GalleryHorizontal',
    description: 'Carrusel multiproposito con autoplay',
    category: 'media',
    isRequired: false,
    isDeletable: true,
    maxInstances: 0,
    defaultConfig: {
      items: [],
      autoplay: true,
      autoplayInterval: 5000,
      showDots: true,
      showArrows: true,
      loop: true,
      slidesPerView: 1,
      gap: 'md',
    },
    defaultStyles: {
      padding: 'md',
      margin: 'md',
    },
    requiresPlan: 'creator_pro',
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

// =====================================================
// Helpers para Sistema Responsive
// =====================================================

/**
 * Resuelve la configuración efectiva de un bloque según el dispositivo
 * Herencia: desktop (base) -> tablet -> mobile
 */
export function resolveBlockForDevice(
  block: ProfileBlock,
  device: DeviceType
): { config: Record<string, unknown>; content: Record<string, unknown>; styles: BlockStyles } {
  // Desktop es la base
  if (device === 'desktop') {
    return {
      config: { ...block.config },
      content: { ...block.content },
      styles: { ...block.styles },
    };
  }

  const overrides = block.deviceOverrides?.[device];

  // Si no hay overrides para este dispositivo, heredar de desktop
  if (!overrides) {
    return {
      config: { ...block.config },
      content: { ...block.content },
      styles: { ...block.styles },
    };
  }

  return {
    config: { ...block.config, ...overrides.config },
    content: { ...block.content, ...overrides.content },
    styles: { ...block.styles, ...overrides.styles },
  };
}

/**
 * Actualiza los overrides de un dispositivo específico
 */
export function updateDeviceOverrides(
  block: ProfileBlock,
  device: DeviceType,
  updates: {
    config?: Record<string, unknown>;
    content?: Record<string, unknown>;
    styles?: Partial<BlockStyles>;
  }
): DeviceOverrides {
  if (device === 'desktop') {
    // Desktop no tiene overrides, es la base
    return block.deviceOverrides || {};
  }

  const currentOverrides = block.deviceOverrides || {};
  const deviceOverrides = currentOverrides[device] || {};

  return {
    ...currentOverrides,
    [device]: {
      config: updates.config
        ? { ...deviceOverrides.config, ...updates.config }
        : deviceOverrides.config,
      content: updates.content
        ? { ...deviceOverrides.content, ...updates.content }
        : deviceOverrides.content,
      styles: updates.styles
        ? { ...deviceOverrides.styles, ...updates.styles }
        : deviceOverrides.styles,
    },
  };
}

/**
 * Verifica si un bloque tiene overrides para un dispositivo
 */
export function hasDeviceOverrides(block: ProfileBlock, device: DeviceType): boolean {
  if (device === 'desktop') return false;
  const overrides = block.deviceOverrides?.[device];
  if (!overrides) return false;
  return !!(
    (overrides.config && Object.keys(overrides.config).length > 0) ||
    (overrides.content && Object.keys(overrides.content).length > 0) ||
    (overrides.styles && Object.keys(overrides.styles).length > 0)
  );
}

/**
 * Limpia overrides vacíos o iguales al base
 */
export function cleanDeviceOverrides(
  block: ProfileBlock,
  device: DeviceType
): DeviceOverrides | undefined {
  if (device === 'desktop') return block.deviceOverrides;

  const overrides = block.deviceOverrides?.[device];
  if (!overrides) return block.deviceOverrides;

  // Filtrar valores que son iguales al base
  const cleanConfig = overrides.config
    ? Object.fromEntries(
        Object.entries(overrides.config).filter(
          ([key, value]) => block.config[key] !== value
        )
      )
    : undefined;

  const cleanContent = overrides.content
    ? Object.fromEntries(
        Object.entries(overrides.content).filter(
          ([key, value]) => block.content[key] !== value
        )
      )
    : undefined;

  const cleanStyles = overrides.styles
    ? Object.fromEntries(
        Object.entries(overrides.styles).filter(
          ([key, value]) => (block.styles as Record<string, unknown>)[key] !== value
        )
      ) as Partial<BlockStyles>
    : undefined;

  const hasClean =
    (cleanConfig && Object.keys(cleanConfig).length > 0) ||
    (cleanContent && Object.keys(cleanContent).length > 0) ||
    (cleanStyles && Object.keys(cleanStyles).length > 0);

  if (!hasClean) {
    // No hay overrides significativos, eliminar el dispositivo
    const { [device]: _, ...rest } = block.deviceOverrides || {};
    return Object.keys(rest).length > 0 ? rest : undefined;
  }

  return {
    ...block.deviceOverrides,
    [device]: {
      ...(cleanConfig && Object.keys(cleanConfig).length > 0 && { config: cleanConfig }),
      ...(cleanContent && Object.keys(cleanContent).length > 0 && { content: cleanContent }),
      ...(cleanStyles && Object.keys(cleanStyles).length > 0 && { styles: cleanStyles }),
    },
  };
}
