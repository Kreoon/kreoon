import { ProductSelector } from '@/components/products/ProductSelector';
import { StrategistScriptForm } from '@/components/content/StrategistScriptForm';
import { SkillsExecutionBadge } from '@/components/content/SkillsExecutionBadge';
import { SectionCard, FieldRow } from '../../components/SectionCard';
import { Sparkles, Package, History } from 'lucide-react';
import { SubTabProps } from './types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;

  // Combine scriptPermissions with readOnly prop for effective edit capability
  const canEdit = scriptPermissions.canEdit('ia') && !readOnly;
  const canGenerate = scriptPermissions.canGenerate() && !readOnly;
  const isReadOnly = scriptPermissions.isReadOnly('ia') || readOnly;

  const handleScriptGenerated = async (generated: {
    script: string;
    director_output?: string;
    marketing_output?: string;
    captions?: string;
    broll_output?: string;
  }) => {
    // Actualizar estado local
    setFormData(prev => ({
      ...prev,
      script: generated.script || prev.script,
      director_output: generated.director_output || prev.director_output,
      marketing_output: generated.marketing_output || prev.marketing_output,
      captions: generated.captions || prev.captions,
      broll_output: generated.broll_output || prev.broll_output,
    }));
    if (!editMode) setEditMode(true);

    // Guardar directo a DB — evita la race condition entre setFormData y setEditMode
    // que hace que originalFormDataRef capture los nuevos datos como "baseline",
    // impidiendo que changed() detecte el cambio y el autoSave no guarde nada.
    if (content?.id) {
      const updates: Record<string, string> = {};
      if (generated.script) updates.script = generated.script;
      if (generated.director_output) updates.director_output = generated.director_output;
      if (generated.marketing_output) updates.marketing_output = generated.marketing_output;
      if (generated.captions) updates.captions = generated.captions;
      if (generated.broll_output) updates.broll_output = generated.broll_output;

      if (Object.keys(updates).length > 0) {
        await supabase.from('content').update(updates).eq('id', content.id);
        onUpdate?.();
      }
    }

  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
        <div className="p-2 sm:p-3 bg-muted/50 rounded-sm text-xs sm:text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>
              Personaliza prompts en{' '}
              <strong>Configuración → IA → Guiones</strong>
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
            spherePhase={formData.sphere_phase}
            existingScript={formData.script}
          />
        </SectionCard>
      )}

      {/* Skills Execution Info */}
      {content?.metadata?.skills_executed && content.metadata.skills_executed.length > 0 && (
        <SectionCard title="Skills IA Ejecutados" iconEmoji="🤖">
          <SkillsExecutionBadge
            skillsExecuted={content.metadata.skills_executed}
            viralityScore={content.metadata.virality_score}
          />
        </SectionCard>
      )}

      {/* Generation History (placeholder) */}
      <SectionCard title="Historial de Generaciones" iconEmoji="📜">
        <div className="flex flex-col items-center justify-center py-4 sm:py-8 text-center text-muted-foreground">
          <History className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
          <p className="text-xs sm:text-sm">El historial de generaciones estará disponible próximamente</p>
        </div>
      </SectionCard>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="p-3 bg-muted/50 rounded-sm text-sm text-muted-foreground text-center">
          Solo puedes ver esta configuración, no editarla
        </div>
      )}
    </div>
  );
}
