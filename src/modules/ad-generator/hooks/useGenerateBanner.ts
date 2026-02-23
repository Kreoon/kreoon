import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeAIWithTokens } from '@/lib/ai/token-gate';
import type { GenerateBannerParams } from '../types/ad-generator.types';

export function useGenerateBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateBannerParams) => {
      const aspectRatio = params.aspectRatio || '1:1';
      const result = await invokeAIWithTokens(
        'generate-ad-banner',
        'ads.generate_banner',
        {
          action: 'generate',
          organization_id: params.organizationId,
          product_id: params.productId,
          user_id: params.userId,
          reference_image_url: params.referenceImageUrl || null,
          product_image_urls: params.productImageUrls,
          aspect_ratio: aspectRatio,
          // Legacy fallback for cached edge functions
          output_size: aspectRatio,
          copy_language: params.copyLanguage || 'es',
          style_preset: params.stylePreset || 'professional',
          customization: params.customization || null,
          research_context: params.researchContext || null,
          research_variables: params.researchVariables || null,
          brand_dna: params.brandDNA || null,
        },
        params.organizationId,
      );
      return result as {
        banner_url: string;
        copy: string;
        banner_id: string;
        ai_provider: string;
        ai_model: string;
        generation_time_ms: number;
        dimensions: { width: number; height: number };
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ad-banners', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['ad-products'] });
    },
  });
}
