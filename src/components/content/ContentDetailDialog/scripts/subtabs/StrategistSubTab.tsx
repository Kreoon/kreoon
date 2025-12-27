import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { Target, MessageCircle, Lightbulb, TrendingUp } from 'lucide-react';
import { SubTabProps } from './types';

export function StrategistSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('strategist');
  const hasContent = !!formData.strategist_guidelines?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* Strategy Guidelines */}
      <SectionCard title="Estrategia de Contenido" iconEmoji="🧠">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Intención estratégica, objetivo del video, mensaje clave y frameworks utilizados.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.strategist_guidelines || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, strategist_guidelines: value }))}
              placeholder="Define el objetivo, mensaje clave, público objetivo, CTA..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
              <RichTextViewer content={formData.strategist_guidelines || ''} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
              <Target className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin estrategia definida</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Strategy Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Objetivo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ¿Qué debe lograr este contenido?
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Mensaje Clave</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Una idea central que debe quedar clara
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Framework</span>
          </div>
          <p className="text-xs text-muted-foreground">
            AIDA, PAS, Hook-Story-Offer, etc.
          </p>
        </div>
      </div>

      {/* Sales Angle Display */}
      {formData.sales_angle && (
        <SectionCard title="Ángulo de Venta" iconEmoji="💡">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm">{formData.sales_angle}</p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
