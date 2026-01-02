import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductSelector } from '@/components/products/ProductSelector';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { SectionCard, FieldRow } from '../../components/SectionCard';
import { Sparkles, Package, History, Bot } from 'lucide-react';
import { SubTabProps } from './types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationAI } from '@/hooks/useOrganizationAI';

// Available AI providers and models
const AI_PROVIDERS = [
  { 
    key: 'lovable', 
    name: 'Lovable AI', 
    description: 'Google Gemini & OpenAI GPT-5',
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Rápido)' },
      { value: 'openai/gpt-5', label: 'GPT-5' },
      { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    ]
  },
  { 
    key: 'openai', 
    name: 'OpenAI', 
    description: 'Requiere API Key',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ]
  },
  { 
    key: 'anthropic', 
    name: 'Anthropic Claude', 
    description: 'Requiere API Key',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ]
  },
];

export function IASubTab({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  onUpdate,
  selectedProduct,
  onProductChange,
  scriptPermissions,
  readOnly = false,
}: SubTabProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;
  
  // Load organization's AI configuration
  const { getModuleConfig, loading: loadingAIConfig } = useOrganizationAI(organizationId || '');
  
  const [selectedProvider, setSelectedProvider] = useState('lovable');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');

  // Initialize from organization config
  useEffect(() => {
    if (organizationId && !loadingAIConfig) {
      const config = getModuleConfig('content_script_gen');
      if (config) {
        setSelectedProvider(config.provider || 'lovable');
        setSelectedModel(config.model || 'google/gemini-2.5-flash');
      }
    }
  }, [organizationId, loadingAIConfig, getModuleConfig]);

  // Get current provider config
  const currentProvider = AI_PROVIDERS.find(p => p.key === selectedProvider);
  const availableModels = currentProvider?.models || AI_PROVIDERS[0].models;

  // Update model when provider changes
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const providerConfig = AI_PROVIDERS.find(p => p.key === provider);
    if (providerConfig && providerConfig.models.length > 0) {
      setSelectedModel(providerConfig.models[0].value);
    }
  };

  // Combine scriptPermissions with readOnly prop for effective edit capability
  const canEdit = scriptPermissions.canEdit('ia') && !readOnly;
  const canGenerate = scriptPermissions.canGenerate() && !readOnly;
  const isReadOnly = scriptPermissions.isReadOnly('ia') || readOnly;

  const handleScriptGenerated = (generated: {
    script: string;
    editor_guidelines: string;
    trafficker_guidelines: string;
    strategist_guidelines: string;
    designer_guidelines: string;
    admin_guidelines: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      script: generated.script,
      editor_guidelines: generated.editor_guidelines,
      trafficker_guidelines: generated.trafficker_guidelines,
      strategist_guidelines: generated.strategist_guidelines,
      designer_guidelines: generated.designer_guidelines,
      admin_guidelines: generated.admin_guidelines,
    }));
    if (!editMode) setEditMode(true);
    toast({ title: 'Guión generado', description: 'Revisa y edita en la pestaña Guión' });
  };

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <SectionCard title="Producto Base" iconEmoji="📦">
        <FieldRow label="Producto para el guión" icon={Package}>
          {canEdit ? (
            <ProductSelector
              clientId={formData.client_id || content?.client_id || null}
              value={formData.product_id}
              onChange={onProductChange}
            />
          ) : (
            <span className="text-muted-foreground">
              {selectedProduct?.name || content?.product || 'Sin producto'}
            </span>
          )}
        </FieldRow>
      </SectionCard>

      {/* AI Configuration */}
      <SectionCard title="Configuración IA" iconEmoji="🤖">
        <FieldRow label="Proveedor de IA" icon={Bot}>
          {canEdit ? (
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(provider => (
                  <SelectItem key={provider.key} value={provider.key}>
                    <div className="flex flex-col">
                      <span>{provider.name}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">
              {currentProvider?.name || 'Lovable AI'}
            </span>
          )}
        </FieldRow>
        
        <FieldRow label="Modelo de IA" icon={Sparkles}>
          {canEdit ? (
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">
              {availableModels.find(m => m.value === selectedModel)?.label || selectedModel}
            </span>
          )}
        </FieldRow>

        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>
              Personaliza los prompts en{' '}
              <strong>Configuración → IA & Modelos → Guiones</strong>
            </span>
          </p>
        </div>
      </SectionCard>

      {/* Script Generator Form */}
      {canGenerate && selectedProduct && content?.id && (
        <SectionCard title="Generar Guión" iconEmoji="✨" variant="highlight">
          <StrategistScriptForm
            product={selectedProduct}
            contentId={content.id}
            onScriptGenerated={handleScriptGenerated}
            organizationId={organizationId}
          />
        </SectionCard>
      )}

      {/* Generation History (placeholder) */}
      <SectionCard title="Historial de Generaciones" iconEmoji="📜">
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <History className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">El historial de generaciones estará disponible próximamente</p>
        </div>
      </SectionCard>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
          Solo puedes ver esta configuración, no editarla
        </div>
      )}
    </div>
  );
}
