import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { BlockType } from '@/components/profile-builder/types/profile-builder';

// Tipos de features del plan
export interface CreatorPlanFeatures {
  maxBlocks: number;
  allowedBlocks: BlockType[] | 'all';
  showBranding: boolean;
  canHideBranding: boolean; // Solo Premium puede ocultar branding
  revealSocials: boolean | 'icons_only'; // Free = solo iconos, Pro/Premium = clickeables
  revealContact: 'none' | 'email_only' | 'all';
  maxTemplates: number;
  allowedTemplates: string[] | 'all';
  maxColors: number; // 0 = ilimitado
  maxFonts: number;
  previewDays: number;
  aiBioGenerator: boolean;
  aiSeoOptimizer: boolean;
  aiContentSuggestions: boolean;
  analyticsLevel: 'basic' | 'intermediate' | 'advanced';
  prioritySupport: boolean;
  premiumBadge: boolean;
  customCss: boolean;
  portfolioMaxItems: number;
  commissionRate: number; // 0.30 Free, 0.25 Pro, 0.15 Premium
}

// Features por defecto (plan free - freemium MUY potente)
// La comisión es el diferenciador principal, NO los bloques
// FREE puede crear perfiles muy profesionales - la plataforma gana con comisión
const DEFAULT_FEATURES: CreatorPlanFeatures = {
  maxBlocks: Infinity, // Sin límite de bloques para todos los planes
  allowedBlocks: [
    // Fijos
    'hero_banner', 'recommended_talent',
    // Core - TODOS disponibles
    'about', 'portfolio', 'services', 'stats', 'reviews', 'pricing',
    // Contenido - TODOS disponibles
    'faq', 'testimonials', 'brands', 'text_block',
    'skills', 'timeline', // Antes eran Pro, ahora FREE
    // Media - TODOS disponibles
    'video_embed', 'image_gallery', // Antes eran Premium, ahora FREE
    // Layout
    'divider', 'spacer',
    // EXCLUIDOS (Premium only): 'contact', 'social_links'
  ],
  showBranding: true,
  canHideBranding: false,
  revealSocials: 'icons_only', // Ve iconos pero no clickeables
  revealContact: 'none',       // Sin contacto directo
  maxTemplates: 3,             // Más templates para FREE
  allowedTemplates: ['minimalista', 'creativo', 'profesional'],
  maxColors: 10,               // Más colores
  maxFonts: 4,                 // Más fuentes
  previewDays: 1,              // 1 día de preview
  aiBioGenerator: false,
  aiSeoOptimizer: false,
  aiContentSuggestions: false,
  analyticsLevel: 'basic',
  prioritySupport: false,
  premiumBadge: false,
  customCss: false,
  portfolioMaxItems: 15,       // Más items
  commissionRate: 0.30,        // 30% - La plataforma gana más de usuarios FREE
};

