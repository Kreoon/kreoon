import { useCallback, useRef } from 'react';
import { useAnalyticsContext } from '../context';
import { AI_EVENTS } from '../constants';
import type {
  DNAWizardProps,
  AIAnalysisProps,
  ScriptGenerationProps,
  AISuggestionProps,
  AITokenUsageProps,
} from '../types';

export function useAIAnalytics() {
  const { track } = useAnalyticsContext();
  const wizardStartTime = useRef<number | null>(null);
  const stepStartTime = useRef<number | null>(null);

  // ===== DNA WIZARD =====

  const trackDNAWizardStarted = useCallback((inputMethod: 'url' | 'upload' | 'manual') => {
    wizardStartTime.current = Date.now();
    stepStartTime.current = Date.now();

    track({
      event_name: AI_EVENTS.DNA_WIZARD_STARTED,
      event_category: 'ai',
      properties: {
        input_method: inputMethod,
        total_steps: 6, // DNA Wizard tiene 6 pasos
      },
    });
  }, [track]);

  const trackDNAWizardStepCompleted = useCallback((
    stepNumber: number,
    stepName: string,
    additionalProps?: Partial<DNAWizardProps>
  ) => {
    const timeOnStep = stepStartTime.current
      ? Math.round((Date.now() - stepStartTime.current) / 1000)
      : undefined;

    stepStartTime.current = Date.now();

    track({
      event_name: AI_EVENTS.DNA_WIZARD_STEP_COMPLETED,
      event_category: 'ai',
      properties: {
        step_number: stepNumber,
        step_name: stepName,
        total_steps: 6,
        time_on_step_seconds: timeOnStep,
        ...additionalProps,
      },
    });
  }, [track]);

  const trackDNAWizardCompleted = useCallback((
    productId: string,
    analysisTypes: string[]
  ) => {
    const totalTime = wizardStartTime.current
      ? Math.round((Date.now() - wizardStartTime.current) / 1000)
      : undefined;

    wizardStartTime.current = null;
    stepStartTime.current = null;

    track({
      event_name: AI_EVENTS.DNA_WIZARD_COMPLETED,
      event_category: 'ai',
      properties: {
        product_id: productId,
        analysis_types: analysisTypes,
        total_steps: 6,
        total_time_seconds: totalTime,
      },
    });
  }, [track]);

  const trackDNAWizardAbandoned = useCallback((
    lastStepCompleted: number,
    reason?: string
  ) => {
    const totalTime = wizardStartTime.current
      ? Math.round((Date.now() - wizardStartTime.current) / 1000)
      : undefined;

    wizardStartTime.current = null;
    stepStartTime.current = null;

    track({
      event_name: AI_EVENTS.DNA_WIZARD_ABANDONED,
      event_category: 'ai',
      properties: {
        last_step_completed: lastStepCompleted,
        total_steps: 6,
        total_time_seconds: totalTime,
        abandon_reason: reason,
      },
    });
  }, [track]);

  // ===== DNA ANALYSIS =====

  const trackDNAAnalysisGenerated = useCallback((
    productId: string,
    analysisType: string,
    success: boolean,
    responseTimeMs?: number
  ) => {
    track({
      event_name: AI_EVENTS.DNA_ANALYSIS_GENERATED,
      event_category: 'ai',
      properties: {
        product_id: productId,
        analysis_type: analysisType,
        success,
        response_time_ms: responseTimeMs,
      },
    });
  }, [track]);

  const trackDNAAnalysisRegenerated = useCallback((
    productId: string,
    analysisType: string
  ) => {
    track({
      event_name: AI_EVENTS.DNA_ANALYSIS_REGENERATED,
      event_category: 'ai',
      properties: { product_id: productId, analysis_type: analysisType },
    });
  }, [track]);

  const trackDNAAnalysisExported = useCallback((
    productId: string,
    exportFormat: 'pdf' | 'docx' | 'json'
  ) => {
    track({
      event_name: AI_EVENTS.DNA_ANALYSIS_EXPORTED,
      event_category: 'ai',
      properties: { product_id: productId, export_format: exportFormat },
    });
  }, [track]);

  // ===== SCRIPT GENERATION =====

  const trackScriptGenerationStarted = useCallback((props: ScriptGenerationProps) => {
    track({
      event_name: AI_EVENTS.SCRIPT_GENERATION_STARTED,
      event_category: 'ai',
      properties: props,
    });
  }, [track]);

  const trackScriptGenerated = useCallback((
    props: ScriptGenerationProps & { success: boolean; responseTimeMs?: number }
  ) => {
    track({
      event_name: AI_EVENTS.SCRIPT_GENERATED,
      event_category: 'ai',
      properties: props,
    });
  }, [track]);

  const trackScriptRegenerated = useCallback((scriptId: string, reason?: string) => {
    track({
      event_name: AI_EVENTS.SCRIPT_REGENERATED,
      event_category: 'ai',
      properties: { script_id: scriptId, regenerate_reason: reason },
    });
  }, [track]);

  const trackScriptCopied = useCallback((scriptId: string) => {
    track({
      event_name: AI_EVENTS.SCRIPT_COPIED,
      event_category: 'ai',
      properties: { script_id: scriptId },
    });
  }, [track]);

  const trackScriptExported = useCallback((scriptId: string, format: string) => {
    track({
      event_name: AI_EVENTS.SCRIPT_EXPORTED,
      event_category: 'ai',
      properties: { script_id: scriptId, export_format: format },
    });
  }, [track]);

  // ===== AI ANALYSIS (Generic) =====

  const trackAIAnalysisRequested = useCallback((props: AIAnalysisProps) => {
    track({
      event_name: AI_EVENTS.AI_ANALYSIS_REQUESTED,
      event_category: 'ai',
      properties: props,
    });
  }, [track]);

  const trackAIAnalysisCompleted = useCallback((props: AIAnalysisProps) => {
    track({
      event_name: AI_EVENTS.AI_ANALYSIS_COMPLETED,
      event_category: 'ai',
      properties: { ...props, success: true },
    });
  }, [track]);

  const trackAIAnalysisFailed = useCallback((
    analysisType: string,
    errorCode: string,
    errorMessage: string
  ) => {
    track({
      event_name: AI_EVENTS.AI_ANALYSIS_FAILED,
      event_category: 'ai',
      properties: {
        analysis_type: analysisType,
        success: false,
        error_code: errorCode,
        error_message: errorMessage,
      },
    });
  }, [track]);

  // ===== AI SUGGESTIONS =====

  const trackAISuggestionShown = useCallback((props: AISuggestionProps) => {
    track({
      event_name: AI_EVENTS.AI_SUGGESTION_SHOWN,
      event_category: 'ai',
      properties: { ...props, action: 'shown' },
    });
  }, [track]);

  const trackAISuggestionAccepted = useCallback((props: Omit<AISuggestionProps, 'action'>) => {
    track({
      event_name: AI_EVENTS.AI_SUGGESTION_ACCEPTED,
      event_category: 'ai',
      properties: { ...props, action: 'accepted' },
    });
  }, [track]);

  const trackAISuggestionRejected = useCallback((props: Omit<AISuggestionProps, 'action'>) => {
    track({
      event_name: AI_EVENTS.AI_SUGGESTION_REJECTED,
      event_category: 'ai',
      properties: { ...props, action: 'rejected' },
    });
  }, [track]);

  const trackAISuggestionModified = useCallback((
    props: Omit<AISuggestionProps, 'action'> & { modificationPercent: number }
  ) => {
    track({
      event_name: AI_EVENTS.AI_SUGGESTION_MODIFIED,
      event_category: 'ai',
      properties: { ...props, action: 'modified' },
    });
  }, [track]);

  // ===== AI CHAT (KIRO) =====

  const trackAIChatStarted = useCallback((context?: string) => {
    track({
      event_name: AI_EVENTS.AI_CHAT_STARTED,
      event_category: 'ai',
      properties: { chat_context: context },
    });
  }, [track]);

  const trackAIChatMessageSent = useCallback((messageLength: number) => {
    track({
      event_name: AI_EVENTS.AI_CHAT_MESSAGE_SENT,
      event_category: 'ai',
      properties: { message_length: messageLength },
    });
  }, [track]);

  const trackAIChatResponseReceived = useCallback((responseTimeMs: number, tokensUsed?: number) => {
    track({
      event_name: AI_EVENTS.AI_CHAT_RESPONSE_RECEIVED,
      event_category: 'ai',
      properties: { response_time_ms: responseTimeMs, tokens_used: tokensUsed },
    });
  }, [track]);

  // ===== TOKEN USAGE =====

  const trackAITokensUsed = useCallback((props: AITokenUsageProps) => {
    track({
      event_name: AI_EVENTS.AI_TOKENS_USED,
      event_category: 'ai',
      properties: props,
    });
  }, [track]);

  const trackAIQuotaWarning = useCallback((
    usagePercent: number,
    feature: string
  ) => {
    track({
      event_name: AI_EVENTS.AI_QUOTA_WARNING,
      event_category: 'ai',
      properties: { usage_percent: usagePercent, feature },
    });
  }, [track]);

  const trackAIQuotaExceeded = useCallback((feature: string) => {
    track({
      event_name: AI_EVENTS.AI_QUOTA_EXCEEDED,
      event_category: 'ai',
      properties: { feature },
    });
  }, [track]);

  return {
    // DNA Wizard
    trackDNAWizardStarted,
    trackDNAWizardStepCompleted,
    trackDNAWizardCompleted,
    trackDNAWizardAbandoned,

    // DNA Analysis
    trackDNAAnalysisGenerated,
    trackDNAAnalysisRegenerated,
    trackDNAAnalysisExported,

    // Script
    trackScriptGenerationStarted,
    trackScriptGenerated,
    trackScriptRegenerated,
    trackScriptCopied,
    trackScriptExported,

    // AI Analysis
    trackAIAnalysisRequested,
    trackAIAnalysisCompleted,
    trackAIAnalysisFailed,

    // Suggestions
    trackAISuggestionShown,
    trackAISuggestionAccepted,
    trackAISuggestionRejected,
    trackAISuggestionModified,

    // Chat
    trackAIChatStarted,
    trackAIChatMessageSent,
    trackAIChatResponseReceived,

    // Tokens
    trackAITokensUsed,
    trackAIQuotaWarning,
    trackAIQuotaExceeded,
  };
}
