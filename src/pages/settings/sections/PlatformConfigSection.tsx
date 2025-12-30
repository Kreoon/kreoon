import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Palette, Globe, Coins } from 'lucide-react';
import { AppSettingsManagement } from '@/components/settings/AppSettingsManagement';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { TokenGiftingPanel } from '@/components/settings/TokenGiftingPanel';

export default function PlatformConfigSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración de Plataforma</h2>
        <p className="text-muted-foreground">
          Ajustes globales, apariencia e integraciones externas
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Ajustes
          </TabsTrigger>
          <TabsTrigger value="tokens" className="gap-2">
            <Coins className="h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Apariencia
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="h-4 w-4" />
            Integraciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <AppSettingsManagement />
        </TabsContent>

        <TabsContent value="tokens">
          <TokenGiftingPanel />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
