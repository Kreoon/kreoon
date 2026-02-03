import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Crown, Users, TrendingUp, DollarSign, Copy, UserPlus, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { useAmbassador } from "@/hooks/useAmbassador";
import { useTalentAI, TalentAmbassadorResult } from "@/hooks/useTalentAI";
import { toast } from "@/hooks/use-toast";

interface AmbassadorProfileSectionProps {
  userId: string;
  ambassadorLevel?: "none" | "bronze" | "silver" | "gold";
  isOwn?: boolean;
}

interface AmbassadorReferral {
  id: string;
  status: string;
  referred_email: string;
  referred_type: string;
  created_at: string;
}

interface AmbassadorStats {
  membership: {
    ambassador_level: string | null;
    ambassador_since: string | null;
    ambassador_total_referrals: number | null;
    ambassador_active_referrals: number | null;
    ambassador_network_revenue: number | null;
  } | null;
  referrals: AmbassadorReferral[];
  latestStats: Record<string, unknown> | null;
}

const LEVEL_COLORS = {
  none: "bg-muted text-muted-foreground",
  bronze: "bg-amber-600 text-white",
  silver: "bg-slate-400 text-white",
  gold: "bg-yellow-500 text-black",
};

const LEVEL_LABELS = {
  none: "Sin nivel",
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};

export function AmbassadorProfileSection({ userId, ambassadorLevel = "none", isOwn = false }: AmbassadorProfileSectionProps) {
  const { getAmbassadorStats, createReferral, getMyReferralCode, loading } = useAmbassador();
  const { evaluateAmbassador, loading: aiLoading } = useTalentAI();
  
  const [stats, setStats] = useState<AmbassadorStats | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<TalentAmbassadorResult | null>(null);
  const [currentLevel, setCurrentLevel] = useState<"none" | "bronze" | "silver" | "gold">(ambassadorLevel);
  
  // New referral form
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState<"creator" | "editor" | "client">("creator");

  useEffect(() => {
    const loadData = async () => {
      const [statsData, code] = await Promise.all([
        getAmbassadorStats(userId),
        isOwn ? getMyReferralCode() : Promise.resolve(null),
      ]);
      setStats(statsData);
      setReferralCode(code);
    };
    loadData();
  }, [userId, isOwn, getAmbassadorStats, getMyReferralCode]);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({ description: "Código copiado al portapapeles" });
    }
  };

  const handleAddReferral = async () => {
    if (!newEmail) return;
    const result = await createReferral(newEmail, newType);
    if (result) {
      setNewEmail("");
      // Reload stats
      const newStats = await getAmbassadorStats(userId);
      setStats(newStats);
    }
  };

  const handleAnalyzeAI = async () => {
    const result = await evaluateAmbassador(userId);
    if (result) {
      setAiAnalysis(result);
    }
  };

  const activeReferrals = stats?.referrals?.filter((r) => r.status === "active")?.length || 0;
  const pendingReferrals = stats?.referrals?.filter((r) => r.status === "pending")?.length || 0;
  const totalReferrals = stats?.referrals?.length || 0;

  if (currentLevel === "none" && !isOwn) {
    return null;
  }

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Impacto como Embajador</CardTitle>
          </div>
          <Badge className={LEVEL_COLORS[currentLevel]}>
            {LEVEL_LABELS[currentLevel]}
          </Badge>
        </div>
        <CardDescription>
          {isOwn
            ? "Tu red de referidos y métricas de impacto"
            : "Métricas de impacto del embajador"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{activeReferrals}</p>
            <p className="text-xs text-muted-foreground">Red Activa</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats?.latestStats?.content_by_network || 0}</p>
            <p className="text-xs text-muted-foreground">Contenido Red</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">${stats?.membership?.ambassador_network_revenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Revenue Indirecto</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Sparkles className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{stats?.latestStats?.retention_rate?.toFixed(0) || 0}%</p>
            <p className="text-xs text-muted-foreground">Retención</p>
          </div>
        </div>

        {/* Referrals Summary */}
        {totalReferrals > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Referidos totales</span>
              <span className="font-medium">{totalReferrals}</span>
            </div>
            <Progress value={(activeReferrals / Math.max(totalReferrals, 1)) * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{activeReferrals} activos</span>
              <span>{pendingReferrals} pendientes</span>
            </div>
          </div>
        )}

        {/* Referral Code (only for ambassador) */}
        {isOwn && ambassadorLevel !== "none" && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Tu código de referido</h4>
              <div className="flex gap-2">
                <Input
                  value={referralCode || "Generando..."}
                  readOnly
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={handleCopyCode} disabled={!referralCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Add new referral */}
              <div className="flex gap-2">
                <Input
                  placeholder="Email del referido"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">Creador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddReferral} disabled={loading || !newEmail}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* AI Analysis Button & Results */}
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Análisis IA
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeAI}
              disabled={aiLoading}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analizar"}
            </Button>
          </div>

          {aiAnalysis && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              {/* Recommended Level */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nivel recomendado</span>
                <Badge className={LEVEL_COLORS[aiAnalysis.recommended_level]}>
                  {LEVEL_LABELS[aiAnalysis.recommended_level]}
                </Badge>
              </div>

              {/* Level Change Indicator */}
              {aiAnalysis.level_change !== "same" && (
                <div className={`text-sm p-2 rounded ${
                  aiAnalysis.level_change === "up" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                }`}>
                  {aiAnalysis.level_change === "up" ? "📈 Candidato a ascenso" : "📉 Riesgo de descenso"}
                </div>
              )}

              {/* Justification */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Justificación:</p>
                <ul className="text-xs space-y-1">
                  {aiAnalysis.justification.map((j, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {j}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Flags */}
              {aiAnalysis.risk_flags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Alertas:
                  </p>
                  <ul className="text-xs space-y-1">
                    {aiAnalysis.risk_flags.map((r, i) => (
                      <li key={i} className="text-amber-600">{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Network Metrics */}
              {aiAnalysis.network_metrics && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Calidad promedio red:</span>
                    <span className="ml-1 font-medium">{aiAnalysis.network_metrics.network_quality_avg.toFixed(1)}/10</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Impacto revenue:</span>
                    <span className="ml-1 font-medium">${aiAnalysis.network_metrics.estimated_revenue_impact.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confianza:</span>
                <Progress value={aiAnalysis.confidence} className="flex-1 h-1.5" />
                <span className="text-xs font-medium">{aiAnalysis.confidence}%</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
