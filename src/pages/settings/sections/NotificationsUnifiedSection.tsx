import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Building2 } from 'lucide-react';
import { KiroNotificationSettingsTab } from '@/components/settings/KiroNotificationSettingsTab';
import { NotificationPreferencesSettings } from '@/components/settings/NotificationPreferencesSettings';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsUnifiedSection() {
  const { profile } = useAuth();
  const isOrgMember = !!profile?.current_organization_id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notificaciones</h2>
        <p className="text-muted-foreground">
          Configura cómo Kiro te notifica y qué eventos generan alertas
        </p>
      </div>

      <Tabs defaultValue="kiro" className="space-y-6">
        <TabsList className={`grid w-full ${isOrgMember ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="kiro" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Kiro
          </TabsTrigger>
          {isOrgMember && (
            <TabsTrigger value="org-rules" className="gap-2">
              <Building2 className="h-4 w-4" />
              Reglas de Org
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="kiro">
          <KiroNotificationSettingsTab />
        </TabsContent>

        {isOrgMember && (
          <TabsContent value="org-rules">
            <NotificationPreferencesSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
