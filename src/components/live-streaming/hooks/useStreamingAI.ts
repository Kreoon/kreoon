import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface AIGenerationResult {
  title?: string;
  description?: string;
}

export interface FullLiveContentResult {
  event_title?: string;
  event_description?: string;
  promotional_content?: {
    teaser_post?: string;
    reminder_post?: string;
    countdown_story?: string;
    hashtags?: string[];
  };
  script_outline?: Record<string, unknown>;
  interaction_elements?: Record<string, unknown>;
  technical_checklist?: string[];
  kpis_target?: Record<string, string>;
}

interface UseStreamingAIOptions {
  organizationId?: string;
}

export function useStreamingAI(options?: UseStreamingAIOptions) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Use passed organizationId or get from profile
  const organizationId = options?.organizationId || profile?.current_organization_id;

  const generateEventContent = async (params: {
    eventType: string;
    clientName?: string;
    product?: string;
    keywords?: string[];
  }): Promise<AIGenerationResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streaming-ai-generate', {
        body: {
          action: 'generate_event_content',
          eventType: params.eventType,
          clientName: params.clientName,
          product: params.product,
          keywords: params.keywords,
          organizationId, // Pass organization ID for AI config lookup
        },
      });

      if (error) throw error;

      return {
        title: data?.title || '',
        description: data?.description || '',
      };
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar contenido con IA',
        variant: 'destructive',
      });
      return {};
    } finally {
      setLoading(false);
    }
  };

  const improveTitle = async (currentTitle: string, eventType: string): Promise<string> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streaming-ai-generate', {
        body: {
          action: 'improve_title',
          currentTitle,
          eventType,
          organizationId,
        },
      });

      if (error) throw error;
      return data?.title || currentTitle;
    } catch (error) {
      console.error('Error improving title:', error);
      return currentTitle;
    } finally {
      setLoading(false);
    }
  };

  const improveDescription = async (currentDescription: string, eventType: string): Promise<string> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streaming-ai-generate', {
        body: {
          action: 'improve_description',
          currentDescription,
          eventType,
          organizationId,
        },
      });

      if (error) throw error;
      return data?.description || currentDescription;
    } catch (error) {
      console.error('Error improving description:', error);
      return currentDescription;
    } finally {
      setLoading(false);
    }
  };

  const generateFullLiveContent = async (
    eventData: Record<string, unknown>,
    usePerplexity = false
  ): Promise<FullLiveContentResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("streaming-ai-generate", {
        body: {
          action: "generate_full",
          organizationId,
          eventData,
          usePerplexity,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as FullLiveContentResult;
    } catch (error) {
      console.error("Error generating full live content:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el contenido completo",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    generateEventContent,
    improveTitle,
    improveDescription,
    generateFullLiveContent,
  };
}
