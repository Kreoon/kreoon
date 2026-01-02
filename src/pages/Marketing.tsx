import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { MarketingDashboard } from "@/components/marketing/MarketingDashboard";
import { MarketingStrategy } from "@/components/marketing/MarketingStrategy";
import { MarketingTraffic } from "@/components/marketing/MarketingTraffic";
import { MarketingCampaigns } from "@/components/marketing/MarketingCampaigns";
import { MarketingReports } from "@/components/marketing/MarketingReports";
import { MarketingInsights } from "@/components/marketing/MarketingInsights";
import { StrategistCompanySwitcher } from "@/components/marketing/StrategistCompanySwitcher";
import { useStrategistClientContext } from "@/contexts/StrategistClientContext";
import { 
  LayoutDashboard, 
  Target, 
  Radio, 
  Megaphone, 
  BarChart3, 
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function Marketing() {
  const { profile } = useAuth();
  const { selectedClient, clients } = useStrategistClientContext();
  const [activeTab, setActiveTab] = useState("dashboard");

  const hasStrategistRole = clients.length > 0;

  // Determine which organization to use
  const effectiveOrgId = profile?.current_organization_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header con Company Switcher para Estrategas */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Marketing Hub</h1>
                <p className="text-muted-foreground">
                  Centro de control estratégico de marketing
                </p>
              </div>
            </div>
          </div>
          
          {/* Company Switcher para Estrategas */}
          {hasStrategistRole && (
            <StrategistCompanySwitcher />
          )}
        </div>

        {/* Empresa activa badge */}
        {hasStrategistRole && selectedClient && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-3 flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Gestionando
              </Badge>
              <span className="font-medium">{selectedClient.name}</span>
              <span className="text-muted-foreground text-sm">
                — Todos los datos corresponden a esta empresa
              </span>
            </CardContent>
          </Card>
        )}

        {/* Tabs del módulo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
            <TabsTrigger value="dashboard" className="gap-2 py-2.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-2 py-2.5">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Estrategia</span>
            </TabsTrigger>
            <TabsTrigger value="traffic" className="gap-2 py-2.5">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Tráfico</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 py-2.5">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Campañas</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 py-2.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reportes</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2 py-2.5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Insights IA</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <MarketingDashboard 
              organizationId={effectiveOrgId} 
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <MarketingStrategy 
              organizationId={effectiveOrgId}
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <MarketingTraffic 
              organizationId={effectiveOrgId}
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <MarketingCampaigns 
              organizationId={effectiveOrgId} 
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <MarketingReports 
              organizationId={effectiveOrgId}
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <MarketingInsights 
              organizationId={effectiveOrgId}
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
