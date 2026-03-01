/**
 * useStreamingAI - IA para streaming v2
 * Generación de guiones, dinámicas, sugerencias y análisis
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  StreamingSessionType,
  GeneratedLiveScript,
  StreamingDynamic,
  AIStreamingSuggestion,
  UseStreamingAIReturn,
} from '@/types/streaming.types';

export function useStreamingAI(): UseStreamingAIReturn {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Generate live script
  const generateScript = useCallback(
    async (
      sessionType: StreamingSessionType,
      context: Record<string, unknown>
    ): Promise<GeneratedLiveScript> => {
      setGenerating(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('streaming-ai', {
          body: {
            action: 'generate_script',
            session_type: sessionType,
            context,
            user_id: profile?.id,
            organization_id: profile?.current_organization_id,
          },
        });

        if (invokeError) throw new Error(invokeError.message);

        toast({
          title: 'Guión generado',
          description: `${data.sections?.length || 0} secciones creadas`,
        });

        return data as GeneratedLiveScript;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error generando guión';
        setError(new Error(errorMsg));
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [profile?.id, profile?.current_organization_id, toast]
  );

  // Generate dynamics (polls, trivia, giveaways)
  const generateDynamics = useCallback(
    async (count: number, audience: string): Promise<StreamingDynamic[]> => {
      setGenerating(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('streaming-ai', {
          body: {
            action: 'generate_dynamics',
            count,
            audience,
            user_id: profile?.id,
            organization_id: profile?.current_organization_id,
          },
        });

        if (invokeError) throw new Error(invokeError.message);

        toast({
          title: 'Dinámicas generadas',
          description: `${data.dynamics?.length || 0} dinámicas creadas`,
        });

        return (data.dynamics || []) as StreamingDynamic[];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error generando dinámicas';
        setError(new Error(errorMsg));
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [profile?.id, profile?.current_organization_id, toast]
  );

  // Get AI suggestions for a session (real-time tips)
  const getSuggestions = useCallback(
    async (sessionId: string): Promise<AIStreamingSuggestion[]> => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('streaming-ai', {
          body: {
            action: 'get_suggestions',
            session_id: sessionId,
            user_id: profile?.id,
          },
        });

        if (invokeError) throw new Error(invokeError.message);

        return (data.suggestions || []) as AIStreamingSuggestion[];
      } catch (err) {
        console.error('[useStreamingAI] getSuggestions error:', err);
        return [];
      }
    },
    [profile?.id]
  );

  // Analyze performance after live
  const analyzePerformance = useCallback(
    async (
      sessionId: string
    ): Promise<{ summary: string; recommendations: string[] }> => {
      setGenerating(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('streaming-ai', {
          body: {
            action: 'analyze_performance',
            session_id: sessionId,
            user_id: profile?.id,
            organization_id: profile?.current_organization_id,
          },
        });

        if (invokeError) throw new Error(invokeError.message);

        toast({
          title: 'Análisis completado',
          description: 'Tu reporte de rendimiento está listo',
        });

        return {
          summary: data.summary || '',
          recommendations: data.recommendations || [],
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error analizando sesión';
        setError(new Error(errorMsg));
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [profile?.id, profile?.current_organization_id, toast]
  );

  return {
    generating,
    error,
    generateScript,
    generateDynamics,
    getSuggestions,
    analyzePerformance,
  };
}

export default useStreamingAI;
