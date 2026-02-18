import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invokeAIWithTokens } from '@/lib/ai/token-gate';

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
  execution_id?: string;
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
  execution_id?: string;
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

export interface ResearchContextResult {
  research: string;
  citations: string[];
  contentContext: { title?: string; salesAngle?: string; spherePhase?: string };
  researchType: string;
}

export function useBoardAI(organizationId?: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [cardAnalysis, setCardAnalysis] = useState<CardAnalysis | null>(null);
  const [boardAnalysis, setBoardAnalysis] = useState<BoardAnalysis | null>(null);
  const [nextStateSuggestion, setNextStateSuggestion] = useState<NextStateSuggestion | null>(null);
  const [automationRecommendations, setAutomationRecommendations] = useState<AutomationRecommendations | null>(null);
  const [moduleInactive, setModuleInactive] = useState<string | null>(null);

  const callBoardAI = useCallback(async (action: string, contentId?: string, extra?: Record<string, unknown>) => {
    if (!organizationId) {
      toast({ title: 'Error', description: 'Organización no encontrada', variant: 'destructive' });
      return null;
    }

    setModuleInactive(null);

    // Map board-ai actions to token action types
    const tokenActionMap: Record<string, string> = {
      analyze_card: 'board.analyze_card',
      suggestions: 'board.suggestions',
      analyze_board: 'board.analyze_board',
      prioritize: 'board.prioritize',
      research_context: 'board.research_context',
    };
    const tokenAction = tokenActionMap[action] || 'board.suggestions';

    let data: any, error: any;
    try {
      data = await invokeAIWithTokens('board-ai', tokenAction, { action, organizationId, contentId, ...extra }, organizationId);
    } catch (err: any) {
      if (err.message?.includes('Kreoon Coins insuficientes')) {
        toast({ title: 'Coins insuficientes', description: err.message, variant: 'destructive' });
        return null;
      }
      error = err;
    }

    // Handle MODULE_INACTIVE error
    if (data?.error === 'MODULE_INACTIVE') {
      setModuleInactive(data.module_key);
      toast({
        title: 'IA no habilitada',
        description: 'Este módulo de IA no está activado. Ve a Configuración → IA & Modelos para habilitarlo.',
        variant: 'destructive',
      });
      return null;
    }

    if (error) {
      console.error('Board AI Error:', error);
      const msg = (error as any)?.message || '';
      if (msg.includes('429')) {
        toast({
          title: 'Límite de IA alcanzado',
          description: 'Se alcanzó el límite del proveedor de IA. Espera ~1 minuto e intenta de nuevo.',
          variant: 'destructive',
        });
        return null;
      }
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

  const researchContext = useCallback(async (
    contentId: string,
    researchType: "trends" | "competitors" | "hooks" = "trends"
  ): Promise<ResearchContextResult | null> => {
    setLoading("research");
    try {
      const result = await callBoardAI("research_context", contentId, { researchType });
      return result as ResearchContextResult | null;
    } catch (error) {
      toast({
        title: "Error al investigar",
        description: "No se pudo completar la investigación con Perplexity",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [callBoardAI, toast]);

  return {
    loading,
    cardAnalysis,
    boardAnalysis,
    nextStateSuggestion,
    automationRecommendations,
    moduleInactive,
    analyzeCard,
    analyzeBoard,
    suggestNextState,
    detectBottlenecks,
    recommendAutomation,
    researchContext,
    clearAnalysis
  };
}
