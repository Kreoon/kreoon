import { LazyRichTextEditor as RichTextEditor } from '@/components/ui/lazy-rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { MessageSquare, Hash, Sparkles, TrendingUp } from 'lucide-react';
import { SubTabProps } from './types';

export function CaptionsSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
  readOnly = false,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('captions') && !readOnly;
  const hasContent = !!formData.captions?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* Captions Output */}
      <SectionCard title="Captions y Copies" iconEmoji="📱">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            4 variaciones de captions: 2 orgánicos (engagement) + 2 ads (conversión).
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.captions || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, captions: value }))}
              placeholder="Variaciones de captions para orgánico y ads..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <RichTextViewer content={formData.captions || ''} maxHeight="" />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-sm">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin captions generados</p>
              <p className="text-muted-foreground text-xs mt-1">Genera desde la pestaña IA</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-green-500/10 rounded-sm border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm text-green-600">Orgánico 1</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Engagement: preguntas, interacción
          </p>
        </div>

        <div className="p-4 bg-green-500/10 rounded-sm border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm text-green-600">Orgánico 2</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Viralidad: trends, hashtags
          </p>
        </div>

        <div className="p-4 bg-blue-500/10 rounded-sm border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm text-blue-600">Ads 1</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Conversión: CTA directo
          </p>
        </div>

        <div className="p-4 bg-blue-500/10 rounded-sm border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm text-blue-600">Ads 2</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Urgencia: FOMO, escasez
          </p>
        </div>
      </div>
    </div>
  );
}
