import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { toast } from "@/hooks/use-toast";
import { invokeAIWithTokens } from "@/lib/ai/token-gate";

export interface TalentMatchingResult {
  selected_id: string | null;
  selected_name?: string;
  reasoning: string[];
  risk_level: "low" | "medium" | "high";
  confidence: number;
  alternatives?: Array<{ id: string; name: string; reason: string }>;
}

export interface TalentQualityResult {
  quality_score: number;
  strengths: string[];
  improvements: string[];
  on_time: boolean;
  bonus_points: number;
}

export interface TalentRiskResult {
  risk_level: "none" | "warning" | "high";
  risk_factors: string[];
  recommended_action: string;
  max_recommended_tasks?: number;
  burnout_probability?: number;
  execution_id?: string;
}

export interface TalentReputationResult {
  recommended_level: "junior" | "pro" | "elite";
  level_reasoning: string;
  ambassador_potential: number;
  ambassador_reasoning: string;
  recommendations: Array<{
    type: string;
    reason: string;
    confidence: number;
  }>;
  strengths: string[];
  development_areas: string[];
  execution_id?: string;
}

export interface TalentAmbassadorResult {
  recommended_level: "none" | "bronze" | "silver" | "gold";
  current_level: string;
  level_change: "up" | "down" | "same";
  justification: string[];
  risk_flags: string[];
  suggested_actions: Array<{
    type: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  network_metrics?: {
    active_referrals: number;
    network_content_count: number;
    network_quality_avg: number;
    retention_rate: number;
    estimated_revenue_impact: number;
  };
  confidence: number;
}

export function useTalentAI() {
  const [loading, setLoading] = useState(false);
  const { currentOrgId } = useOrgOwner();

  const findBestMatch = async (
    role: "editor" | "creator",
    options?: {
      contentId?: string;
      contentType?: string;
      deadline?: string;
      priority?: string;
    }
  ): Promise<TalentMatchingResult | null> => {
    if (!currentOrgId) {
      toast({ variant: "destructive", description: "No hay organización seleccionada" });
      return null;
    }

    setLoading(true);
    try {
      const data = await invokeAIWithTokens("talent-ai", "talent.match", {
        action: "matching",
        organizationId: currentOrgId,
        role,
        ...options,
      }, currentOrgId);
      return data as TalentMatchingResult;
    } catch (error: any) {
      console.error("Talent matching error:", error);
      toast({ variant: "destructive", description: error.message || "Error al buscar talento" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const evaluateQuality = async (
    userId: string,
    contentId: string
  ): Promise<TalentQualityResult | null> => {
    if (!currentOrgId) return null;

    setLoading(true);
    try {
      const data = await invokeAIWithTokens("talent-ai", "talent.suggest_creator", {
        action: "quality",
        organizationId: currentOrgId,
        userId,
        contentId,
      }, currentOrgId);
      return data as TalentQualityResult;
    } catch (error: any) {
      console.error("Quality evaluation error:", error);
      toast({ variant: "destructive", description: error.message || "Error al evaluar calidad" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const analyzeRisk = async (userId: string): Promise<TalentRiskResult | null> => {
    if (!currentOrgId) return null;

    setLoading(true);
    try {
      const data = await invokeAIWithTokens("talent-ai", "talent.suggest_creator", {
        action: "risk",
        organizationId: currentOrgId,
        userId,
      }, currentOrgId);
      return data as TalentRiskResult;
    } catch (error: any) {
      console.error("Risk analysis error:", error);
      toast({ variant: "destructive", description: error.message || "Error al analizar riesgo" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const evaluateReputation = async (userId: string): Promise<TalentReputationResult | null> => {
    if (!currentOrgId) return null;

    setLoading(true);
    try {
      const data = await invokeAIWithTokens("talent-ai", "talent.suggest_creator", {
        action: "reputation",
        organizationId: currentOrgId,
        userId,
      }, currentOrgId);
      return data as TalentReputationResult;
    } catch (error: any) {
      console.error("Reputation evaluation error:", error);
      toast({ variant: "destructive", description: error.message || "Error al evaluar reputación" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const evaluateAmbassador = async (userId: string): Promise<TalentAmbassadorResult | null> => {
    if (!currentOrgId) return null;

    setLoading(true);
    try {
      const data = await invokeAIWithTokens("talent-ai", "talent.suggest_creator", {
        action: "ambassador",
        organizationId: currentOrgId,
        userId,
      }, currentOrgId);
      return data as TalentAmbassadorResult;
    } catch (error: any) {
      console.error("Ambassador evaluation error:", error);
      toast({ variant: "destructive", description: error.message || "Error al evaluar embajador" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    findBestMatch,
    evaluateQuality,
    analyzeRisk,
    evaluateReputation,
    evaluateAmbassador,
  };
}
