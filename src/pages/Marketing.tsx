import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { MarketingDashboard } from "@/components/marketing/MarketingDashboard";
import { MarketingStrategy } from "@/components/marketing/MarketingStrategy";
import { MarketingTraffic } from "@/components/marketing/MarketingTraffic";
import { MarketingCampaigns } from "@/components/marketing/MarketingCampaigns";
import { MarketingReports } from "@/components/marketing/MarketingReports";
import { MarketingInsights } from "@/components/marketing/MarketingInsights";
import { MarketingContent } from "@/components/marketing/MarketingContent";
import { ClientMarketingDashboard } from "@/components/marketing/ClientMarketingDashboard";
import { StrategistCompanySwitcher } from "@/components/marketing/StrategistCompanySwitcher";
import { MarketingClientSwitcher } from "@/components/marketing/MarketingClientSwitcher";
import { useStrategistClientContext } from "@/contexts/StrategistClientContext";
import { 
  LayoutDashboard, 
  Target, 
  Radio, 
  Megaphone, 
  BarChart3, 
  Sparkles,
  TrendingUp,
  FileVideo,
  Building2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Marketing() {
  const { profile } = useAuth();
  const { selectedClient, clients } = useStrategistClientContext();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Local state for client selection in marketing module
  const [selectedMarketingClientId, setSelectedMarketingClientId] = useState<string | null>(null);

  const hasStrategistRole = clients.length > 0;

  // Determine which organization to use
  const effectiveOrgId = profile?.current_organization_id;
  
  // Use either the marketing-specific client or the strategist context client
  const effectiveClientId = selectedMarketingClientId || selectedClient?.id || null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header con Company Switcher y Client Switcher */}
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
          
          {/* Switchers Container */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Company Switcher para Estrategas */}
            {hasStrategistRole && (
              <StrategistCompanySwitcher />
            )}
            
            {/* Client Switcher - Siempre visible en Marketing */}
            <MarketingClientSwitcher
              organizationId={effectiveOrgId}
              selectedClientId={selectedMarketingClientId}
              onClientChange={setSelectedMarketingClientId}
            />
          </div>
        </div>

        {/* Context Badges */}
        <div className="flex flex-wrap gap-2">
          {hasStrategistRole && selectedClient && (
            <Badge variant="outline" className="gap-2 py-1.5 px-3 bg-primary/5 border-primary/20">
              <Building2 className="h-3.5 w-3.5" />
              Empresa: {selectedClient.name}
            </Badge>
          )}
          {selectedMarketingClientId && (
            <Badge variant="default" className="gap-2 py-1.5 px-3">
              <Target className="h-3.5 w-3.5" />
              Analizando cliente activo
            </Badge>
          )}
        </div>

        {/* Alert when no client selected */}
        {!selectedMarketingClientId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Selecciona un cliente</AlertTitle>
            <AlertDescription>
              Selecciona un cliente para analizar su marketing, validar contenido y gestionar campañas.
              Los datos mostrados se filtrarán por el cliente seleccionado.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs del módulo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1">
            <TabsTrigger value="dashboard" className="gap-2 py-2.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-2 py-2.5">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Estrategia</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2 py-2.5">
              <FileVideo className="h-4 w-4" />
              <span className="hidden sm:inline">Contenido</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 py-2.5">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Campañas</span>
            </TabsTrigger>
            <TabsTrigger value="traffic" className="gap-2 py-2.5">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Tráfico</span>
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
            {selectedMarketingClientId ? (
              <ClientMarketingDashboard 
                organizationId={effectiveOrgId}
                clientId={selectedMarketingClientId}
              />
            ) : (
              <MarketingDashboard 
                organizationId={effectiveOrgId} 
                selectedClientId={effectiveClientId}
              />
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <MarketingContent 
              organizationId={effectiveOrgId}
              selectedClientId={selectedMarketingClientId}
            />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <MarketingStrategy 
              organizationId={effectiveOrgId}
              selectedClientId={selectedMarketingClientId}
            />
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <MarketingTraffic 
              organizationId={effectiveOrgId}
              selectedClientId={selectedMarketingClientId}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <MarketingCampaigns 
              organizationId={effectiveOrgId} 
              selectedClientId={selectedMarketingClientId}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <MarketingReports 
              organizationId={effectiveOrgId}
              selectedClientId={selectedMarketingClientId}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <MarketingInsights 
              organizationId={effectiveOrgId}
              selectedClientId={selectedMarketingClientId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}