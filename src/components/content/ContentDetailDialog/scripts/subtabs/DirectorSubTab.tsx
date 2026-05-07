import { LazyRichTextEditor as RichTextEditor } from '@/components/ui/lazy-rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { Clapperboard, Clock, Camera, Lightbulb } from 'lucide-react';
import { SubTabProps } from './types';

export function DirectorSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
  readOnly = false,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('director') && !readOnly;
  const hasContent = !!formData.director_output?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* Director Output - Production Table */}
      <SectionCard title="Tabla de Producción" iconEmoji="🎥">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Desglose de escenas con timecodes, guión verbal, guión visual y notas de dirección.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.director_output || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, director_output: value }))}
              placeholder="Tabla de producción con escenas de 3-5 segundos..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <RichTextViewer content={formData.director_output || ''} maxHeight="" />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-sm">
              <Clapperboard className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin tabla de producción</p>
              <p className="text-muted-foreground text-xs mt-1">Genera desde la pestaña IA</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Escenas 3-5s</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada escena debe durar entre 3 y 5 segundos
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Planos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            PP (primer plano), PM (medio), PE (entero), PD (detalle)
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Notas</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Indicaciones de tono, energía y actuación
          </p>
        </div>
      </div>
    </div>
  );
}
