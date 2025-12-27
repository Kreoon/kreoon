import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { Scissors, Clock, Layers, Music } from 'lucide-react';
import { SubTabProps } from './types';

export function EditorSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
  readOnly = false,
}: SubTabProps) {
  // Combine scriptPermissions with readOnly prop for effective edit capability
  const canEdit = scriptPermissions.canEdit('editor') && !readOnly;
  const hasContent = !!formData.editor_guidelines?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* Editor Guidelines */}
      <SectionCard title="Indicaciones de Edición" iconEmoji="🎬">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Instrucciones técnicas para el editor: ritmo, cortes, efectos, timing, música.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.editor_guidelines || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, editor_guidelines: value }))}
              placeholder="Describe el estilo de edición, ritmo, transiciones, efectos especiales..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
              <RichTextViewer content={formData.editor_guidelines || ''} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
              <Scissors className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin indicaciones de edición</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Ritmo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Define la velocidad y energía del video
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Overlays</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Textos, gráficos y elementos visuales
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Music className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Audio</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Música, efectos de sonido, voiceover
          </p>
        </div>
      </div>
    </div>
  );
}
