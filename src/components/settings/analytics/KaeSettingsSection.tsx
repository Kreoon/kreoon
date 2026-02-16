import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Satellite, MapPin, ScrollText, FlaskConical, BarChart3 } from 'lucide-react';
import { AdPlatformsSettings } from '@/components/admin/analytics/platforms/AdPlatformsSettings';
import { KaeEventMappingTab } from './KaeEventMappingTab';
import { KaePlatformLogsTab } from './KaePlatformLogsTab';
import { KaeTestEventTab } from './KaeTestEventTab';
import { KAEDashboard } from '@/components/admin/analytics/KAEDashboard';

export function KaeSettingsSection() {
  const [activeTab, setActiveTab] = useState('platforms');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics Engine</h2>
        <p className="text-muted-foreground">
          Configura el motor de analytics server-side y las integraciones con plataformas de ads
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="platforms" className="flex items-center gap-2">
            <Satellite className="h-4 w-4" />
            <span className="hidden sm:inline">Plataformas</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Mapeo</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <span className="hidden sm:inline">Test</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="mt-6">
          <AdPlatformsSettings />
        </TabsContent>
        <TabsContent value="mapping" className="mt-6">
          <KaeEventMappingTab />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <KaePlatformLogsTab />
        </TabsContent>
        <TabsContent value="test" className="mt-6">
          <KaeTestEventTab />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-6">
          <KAEDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
