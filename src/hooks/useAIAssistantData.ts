/**
 * useAIAssistantData
 *
 * Hook para gestionar datos del asistente AI.
 * Usa aiAssistantService para todas las operaciones.
 * Diseñado para reemplazar las llamadas directas a Supabase en AIAssistantSettings.tsx
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  aiAssistantService,
  type AIConfig,
  type KnowledgeBase,
  type ConversationFlow,
  type PositiveExample,
  type NegativeRule,
  type PromptConfig,
  type AILog,
  type AIFeedback,
} from '@/services/supabase/aiAssistantService';

interface UseAIAssistantDataReturn {
  // Estado
  loading: boolean;
  saving: boolean;
  config: AIConfig | null;
  knowledge: KnowledgeBase[];
  flows: ConversationFlow[];
  positiveExamples: PositiveExample[];
  negativeRules: NegativeRule[];
  promptConfig: PromptConfig | null;
  logs: AILog[];
  feedback: AIFeedback[];

  // Acciones - Config
  setConfig: (config: AIConfig | null) => void;
  saveConfig: () => Promise<boolean>;

  // Acciones - Prompt
  setPromptConfig: (config: PromptConfig | null) => void;
  savePromptConfig: () => Promise<boolean>;

  // Acciones - Knowledge
  addKnowledge: (data: { title: string; content: string; knowledge_type: string }) => Promise<boolean>;
  deleteKnowledge: (id: string) => Promise<boolean>;
  toggleKnowledgeActive: (id: string, isActive: boolean) => Promise<boolean>;

  // Acciones - Flows
  addFlow: (data: {
    name: string;
    description?: string;
    trigger_keywords?: string;
    trigger_intent?: string;
    priority?: number;
  }) => Promise<boolean>;
  deleteFlow: (id: string) => Promise<boolean>;
  toggleFlowActive: (id: string, isActive: boolean) => Promise<boolean>;

  // Acciones - Examples
  addPositiveExample: (data: {
    user_question: string;
    ideal_response: string;
    category: string;
    context_notes?: string;
  }) => Promise<boolean>;
  deletePositiveExample: (id: string) => Promise<boolean>;

  // Acciones - Rules
  addNegativeRule: (data: {
    rule_type: string;
    pattern: string;
    reason?: string;
    severity: string;
  }) => Promise<boolean>;
  deleteNegativeRule: (id: string) => Promise<boolean>;

  // Utilidades
  refetch: () => Promise<void>;
}

export function useAIAssistantData(): UseAIAssistantDataReturn {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeBase[]>([]);
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [positiveExamples, setPositiveExamples] = useState<PositiveExample[]>([]);
  const [negativeRules, setNegativeRules] = useState<NegativeRule[]>([]);
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [feedback, setFeedback] = useState<AIFeedback[]>([]);

  const orgId = profile?.current_organization_id;

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Obtener todos los datos
      const data = await aiAssistantService.fetchAll(orgId);

      // Si no existe config, crear una
      const finalConfig = data.config || (await aiAssistantService.getOrCreateConfig(orgId));
      setConfig(finalConfig);

      // Si no existe promptConfig, crear uno
      const finalPrompt = data.promptConfig || (await aiAssistantService.getOrCreatePromptConfig(orgId));
      setPromptConfig(finalPrompt);

      setKnowledge(data.knowledge);
      setFlows(data.flows);
      setPositiveExamples(data.positiveExamples);
      setNegativeRules(data.negativeRules);
      setLogs(data.logs);
      setFeedback(data.feedback);
    } catch (error) {
      console.error('[useAIAssistantData] Error fetching:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId, fetchData]);

  // ─────────────────────────────────────────
  // CONFIG ACTIONS
  // ─────────────────────────────────────────

  const saveConfig = useCallback(async (): Promise<boolean> => {
    if (!config) return false;
    setSaving(true);
    try {
      await aiAssistantService.updateConfig(config.id, {
        is_enabled: config.is_enabled,
        provider: config.provider,
        model: config.model,
        assistant_name: config.assistant_name,
        system_prompt: config.system_prompt,
        tone: config.tone,
      });
      toast({ title: 'Configuración guardada' });
      return true;
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [config, toast]);

  const savePromptConfigAction = useCallback(async (): Promise<boolean> => {
    if (!promptConfig || !orgId) return false;
    setSaving(true);
    try {
      const saved = await aiAssistantService.savePromptConfig(orgId, promptConfig.id, {
        assistant_role: promptConfig.assistant_role,
        personality: promptConfig.personality,
        tone: promptConfig.tone,
        greeting: promptConfig.greeting,
        fallback_message: promptConfig.fallback_message,
        can_discuss_pricing: promptConfig.can_discuss_pricing,
        can_discuss_competitors: promptConfig.can_discuss_competitors,
        can_share_user_data: promptConfig.can_share_user_data,
        max_response_length: promptConfig.max_response_length,
        language: promptConfig.language,
        custom_instructions: promptConfig.custom_instructions,
      });
      setPromptConfig(saved);
      toast({ title: 'Prompt guardado' });
      return true;
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [promptConfig, orgId, toast]);

  // ─────────────────────────────────────────
  // KNOWLEDGE ACTIONS
  // ─────────────────────────────────────────

  const addKnowledge = useCallback(
    async (data: { title: string; content: string; knowledge_type: string }): Promise<boolean> => {
      if (!orgId) return false;
      try {
        await aiAssistantService.addKnowledge(orgId, data);
        toast({ title: 'Conocimiento agregado' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
        return false;
      }
    },
    [orgId, fetchData, toast]
  );

  const deleteKnowledge = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await aiAssistantService.deleteKnowledge(id);
        toast({ title: 'Conocimiento eliminado' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
        return false;
      }
    },
    [fetchData, toast]
  );

  const toggleKnowledgeActive = useCallback(
    async (id: string, isActive: boolean): Promise<boolean> => {
      try {
        await aiAssistantService.toggleKnowledgeActive(id, isActive);
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', variant: 'destructive' });
        return false;
      }
    },
    [fetchData, toast]
  );

  // ─────────────────────────────────────────
  // FLOWS ACTIONS
  // ─────────────────────────────────────────

  const addFlow = useCallback(
    async (data: {
      name: string;
      description?: string;
      trigger_keywords?: string;
      trigger_intent?: string;
      priority?: number;
    }): Promise<boolean> => {
      if (!orgId) return false;
      try {
        await aiAssistantService.addFlow(orgId, {
          name: data.name,
          description: data.description,
          trigger_keywords: data.trigger_keywords ? data.trigger_keywords.split(',').map((k) => k.trim()) : undefined,
          trigger_intent: data.trigger_intent,
          priority: data.priority,
        });
        toast({ title: 'Flujo agregado' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
        return false;
      }
    },
    [orgId, fetchData, toast]
  );

  const deleteFlow = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await aiAssistantService.deleteFlow(id);
        toast({ title: 'Flujo eliminado' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
        return false;
      }
    },
    [fetchData, toast]
  );

  const toggleFlowActive = useCallback(
    async (id: string, isActive: boolean): Promise<boolean> => {
      try {
        await aiAssistantService.toggleFlowActive(id, isActive);
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', variant: 'destructive' });
        return false;
      }
    },
    [fetchData, toast]
  );

  // ─────────────────────────────────────────
  // EXAMPLES ACTIONS
  // ─────────────────────────────────────────

  const addPositiveExample = useCallback(
    async (data: {
      user_question: string;
      ideal_response: string;
      category: string;
      context_notes?: string;
    }): Promise<boolean> => {
      if (!orgId) return false;
      try {
        await aiAssistantService.addPositiveExample(orgId, {
          user_question: data.user_question,
          ideal_response: data.ideal_response,
          category: data.category,
          context_notes: data.context_notes,
        });
        toast({ title: 'Ejemplo agregado' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
        return false;
      }
    },
    [orgId, fetchData, toast]
  );

  const deletePositiveExample = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await aiAssistantService.deletePositiveExample(id);
        toast({ title: 'Ejemplo eliminado' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
        return false;
      }
    },
    [fetchData, toast]
  );

  // ─────────────────────────────────────────
  // RULES ACTIONS
  // ─────────────────────────────────────────

  const addNegativeRule = useCallback(
    async (data: { rule_type: string; pattern: string; reason?: string; severity: string }): Promise<boolean> => {
      if (!orgId) return false;
      try {
        await aiAssistantService.addNegativeRule(orgId, data);
        toast({ title: 'Regla agregada' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' });
        return false;
      }
    },
    [orgId, fetchData, toast]
  );

  const deleteNegativeRule = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await aiAssistantService.deleteNegativeRule(id);
        toast({ title: 'Regla eliminada' });
        await fetchData();
        return true;
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
        return false;
      }
    },
    [fetchData, toast]
  );

  return {
    // Estado
    loading,
    saving,
    config,
    knowledge,
    flows,
    positiveExamples,
    negativeRules,
    promptConfig,
    logs,
    feedback,

    // Acciones - Config
    setConfig,
    saveConfig,

    // Acciones - Prompt
    setPromptConfig,
    savePromptConfig: savePromptConfigAction,

    // Acciones - Knowledge
    addKnowledge,
    deleteKnowledge,
    toggleKnowledgeActive,

    // Acciones - Flows
    addFlow,
    deleteFlow,
    toggleFlowActive,

    // Acciones - Examples
    addPositiveExample,
    deletePositiveExample,

    // Acciones - Rules
    addNegativeRule,
    deleteNegativeRule,

    // Utilidades
    refetch: fetchData,
  };
}
