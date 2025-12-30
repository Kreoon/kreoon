import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIGenerationResult {
  title?: string;
  description?: string;
}

export function useStreamingAI() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

  return {
    loading,
    generateEventContent,
    improveTitle,
    improveDescription,
  };
}
