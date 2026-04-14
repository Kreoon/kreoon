/**
 * AI Assistant Service
 *
 * Centraliza todas las operaciones de base de datos para el asistente AI.
 * Usado por AIAssistantSettings.tsx y KiroBrainPlatform.tsx
 *
 * Beneficios:
 * - Elimina duplicación de queries entre componentes
 * - Usa UPSERT para evitar race conditions en INSERT-OR-CREATE
 * - Tipado fuerte en todas las operaciones
 * - Punto único de mantenimiento
 */
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TIPOS
// ============================================

export interface AIConfig {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  provider: string;
  model: string;
  assistant_name: string;
  system_prompt: string | null;
  tone: string | null;
  auto_learn_content?: boolean;
  auto_learn_research?: boolean;
  auto_learn_products?: boolean;
  auto_learn_clients?: boolean;
  kiro_enabled?: boolean;
}

export interface KnowledgeBase {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  knowledge_type: string;
  is_active: boolean;
  is_platform?: boolean;
  created_at: string;
}

export interface ConversationFlow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_keywords: string[] | null;
  trigger_intent: string | null;
  flow_steps: any;
  priority: number;
  is_active: boolean;
  is_platform?: boolean;
}

export interface PositiveExample {
  id: string;
  organization_id: string;
  user_question: string;
  ideal_response: string;
  category: string;
  context_notes: string | null;
  is_active: boolean;
  is_platform?: boolean;
}

export interface NegativeRule {
  id: string;
  organization_id: string;
  rule_type: string;
  pattern: string;
  reason: string | null;
  severity: string;
  is_active: boolean;
  is_platform?: boolean;
}

export interface PromptConfig {
  id: string;
  organization_id: string;
  assistant_role: string;
  personality: string | null;
  tone: string | null;
  greeting: string | null;
  fallback_message: string | null;
  can_discuss_pricing: boolean;
  can_discuss_competitors: boolean;
  can_share_user_data: boolean;
  max_response_length: number | null;
  language: string | null;
  custom_instructions: string | null;
}

export interface AILog {
  id: string;
  organization_id: string;
  user_message: string;
  assistant_response: string;
  created_at: string;
  user_id: string;
}

export interface AIFeedback {
  id: string;
  organization_id: string;
  rating: string;
  comment: string | null;
  created_at: string;
}

export interface AIAssistantData {
  config: AIConfig | null;
  knowledge: KnowledgeBase[];
  flows: ConversationFlow[];
  positiveExamples: PositiveExample[];
  negativeRules: NegativeRule[];
  promptConfig: PromptConfig | null;
  logs: AILog[];
  feedback: AIFeedback[];
}

// ============================================
// SERVICIO
// ============================================