// Parsear features desde JSON de la BD
function parseFeatures(rawFeatures: Record<string, unknown>): CreatorPlanFeatures {
  const parseJson = (value: unknown) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  return {
    maxBlocks: Infinity, // Sin límite de bloques para todos los planes
    allowedBlocks: parseJson(rawFeatures.allowed_blocks) || DEFAULT_FEATURES.allowedBlocks,
    showBranding: parseJson(rawFeatures.show_branding) ?? DEFAULT_FEATURES.showBranding,
    canHideBranding: parseJson(rawFeatures.can_hide_branding) ?? DEFAULT_FEATURES.canHideBranding,
    revealSocials: parseJson(rawFeatures.reveal_socials) ?? DEFAULT_FEATURES.revealSocials,
    revealContact: parseJson(rawFeatures.reveal_contact) || DEFAULT_FEATURES.revealContact,
    maxTemplates: rawFeatures.max_templates != null ? Number(parseJson(rawFeatures.max_templates)) : DEFAULT_FEATURES.maxTemplates,
    allowedTemplates: parseJson(rawFeatures.allowed_templates) || DEFAULT_FEATURES.allowedTemplates,
    maxColors: rawFeatures.max_colors != null ? Number(parseJson(rawFeatures.max_colors)) : DEFAULT_FEATURES.maxColors,
    maxFonts: Number(parseJson(rawFeatures.max_fonts)) || DEFAULT_FEATURES.maxFonts,
    previewDays: rawFeatures.preview_days != null ? Number(parseJson(rawFeatures.preview_days)) : DEFAULT_FEATURES.previewDays,
    aiBioGenerator: parseJson(rawFeatures.ai_bio_generator) ?? DEFAULT_FEATURES.aiBioGenerator,
    aiSeoOptimizer: parseJson(rawFeatures.ai_seo_optimizer) ?? DEFAULT_FEATURES.aiSeoOptimizer,
    aiContentSuggestions: parseJson(rawFeatures.ai_content_suggestions) ?? DEFAULT_FEATURES.aiContentSuggestions,
    analyticsLevel: parseJson(rawFeatures.analytics_level) || DEFAULT_FEATURES.analyticsLevel,
    prioritySupport: parseJson(rawFeatures.priority_support) ?? DEFAULT_FEATURES.prioritySupport,
    premiumBadge: parseJson(rawFeatures.premium_badge) ?? DEFAULT_FEATURES.premiumBadge,
    customCss: parseJson(rawFeatures.custom_css) ?? DEFAULT_FEATURES.customCss,
    portfolioMaxItems: Number(parseJson(rawFeatures.portfolio_max_items)) || DEFAULT_FEATURES.portfolioMaxItems,
    commissionRate: Number(parseJson(rawFeatures.commission_rate)) || DEFAULT_FEATURES.commissionRate,
  };
}

export type CreatorTier = 'creator_free' | 'creator_pro' | 'creator_premium';

