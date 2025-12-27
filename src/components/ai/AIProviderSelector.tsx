import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bot, Sparkles } from 'lucide-react';
import { useOrganizationAI, AI_PROVIDERS_CONFIG } from '@/hooks/useOrganizationAI';
import { cn } from '@/lib/utils';

interface AIProviderSelectorProps {
  organizationId: string;
  module: string; // 'scripts' | 'thumbnails' | 'sistema_up' | 'live_assistant'
  value?: { provider: string; model: string };
  onChange?: (config: { provider: string; model: string }) => void;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}

export function AIProviderSelector({
  organizationId,
  module,
  value,
  onChange,
  className,
  compact = false,
  disabled = false
}: AIProviderSelectorProps) {
  const { 
    loading, 
    getModuleConfig, 
    getEnabledProviders, 
    hasValidApiKey 
  } = useOrganizationAI(organizationId);

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Initialize with module defaults or passed value
  useEffect(() => {
    if (!loading) {
      const moduleConfig = getModuleConfig(module);
      setSelectedProvider(value?.provider || moduleConfig.provider);
      setSelectedModel(value?.model || moduleConfig.model);
    }
  }, [loading, module, value, getModuleConfig]);

  const enabledProviders = getEnabledProviders();
  
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    
    // Get default model for the new provider
    const providerConfig = AI_PROVIDERS_CONFIG[provider as keyof typeof AI_PROVIDERS_CONFIG];
    const defaultModel = providerConfig?.models.find(m => m.default)?.value || providerConfig?.models[0]?.value || '';
    setSelectedModel(defaultModel);
    
    onChange?.({ provider, model: defaultModel });
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onChange?.({ provider: selectedProvider, model });
  };

  const currentProviderConfig = AI_PROVIDERS_CONFIG[selectedProvider as keyof typeof AI_PROVIDERS_CONFIG];
  const isKeyValid = hasValidApiKey(selectedProvider);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select 
          value={selectedProvider} 
          onValueChange={handleProviderChange}
          disabled={disabled || loading}
        >
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="IA" />
          </SelectTrigger>
          <SelectContent>
            {enabledProviders.map(p => (
              <SelectItem key={p.key} value={p.key}>
                <div className="flex items-center gap-2">
                  {p.label}
                  {!hasValidApiKey(p.key) && p.requiresApiKey && (
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedModel} 
          onValueChange={handleModelChange}
          disabled={disabled || loading}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            {currentProviderConfig?.models.map(m => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isKeyValid && currentProviderConfig?.requiresApiKey && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
            Sin API Key
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 p-4 rounded-lg border bg-muted/30", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Configuración de IA</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Proveedor</Label>
          <Select 
            value={selectedProvider} 
            onValueChange={handleProviderChange}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proveedor" />
            </SelectTrigger>
            <SelectContent>
              {enabledProviders.map(p => (
                <SelectItem key={p.key} value={p.key}>
                  <div className="flex items-center gap-2">
                    {p.label}
                    {p.key === 'lovable' && (
                      <Badge className="text-[10px] px-1 py-0 bg-gradient-to-r from-purple-500 to-pink-500">
                        Incluido
                      </Badge>
                    )}
                    {!hasValidApiKey(p.key) && p.requiresApiKey && (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Modelo</Label>
          <Select 
            value={selectedModel} 
            onValueChange={handleModelChange}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar modelo" />
            </SelectTrigger>
            <SelectContent>
              {currentProviderConfig?.models.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex items-center gap-2">
                    {m.label}
                    {m.default && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isKeyValid && currentProviderConfig?.requiresApiKey && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>
            Configura tu API Key de {currentProviderConfig.label} en la configuración de la organización
          </span>
        </div>
      )}
    </div>
  );
}
