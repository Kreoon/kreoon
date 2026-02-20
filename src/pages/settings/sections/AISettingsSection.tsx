import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Sparkles, MessageSquare, Cpu, Blocks, Zap, Brain, BarChart3, FileText } from 'lucide-react';
import { OrganizationAISettings } from '@/components/settings/OrganizationAISettings';
import { PortfolioAISettings } from '@/components/settings/PortfolioAISettings';
import { AIAssistantSettings } from '@/components/settings/AIAssistantSettings';
import { AIUsageDashboard } from '@/components/settings/ai/AIUsageDashboard';
import { ScriptPromptsConfig } from '@/components/settings/ai/ScriptPromptsConfig';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AISettingsSection() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const subTabFromUrl = searchParams.get('subTab');
  const [activeTab, setActiveTab] = useState(subTabFromUrl === 'custom-api' ? 'providers' : 'providers');
  const [orgAIInitialTab, setOrgAIInitialTab] = useState<'overview' | 'custom-api' | 'providers' | 'usage' | undefined>(
    subTabFromUrl === 'custom-api' ? 'custom-api' : undefined
  );

  useEffect(() => {
    if (subTabFromUrl === 'custom-api') {
      setActiveTab('providers');
      setOrgAIInitialTab('custom-api');
    }
  }, [subTabFromUrl]);
  
  if (!profile?.current_organization_id) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 p-6 border border-primary/20">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">IA & Modelos</h2>
              <p className="text-muted-foreground">
                Configura proveedores, módulos y funcionalidades inteligentes
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary" className="bg-background/50">
              <Zap className="h-3 w-3 mr-1" />
              Kreoon AI incluido
            </Badge>
            <Badge variant="outline" className="bg-background/50">
              <Cpu className="h-3 w-3 mr-1" />
              Múltiples proveedores
            </Badge>
            <Badge variant="outline" className="bg-background/50">
              <Blocks className="h-3 w-3 mr-1" />
              Módulos configurables
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto p-1">
          <TabsTrigger 
            value="providers" 
            className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Proveedores</span>
          </TabsTrigger>
          <TabsTrigger 
            value="scripts" 
            className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Guiones</span>
          </TabsTrigger>
          <TabsTrigger 
            value="usage" 
            className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Uso</span>
          </TabsTrigger>
          <TabsTrigger 
            value="portfolio" 
            className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Portfolio</span>
          </TabsTrigger>
          <TabsTrigger 
            value="assistant" 
            className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Asistente</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-0">
          <OrganizationAISettings organizationId={profile.current_organization_id} initialTab={orgAIInitialTab} />
        </TabsContent>

        <TabsContent value="scripts" className="mt-0">
          <ScriptPromptsConfig organizationId={profile.current_organization_id} />
        </TabsContent>

        <TabsContent value="usage" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <AIUsageDashboard organizationId={profile.current_organization_id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Portfolio IA
              </CardTitle>
              <CardDescription>
                Funcionalidades de IA específicas para el módulo de portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortfolioAISettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistant" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Asistente IA
              </CardTitle>
              <CardDescription>
                Configura el comportamiento y conocimiento del asistente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIAssistantSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
