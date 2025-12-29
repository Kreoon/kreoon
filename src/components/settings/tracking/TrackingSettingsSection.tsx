import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Puzzle, Brain, BarChart3, Settings2 } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { TrackingGeneralSettings } from './TrackingGeneralSettings';
import { TrackingIntegrationsSettings } from './TrackingIntegrationsSettings';
import { TrackingAISettings } from './TrackingAISettings';
import { TrackingEventsLog } from './TrackingEventsLog';
import { TrackingAnalyticsDashboard } from './TrackingAnalyticsDashboard';

export function TrackingSettingsSection() {
  const [activeTab, setActiveTab] = useState('general');
  const { currentOrganization: organization } = useOrganization();

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Selecciona una organización para configurar el tracking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tracking & Analytics</h2>
        <p className="text-muted-foreground">
          Configura el motor de tracking interno y las integraciones externas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Integraciones</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">IA Insights</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <TrackingGeneralSettings organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <TrackingIntegrationsSettings organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <TrackingAISettings organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <TrackingAnalyticsDashboard organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <TrackingEventsLog organizationId={organization.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
