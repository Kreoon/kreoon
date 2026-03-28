import { useState } from 'react';
import { Image, Upload, Wand2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIThumbnailGenerator } from '@/components/content/AIThumbnailGenerator';
import { ThumbnailSelector } from '@/components/content/ThumbnailSelector';
import type { UnifiedTabProps } from '../types';

export default function ThumbnailTab({ project, formData, setFormData, editMode, readOnly, selectedProduct }: UnifiedTabProps) {
  const isContent = project.source === 'content';
  const contentId = isContent ? project.id : null;
  const organizationId = project.contentData?.organization_id || '';
  const currentThumbnail = formData.thumbnail_url ?? project.contentData?.thumbnail_url ?? null;

  const [activeTab, setActiveTab] = useState<string>('upload');

  const handleThumbnailChange = (url: string | null) => {
    setFormData((prev: Record<string, any>) => ({ ...prev, thumbnail_url: url }));
  };

  // Non-content projects: show info message
  if (!isContent || !contentId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Image className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Las miniaturas solo estan disponibles para proyectos de contenido.</p>
      </div>
    );
  }

  // Build script context for AI generator
  const scriptContext = {
    script: project.contentData?.script || null,
    salesAngle: project.contentData?.sales_angle || null,
    idealAvatar: selectedProduct?.ideal_avatar || null,
    hooksCount: project.contentData?.hooks_count || 1,
    productName: selectedProduct?.name || project.contentData?.product || null,
    clientName: project.clientName || null,
    strategistGuidelines: (project.contentData as any)?.strategist_guidelines || null,
    editorGuidelines: (project.contentData as any)?.editor_guidelines || null,
    designerGuidelines: (project.contentData as any)?.designer_guidelines || null,
    adminGuidelines: (project.contentData as any)?.admin_guidelines || null,
    traffickerGuidelines: (project.contentData as any)?.trafficker_guidelines || null,
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Image className="h-5 w-5" />
        Miniatura del Proyecto
      </h3>

      {/* Current thumbnail preview */}
      {currentThumbnail && (
        <div className="flex items-start gap-4">
          <div className="relative w-32 aspect-[9/16] rounded-sm overflow-hidden border bg-black shrink-0">
            <img
              src={currentThumbnail}
              alt="Miniatura actual"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Miniatura actual</p>
            <p>Puedes cambiarla subiendo una nueva o generando una con IA.</p>
          </div>
        </div>
      )}

      {/* Upload / AI tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-1.5 text-sm">
            <Upload className="h-3.5 w-3.5" />
            Subir Miniatura
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5 text-sm">
            <Wand2 className="h-3.5 w-3.5" />
            Generar con IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <ThumbnailSelector
            contentId={contentId}
            currentThumbnail={currentThumbnail}
            onThumbnailChange={handleThumbnailChange}
            disabled={readOnly}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {readOnly ? (
            <div className="text-center py-6 text-muted-foreground">
              <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Activa el modo edicion para generar miniaturas con IA.</p>
            </div>
          ) : (
            <AIThumbnailGenerator
              contentId={contentId}
              organizationId={organizationId}
              currentThumbnail={currentThumbnail}
              scriptContext={scriptContext}
              onThumbnailGenerated={(url) => handleThumbnailChange(url)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
