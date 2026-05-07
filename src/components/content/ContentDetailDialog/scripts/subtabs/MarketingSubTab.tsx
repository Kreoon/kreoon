import { LazyRichTextEditor as RichTextEditor } from '@/components/ui/lazy-rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { BarChart3, Target, Users, Megaphone } from 'lucide-react';
import { SubTabProps } from './types';

export function MarketingSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
  readOnly = false,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('marketing') && !readOnly;
  const hasContent = !!formData.marketing_output?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* Marketing Output */}
      <SectionCard title="Estrategia de Marketing" iconEmoji="📊">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Estrategia completa: audiencias, plataformas, variaciones de ads y KPIs.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.marketing_output || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, marketing_output: value }))}
              placeholder="Estrategia de marketing y tráfico..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <RichTextViewer content={formData.marketing_output || ''} maxHeight="" />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-sm">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin estrategia de marketing</p>
              <p className="text-muted-foreground text-xs mt-1">Genera desde la pestaña IA</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">Audiencias</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cold (prospección), Warm (retargeting), Hot (conversión)
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">Plataformas</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Meta (IG/FB), TikTok, YouTube Shorts
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-sm">Variaciones</span>
          </div>
          <p className="text-xs text-muted-foreground">
            3 variaciones de ad con diferentes hooks
          </p>
        </div>
      </div>
    </div>
  );
}
