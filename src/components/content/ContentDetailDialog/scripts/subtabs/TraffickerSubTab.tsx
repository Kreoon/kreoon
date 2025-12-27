import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';
import { SubTabProps } from './types';

export function TraffickerSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('trafficker');
  const hasContent = !!formData.trafficker_guidelines?.trim();

  return (
    <div className="space-y-6">
      {/* Trafficker Guidelines */}
      <SectionCard title="Indicaciones de Pauta" iconEmoji="📈">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Objetivo de campaña, plataforma, KPIs y hook principal para ads.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              value={formData.trafficker_guidelines || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, trafficker_guidelines: value }))}
              placeholder="Define objetivo de campaña, audiencia, presupuesto, plataformas..."
              minHeight={200}
            />
          ) : hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
              <RichTextViewer content={formData.trafficker_guidelines || ''} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
              <TrendingUp className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin indicaciones de pauta</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Campaign Quick Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Objetivo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Awareness, Consideration, Conversion
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Audiencia</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Segmentación y público objetivo
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Presupuesto</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Budget diario/total de campaña
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">KPIs</span>
          </div>
          <p className="text-xs text-muted-foreground">
            CTR, CPM, CPA, ROAS esperados
          </p>
        </div>
      </div>

      {/* Platform Badges */}
      <SectionCard title="Plataformas" iconEmoji="📱">
        <div className="flex flex-wrap gap-2">
          {['TikTok', 'Instagram', 'Facebook', 'YouTube', 'Google'].map(platform => (
            <div 
              key={platform}
              className="px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground"
            >
              {platform}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Define las plataformas específicas en las indicaciones
        </p>
      </SectionCard>
    </div>
  );
}
