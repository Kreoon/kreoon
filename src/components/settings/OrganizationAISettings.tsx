import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Bot, 
  Key, 
  Settings2, 
  BarChart3, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Loader2,
  Shield,
  Cpu,
  Sparkles
} from 'lucide-react';
import { 
  useOrganizationAI, 
  AI_PROVIDERS_CONFIG, 
  AI_MODULES 
} from '@/hooks/useOrganizationAI';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrganizationAISettingsProps {
  organizationId: string;
}

export function OrganizationAISettings({ organizationId }: OrganizationAISettingsProps) {
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
    getMaskedApiKey
  } = useOrganizationAI(organizationId);

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [editingApiKey, setEditingApiKey] = useState<string | null>(null);

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

  const handleUpdateDefault = async (field: string, value: string) => {
    try {
      await updateDefaults({ [field]: value });
      toast.success('Configuración actualizada');
    } catch {
      toast.error('Error al actualizar');
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
          Configura los proveedores de IA y modelos por defecto para tu organización
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="providers">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Uso
            </TabsTrigger>
          </TabsList>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4 mt-4">
            {Object.values(AI_PROVIDERS_CONFIG).map((config) => {
              const providerData = providers.find(p => p.provider_key === config.key);
              const isEnabled = config.key === 'lovable' || providerData?.is_enabled;
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
                            {config.key === 'lovable' && (
                              <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                                Incluido
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

                      {config.key !== 'lovable' && (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggleProvider(config.key, checked)}
                          disabled={saving}
                        />
                      )}
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

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-4 mt-4">
            {/* Default settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuración por Defecto</CardTitle>
                <CardDescription>
                  Proveedor y modelo predeterminado para todos los módulos
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Proveedor por Defecto</Label>
                  <Select
                    value={defaults?.default_provider || 'lovable'}
                    onValueChange={(value) => handleUpdateDefault('default_provider', value)}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledProviders.map(p => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo por Defecto</Label>
                  <Select
                    value={defaults?.default_model || 'google/gemini-2.5-flash'}
                    onValueChange={(value) => handleUpdateDefault('default_model', value)}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledProviders
                        .find(p => p.key === (defaults?.default_provider || 'lovable'))
                        ?.models.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        )) || []}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Per-module settings */}
            {AI_MODULES.map(module => {
              const providerField = `${module.key}_provider` as keyof typeof defaults;
              const modelField = `${module.key}_model` as keyof typeof defaults;
              const currentProvider = defaults?.[providerField] as string || defaults?.default_provider || 'lovable';
              const currentModel = defaults?.[modelField] as string || defaults?.default_model || 'google/gemini-2.5-flash';
              const isCustomized = !!defaults?.[providerField];

              return (
                <Card key={module.key} className={isCustomized ? 'border-primary/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">{module.label}</h4>
                        {'description' in module && (
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        )}
                      </div>
                      {isCustomized && (
                        <Badge variant="outline" className="border-primary/50 text-primary">Personalizado</Badge>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Proveedor</Label>
                        <Select
                          value={currentProvider}
                          onValueChange={(value) => handleUpdateDefault(providerField, value)}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default__">Usar por defecto</SelectItem>
                            {enabledProviders.map(p => (
                              <SelectItem key={p.key} value={p.key}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Modelo</Label>
                        <Select
                          value={currentModel}
                          onValueChange={(value) => handleUpdateDefault(modelField, value)}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default__">Usar por defecto</SelectItem>
                            {enabledProviders
                              .find(p => p.key === currentProvider)
                              ?.models.filter(m => m.value).map(m => (
                                <SelectItem key={m.value} value={m.value}>
                                  {m.label}
                                </SelectItem>
                              )) || []}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
