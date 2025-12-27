import { useState, useEffect } from "react";
import { 
  Brain, Sparkles, AlertTriangle, TrendingUp, Shield, Crown, Zap,
  RefreshCw, CheckCircle2, XCircle, Loader2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useTalentAI, TalentReputationResult, TalentRiskResult } from "@/hooks/useTalentAI";
import { cn } from "@/lib/utils";

interface TalentAITabProps {
  userId: string;
  onUpdate?: () => void;
}

interface AIRecommendation {
  id: string;
  recommendation_type: string;
  reason: string;
  confidence: number;
  is_actioned: boolean;
  created_at: string;
}

const LEVEL_CONFIG = {
  junior: { label: "Junior", icon: Shield, color: "text-muted-foreground", bgColor: "bg-muted" },
  pro: { label: "Pro", icon: Zap, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  elite: { label: "Elite", icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/10" }
};

const RISK_CONFIG = {
  none: { label: "Sin riesgo", color: "text-success", bgColor: "bg-success/10" },
  warning: { label: "Riesgo medio", color: "text-warning", bgColor: "bg-warning/10" },
  high: { label: "Alto riesgo", color: "text-destructive", bgColor: "bg-destructive/10" }
};

const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  level_up: "Subir de nivel",
  level_down: "Bajar de nivel",
  pause_assignments: "Pausar asignaciones",
  make_ambassador: "Convertir en embajador",
  increase_load: "Aumentar carga",
  reduce_load: "Reducir carga",
  training: "Capacitación recomendada"
};

export function TalentAITab({ userId, onUpdate }: TalentAITabProps) {
  const { currentOrgId } = useOrgOwner();
  const { analyzeRisk, evaluateReputation, loading: aiLoading } = useTalentAI();
  
  const [profile, setProfile] = useState<{
    ai_recommended_level: 'junior' | 'pro' | 'elite';
    ai_risk_flag: 'none' | 'warning' | 'high';
    quality_score_avg: number;
    reliability_score: number;
    velocity_score: number;
  } | null>(null);
  
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<TalentRiskResult | null>(null);
  const [reputationAnalysis, setReputationAnalysis] = useState<TalentReputationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId, currentOrgId]);

  const fetchData = async () => {
    if (!userId || !currentOrgId) return;
    setLoading(true);

    try {
      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('ai_recommended_level, ai_risk_flag, quality_score_avg, reliability_score, velocity_score')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile({
          ai_recommended_level: (profileData.ai_recommended_level as 'junior' | 'pro' | 'elite') || 'junior',
          ai_risk_flag: (profileData.ai_risk_flag as 'none' | 'warning' | 'high') || 'none',
          quality_score_avg: profileData.quality_score_avg || 0,
          reliability_score: profileData.reliability_score || 0,
          velocity_score: profileData.velocity_score || 0,
        });
      }

      // Fetch AI recommendations
      const { data: recsData } = await supabase
        .from('talent_ai_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', currentOrgId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecommendations(recsData || []);
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFullAnalysis = async () => {
    setAnalyzing(true);
    try {
      const [risk, reputation] = await Promise.all([
        analyzeRisk(userId),
        evaluateReputation(userId)
      ]);

      setRiskAnalysis(risk);
      setReputationAnalysis(reputation);
      
      // Refresh data after analysis
      await fetchData();
      onUpdate?.();
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleActionRecommendation = async (recId: string) => {
    try {
      await supabase
        .from('talent_ai_recommendations')
        .update({ 
          is_actioned: true, 
          actioned_at: new Date().toISOString() 
        })
        .eq('id', recId);

      setRecommendations(prev => 
        prev.map(r => r.id === recId ? { ...r, is_actioned: true } : r)
      );
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const levelConfig = profile ? LEVEL_CONFIG[profile.ai_recommended_level] : LEVEL_CONFIG.junior;
  const riskConfig = profile ? RISK_CONFIG[profile.ai_risk_flag] : RISK_CONFIG.none;
  const LevelIcon = levelConfig.icon;

  const overallScore = profile 
    ? Math.round(((profile.quality_score_avg + profile.reliability_score + profile.velocity_score) / 30) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with AI Analysis Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Análisis de IA</h4>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={runFullAnalysis}
          disabled={analyzing || aiLoading}
        >
          {analyzing || aiLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Analizar
        </Button>
      </div>

      {/* Level and Risk Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className={cn("p-4 rounded-lg border", levelConfig.bgColor)}>
          <div className="flex items-center gap-2 mb-2">
            <LevelIcon className={cn("h-5 w-5", levelConfig.color)} />
            <span className="text-sm font-medium text-muted-foreground">Nivel IA</span>
          </div>
          <p className={cn("text-xl font-bold", levelConfig.color)}>{levelConfig.label}</p>
        </div>

        <div className={cn("p-4 rounded-lg border", riskConfig.bgColor)}>
          <div className="flex items-center gap-2 mb-2">
            {profile?.ai_risk_flag !== 'none' && (
              <AlertTriangle className={cn("h-5 w-5", riskConfig.color)} />
            )}
            <span className="text-sm font-medium text-muted-foreground">Riesgo</span>
          </div>
          <p className={cn("text-xl font-bold", riskConfig.color)}>{riskConfig.label}</p>
        </div>
      </div>

      {/* Performance Scores */}
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <h5 className="font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Performance Score
        </h5>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall</span>
            <span className={cn(
              "font-semibold",
              overallScore >= 70 ? "text-success" : overallScore >= 40 ? "text-warning" : "text-destructive"
            )}>
              {overallScore}%
            </span>
          </div>
          <Progress value={overallScore} className="h-2" />

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.quality_score_avg?.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-muted-foreground">Calidad</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.reliability_score?.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-muted-foreground">Puntualidad</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.velocity_score?.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-muted-foreground">Velocidad</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Analysis Results */}
      {riskAnalysis && (
        <div className={cn("p-4 rounded-lg border", RISK_CONFIG[riskAnalysis.risk_level].bgColor)}>
          <h5 className="font-medium flex items-center gap-2 mb-3">
            <AlertTriangle className={cn("h-4 w-4", RISK_CONFIG[riskAnalysis.risk_level].color)} />
            Análisis de Riesgo
          </h5>
          
          {riskAnalysis.risk_factors.length > 0 && (
            <div className="space-y-1 mb-3">
              <p className="text-xs text-muted-foreground font-medium">Factores de riesgo:</p>
              <ul className="text-sm space-y-1">
                {riskAnalysis.risk_factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 flex-shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {riskAnalysis.recommended_action && (
            <div className="p-2 rounded bg-background/50">
              <p className="text-xs text-muted-foreground">Acción recomendada:</p>
              <p className="text-sm font-medium">{riskAnalysis.recommended_action}</p>
            </div>
          )}
        </div>
      )}

      {/* Reputation Analysis Results */}
      {reputationAnalysis && (
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <h5 className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Análisis de Reputación
          </h5>

          {reputationAnalysis.ambassador_potential > 50 && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-sm">
                Potencial de embajador: <strong>{reputationAnalysis.ambassador_potential}%</strong>
              </span>
            </div>
          )}

          {reputationAnalysis.strengths.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Fortalezas:</p>
              <div className="flex flex-wrap gap-1">
                {reputationAnalysis.strengths.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {reputationAnalysis.development_areas?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Áreas de desarrollo:</p>
              <div className="flex flex-wrap gap-1">
                {reputationAnalysis.development_areas.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Recommendations */}
      <div className="space-y-3">
        <h5 className="font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Recomendaciones IA
        </h5>

        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay recomendaciones. Ejecuta un análisis para generar sugerencias.
          </p>
        ) : (
          <div className="space-y-2">
            {recommendations.map(rec => (
              <div 
                key={rec.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  rec.is_actioned ? "bg-muted/50 opacity-60" : "bg-card"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {RECOMMENDATION_TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {rec.confidence}% confianza
                    </span>
                  </div>
                  <p className="text-sm truncate">{rec.reason}</p>
                </div>

                {!rec.is_actioned ? (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleActionRecommendation(rec.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </Button>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
