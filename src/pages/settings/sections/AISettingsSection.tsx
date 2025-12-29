import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';
import { OrganizationAISettings } from '@/components/settings/OrganizationAISettings';
import { PortfolioAISettings } from '@/components/settings/PortfolioAISettings';
import { AIAssistantSettings } from '@/components/settings/AIAssistantSettings';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AISettingsSection() {
  const { profile } = useAuth();
  
  if (!profile?.current_organization_id) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">IA & Modelos</h2>
        <p className="text-muted-foreground">
          Configura proveedores de IA, modelos y funcionalidades inteligentes
        </p>
      </div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers" className="gap-2">
            <Bot className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Portfolio IA
          </TabsTrigger>
          <TabsTrigger value="assistant" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Asistente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <OrganizationAISettings organizationId={profile.current_organization_id} />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioAISettings />
        </TabsContent>

        <TabsContent value="assistant">
          <AIAssistantSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