export function useCreatorPlanFeatures() {
  const { user } = useAuth();

  // Obtener el tier del usuario
  const { data: userTier } = useQuery({
    queryKey: ['creator-tier', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'creator_free';

      // Primero buscar en creator_profiles
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (profile?.subscription_tier) {
        return profile.subscription_tier as CreatorTier;
      }

      // Fallback: buscar en platform_subscriptions
      const { data: subscription } = await supabase
        .from('platform_subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return (subscription?.tier as CreatorTier) || 'creator_free';
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const tier = userTier || 'creator_free';

  // Obtener features del plan
  const { data: rawFeatures, isLoading } = useQuery({
    queryKey: ['plan-features', tier],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_plan_features', {
        plan_tier: tier,
      });

      if (error) throw error;
      return data as Record<string, unknown>;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (las features no cambian frecuentemente)
  });

  // Parsear features
  const features = useMemo(() => {
    if (!rawFeatures) return DEFAULT_FEATURES;
    return parseFeatures(rawFeatures);
  }, [rawFeatures]);

  // Helpers de nivel de plan (DEBE ir antes de canUseBlock)
  const isPremium = tier === 'creator_premium';
  const isPro = tier === 'creator_pro' || tier === 'creator_premium';
  const isFree = tier === 'creator_free';

  // SOLO estos bloques requieren Premium (contacto directo)
  // El resto está disponible para TODOS - la comisión es el diferenciador
  const PREMIUM_ONLY_BLOCKS: BlockType[] = ['contact', 'social_links', 'whatsapp_button'];

  // Helper: ¿Puede usar este bloque?
  const canUseBlock = useCallback(
    (blockType: BlockType): boolean => {
      // Bloques de contacto directo son Premium-only
      if (PREMIUM_ONLY_BLOCKS.includes(blockType) && !isPremium) {
        return false;
      }
      // Todos los demás bloques están disponibles para todos los planes
      return true;
    },
    [isPremium]
  );

  // Helper: ¿Puede usar este template?
  const canUseTemplate = useCallback(
    (templateName: string): boolean => {
      if (features.allowedTemplates === 'all') return true;
      return features.allowedTemplates.includes(templateName);
    },
    [features.allowedTemplates]
  );

  // Helper: ¿Puede usar feature de IA?
  const canUseAIFeature = useCallback(
    (feature: 'bio_generator' | 'seo_optimizer' | 'content_suggestions'): boolean => {
      switch (feature) {
        case 'bio_generator':
          return features.aiBioGenerator;
        case 'seo_optimizer':
          return features.aiSeoOptimizer;
        case 'content_suggestions':
          return features.aiContentSuggestions;
        default:
          return false;
      }
    },
    [features]
  );

  // Bloques que requieren upgrade
  const getBlocksRequiringUpgrade = useCallback((): BlockType[] => {
    if (features.allowedBlocks === 'all') return [];

    const allowedBlocks = features.allowedBlocks;
    const allBlocks: BlockType[] = [
      'hero_banner', 'about', 'portfolio', 'contact', 'stats', 'reviews',
      'services', 'faq', 'text_block', 'divider', 'spacer', 'social_links',
      'pricing', 'brands', 'skills', 'timeline', 'video_embed', 'image_gallery',
      'testimonials',
    ];

    return allBlocks.filter((block) => !allowedBlocks.includes(block));
  }, [features.allowedBlocks]);

  // Plan requerido para un bloque específico (v2.2 - Freemium MUY potente)
  // SOLO contact y social_links requieren Premium - todo lo demás es FREE
  const getPlanRequiredForBlock = useCallback((blockType: BlockType): CreatorTier | null => {
    // ÚNICO bloqueo: contact y social_links requieren Premium
    const premiumOnlyBlocks: BlockType[] = ['contact', 'social_links'];
    if (premiumOnlyBlocks.includes(blockType)) {
      return 'creator_premium';
    }
    // TODOS los demás bloques son FREE
    return null;
  }, []);

  // Helper: ¿Puede eliminar el bloque de talento recomendado?
  // Solo planes pagos pueden eliminar este bloque
  const canDeleteRecommendedTalent = isPro || isPremium;

  // Helper: ¿Es un bloque fijo? (no se puede mover de posición)
  const isBlockFixed = useCallback((blockType: BlockType): boolean => {
    return blockType === 'hero_banner' || blockType === 'recommended_talent';
  }, []);

  return {
    // Estado
    tier,
    isLoading,
    features,

    // Helpers de nivel
    isPremium,
    isPro,
    isFree,

    // Helpers de permisos
    canUseBlock,
    canUseTemplate,
    canUseAIFeature,
    getBlocksRequiringUpgrade,
    getPlanRequiredForBlock,
    canDeleteRecommendedTalent,
    isBlockFixed,

    // Acceso directo a features comunes
    maxBlocks: features.maxBlocks,
    showBranding: features.showBranding,
    canHideBranding: features.canHideBranding,
    revealSocials: features.revealSocials,
    revealContact: features.revealContact,
    previewDays: features.previewDays,
    analyticsLevel: features.analyticsLevel,
    premiumBadge: features.premiumBadge,
    commissionRate: features.commissionRate,
  };
}

// Hook simplificado para uso en componentes de vista
// ACTUALIZADO v2: Solo Premium tiene contacto visible
export function useCanViewCreatorContact(creatorTier: CreatorTier) {
  const revealContact = useMemo(() => {
    switch (creatorTier) {
      case 'creator_premium':
        return 'all'; // Único tier con contacto completo
      case 'creator_pro':
        return 'none'; // Pro ya NO tiene email (solo Premium)
      default:
        return 'none';
    }
  }, [creatorTier]);

  const revealSocials = useMemo((): boolean | 'icons_only' => {
    switch (creatorTier) {
      case 'creator_premium':
      case 'creator_pro':
        return true; // Links clickeables
      default:
        return 'icons_only'; // Solo iconos, sin links
    }
  }, [creatorTier]);

  return { revealContact, revealSocials };
}
