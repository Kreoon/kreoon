import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, Settings, Brain, Target, 
  AlertTriangle, Zap, Trophy, Activity, Award, Lock
} from 'lucide-react';
import { useUPEngine } from '@/hooks/useUPEngine';
import { UPRulesBuilder } from './UPRulesBuilder';
import { UPAIPanel } from './UPAIPanel';
import { UPAnalytics } from './UPAnalytics';
import { UPSeasonsManager } from './UPSeasonsManager';
import { UPSettingsPanel } from './UPSettingsPanel';
import { UPAchievementsManager } from './UPAchievementsManager';
import { UPLevelsManager } from './UPLevelsManager';
import { UPPermissionsEditor } from './UPPermissionsEditor';
import { cn } from '@/lib/utils';

interface UPControlCenterProps {
  organizationId: string;
}

export function UPControlCenter({ organizationId }: UPControlCenterProps) {
  const { 
    rules, 
    events, 
    seasons,
    aiConfig,
    loading,
    refetch
  } = useUPEngine(organizationId);

  const [activeTab, setActiveTab] = useState('analytics');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const activeSeason = seasons.find(s => s.is_active);
  const activeRulesCount = rules.filter(r => r.is_active).length;
  const totalEvents = events.length;
  const fraudAlerts = 0; // Will be fetched from UP fraud alerts

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRulesCount}</p>
              <p className="text-xs text-muted-foreground">Reglas Activas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Zap className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEvents}</p>
              <p className="text-xs text-muted-foreground">Eventos Hoy</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Trophy className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSeason?.name || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Temporada Activa</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5",
          fraudAlerts > 0 && "animate-pulse"
        )}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{fraudAlerts}</p>
              <p className="text-xs text-muted-foreground">Alertas Fraude</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid bg-secondary/50 border border-border">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Reglas</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Logros</span>
          </TabsTrigger>
          <TabsTrigger value="levels" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Niveles</span>
          </TabsTrigger>
          <TabsTrigger value="seasons" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Temporadas</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">IA</span>
            {aiConfig?.quality_score_enabled && (
              <Badge variant="secondary" className="ml-1 text-xs">ON</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">RBAC</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <UPAnalytics organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="rules">
          <UPRulesBuilder 
            organizationId={organizationId} 
            rules={rules}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="achievements">
          <UPAchievementsManager organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="levels">
          <UPLevelsManager organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="seasons">
          <UPSeasonsManager 
            organizationId={organizationId}
            seasons={seasons}
          />
        </TabsContent>

        <TabsContent value="ai">
          <UPAIPanel 
            organizationId={organizationId}
            aiConfig={aiConfig}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <UPPermissionsEditor organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="settings">
          <UPSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
