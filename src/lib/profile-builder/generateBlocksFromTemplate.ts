/**
 * Genera bloques del Profile Builder usando una plantilla + datos del creador.
 *
 * Flujo:
 * 1. Toma la estructura de bloques de la plantilla (tipos, orden, config)
 * 2. Rellena el contenido con los datos reales del creador
 * 3. Retorna bloques listos para renderizar con PublicBlockRenderer
 */

import type { ProfileBlock, BlockType, ProfileTemplate } from '@/components/profile-builder/types/profile-builder';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

// Helper para obtener thumbnail de Bunny CDN
function getVideoThumbnail(mediaUrl: string, fallbackThumbnail?: string | null): string {
  const bunnyUrls = getBunnyVideoUrls(mediaUrl);
  if (bunnyUrls?.thumbnail) {
    return bunnyUrls.thumbnail;
  }
  return fallbackThumbnail || mediaUrl;
}

// ─── Tipos de datos del creador ────────────────────────────────────────────────

export interface CreatorDataForTemplate {
  profile: {
    id: string;
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
    banner_url?: string | null;
    bio?: string | null;
    bio_full?: string | null;
    location_city?: string | null;
    location_country?: string | null;
    categories?: string[] | null;
    content_types?: string[] | null;
    level?: string | null;
    is_verified?: boolean;
    rating_avg?: number;
    rating_count?: number;
    base_price?: number;
    currency?: string;
    languages?: string[] | null;
    completed_projects?: number;
    response_time_hours?: number;
    on_time_delivery_pct?: number;
    repeat_clients_pct?: number;
    social_links?: Record<string, string | null>;
    platforms?: string[] | null;
    is_available?: boolean;
    accepts_product_exchange?: boolean;
    exchange_conditions?: string | null;
    experience_level?: string | null;
    content_style?: string | null;
  };
  portfolioItems?: Array<{
    id: string;
    media_url: string;
    thumbnail_url?: string | null;
    media_type: string;
    title?: string | null;
    description?: string | null;
    metrics?: Record<string, unknown> | null;
    client_name?: string | null;
  }>;
  services?: Array<{
    id: string;
    title: string;
    description?: string | null;
    service_type: string;
    price_amount?: number | null;
    price_currency?: string | null;
    delivery_days?: number | null;
    revisions_included?: number;
    deliverables?: Array<{ item: string; quantity: number }> | null;
    is_featured?: boolean;
  }>;
  reviews?: Array<{
    id: string;
    brand_name?: string | null;
    campaign_type?: string | null;
    rating: number;
    text: string;
    date: string;
  }>;
  trustStats?: {
    completed_projects: number;
    marketplace_projects: number;
    org_projects: number;
    active_projects: number;
    cancelled_projects: number;
    rating_avg: number;
    rating_count: number;
    on_time_delivery_pct: number;
    response_time_hours: number;
    repeat_clients_pct: number;
    has_portfolio: boolean;
    portfolio_count: number;
    has_services: boolean;
    services_count: number;
    member_since: string;
    years_active: number;
  };
  specializations?: string[];
}

// ─── Mapeo de iconos por tipo de servicio ──────────────────────────────────────

const ICON_BY_SERVICE_TYPE: Record<string, string> = {
  ugc_video: 'Video',
  reels_tiktok: 'Smartphone',
  review: 'Star',
  unboxing: 'Package',
  testimonial: 'Star',
  tutorial: 'BookOpen',
  vsl: 'PlayCircle',
  photography: 'Camera',
  live_streaming: 'Video',
  consulting: 'MessageSquare',
  other: 'Video',
};

// ─── Funcion principal ─────────────────────────────────────────────────────────

/**
 * Genera bloques usando estructura de plantilla + datos del creador.
 */
export function generateBlocksFromTemplate(
  template: ProfileTemplate,
  creatorData: CreatorDataForTemplate
): ProfileBlock[] {
  const { profile, portfolioItems = [], services = [], reviews = [], trustStats } = creatorData;

  return template.blocks.map((templateBlock) => {
    const block: ProfileBlock = {
      id: crypto.randomUUID(),
      type: templateBlock.type,
      orderIndex: templateBlock.orderIndex,
      isVisible: true,
      isDraft: false,
      config: { ...templateBlock.config },
      styles: { ...templateBlock.styles },
      content: populateBlockContent(templateBlock.type, creatorData, templateBlock),
    };

    return block;
  });
}

// ─── Poblar contenido segun tipo de bloque ─────────────────────────────────────