export const aiAssistantService = {
  // ─────────────────────────────────────────
  // FETCH ALL DATA
  // ─────────────────────────────────────────

  /**
   * Obtiene todos los datos del asistente AI para una organización
   * Usa Promise.all para fetch paralelo
   */
  async fetchAll(organizationId: string): Promise<AIAssistantData> {
    const [
      configRes,
      knowledgeRes,
      flowsRes,
      examplesRes,
      rulesRes,
      promptRes,
      logsRes,
      feedbackRes,
    ] = await Promise.all([
      supabase
        .from('ai_assistant_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('ai_assistant_knowledge')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_conversation_flows')
        .select('*')
        .eq('organization_id', organizationId)
        .order('priority'),
      supabase
        .from('ai_positive_examples')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_negative_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('severity'),
      supabase
        .from('ai_prompt_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('ai_assistant_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('ai_chat_feedback')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    return {
      config: configRes.data as AIConfig | null,
      knowledge: (knowledgeRes.data as KnowledgeBase[]) || [],
      flows: (flowsRes.data as ConversationFlow[]) || [],
      positiveExamples: (examplesRes.data as PositiveExample[]) || [],
      negativeRules: (rulesRes.data as NegativeRule[]) || [],
      promptConfig: promptRes.data as PromptConfig | null,
      logs: (logsRes.data as AILog[]) || [],
      feedback: (feedbackRes.data as AIFeedback[]) || [],
    };
  },

  /**
   * Obtiene datos del asistente a nivel de plataforma (is_platform = true)
   */
  async fetchPlatformData(platformOrgId: string): Promise<Omit<AIAssistantData, 'logs' | 'feedback'>> {
    const [knowledgeRes, flowsRes, examplesRes, rulesRes, promptRes] = await Promise.all([
      supabase
        .from('ai_assistant_knowledge')
        .select('*')
        .eq('is_platform', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_conversation_flows')
        .select('*')
        .eq('is_platform', true)
        .order('priority'),
      supabase
        .from('ai_positive_examples')
        .select('*')
        .eq('is_platform', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_negative_rules')
        .select('*')
        .eq('is_platform', true)
        .order('severity'),
      supabase
        .from('ai_prompt_config')
        .select('*')
        .eq('organization_id', platformOrgId)
        .maybeSingle(),
    ]);

    return {
      config: null,
      knowledge: (knowledgeRes.data as KnowledgeBase[]) || [],
      flows: (flowsRes.data as ConversationFlow[]) || [],
      positiveExamples: (examplesRes.data as PositiveExample[]) || [],
      negativeRules: (rulesRes.data as NegativeRule[]) || [],
      promptConfig: promptRes.data as PromptConfig | null,
    };
  },

  // ─────────────────────────────────────────
  // CONFIG OPERATIONS
  // ─────────────────────────────────────────

  /**
   * Obtiene o crea la configuración del asistente
   * Usa UPSERT para evitar race conditions
   */
  async getOrCreateConfig(organizationId: string): Promise<AIConfig> {
    // Primero intentamos obtener
    const { data: existing } = await supabase
      .from('ai_assistant_config')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing) {
      return existing as AIConfig;
    }

    // Si no existe, creamos con upsert para evitar race conditions
    const { data: newConfig, error } = await supabase
      .from('ai_assistant_config')
      .upsert(
        {
          organization_id: organizationId,
          is_enabled: false,
          provider: 'kreoon',
          model: 'google/gemini-2.5-flash',
          assistant_name: 'Asistente',
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return newConfig as AIConfig;
  },

  /**
   * Actualiza la configuración del asistente
   */
  async updateConfig(
    configId: string,
    updates: Partial<Omit<AIConfig, 'id' | 'organization_id'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_assistant_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', configId);

    if (error) throw error;
  },

  // ─────────────────────────────────────────
  // PROMPT CONFIG OPERATIONS
  // ─────────────────────────────────────────

  /**
   * Obtiene o crea la configuración de prompt
   * Usa UPSERT para evitar race conditions
   */
  async getOrCreatePromptConfig(organizationId: string): Promise<PromptConfig> {
    const { data: existing } = await supabase
      .from('ai_prompt_config')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing) {
      return existing as PromptConfig;
    }

    const { data: newPrompt, error } = await supabase
      .from('ai_prompt_config')
      .upsert(
        {
          organization_id: organizationId,
          assistant_role: 'Eres un asistente útil de la organización.',
          can_discuss_pricing: false,
          can_discuss_competitors: false,
          can_share_user_data: false,
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return newPrompt as PromptConfig;
  },

  /**
   * Guarda la configuración de prompt (INSERT o UPDATE)
   */
  async savePromptConfig(
    organizationId: string,
    promptId: string | undefined,
    data: Partial<Omit<PromptConfig, 'id' | 'organization_id'>>
  ): Promise<PromptConfig> {
    if (promptId) {
      // Update existente
      const { data: updated, error } = await supabase
        .from('ai_prompt_config')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promptId)
        .select()
        .single();

      if (error) throw error;
      return updated as PromptConfig;
    } else {
      // Insert nuevo con upsert
      const { data: created, error } = await supabase
        .from('ai_prompt_config')
        .upsert(
          {
            organization_id: organizationId,
            ...data,
          },
          { onConflict: 'organization_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return created as PromptConfig;
    }
  },

  // ─────────────────────────────────────────
  // KNOWLEDGE OPERATIONS
  // ─────────────────────────────────────────

  async addKnowledge(
    organizationId: string,
    data: { title: string; content: string; knowledge_type: string; is_platform?: boolean }
  ): Promise<KnowledgeBase> {
    const { data: created, error } = await supabase
      .from('ai_assistant_knowledge')
      .insert({
        organization_id: organizationId,
        ...data,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return created as KnowledgeBase;
  },

  async deleteKnowledge(id: string): Promise<void> {
    const { error } = await supabase.from('ai_assistant_knowledge').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleKnowledgeActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('ai_assistant_knowledge')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },

  // ─────────────────────────────────────────
  // FLOWS OPERATIONS
  // ─────────────────────────────────────────

  async addFlow(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      trigger_keywords?: string[];
      trigger_intent?: string;
      flow_steps?: any;
      priority?: number;
      is_platform?: boolean;
    }
  ): Promise<ConversationFlow> {
    const { data: created, error } = await supabase
      .from('ai_conversation_flows')
      .insert({
        organization_id: organizationId,
        name: data.name,
        description: data.description || null,
        trigger_keywords: data.trigger_keywords || null,
        trigger_intent: data.trigger_intent || null,
        flow_steps: data.flow_steps || null,
        priority: data.priority || 0,
        is_active: true,
        is_platform: data.is_platform || false,
      })
      .select()
      .single();

    if (error) throw error;
    return created as ConversationFlow;
  },

  async deleteFlow(id: string): Promise<void> {
    const { error } = await supabase.from('ai_conversation_flows').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleFlowActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('ai_conversation_flows')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },

  // ─────────────────────────────────────────
  // POSITIVE EXAMPLES OPERATIONS
  // ─────────────────────────────────────────

  async addPositiveExample(
    organizationId: string,
    data: {
      user_question: string;
      ideal_response: string;
      category: string;
      context_notes?: string;
      is_platform?: boolean;
    }
  ): Promise<PositiveExample> {
    const { data: created, error } = await supabase
      .from('ai_positive_examples')
      .insert({
        organization_id: organizationId,
        ...data,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return created as PositiveExample;
  },

  async deletePositiveExample(id: string): Promise<void> {
    const { error } = await supabase.from('ai_positive_examples').delete().eq('id', id);
    if (error) throw error;
  },

  async togglePositiveExampleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('ai_positive_examples')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },

  // ─────────────────────────────────────────
  // NEGATIVE RULES OPERATIONS
  // ─────────────────────────────────────────

  async addNegativeRule(
    organizationId: string,
    data: {
      rule_type: string;
      pattern: string;
      reason?: string;
      severity: string;
      is_platform?: boolean;
    }
  ): Promise<NegativeRule> {
    const { data: created, error } = await supabase
      .from('ai_negative_rules')
      .insert({
        organization_id: organizationId,
        ...data,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return created as NegativeRule;
  },

  async deleteNegativeRule(id: string): Promise<void> {
    const { error } = await supabase.from('ai_negative_rules').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleNegativeRuleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('ai_negative_rules')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },

  // ─────────────────────────────────────────
  // GENERIC DELETE/TOGGLE (para compatibilidad)
  // ─────────────────────────────────────────

  /**
   * Elimina un item de cualquier tabla de AI
   * Mantenido para compatibilidad con código existente
   */
  async deleteItem(
    table: 'ai_assistant_knowledge' | 'ai_conversation_flows' | 'ai_positive_examples' | 'ai_negative_rules',
    id: string
  ): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Toggle is_active de cualquier tabla de AI
   * Mantenido para compatibilidad con código existente
   */
  async toggleItemActive(
    table: 'ai_assistant_knowledge' | 'ai_conversation_flows' | 'ai_positive_examples' | 'ai_negative_rules',
    id: string,
    isActive: boolean
  ): Promise<void> {
    const { error } = await supabase.from(table).update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },
};
