import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Bot, 
  Key, 
  BarChart3, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  Blocks,
  Cpu,
  Zap,
  Search
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useOrganizationAI, 
  AI_PROVIDERS_CONFIG,
  PERPLEXITY_MODELS,
  PERPLEXITY_FEATURES
} from '@/hooks/useOrganizationAI';
import { AIModulesManager } from './AIModulesManager';
import { CustomAIApiSettings } from './ai/CustomAIApiSettings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrganizationAISettingsProps {
  organizationId: string;
  /** Tab inicial (ej. desde deep link) */
  initialTab?: 'overview' | 'custom-api' | 'providers' | 'usage';
}

export function OrganizationAISettings({ organizationId, initialTab }: OrganizationAISettingsProps) {
  const {
    providers,
    defaults,
    usageLogs,
    loading,
    saving,
    toggleProvider,
    updateProviderApiKey,
    updateDefaults,
    getEnabledProviders,
    hasValidApiKey,
    getMaskedApiKey,
    perplexityConnected,
    perplexityModel,
    perplexityFeatures,
    savePerplexityKey,
    savePerplexityModel,
    updatePerplexityFeature,
    testPerplexityConnection,
    refetch
  } = useOrganizationAI(organizationId);

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [editingApiKey, setEditingApiKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab ?? 'overview');
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [perplexityKey, setPerplexityKey] = useState('');
  const [perplexityModelLocal, setPerplexityModelLocal] = useState(perplexityModel);
  const [isSavingPerplexity, setIsSavingPerplexity] = useState(false);
  const [isTestingPerplexity, setIsTestingPerplexity] = useState(false);

  // Sync perplexityModelLocal when defaults load
  useEffect(() => {
    setPerplexityModelLocal(defaults?.perplexity_model || 'llama-3.1-sonar-large-128k-online');
  }, [defaults?.perplexity_model]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleToggleProvider = async (providerKey: string, enabled: boolean) => {
    try {
      await toggleProvider(providerKey, enabled);
      toast.success(enabled ? 'Proveedor habilitado' : 'Proveedor deshabilitado');
    } catch {
      toast.error('Error al actualizar el proveedor');
    }
  };

  const handleSavePerplexityKey = async () => {
    if (!perplexityKey?.trim()) {
      if (perplexityConnected) {
        toast.error('Ingresa una nueva API Key para actualizar');
      } else {
        toast.error('Ingresa una API Key válida');
      }
      return;
    }
    setIsSavingPerplexity(true);
    try {
      await savePerplexityKey(perplexityKey.trim());
      setPerplexityKey('');
      toast.success('API Key de Perplexity guardada correctamente');
      refetch();
    } catch {
      toast.error('Error al guardar la API Key');
    } finally {
      setIsSavingPerplexity(false);
    }
  };

  const handleSavePerplexityModel = async (model: string) => {
    setPerplexityModelLocal(model);
    try {
      await savePerplexityModel(model);
      toast.success('Modelo de Perplexity actualizado');
    } catch {
      toast.error('Error al actualizar el modelo');
    }
  };

  const handleTestPerplexity = async () => {
    setIsTestingPerplexity(true);
    try {
      const ok = await testPerplexityConnection();
      if (ok) {
        toast.success('Conexión exitosa con Perplexity');
      } else {
        toast.error('No se pudo conectar. Verifica tu API Key.');
      }
    } catch {
      toast.error('Error al probar la conexión');
    } finally {
      setIsTestingPerplexity(false);
    }
  };

  const handleSaveApiKey = async (providerKey: string) => {
    const key = apiKeyInputs[providerKey];
    if (!key?.trim()) {
      toast.error('Ingresa una API Key válida');
      return;
    }

    try {
      await updateProviderApiKey(providerKey, key.trim());
      setApiKeyInputs(prev => ({ ...prev, [providerKey]: '' }));
      setEditingApiKey(null);
      toast.success('API Key guardada correctamente');
    } catch {
      toast.error('Error al guardar la API Key');
    }
  };

  const enabledProviders = getEnabledProviders();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          IA & Modelos
        </CardTitle>
        <CardDescription>
          Configura los proveedores de IA y módulos para tu organización
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Blocks className="h-4 w-4" />
              Vista General
            </TabsTrigger>
            <TabsTrigger value="custom-api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Mis APIs
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Uso
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Single Column Layout */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Default Model Selector */}
              <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-purple-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Modelo IA Predeterminado</h3>
                  <Badge variant="outline" className="text-xs">Organización</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Este modelo se usará en todas las funciones de IA de la organización
                </p>
                <Select
                  value={defaults?.default_model || 'gemini-2.5-flash'}
                  onValueChange={async (value) => {
                    // Determine provider from model value
                    const provider = value.startsWith('gpt') ? 'openai' : 
                                     value.startsWith('claude') ? 'anthropic' : 'gemini';
                    try {
                      await updateDefaults({ 
                        default_provider: provider, 
                        default_model: value 
                      });
                      toast.success('Modelo predeterminado actualizado');
                    } catch {
                      toast.error('Error al actualizar el modelo');
                    }
                  }}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Google Gemini (API Directa)</div>
                    {AI_PROVIDERS_CONFIG.gemini.models.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-blue-500" />
                          {model.label}
                        </div>
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">OpenAI (API Directa)</div>
                    {AI_PROVIDERS_CONFIG.openai.models.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-green-500" />
                          {model.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  Modelo actual: {
                    AI_PROVIDERS_CONFIG.gemini.models.find(m => m.value === defaults?.default_model)?.label ||
                    AI_PROVIDERS_CONFIG.openai.models.find(m => m.value === defaults?.default_model)?.label ||
                    defaults?.default_model || 'Gemini 2.5 Flash'
                  }
                </div>
              </div>

              <Separator />

              {/* Providers Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Proveedores de IA</h3>
                </div>
                
                <div className="space-y-3">
                  {Object.values(AI_PROVIDERS_CONFIG).map((config) => {
                    const providerData = providers.find(p => p.provider_key === config.key);
                    const isEnabled = providerData?.is_enabled;
                    const hasKey = hasValidApiKey(config.key);

                    return (
                      <div 
                        key={config.key}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Sparkles className={`h-4 w-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{config.label}</span>
                              {isEnabled && (
                                <Badge variant="outline" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Activo
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {config.models.length} modelos
                              </Badge>
                              {config.requiresApiKey && isEnabled && (
                                hasKey ? (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                    <Shield className="h-3 w-3 mr-1" />
                                    API Key ✓
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Sin Key
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggleProvider(config.key, checked)}
                          disabled={saving}
                        />
                      </div>
                    );
                  })}
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setActiveTab('providers')}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Configurar API Keys
                </Button>
              </div>

              <Separator />

              {/* Perplexity - Investigación en Tiempo Real */}
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-purple-500" />
                    Perplexity AI - Investigación en Tiempo Real
                  </CardTitle>
                  <CardDescription>
                    Conecta Perplexity para habilitar búsquedas de tendencias, hooks y análisis competitivo en tiempo real.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Estado de conexión</p>
                      <p className="text-sm text-muted-foreground">
                        {perplexityConnected ? 'Conectado y funcionando' : 'No configurado'}
                      </p>
                    </div>
                    <Badge variant={perplexityConnected ? 'default' : 'secondary'}>
                      {perplexityConnected ? '✓ Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="perplexity-key">API Key de Perplexity</Label>
                    <div className="flex gap-2">
                      <Input
                        id="perplexity-key"
                        type="password"
                        placeholder={perplexityConnected ? 'Dejar vacío para mantener la actual' : 'pplx-...'}
                        value={perplexityKey}
                        onChange={(e) => setPerplexityKey(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleSavePerplexityKey} disabled={isSavingPerplexity || !perplexityKey.trim()}>
                        {isSavingPerplexity ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Obtén tu API key en{' '}
                      <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                        perplexity.ai/settings/api
                      </a>
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Modelo preferido</Label>
                    <Select value={perplexityModelLocal} onValueChange={handleSavePerplexityModel} disabled={saving}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERPLEXITY_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-medium">¿Dónde usar Perplexity?</p>
                    <div className="space-y-2">
                      {PERPLEXITY_FEATURES.map((feature) => (
                        <div key={feature.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{feature.label}</p>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                          <Switch
                            checked={perplexityFeatures[feature.key] ?? false}
                            onCheckedChange={(checked) => updatePerplexityFeature(feature.key, checked)}
                            disabled={saving}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleTestPerplexity}
                    className="w-full"
                    disabled={!perplexityConnected || isTestingPerplexity}
                  >
                    {isTestingPerplexity ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Probar conexión
                  </Button>
                </CardContent>
              </Card>

              <Separator />

              {/* Modules */}
              <div className="space-y-4">
                <AIModulesManager 
                  organizationId={organizationId} 
                  enabledProviders={enabledProviders}
                />
              </div>
            </div>
          </TabsContent>

          {/* Mis APIs Tab - Custom API Connection */}
          <TabsContent value="custom-api" className="mt-6">
            <CustomAIApiSettings organizationId={organizationId} />
          </TabsContent>

          {/* Providers Tab - Full API Key Management */}
          <TabsContent value="providers" className="space-y-4 mt-4">
            {Object.values(AI_PROVIDERS_CONFIG).map((config) => {
              const providerData = providers.find(p => p.provider_key === config.key);
              const isEnabled = providerData?.is_enabled;
              const hasKey = hasValidApiKey(config.key);

              return (
                <Card key={config.key} className={isEnabled ? 'border-primary/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Sparkles className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{config.label}</h4>
                            {isEnabled && (
                              <Badge variant="outline" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Activo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                          
                          {/* Models list */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {config.models.slice(0, 3).map(model => (
                              <Badge key={model.value} variant="secondary" className="text-xs">
                                {model.label}
                              </Badge>
                            ))}
                            {config.models.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{config.models.length - 3} más
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleProvider(config.key, checked)}
                        disabled={saving}
                      />
                    </div>

                    {/* API Key section */}
                    {config.requiresApiKey && isEnabled && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">API Key</Label>
                          {hasKey ? (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              <Shield className="h-3 w-3 mr-1" />
                              Configurada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No configurada
                            </Badge>
                          )}
                        </div>

                        {editingApiKey === config.key ? (
                          <div className="flex gap-2">
                            <Input
                              type={showApiKeys[config.key] ? 'text' : 'password'}
                              placeholder={`Ingresa tu ${config.label} API Key`}
                              value={apiKeyInputs[config.key] || ''}
                              onChange={(e) => setApiKeyInputs(prev => ({ 
                                ...prev, 
                                [config.key]: e.target.value 
                              }))}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowApiKeys(prev => ({ 
                                ...prev, 
                                [config.key]: !prev[config.key] 
                              }))}
                            >
                              {showApiKeys[config.key] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              onClick={() => handleSaveApiKey(config.key)}
                              disabled={saving}
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingApiKey(null);
                                setApiKeyInputs(prev => ({ ...prev, [config.key]: '' }));
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                              {hasKey ? getMaskedApiKey(config.key) : 'Sin configurar'}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingApiKey(config.key)}
                            >
                              {hasKey ? 'Cambiar' : 'Configurar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de Uso</CardTitle>
                <CardDescription>
                  Últimas 100 llamadas a la IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay registros de uso todavía</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {usageLogs.map(log => (
                        <div 
                          key={log.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div>
                              <div className="font-medium">{log.action}</div>
                              <div className="text-xs text-muted-foreground">
                                {log.module} • {log.provider}/{log.model}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "d MMM HH:mm", { locale: es })}
                            {log.tokens_input && (
                              <div>{log.tokens_input + (log.tokens_output || 0)} tokens</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
