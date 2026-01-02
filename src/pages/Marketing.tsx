import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { MarketingClients } from "@/components/marketing/MarketingClients";
import { MarketingCampaigns } from "@/components/marketing/MarketingCampaigns";
import { MarketingCalendar } from "@/components/marketing/MarketingCalendar";
import { MarketingReports } from "@/components/marketing/MarketingReports";
import { Target, Megaphone, Calendar, BarChart3 } from "lucide-react";

export default function Marketing() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Marketing & Estrategia</h1>
          <p className="text-muted-foreground">
            Gestiona clientes, campañas y estrategias de marketing digital
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="clients" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Campañas</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reportes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <MarketingClients organizationId={profile?.current_organization_id} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <MarketingCampaigns organizationId={profile?.current_organization_id} />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <MarketingCalendar organizationId={profile?.current_organization_id} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <MarketingReports organizationId={profile?.current_organization_id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
