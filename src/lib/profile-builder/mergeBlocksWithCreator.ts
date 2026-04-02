/**
 * Merge de datos del Profile Builder con CreatorFullProfile.
 *
 * El Profile Builder provee contenido personalizado (textos, imagenes) que
 * se aplica sobre los datos existentes del creador sin cambiar la estructura.
 */

import type { ProfileBlock } from '@/components/profile-builder/types/profile-builder';
import type { CreatorFullProfile } from '@/components/marketplace/types/marketplace';

/**
 * Aplica el contenido de bloques personalizados del Profile Builder
 * sobre los datos del creador, manteniendo la estructura original.
 *
 * @param creator - Datos originales del creador desde Supabase
 * @param blocks - Bloques personalizados del Profile Builder
 * @returns CreatorFullProfile con datos mergeados
 */
export function mergeBlocksWithCreator(
  creator: CreatorFullProfile,
  blocks: ProfileBlock[]
): CreatorFullProfile {
  // Clonar para no mutar el original
  const merged: CreatorFullProfile = { ...creator };

  for (const block of blocks) {
    // Solo procesar bloques visibles y no draft
    if (!block.isVisible || block.isDraft) continue;

    switch (block.type) {
      case 'hero_banner': {
        // Aplicar contenido del hero si tiene personalizaciones
        const content = block.content as Record<string, unknown>;
        if (content.headline && typeof content.headline === 'string') {
          merged.display_name = content.headline;
        }
        if (content.subheadline && typeof content.subheadline === 'string') {
          merged.bio = content.subheadline;
        }
        if (content.backgroundImage && typeof content.backgroundImage === 'string') {
          merged.banner_url = content.backgroundImage;
        }
        if (content.avatarUrl && typeof content.avatarUrl === 'string') {
          merged.avatar_url = content.avatarUrl;
        }
        break;
      }

      case 'about': {
        // Aplicar bio extendido
        const content = block.content as Record<string, unknown>;
        if (content.text && typeof content.text === 'string') {
          merged.bio_full = content.text;
        }
        if (content.title && typeof content.title === 'string') {
          // El titulo del about puede usarse como tagline
          merged.bio = content.title;
        }
        break;
      }

      case 'services': {
        // Los servicios del builder pueden extender/reemplazar los existentes
        const content = block.content as Record<string, unknown>;
        const serviceItems = content.items as Array<{
          title: string;
          description?: string;
          icon?: string;
        }> | undefined;

        if (serviceItems && Array.isArray(serviceItems) && serviceItems.length > 0) {
          merged.services = serviceItems.map((item, idx) => ({
            id: `builder-service-${idx}`,
            icon: item.icon || 'Video',
            title: item.title,
            description: item.description || '',
          }));
        }
        break;
      }

      case 'pricing': {
        // Los paquetes del builder pueden extender/reemplazar
        const content = block.content as Record<string, unknown>;
        const pricingItems = content.packages as Array<{
          name: string;
          description?: string;
          price: number;
          currency?: string;
          deliveryDays?: string;
          includes?: string[];
          isPopular?: boolean;
        }> | undefined;

        if (pricingItems && Array.isArray(pricingItems) && pricingItems.length > 0) {
          merged.packages = pricingItems.map((pkg, idx) => ({
            id: `builder-pkg-${idx}`,
            name: pkg.name,
            description: pkg.description || '',
            price: pkg.price,
            currency: pkg.currency || merged.currency,
            delivery_days: pkg.deliveryDays || '5-7 dias',
            includes: pkg.includes || [],
            is_popular: pkg.isPopular || false,
          }));
        }
        break;
      }

      case 'stats': {
        // Stats personalizados
        const content = block.content as Record<string, unknown>;
        const statItems = content.items as Array<{
          value: string;
          label: string;
        }> | undefined;

        if (statItems && Array.isArray(statItems)) {
          // Intentar mapear a stats conocidos
          for (const stat of statItems) {
            const label = stat.label.toLowerCase();
            const value = parseInt(stat.value, 10);
            if (!isNaN(value)) {
              if (label.includes('proyecto') || label.includes('completado')) {
                merged.stats.completed_projects = value;
              } else if (label.includes('rating') || label.includes('calificacion')) {
                merged.stats.rating_avg = value;
              }
            }
          }
        }
        break;
      }

      case 'reviews': {
        // Reviews personalizados
        const content = block.content as Record<string, unknown>;
        const reviewItems = content.items as Array<{
          brandName: string;
          campaignType?: string;
          rating: number;
          text: string;
          date?: string;
        }> | undefined;

        if (reviewItems && Array.isArray(reviewItems) && reviewItems.length > 0) {
          merged.reviews = reviewItems.map((review, idx) => ({
            id: `builder-review-${idx}`,
            brand_name: review.brandName,
            campaign_type: review.campaignType || 'Proyecto',
            rating: review.rating,
            text: review.text,
            date: review.date || new Date().toISOString(),
          }));
        }
        break;
      }

      case 'portfolio': {
        // El portfolio del builder puede complementar pero no reemplazar
        // ya que PortfolioGallery usa portfolioItems directamente
        // Solo actualizar si hay URLs especificas
        const content = block.content as Record<string, unknown>;
        const portfolioItems = content.items as Array<{
          url: string;
          thumbnailUrl?: string;
          type: 'image' | 'video';
        }> | undefined;

        if (portfolioItems && Array.isArray(portfolioItems) && portfolioItems.length > 0) {
          // Agregar items del builder al inicio (prioridad)
          const builderMedia = portfolioItems.map((item, idx) => ({
            id: `builder-portfolio-${idx}`,
            url: item.url,
            thumbnail_url: item.thumbnailUrl,
            type: item.type,
          }));
          merged.portfolio_media = [...builderMedia, ...merged.portfolio_media];
        }
        break;
      }

      case 'social_links': {
        // Links sociales personalizados
        const content = block.content as Record<string, unknown>;
        const links = content.links as Record<string, string> | undefined;

        if (links && typeof links === 'object') {
          const socialLinks: Record<string, boolean> = { ...merged.social_links };
          for (const [platform, url] of Object.entries(links)) {
            if (url && typeof url === 'string' && url.length > 0) {
              socialLinks[platform] = true;
            }
          }
          merged.social_links = socialLinks;
        }
        break;
      }

      case 'faq': {
        // FAQs se pueden adjuntar a bio_full o manejar separadamente
        // Por ahora, no hay campo FAQs en CreatorFullProfile
        // Podriamos extender el tipo en el futuro
        break;
      }

      case 'skills': {
        // Skills pueden mapearse a categories o content_types
        const content = block.content as Record<string, unknown>;
        const skills = content.items as Array<{
          name: string;
          level?: number;
        }> | undefined;

        if (skills && Array.isArray(skills)) {
          // Agregar skills como categories si no existen
          const skillNames = skills.map(s => s.name);
          const existingCategories = new Set(merged.categories || []);
          for (const skill of skillNames) {
            if (!existingCategories.has(skill)) {
              existingCategories.add(skill);
            }
          }
          merged.categories = Array.from(existingCategories);
        }
        break;
      }

      // Bloques visuales que no afectan datos
      case 'text_block':
      case 'video_embed':
      case 'image_gallery':
      case 'testimonials':
      case 'brands':
      case 'timeline':
      case 'divider':
      case 'spacer':
      case 'contact':
      case 'recommended_talent':
        // Estos bloques son puramente visuales para el Profile Builder
        // No tienen equivalente directo en CreatorFullProfile
        break;

      default:
        // Tipo de bloque desconocido, ignorar
        break;
    }
  }

  return merged;
}

export default mergeBlocksWithCreator;
