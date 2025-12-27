import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AI_MODULE_DEFINITIONS, 
  getModuleDefinition
} from '@/lib/aiModuleKeys';

export interface AIPromptConfig {
  role: string;
  task: string;
  input: Record<string, unknown>;
  output_format: Record<string, unknown>;
}

// Default prompts for each module (fallback if not in DB)
const DEFAULT_PROMPTS: Record<string, AIPromptConfig> = {
  'board.cards.ai': {
    role: 'board_ai_card_analyst',
    task: 'Analyze a board card and recommend next actions.',
    input: { card: {}, current_state: '', assigned_roles: [], timestamps: {}, comments: [] },
    output_format: { risk_level: 'low | medium | high', delay_probability: 0, recommended_next_state: '', recommended_actions: [], reasoning: [], confidence: 0 }
  },
  'board.states.ai': {
    role: 'board_ai_state_optimizer',
    task: 'Analyze board states and detect inefficiencies.',
    input: { states: [], cards_per_state: {}, avg_time_per_state: {} },
    output_format: { problematic_states: [], recommendations: [], impact_estimation: '', confidence: 0 }
  },
  'board.flows.ai': {
    role: 'board_ai_flow_strategist',
    task: 'Analyze the full board flow and suggest optimizations.',
    input: { states_order: [], transitions: [], bottlenecks: [] },
    output_format: { flow_issues: [], automation_suggestions: [], expected_improvement: '', confidence: 0 }
  },
  'content.script.ai': {
    role: 'ugc_script_strategist',
    task: 'Generate or analyze a video script based on structured inputs.',
    input: { product: {}, avatar: {}, hooks_count: 0, objective: '', angle: '', stage: '' },
    output_format: { creator_block: {}, editor_block: {}, strategist_block: {}, trafficker_block: {}, designer_block: {}, admin_block: {} }
  },
  'content.editor.ai': {
    role: 'ugc_video_editor_ai',
    task: 'Optimize editing structure and storytelling rhythm.',
    input: { script: {}, platform: '', duration: '' },
    output_format: { editing_notes: [], scene_breakdown: [], subtitle_style: '', confidence: 0 }
  },
  'content.strategist.ai': {
    role: 'ugc_content_strategist',
    task: 'Analyze funnel position and conversion hypothesis.',
    input: { product: {}, funnel_stage: '', target_audience: {}, previous_content_performance: [] },
    output_format: { funnel_analysis: {}, conversion_hypothesis: [], recommended_angles: [], kpi_predictions: {}, confidence: 0 }
  },
  'content.designer.ai': {
    role: 'ugc_visual_designer_ai',
    task: 'Generate visual guidelines and thumbnail concepts.',
    input: { script: {}, brand_guidelines: {}, platform: '', content_type: '' },
    output_format: { color_palette: [], typography_suggestions: [], thumbnail_concepts: [], visual_style: '', confidence: 0 }
  },
  'content.trafficker.ai': {
    role: 'ugc_trafficker_ai',
    task: 'Generate ad copies, targeting suggestions, and KPI predictions.',
    input: { script: {}, product: {}, platform: '', budget: 0, objective: '' },
    output_format: { primary_text_variations: [], headlines: [], targeting_suggestions: {}, expected_kpis: {}, confidence: 0 }
  },
  'content.admin.ai': {
    role: 'ugc_project_manager_ai',
    task: 'Operational management, timeline tracking, and resource allocation.',
    input: { content: {}, team: [], deadlines: {}, blockers: [] },
    output_format: { timeline_status: '', risk_alerts: [], resource_suggestions: [], next_actions: [], confidence: 0 }
  },
  'up.events.ai': {
    role: 'gamification_event_detector',
    task: 'Detect events that should trigger point awards.',
    input: { content: {}, user_actions: [], timestamps: {} },
    output_format: { detected_events: [], point_recommendations: [], confidence: 0 }
  },
  'up.quality.ai': {
    role: 'gamification_quality_ai',
    task: 'Evaluate content quality for gamification scoring.',
    input: { content: {}, history: {}, corrections: 0 },
    output_format: { quality_score: 0, strengths: [], improvements: [], recommended_bonus: 0 }
  },
  'up.recommendations.ai': {
    role: 'gamification_quest_generator',
    task: 'Generate personalized quests and challenges for users.',
    input: { user_stats: {}, role: '', current_level: '', completed_quests: [] },
    output_format: { suggested_quests: [], difficulty_rating: '', expected_engagement: 0, confidence: 0 }
  },
  'up.antifraud.ai': {
    role: 'gamification_antifraud_ai',
    task: 'Detect suspicious patterns and potential abuse in gamification.',
    input: { user_activity: [], point_history: [], login_patterns: [] },
    output_format: { risk_score: 0, suspicious_patterns: [], recommended_actions: [], confidence: 0 }
  }
};

export function useAIPrompts(organizationId: string | null) {
  /**
   * Get the prompt configuration for a specific module
   * First tries to fetch from DB, falls back to default
   */
  const getModulePrompt = useCallback(async (moduleKey: string): Promise<AIPromptConfig | null> => {
    if (!organizationId) return DEFAULT_PROMPTS[moduleKey] || null;

    try {
      // Try to get from database using RPC
      const { data, error } = await supabase.rpc('get_ai_module_prompt', {
        _org_id: organizationId,
        _module_key: moduleKey
      });

      if (error) {
        console.error('Error fetching AI prompt:', error);
        return DEFAULT_PROMPTS[moduleKey] || null;
      }

      if (data && typeof data === 'object' && 'role' in data) {
        return data as unknown as AIPromptConfig;
      }

      // Fallback to default
      return DEFAULT_PROMPTS[moduleKey] || null;
    } catch (err) {
      console.error('Error in getModulePrompt:', err);
      return DEFAULT_PROMPTS[moduleKey] || null;
    }
  }, [organizationId]);

  /**
   * Initialize default prompts for an organization
   */
  const initializePrompts = useCallback(async (): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const { error } = await supabase.rpc('init_ai_prompts_for_org', {
        _org_id: organizationId
      });

      if (error) {
        console.error('Error initializing AI prompts:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in initializePrompts:', err);
      return false;
    }
  }, [organizationId]);

  /**
   * Build a complete prompt string from the config
   */
  const buildPromptString = useCallback((config: AIPromptConfig, inputData: Record<string, unknown>): string => {
    const systemPrompt = `You are a ${config.role}. Your task is: ${config.task}

Expected input format:
${JSON.stringify(config.input, null, 2)}

Expected output format (respond ONLY with valid JSON matching this structure):
${JSON.stringify(config.output_format, null, 2)}`;

    const userPrompt = `Input data:
${JSON.stringify(inputData, null, 2)}

Analyze this data and provide your response in the expected JSON format.`;

    return `${systemPrompt}\n\n---\n\n${userPrompt}`;
  }, []);

  /**
   * Get module definition with prompt config
   */
  const getModuleWithPrompt = useCallback(async (moduleKey: string) => {
    const definition = getModuleDefinition(moduleKey);
    const prompt = await getModulePrompt(moduleKey);
    
    return {
      definition,
      prompt
    };
  }, [getModulePrompt]);

  return {
    getModulePrompt,
    initializePrompts,
    buildPromptString,
    getModuleWithPrompt,
    defaultPrompts: DEFAULT_PROMPTS,
    moduleDefinitions: AI_MODULE_DEFINITIONS
  };
}
