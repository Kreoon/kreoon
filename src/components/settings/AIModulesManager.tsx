import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Bot, 
  Loader2, 
  Check, 
  X, 
  Clock, 
  BarChart2,
  RefreshCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAIModules, PREDEFINED_AI_MODULES } from '@/hooks/useAIModules';
import { AI_PROVIDERS_CONFIG } from '@/hooks/useOrganizationAI';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AIModulesManagerProps {
  organizationId: string;
  enabledProviders: Array<{ key: string; label: string; models: Array<{ value: string; label: string }> }>;
}

export function AIModulesManager({ organizationId, enabledProviders }: AIModulesManagerProps) {
  const {
    modules,
    loading,
    saving,
    toggleModule,
    updateModuleConfig,
    ensureModulesExist,
    refetch
  } = useAIModules(organizationId);

  useEffect(() => {
    // Auto-register predefined modules when component mounts
    ensureModulesExist();
  }, [ensureModulesExist]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleProviderChange = async (moduleKey: string, newProvider: string) => {
    const mod = modules.find(m => m.module_key === moduleKey);
    if (!mod) return;
    
    // Get default model for the new provider
    const providerConfig = enabledProviders.find(p => p.key === newProvider);
    const defaultModel = providerConfig?.models[0]?.value || 'google/gemini-2.5-flash';
    
    await updateModuleConfig(moduleKey, newProvider, defaultModel);
  };

  const handleModelChange = async (moduleKey: string, newModel: string) => {
    const mod = modules.find(m => m.module_key === moduleKey);
    if (!mod) return;
    await updateModuleConfig(moduleKey, mod.provider, newModel);
  };

  // Get module info from predefined list
  const getModuleInfo = (key: string) => {
    return PREDEFINED_AI_MODULES.find(m => m.key === key);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Módulos con IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Activa y configura la IA para cada módulo de tu organización
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="rounded-lg border bg-amber-500/10 border-amber-500/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">Importante</p>
            <p className="text-muted-foreground">
              Los módulos de IA están desactivados por defecto. Activa solo los que necesites para controlar costos y seguridad.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {modules.map((mod) => {
          const info = getModuleInfo(mod.module_key);
          const currentProviderConfig = enabledProviders.find(p => p.key === mod.provider);
          
          return (
            <Card 
              key={mod.id} 
              className={mod.is_active ? 'border-primary/30 bg-primary/5' : 'opacity-75'}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{mod.module_name}</h4>
                      {mod.is_active ? (
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                          <X className="h-3 w-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mod.description || info?.description}
                    </p>
                    
                    {/* Stats */}
                    {mod.execution_count > 0 && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart2 className="h-3 w-3" />
                          {mod.execution_count} ejecuciones
                        </span>
                        {mod.last_execution_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Última: {format(new Date(mod.last_execution_at), 'dd MMM HH:mm', { locale: es })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            checked={mod.is_active}
                            onCheckedChange={(checked) => toggleModule(mod.module_key, checked)}
                            disabled={saving}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {mod.is_active ? 'Desactivar IA para este módulo' : 'Activar IA para este módulo'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Provider & Model selection - only show when active */}
                {mod.is_active && (
                  <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Proveedor
                      </label>
                      <Select
                        value={mod.provider}
                        onValueChange={(value) => handleProviderChange(mod.module_key, value)}
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
                      <label className="text-sm font-medium">Modelo</label>
                      <Select
                        value={mod.model}
                        onValueChange={(value) => handleModelChange(mod.module_key, value)}
                        disabled={saving}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentProviderConfig?.models.map(m => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay módulos de IA registrados</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={ensureModulesExist}
            >
              Registrar módulos predefinidos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
