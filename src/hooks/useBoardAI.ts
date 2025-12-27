import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CardAnalysis {
  card_id: string;
  card_title: string;
  current_status: string;
  current_interpretation: string;
  risk_level: 'bajo' | 'medio' | 'alto';
  risk_percentage: number;
  risk_factors?: string[];
  probable_next_state: string;
  recommendation: string;
  data_analyzed?: string[];
  confidence: number;
  analyzed_at: string;
  ai_model: string;
}

export interface Bottleneck {
  status: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact?: string;
  suggestion: string;
}

export interface BoardRecommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  type: 'process' | 'automation' | 'resource' | 'training';
}

export interface BoardAnalysis {
  summary: string;
  health_score: number;
  bottlenecks: Bottleneck[];
  recommendations: BoardRecommendation[];
  metrics_analyzed?: string[];
  total_cards: number;
  overdue_count: number;
  stale_count: number;
  status_distribution: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  analyzed_at: string;
  ai_model: string;
}

export interface NextStateSuggestion {
  suggested_state: string;
  confidence: number;
  reasoning: string;
  prerequisites_met?: string[];
  prerequisites_missing?: string[];
  alternative_state?: string;
  alternative_reasoning?: string;
  current_state: string;
  card_id: string;
  ai_model: string;
}

export interface AutomationSuggestion {
  title: string;
  trigger: string;
  action: string;
  benefit: string;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface AutomationRecommendations {
  automations: AutomationSuggestion[];
  patterns_analyzed?: string[];
  transition_patterns: Record<string, number>;
  analyzed_at: string;
  ai_model: string;
}

export function useBoardAI(organizationId?: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [cardAnalysis, setCardAnalysis] = useState<CardAnalysis | null>(null);
  const [boardAnalysis, setBoardAnalysis] = useState<BoardAnalysis | null>(null);
  const [nextStateSuggestion, setNextStateSuggestion] = useState<NextStateSuggestion | null>(null);
  const [automationRecommendations, setAutomationRecommendations] = useState<AutomationRecommendations | null>(null);

  const callBoardAI = useCallback(async (action: string, contentId?: string) => {
    if (!organizationId) {
      toast({ title: 'Error', description: 'Organización no encontrada', variant: 'destructive' });
      return null;
    }

    const { data, error } = await supabase.functions.invoke('board-ai', {
      body: { action, organizationId, contentId }
    });

    if (error) {
      console.error('Board AI Error:', error);
      throw error;
    }

    return data;
  }, [organizationId, toast]);

  const analyzeCard = useCallback(async (contentId: string): Promise<CardAnalysis | null> => {
    setLoading('card');
    try {
      const result = await callBoardAI('analyze_card', contentId);
      setCardAnalysis(result);
      return result;
    } catch (error) {
      toast({ 
        title: 'Error al analizar', 
        description: 'No se pudo completar el análisis de la tarjeta',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [callBoardAI, toast]);

  const analyzeBoard = useCallback(async (): Promise<BoardAnalysis | null> => {
    setLoading('board');
    try {
      const result = await callBoardAI('analyze_board');
      setBoardAnalysis(result);
      return result;
    } catch (error) {
      toast({ 
        title: 'Error al analizar', 
        description: 'No se pudo completar el análisis del tablero',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [callBoardAI, toast]);

  const suggestNextState = useCallback(async (contentId: string): Promise<NextStateSuggestion | null> => {
    setLoading('nextState');
    try {
      const result = await callBoardAI('suggest_next_state', contentId);
      setNextStateSuggestion(result);
      return result;
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo obtener la sugerencia',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [callBoardAI, toast]);

  const detectBottlenecks = useCallback(async () => {
    setLoading('bottlenecks');
    try {
      const result = await callBoardAI('detect_bottlenecks');
      return result;
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudieron detectar cuellos de botella',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [callBoardAI, toast]);

  const recommendAutomation = useCallback(async (): Promise<AutomationRecommendations | null> => {
    setLoading('automation');
    try {
      const result = await callBoardAI('recommend_automation');
      setAutomationRecommendations(result);
      return result;
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudieron generar recomendaciones',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [callBoardAI, toast]);

  const clearAnalysis = useCallback(() => {
    setCardAnalysis(null);
    setBoardAnalysis(null);
    setNextStateSuggestion(null);
    setAutomationRecommendations(null);
  }, []);

  return {
    loading,
    cardAnalysis,
    boardAnalysis,
    nextStateSuggestion,
    automationRecommendations,
    analyzeCard,
    analyzeBoard,
    suggestNextState,
    detectBottlenecks,
    recommendAutomation,
    clearAnalysis
  };
}
