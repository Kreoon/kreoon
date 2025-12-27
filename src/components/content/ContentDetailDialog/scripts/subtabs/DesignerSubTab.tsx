import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { Palette, Type, Image, Sparkles } from 'lucide-react';
import { SubTabProps } from './types';

export function DesignerSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('designer');
  const hasContent = !!formData.designer_guidelines?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* Designer Guidelines */}
      <SectionCard title="Indicaciones Visuales" iconEmoji="🎨">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lineamientos de diseño: miniaturas, branding, colores, tipografías.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.designer_guidelines || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, designer_guidelines: value }))}
              placeholder="Describe el estilo visual, paleta de colores, tipografías, mood..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
              <RichTextViewer content={formData.designer_guidelines || ''} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
              <Palette className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin indicaciones de diseño</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Design Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Miniatura</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Estilo y elementos para el thumbnail
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Colores</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Paleta de colores y brand guidelines
          </p>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Type className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Tipografía</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Fuentes para textos y overlays
          </p>
        </div>
      </div>

      {/* Thumbnail Preview Placeholder */}
      {content?.thumbnail_url && (
        <SectionCard title="Miniatura Actual" iconEmoji="🖼️">
          <div className="aspect-video max-w-sm rounded-lg overflow-hidden bg-muted">
            <img 
              src={content.thumbnail_url} 
              alt="Thumbnail" 
              className="w-full h-full object-cover"
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
