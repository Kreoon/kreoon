import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Bell, Bot } from 'lucide-react';
import { ChatRBACSettings } from './ChatRBACSettings';
import { AIAssistantSettings } from './AIAssistantSettings';
import { NotificationPreferencesSettings } from './NotificationPreferencesSettings';

export function ChatNotificationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Chat & Notificaciones</h2>
        <p className="text-muted-foreground">
          Configura el sistema de chat, permisos y notificaciones de tu organización
        </p>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Reglas de Chat
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            Asistente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatRBACSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPreferencesSettings />
        </TabsContent>

        <TabsContent value="ai">
          <AIAssistantSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
