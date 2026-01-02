import { ProductSelector } from '@/components/products/ProductSelector';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { SectionCard, FieldRow } from '../../components/SectionCard';
import { Sparkles, Package, History } from 'lucide-react';
import { SubTabProps } from './types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