function populateBlockContent(
  blockType: BlockType,
  data: CreatorDataForTemplate,
  templateBlock: ProfileTemplate['blocks'][0]
): Record<string, unknown> {
  const { profile, portfolioItems = [], services = [], reviews = [], trustStats } = data;

  switch (blockType) {
    case 'hero_banner':
      return {
        headline: profile.display_name,
        subheadline: profile.bio || `Creador de contenido en ${profile.location_country || 'LATAM'}`,
        avatarUrl: profile.avatar_url || '',
        backgroundImage: profile.banner_url || '',
        showAvatar: true,
        showBadge: profile.is_verified,
        badgeText: profile.level || 'Creador',
        ctaText: (templateBlock.content as any)?.ctaText || 'Solicitar cotizacion',
        ctaUrl: '#pricing',
        layout: (templateBlock.config as any)?.layout || 'center',
        overlayOpacity: 60,
      };

    case 'about':
      return {
        title: (templateBlock.content as any)?.title || 'Sobre mi',
        text: profile.bio_full || profile.bio || '',
        showLocation: true,
        location: profile.location_city && profile.location_country
          ? `${profile.location_city}, ${profile.location_country}`
          : profile.location_country || '',
        showLanguages: !!(profile.languages && profile.languages.length > 0),
        languages: profile.languages || [],
        showExperience: !!profile.experience_level,
        experienceLevel: profile.experience_level || '',
      };

    case 'stats':
      const statsConfig = templateBlock.config as any;
      const statsItems: Array<{ id: string; label: string; value: string; icon: 'users' | 'star' | 'briefcase' | 'eye' | 'heart' | 'trending' }> = [];

      if (statsConfig?.showProjects !== false) {
        statsItems.push({
          id: 'projects',
          value: String(trustStats?.completed_projects || profile.completed_projects || 0),
          label: 'Proyectos',
          icon: 'briefcase',
        });
      }
      if (statsConfig?.showRating !== false && (profile.rating_count || 0) > 0) {
        statsItems.push({
          id: 'rating',
          value: (profile.rating_avg || 0).toFixed(1),
          label: `${profile.rating_count} resenas`,
          icon: 'star',
        });
      }
      if (statsConfig?.showClients !== false && trustStats) {
        statsItems.push({
          id: 'clients',
          value: `${trustStats.repeat_clients_pct || 0}%`,
          label: 'Clientes recurrentes',
          icon: 'users',
        });
      }
      if (trustStats?.years_active) {
        statsItems.push({
          id: 'years',
          value: String(trustStats.years_active),
          label: 'Anos de experiencia',
          icon: 'trending',
        });
      }

      return { items: statsItems };

    case 'portfolio':
      return {
        items: portfolioItems.slice(0, (templateBlock.config as any)?.maxItems || 9).map((item) => ({
          id: item.id,
          type: item.media_type === 'video' ? 'video' : 'image',
          url: item.media_url,
          thumbnailUrl: item.media_type === 'video'
            ? getVideoThumbnail(item.media_url, item.thumbnail_url)
            : item.thumbnail_url || item.media_url,
          title: item.title || '',
        })),
      };

    case 'services':
      return {
        title: 'Servicios',
        items: services.map((svc) => ({
          id: svc.id,
          icon: ICON_BY_SERVICE_TYPE[svc.service_type] || 'Video',
          title: svc.title,
          description: svc.description || '',
          price: svc.price_amount
            ? `Desde ${svc.price_currency || profile.currency || 'USD'} $${svc.price_amount}`
            : undefined,
        })),
      };

    case 'pricing':
      // Generar paquetes con la estructura que espera PricingBlock
      const pricingPackages = services
        .filter((svc) => svc.price_amount && svc.price_amount > 0)
        .map((svc, idx) => {
          const features: string[] = [];
          if (svc.deliverables?.length) {
            svc.deliverables.forEach((d) => {
              features.push(d.quantity > 1 ? `${d.quantity}x ${d.item}` : d.item);
            });
          }
          if (svc.delivery_days) {
            features.push(`Entrega en ${svc.delivery_days} dias`);
          }
          if (svc.revisions_included && svc.revisions_included > 0) {
            features.push(`${svc.revisions_included} revision(es)`);
          }
          // Agregar al menos una feature si no hay
          if (features.length === 0) {
            features.push(svc.description || 'Servicio profesional');
          }

          return {
            id: svc.id,
            name: svc.title,
            price: String(svc.price_amount || 0),
            currency: svc.price_currency || profile.currency || 'USD',
            features,
            isPopular: svc.is_featured || idx === Math.floor(services.length / 2),
          };
        });

      // Si no hay servicios, usar paquetes por defecto
      const defaultPackages = [
        {
          id: 'default-1',
          name: 'Basico',
          price: String(profile.base_price || 200),
          currency: profile.currency || 'USD',
          features: ['1 contenido', 'Entrega en 5 dias', '1 revision'],
          isPopular: false,
        },
        {
          id: 'default-2',
          name: 'Estandar',
          price: String((profile.base_price || 200) * 2),
          currency: profile.currency || 'USD',
          features: ['3 contenidos', 'Entrega en 7 dias', '2 revisiones'],
          isPopular: true,
        },
      ];

      return {
        title: 'Paquetes',
        subtitle: profile.accepts_product_exchange
          ? `Tambien acepto intercambio de producto. ${profile.exchange_conditions || ''}`
          : undefined,
        packages: pricingPackages.length > 0 ? pricingPackages : defaultPackages,
      };

    case 'reviews':
      return {
        title: 'Resenas',
        items: reviews.slice(0, (templateBlock.config as any)?.maxItems || 6).map((r) => ({
          id: r.id,
          author: r.brand_name || 'Cliente',
          rating: r.rating,
          text: r.text,
          date: r.date ? new Date(r.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : undefined,
        })),
      };

    case 'faq':
      return {
        title: 'Preguntas Frecuentes',
        items: [
          {
            question: 'Cual es tu tiempo de entrega?',
            answer: profile.response_time_hours
              ? `Respondo en menos de ${profile.response_time_hours} horas y entrego proyectos en 3-7 dias.`
              : 'Normalmente entrego proyectos en 3-7 dias habiles.',
          },
          {
            question: 'Aceptas intercambio de producto?',
            answer: profile.accepts_product_exchange
              ? `Si, acepto productos a cambio de contenido. ${profile.exchange_conditions || ''}`
              : 'No acepto intercambio de productos, solo pagos.',
          },
          {
            question: 'Como es tu proceso de trabajo?',
            answer: 'Primero revisamos el brief, luego creo el contenido y lo entrego para revision. Incluyo revisiones segun el paquete.',
          },
        ],
      };

    case 'brands':
      return {
        title: 'Marcas con las que he trabajado',
        // Extraer nombres de clientes unicos del portfolio
        items: [...new Set(portfolioItems.map((p) => p.client_name).filter(Boolean))].map(
          (name) => ({
            name,
            logoUrl: '', // Se podria agregar si hay logos
          })
        ),
      };

    case 'social_links':
      const links = profile.social_links || {};
      return {
        items: Object.entries(links)
          .filter(([_, url]) => url)
          .map(([platform, url]) => ({
            platform,
            url: url || '',
            label: platform.charAt(0).toUpperCase() + platform.slice(1),
          })),
      };

    case 'testimonials':
      return {
        title: 'Lo que dicen mis clientes',
        items: reviews.slice(0, (templateBlock.config as any)?.maxItems || 4).map((r) => ({
          id: r.id,
          author: r.brand_name || 'Cliente',
          role: r.campaign_type || 'Proyecto',
          company: '',
          avatar: '',
          text: r.text,
        })),
      };

    case 'skills':
      // Usar categorias y content_types como skills
      const skillsFromCategories = (profile.categories || []).map((cat) => ({
        name: cat,
        level: 90,
      }));
      const skillsFromContent = (profile.content_types || []).map((ct) => ({
        name: ct,
        level: 85,
      }));
      return {
        title: 'Habilidades',
        showPercentage: (templateBlock.config as any)?.showPercentage ?? true,
        items: [...skillsFromCategories, ...skillsFromContent].slice(0, 8),
      };

    case 'video_embed':
      // Buscar primer video del portfolio
      const firstVideo = portfolioItems.find((p) => p.media_type === 'video');
      return {
        title: (templateBlock.content as any)?.title || 'Mi mejor contenido',
        videoUrl: firstVideo?.media_url || '',
        thumbnailUrl: firstVideo
          ? getVideoThumbnail(firstVideo.media_url, firstVideo.thumbnail_url)
          : '',
        autoplay: false,
      };

    case 'recommended_talent':
      return {
        title: 'Talento Similar',
        categories: profile.categories || [],
        maxItems: (templateBlock.config as any)?.maxItems || 4,
        excludeId: profile.id,
      };

    case 'contact':
      return {
        title: 'Contacto',
        showEmail: false,
        showPhone: false,
        showWhatsApp: true,
        showButton: true,
        buttonText: 'Enviar mensaje',
      };

    // Bloques sin contenido dinamico
    case 'divider':
    case 'spacer':
      return templateBlock.content || {};

    case 'text_block':
      return templateBlock.content || { text: '' };

    case 'image_gallery':
      return {
        title: 'Galeria',
        items: portfolioItems
          .filter((p) => p.media_type === 'image')
          .slice(0, 6)
          .map((p) => ({
            url: p.media_url,
            thumbnailUrl: p.thumbnail_url,
            title: p.title || '',
          })),
      };

    default:
      return templateBlock.content || {};
  }
}

export default generateBlocksFromTemplate;
