import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolioAIConfig } from "./usePortfolioAIConfig";
import { useAuth } from "./useAuth";
import type { PortfolioAIAction } from "@/lib/prompts/portfolio-ai-types";
import { toast } from "sonner";

interface UsePortfolioAIResult {
  isEnabled: boolean;
  loading: boolean;
  executeAI: <T = unknown>(action: PortfolioAIAction, payload: Record<string, unknown>) => Promise<T | null>;
  generateCaption: (context: string, contentType?: string, tone?: string) => Promise<{ captions: Array<{ text: string; hashtags: string[] }> } | null>;
  improveBio: (currentBio: string, profession?: string, skills?: string) => Promise<{ improved_bio: string; key_changes: string[] } | null>;
  semanticSearch: (query: string) => Promise<{ entities: string[]; keywords: string[]; location?: string; categories: string[] } | null>;
  moderateContent: (text: string, contentType: string, hasMedia?: boolean) => Promise<{ is_flagged: boolean; severity: string; reasons: string[]; action_recommended: string } | null>;
  suggestBlocks: (profession: string, contentTypes: string[], goals?: string) => Promise<{ suggested_blocks: Array<{ block_key: string; title: string; reason: string; priority: number }> } | null>;
}

export function usePortfolioAI(): UsePortfolioAIResult {
  const { config, isFeatureEnabled } = usePortfolioAIConfig();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const executeAI = useCallback(
    async <T = unknown>(action: PortfolioAIAction, payload: Record<string, unknown>): Promise<T | null> => {
      if (!config.enabled) {
        toast.error("IA no está habilitada para este módulo");
        return null;
      }

      const body: Record<string, unknown> = {
        action,
        payload,
        organizationId: profile?.current_organization_id ?? undefined,
      };

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("portfolio-ai", {
          body,
        });

        if (error) {
          console.error("[usePortfolioAI] Error:", error);
          toast.error("Error al ejecutar IA");
          return null;
        }

        if (data?.error) {
          toast.error(data.error);
          return null;
        }

        return data?.data as T;
    } catch (error) {
      console.error('[usePortfolioAI] Exception:', error);
      toast.error('Error de conexión con IA');
      return null;
    } finally {
      setLoading(false);
    }
  }, [config.enabled, profile?.current_organization_id]);

  const generateCaption = useCallback(async (
    context: string,
    contentType = 'post',
    tone = 'casual'
  ) => {
    if (!isFeatureEnabled('ai_caption_helper')) {
      toast.error('Asistente de captions no está habilitado');
      return null;
    }
    return executeAI<{ captions: Array<{ text: string; hashtags: string[] }> }>('caption', {
      context,
      content_type: contentType,
      tone,
      language: 'es'
    });
  }, [executeAI, isFeatureEnabled]);

  const improveBio = useCallback(async (
    currentBio: string,
    profession = 'Creator',
    skills = ''
  ) => {
    if (!isFeatureEnabled('ai_bio_helper')) {
      toast.error('Asistente de bio no está habilitado');
      return null;
    }
    return executeAI<{ improved_bio: string; key_changes: string[] }>('bio', {
      current_bio: currentBio,
      profession,
      skills,
      tone: 'professional',
      language: 'es'
    });
  }, [executeAI, isFeatureEnabled]);

  const semanticSearch = useCallback(async (query: string) => {
    if (!isFeatureEnabled('ai_search')) {
      toast.error('Búsqueda inteligente no está habilitada');
      return null;
    }
    return executeAI<{ entities: string[]; keywords: string[]; location?: string; categories: string[] }>('search', { query });
  }, [executeAI, isFeatureEnabled]);

  const moderateContent = useCallback(async (
    text: string,
    contentType: string,
    hasMedia = false
  ) => {
    if (!isFeatureEnabled('ai_moderation')) {
      return null; // Silent fail for moderation
    }
    return executeAI<{ is_flagged: boolean; severity: string; reasons: string[]; action_recommended: string }>('moderation', {
      text,
      content_type: contentType,
      has_media: hasMedia
    });
  }, [executeAI, isFeatureEnabled]);

  const suggestBlocks = useCallback(async (
    profession: string,
    contentTypes: string[],
    goals = 'showcase work'
  ) => {
    return executeAI<{ suggested_blocks: Array<{ block_key: string; title: string; reason: string; priority: number }> }>('blocks', {
      profession,
      content_types: contentTypes,
      goals
    });
  }, [executeAI]);

  return {
    isEnabled: config.enabled,
    loading,
    executeAI,
    generateCaption,
    improveBio,
    semanticSearch,
    moderateContent,
    suggestBlocks
  };
}
