import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Users, TrendingUp, DollarSign, Sparkles, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useAmbassador } from "@/hooks/useAmbassador";
import { useTalentAI, TalentAmbassadorResult } from "@/hooks/useTalentAI";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

interface AmbassadorWithAnalysis {
  user_id: string;
  ambassador_level: "none" | "bronze" | "silver" | "gold";
  ambassador_since: string | null;
  ambassador_total_referrals: number;
  ambassador_active_referrals: number;
  ambassador_network_revenue: number;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    quality_score_avg: number;
  };
  aiAnalysis?: TalentAmbassadorResult;
}

export function AmbassadorDashboard() {
  const { getAllAmbassadors, updateAmbassadorLevel, loading } = useAmbassador();
  const { evaluateAmbassador, loading: aiLoading } = useTalentAI();
  
  const [ambassadors, setAmbassadors] = useState<AmbassadorWithAnalysis[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAmbassadors = async () => {
    setIsRefreshing(true);
    const data = await getAllAmbassadors();
    setAmbassadors(data as AmbassadorWithAnalysis[]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadAmbassadors();
  }, [getAllAmbassadors]);

  const handleAnalyze = async (userId: string) => {
    setAnalyzingId(userId);
    const result = await evaluateAmbassador(userId);
    if (result) {
      setAmbassadors((prev) =>
        prev.map((a) =>
          a.user_id === userId ? { ...a, aiAnalysis: result } : a
        )
      );
    }
    setAnalyzingId(null);
  };

  const handleLevelChange = async (userId: string, level: "none" | "bronze" | "silver" | "gold") => {
    const success = await updateAmbassadorLevel(userId, level);
    if (success) {
      loadAmbassadors();
    }
  };

  // Summary stats
  const totalAmbassadors = ambassadors.length;
  const goldCount = ambassadors.filter((a) => a.ambassador_level === "gold").length;
  const silverCount = ambassadors.filter((a) => a.ambassador_level === "silver").length;
  const bronzeCount = ambassadors.filter((a) => a.ambassador_level === "bronze").length;
  const totalNetworkRevenue = ambassadors.reduce((sum, a) => sum + (a.ambassador_network_revenue || 0), 0);
  const totalActiveReferrals = ambassadors.reduce((sum, a) => sum + (a.ambassador_active_referrals || 0), 0);

  // Alerts from AI analysis
  const ambassadorsWithAlerts = ambassadors.filter(
    (a) => a.aiAnalysis && (a.aiAnalysis.risk_flags.length > 0 || a.aiAnalysis.level_change !== "same")
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Embajadores</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmbassadors}</div>
            <div className="flex gap-2 mt-1">
              <Badge className={LEVEL_COLORS.gold} variant="secondary">{goldCount} Gold</Badge>
              <Badge className={LEVEL_COLORS.silver} variant="secondary">{silverCount} Silver</Badge>
              <Badge className={LEVEL_COLORS.bronze} variant="secondary">{bronzeCount} Bronze</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Red Total</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveReferrals}</div>
            <p className="text-xs text-muted-foreground">referidos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Indirecto</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalNetworkRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">generado por embajadores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas IA</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ambassadorsWithAlerts.length}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Alerts Section */}
      {ambassadorsWithAlerts.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Alertas de IA
            </CardTitle>
            <CardDescription>Embajadores que requieren revisión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ambassadorsWithAlerts.map((amb) => (
              <div key={amb.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={amb.profile.avatar_url || ""} />
                    <AvatarFallback>{amb.profile.full_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{amb.profile.full_name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge className={LEVEL_COLORS[amb.ambassador_level]} variant="secondary">
                        {LEVEL_LABELS[amb.ambassador_level]}
                      </Badge>
                      {amb.aiAnalysis?.level_change === "up" && (
                        <span className="text-green-600">📈 Candidato a ascenso</span>
                      )}
                      {amb.aiAnalysis?.level_change === "down" && (
                        <span className="text-red-600">📉 Riesgo de descenso</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {amb.aiAnalysis && (
                    <Badge className={LEVEL_COLORS[amb.aiAnalysis.recommended_level]}>
                      Recomendado: {LEVEL_LABELS[amb.aiAnalysis.recommended_level]}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ambassadors Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ranking de Embajadores</CardTitle>
              <CardDescription>Ordenado por impacto de revenue</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAmbassadors} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Embajador</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead className="text-center">Red Activa</TableHead>
                <TableHead className="text-center">Revenue</TableHead>
                <TableHead className="text-center">Calidad</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ambassadors.map((amb, index) => (
                <TableRow key={amb.user_id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={amb.profile.avatar_url || ""} />
                        <AvatarFallback>{amb.profile.full_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{amb.profile.full_name}</p>
                        <p className="text-xs text-muted-foreground">{amb.profile.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={amb.ambassador_level}
                      onValueChange={(v: any) => handleLevelChange(amb.user_id, v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguno</SelectItem>
                        <SelectItem value="bronze">Bronce</SelectItem>
                        <SelectItem value="silver">Plata</SelectItem>
                        <SelectItem value="gold">Oro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-medium">{amb.ambassador_active_referrals || 0}</span>
                      <span className="text-xs text-muted-foreground">/ {amb.ambassador_total_referrals || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    ${(amb.ambassador_network_revenue || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">{amb.profile.quality_score_avg?.toFixed(1) || "-"}</span>
                      <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {amb.aiAnalysis ? (
                      <div className="flex items-center gap-1">
                        <Badge className={LEVEL_COLORS[amb.aiAnalysis.recommended_level]} variant="outline">
                          {LEVEL_LABELS[amb.aiAnalysis.recommended_level]}
                        </Badge>
                        {amb.aiAnalysis.risk_flags.length > 0 && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAnalyze(amb.user_id)}
                      disabled={analyzingId === amb.user_id}
                    >
                      {analyzingId === amb.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {ambassadors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay embajadores activos</p>
              <p className="text-sm">Asigna el nivel de embajador a tus mejores talentos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
