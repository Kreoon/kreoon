import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SocialPlatform, SocialPostType } from '../types/social.types';

export interface AICaption {
  style: 'storytelling' | 'question_value' | 'direct' | 'social_proof';
  caption: string;
  hashtags: string[];
  first_comment: string;
}

export interface AIGenerationResult {
  captions: AICaption[];
  model_used: string;
  tokens_consumed?: number;
  tokens_remaining?: number;
}

export const CAPTION_STYLE_LABELS: Record<AICaption['style'], { label: string; description: string }> = {
  storytelling: {
    label: 'Storytelling',
    description: 'Narrativa emocional que conecta con la audiencia',
  },
  question_value: {
    label: 'Pregunta + Valor',
    description: 'Pregunta poderosa seguida de contenido de valor',
  },
  direct: {
    label: 'Directo',
    description: 'Beneficio principal + CTA claro y contundente',
  },
  social_proof: {
    label: 'Prueba Social',
    description: 'Datos, resultados o testimonios que generan confianza',
  },
};

export function useAIContentGenerator() {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AIGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientTokens, setInsufficientTokens] = useState(false);

  const generate = async (
    contentId: string,
    targetPlatform: SocialPlatform = 'instagram',
    postType: SocialPostType = 'reel',
    accountClientId?: string | null,
  ) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setInsufficientTokens(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'social-ai-generator',
        {
          body: {
            content_id: contentId,
            target_platform: targetPlatform,
            post_type: postType,
            organization_id: orgId || null,
            account_client_id: accountClientId || null,
          },
        },
      );

      if (fnError) throw fnError;

      // Handle insufficient tokens
      if (data?.code === 'INSUFFICIENT_TOKENS') {
        setInsufficientTokens(true);
        setError(
          `Necesitas ${data.tokens_required} Kreoon Coins (tienes ${data.tokens_available})`
        );
        return null;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.captions || !Array.isArray(data.captions)) {
        throw new Error('Respuesta de IA sin captions validos');
      }

      const generationResult: AIGenerationResult = {
        captions: data.captions as AICaption[],
        model_used: data.model_used || 'unknown',
        tokens_consumed: data.tokens_consumed,
        tokens_remaining: data.tokens_remaining,
      };

      setResult(generationResult);
      return generationResult;
    } catch (err: any) {
      const msg = err?.message || 'Error generando contenido con IA';
      setError(msg);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setInsufficientTokens(false);
  };

  return {
    generate,
    reset,
    isGenerating,
    result,
    error,
    insufficientTokens,
  };
}
