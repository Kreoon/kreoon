import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Building2, MessageSquare } from 'lucide-react';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { NotificationPreferencesSettings } from '@/components/settings/NotificationPreferencesSettings';
import { ChatRBACSettings } from '@/components/settings/ChatRBACSettings';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsUnifiedSection() {
  const { profile } = useAuth();
  const isOrgMember = !!profile?.current_organization_id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notificaciones</h2>
        <p className="text-muted-foreground">
          Configura tus preferencias de notificaciones personales y de organización
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className={`grid w-full ${isOrgMember ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="personal" className="gap-2">
            <Bell className="h-4 w-4" />
            Personal
          </TabsTrigger>
          {isOrgMember && (
            <>
              <TabsTrigger value="preferences" className="gap-2">
                <Building2 className="h-4 w-4" />
                Preferencias Org
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Reglas de Chat
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="personal">
          <NotificationSettings />
        </TabsContent>

        {isOrgMember && (
          <>
            <TabsContent value="preferences">
              <NotificationPreferencesSettings />
            </TabsContent>

            <TabsContent value="chat">
              <ChatRBACSettings />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
