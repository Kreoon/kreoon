import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductSelector } from '@/components/products/ProductSelector';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { SectionCard, FieldRow } from '../../components/SectionCard';
import { Sparkles, Package, History } from 'lucide-react';
import { SubTabProps } from './types';
import { useToast } from '@/hooks/use-toast';

const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4 (OpenAI)', description: 'Más preciso, más lento' },
  { id: 'gemini-pro', name: 'Gemini Pro (Google)', description: 'Equilibrado' },
  { id: 'gemini-flash', name: 'Gemini Flash (Google)', description: 'Más rápido' },
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
  const [selectedModel, setSelectedModel] = useState('gemini-pro');
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

      {/* AI Model Selection */}
      <SectionCard title="Configuración IA" iconEmoji="🤖">
        <FieldRow label="Modelo de IA" icon={Sparkles}>
          {canEdit ? (
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">
              {AI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
            </span>
          )}
        </FieldRow>
      </SectionCard>

      {/* Script Generator */}
      {canGenerate && selectedProduct && content?.id && (
        <SectionCard title="Generar Guión" iconEmoji="✨" variant="highlight">
          <StrategistScriptForm
            product={selectedProduct}
            contentId={content.id}
            onScriptGenerated={handleScriptGenerated}
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
