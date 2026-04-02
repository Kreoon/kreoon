/**
 * Genera bloques del Profile Builder desde datos existentes del creador.
 * Usa la plantilla "Profesional B2B" como base.
 */

import type { ProfileBlock } from '@/components/profile-builder/types/profile-builder';
import type { CreatorProfileData } from '@/hooks/useCreatorProfile';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';
import type { CreatorService } from '@/types/marketplace';
import type { CreatorReviewData, CreatorTrustStats } from '@/hooks/useCreatorPublicProfile';

export interface CreatorDataForBlocks {
  profile: CreatorProfileData;
  portfolioItems: PortfolioItemData[];
  services: CreatorService[];
  reviews: CreatorReviewData[];
  trustStats: CreatorTrustStats | null;
}

/**
 * Genera bloques auto-poblados desde los datos del creador.
 * No guarda en DB - solo para renderizado en memoria.
 */
export function generateBlocksFromProfile(data: CreatorDataForBlocks): ProfileBlock[] {
  const blocks: ProfileBlock[] = [];
  let orderIndex = 0;

  const { profile, portfolioItems, services, reviews, trustStats } = data;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HERO BANNER (siempre presente, fijo arriba)
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push({
    id: `auto-hero-${profile.id}`,
    type: 'hero_banner',
    orderIndex: orderIndex++,
    isVisible: true,
    isDraft: false,
    config: {
      showAvatar: true,
      showName: true,
      showBio: true,
      showCTA: true,
      ctaText: 'Contactar',
      layout: 'centered',
    },
    styles: {
      padding: 'lg',
      margin: 'none',
      borderRadius: 'none',
    },
    content: {
      headline: profile.display_name || 'Creador',
      subheadline: profile.bio || '',
      coverUrl: profile.banner_url || null,
      avatarUrl: profile.avatar_url || null,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. STATS (si tiene proyectos o calificaciones significativas)
  // ═══════════════════════════════════════════════════════════════════════════
  const hasStats =
    trustStats ||
    profile.completed_projects > 0 ||
    profile.rating_count > 0;

  if (hasStats) {
    blocks.push({
      id: `auto-stats-${profile.id}`,
      type: 'stats',
      orderIndex: orderIndex++,
      isVisible: true,
      isDraft: false,
      config: {
        showFollowers: false,
        showProjects: true,
        showRating: true,
        showClients: (trustStats?.unique_clients ?? 0) > 0,
        showResponseTime: true,
        showYears: false,
      },
      styles: {
        padding: 'md',
        margin: 'md',
        borderRadius: 'lg',
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
      },
      content: {
        // Datos se cargan dinámicamente por el bloque usando profile
        projects: profile.completed_projects,
        rating: profile.rating_avg,
        ratingCount: profile.rating_count,
        clients: trustStats?.unique_clients ?? 0,
        responseTime: trustStats?.response_time_hours ?? profile.response_time_hours ?? 24,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ABOUT (si tiene bio)
  // ═══════════════════════════════════════════════════════════════════════════
  const bioText = profile.bio_full || profile.bio;
  if (bioText) {
    blocks.push({
      id: `auto-about-${profile.id}`,
      type: 'about',
      orderIndex: orderIndex++,
      isVisible: true,
      isDraft: false,
      config: {},
      styles: {
        padding: 'md',
        margin: 'md',
        borderRadius: 'md',
      },
      content: {
        title: 'Acerca de mi',
        text: bioText,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SERVICES (si tiene servicios)
  // ═══════════════════════════════════════════════════════════════════════════
  if (services.length > 0) {
    blocks.push({
      id: `auto-services-${profile.id}`,
      type: 'services',
      orderIndex: orderIndex++,
      isVisible: true,
      isDraft: false,
      config: {
        layout: 'cards',
      },
      styles: {
        padding: 'md',
        margin: 'md',
        borderRadius: 'md',
      },
      content: {
        title: 'Mis Servicios',
        items: services.map((s) => ({
          id: s.id,
          title: s.title || 'Servicio',
          description: s.description || '',
          icon: getServiceIcon(s.service_type),
          price: s.price_amount ? `Desde $${s.price_amount} ${s.price_currency || 'USD'}` : '',
        })),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PORTFOLIO (si tiene items)
  // ═══════════════════════════════════════════════════════════════════════════
  if (portfolioItems.length > 0) {
    const maxItems = 9;
    blocks.push({
      id: `auto-portfolio-${profile.id}`,
      type: 'portfolio',
      orderIndex: orderIndex++,
      isVisible: true,
      isDraft: false,
      config: {
        layout: 'grid',
        columns: 3,
        showTitles: true,
        maxItems,
      },
      styles: {
        padding: 'md',
        margin: 'md',
        borderRadius: 'md',
      },
      content: {
        items: portfolioItems.slice(0, maxItems).map((p) => ({
          id: p.id,
          type: p.media_type === 'video' ? 'video' : 'image',
          url: p.media_url,
          thumbnailUrl: p.thumbnail_url || p.media_url,
          title: p.title || '',
        })),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. PRICING (si tiene servicios con precios)
  // ═══════════════════════════════════════════════════════════════════════════
  const servicesWithPrice = services.filter((s) => s.price_amount != null && s.price_amount > 0);
  if (servicesWithPrice.length > 0) {
    blocks.push({
      id: `auto-pricing-${profile.id}`,
      type: 'pricing',
      orderIndex: orderIndex++,
      isVisible: true,
      isDraft: false,
      config: {
        layout: 'cards',
        showCurrency: true,
      },
      styles: {
        padding: 'md',
        margin: 'md',
        borderRadius: 'md',
      },
      content: {
        title: 'Precios y Paquetes',
        subtitle: 'Elige el paquete que mejor se adapte a tus necesidades',
        packages: servicesWithPrice.map((s, index) => ({
          id: s.id,
          name: s.title || `Paquete ${index + 1}`,
          price: String(s.price_amount),
          currency: s.price_currency || 'USD',
          features: (s.deliverables || []).map((d: any) => d.item || d).filter(Boolean),
          isPopular: s.is_featured || false,
        })),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. REVIEWS (si tiene reseñas)
  // ═══════════════════════════════════════════════════════════════════════════
  if (reviews.length > 0) {
    const maxReviews = 5;
    blocks.push({
      id: `auto-reviews-${profile.id}`,
      type: 'reviews',
      orderIndex: orderIndex++,
      isVisible: true,
      isDraft: false,
      config: {
        layout: 'grid',
        maxItems: maxReviews,
      },
      styles: {
        padding: 'md',
        margin: 'md',
        borderRadius: 'md',
      },
      content: {
        title: 'Reseñas de clientes',
        items: reviews.slice(0, maxReviews).map((r) => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          authorName: r.brand_name || 'Cliente',
          date: r.date,
        })),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. FAQ (oculto por defecto - plantilla para que personalicen)
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push({
    id: `auto-faq-${profile.id}`,
    type: 'faq',
    orderIndex: orderIndex++,
    isVisible: false, // Oculto hasta que lo activen
    isDraft: false,
    config: {
      allowMultipleOpen: false,
    },
    styles: {
      padding: 'md',
      margin: 'md',
      borderRadius: 'md',
    },
    content: {
      title: 'Preguntas frecuentes',
      items: [
        {
          id: 'faq-1',
          question: 'Como es tu proceso de trabajo?',
          answer: 'Describe aqui tu proceso paso a paso.',
        },
        {
          id: 'faq-2',
          question: 'Cual es tu tiempo de entrega?',
          answer: 'Indica tus tiempos de entrega tipicos.',
        },
        {
          id: 'faq-3',
          question: 'Que incluye el precio?',
          answer: 'Detalla que esta incluido en tu tarifa.',
        },
      ],
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. RECOMMENDED TALENT (siempre al final, fijo abajo)
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push({
    id: `auto-recommended-${profile.id}`,
    type: 'recommended_talent',
    orderIndex: orderIndex++,
    isVisible: true,
    isDraft: false,
    config: {
      maxItems: 4,
      layout: 'horizontal',
      showRating: true,
      showCategory: true,
    },
    styles: {
      padding: 'lg',
      margin: 'lg',
      borderRadius: 'lg',
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    content: {
      // Se llena dinámicamente por el bloque
      title: 'Tambien te puede interesar',
    },
  });

  return blocks;
}

/**
 * Mapea tipo de servicio a icono
 */
function getServiceIcon(serviceType: string | null | undefined): string {
  const iconMap: Record<string, string> = {
    ugc_video: 'video',
    reels_tiktok: 'smartphone',
    review: 'star',
    unboxing: 'package',
    tutorial: 'book-open',
    testimonial: 'message-circle',
    photo: 'camera',
    editing: 'film',
    strategy: 'target',
    consulting: 'users',
  };

  return iconMap[serviceType || ''] || 'briefcase';
}

export default generateBlocksFromProfile;
