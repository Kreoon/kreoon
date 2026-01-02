import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BunnyMultiVideoUploader } from '@/components/content/BunnyMultiVideoUploader';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { ThumbnailSelector } from '@/components/content/ThumbnailSelector';
import { AIThumbnailGenerator } from '@/components/content/AIThumbnailGenerator';
import { CommentsSection } from '@/components/content/CommentsSection';
import { ContentAIAnalysis } from '@/components/content/ContentAIAnalysis';
import { PermissionsGate, EditableField } from '../components/PermissionsGate';
import { SectionCard } from '../components/SectionCard';
import { TabProps } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { supabase } from '@/integrations/supabase/client';
import { Video, Share2, Lock, Download, Loader2, ExternalLink } from 'lucide-react';

// Download button component
function DownloadVideoButton({ contentId, videoUrl, variantIndex, title }: {
  contentId: string;
  videoUrl: string;
  variantIndex: number;
  title: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: contentId, video_url: videoUrl }
      });
      if (error) throw error;
      if (data.download_url) {
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `${title}_v${variantIndex + 1}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Descarga iniciada' });
      }
    } catch (error) {
      toast({ title: 'Error al descargar', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading} className="h-7 px-2 text-xs">
      {downloading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
      Descargar
    </Button>
  );
}

interface VideoTabProps extends TabProps {
  selectedProduct: any;
}

export function VideoTab({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  permissions,
  onUpdate,
  selectedProduct,
  readOnly = false,
}: VideoTabProps) {
  const { isAdmin, isClient } = useAuth();
  const { currentOrgId } = useOrgOwner();
  // Combine permissions with readOnly prop for effective edit capability
  const canEditVideo = permissions.can('content.video', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;
  const canDownload = permissions.can('content.video.download', 'view');
  const currentStatus = content?.status || 'draft';
  const approvedStatuses = ['approved', 'paid', 'delivered'];
  const canDownloadVideo = isAdmin || (isClient && approvedStatuses.includes(currentStatus));

  return (
    <div className="space-y-6">
      {/* Publish to Portfolio */}
      <PermissionsGate permissions={permissions} resource="content.video.thumbnail" action="edit" showLockOnReadOnly={false}>
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Publicar en Portafolio</p>
              <p className="text-xs text-muted-foreground">Visible públicamente en la red social</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {formData.is_published && <Badge variant="secondary" className="bg-success/10 text-success">Publicado</Badge>}
            <Checkbox
              checked={formData.is_published}
              onCheckedChange={(checked) => {
                setFormData(prev => ({ ...prev, is_published: !!checked }));
                if (!editMode) setEditMode(true);
              }}
            />
          </div>
        </div>
      </PermissionsGate>

      {/* Thumbnail Section */}
      <PermissionsGate permissions={permissions} resource="content.video.thumbnail" action="edit" showLockOnReadOnly={false}>
        <div className="space-y-4">
          <AIThumbnailGenerator
            contentId={content?.id || ''}
            organizationId={currentOrgId || ''}
            currentThumbnail={content?.thumbnail_url}
            scriptContext={{
              script: content?.script,
              salesAngle: content?.sales_angle,
              idealAvatar: selectedProduct?.ideal_avatar,
              hooksCount: formData.hooks_count,
              productName: selectedProduct?.name || content?.product,
              clientName: content?.client?.name,
            }}
            onThumbnailGenerated={() => onUpdate?.()}
          />
          <SectionCard title="Subir Miniatura Manual" iconEmoji="🖼️">
            <ThumbnailSelector
              contentId={content?.id || ''}
              currentThumbnail={content?.thumbnail_url}
              onThumbnailChange={() => onUpdate?.()}
              disabled={false}
            />
          </SectionCard>
        </div>
      </PermissionsGate>

      {/* Read-only notice */}
      {(!canEditVideo || readOnly) && effectiveEditMode && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
          <Lock className="h-4 w-4 text-warning" />
          <span>{readOnly ? 'Este tab es de solo lectura' : 'Solo el estratega o admin pueden editar videos'}</span>
        </div>
      )}

      {/* Videos + Comments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Videos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Video className="h-4 w-4" /> Videos Finales
            </h4>
            {effectiveEditMode && canEditVideo && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Cantidad:</Label>
                <Select
                  value={String(formData.hooks_count)}
                  onValueChange={(v) => {
                    const newCount = parseInt(v);
                    const newUrls = Array.from({ length: newCount }, (_, i) => formData.video_urls[i] || '');
                    setFormData(prev => ({ ...prev, hooks_count: newCount, video_urls: newUrls }));
                  }}
                >
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!effectiveEditMode && formData.hooks_count > 1 && (
            <Badge variant="secondary">{formData.hooks_count} variables</Badge>
          )}

          {effectiveEditMode && canEditVideo ? (
            <BunnyMultiVideoUploader
              contentId={content?.id || ''}
              title={content?.title || 'video'}
              currentUrls={formData.video_urls}
              hooksCount={formData.hooks_count}
              onUploadComplete={(urls) => {
                setFormData(prev => ({ ...prev, video_urls: urls }));
                onUpdate?.();
              }}
              disabled={!canEditVideo}
            />
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {formData.video_urls.map((url, i) => (
                <div key={i} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variable {i + 1}</span>
                    <div className="flex items-center gap-2">
                      {url && canDownloadVideo && (
                        <DownloadVideoButton contentId={content?.id || ''} videoUrl={url} variantIndex={i} title={content?.title || 'video'} />
                      )}
                      {url && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />Abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {url ? (
                    <div className="aspect-[9/16] max-h-[300px] rounded-lg overflow-hidden bg-black">
                      <AutoPauseVideo src={url} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-[9/16] max-h-[300px] rounded-lg border-2 border-dashed flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Sin video</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <h4 className="font-medium">💬 Comentarios</h4>
          <CommentsSection contentId={content?.id || ''} />
        </div>
      </div>

      {/* AI Content Analysis */}
      {content?.id && currentOrgId && (
        <SectionCard title="Análisis IA de Contenido" iconEmoji="🧠">
          <ContentAIAnalysis
            contentId={content.id}
            organizationId={currentOrgId}
            videoUrl={formData.video_urls?.[0]}
            product={selectedProduct ? {
              name: selectedProduct.name,
              description: selectedProduct.description,
              strategy: selectedProduct.strategy,
              market_research: selectedProduct.market_research,
              ideal_avatar: selectedProduct.ideal_avatar,
              sales_angles: selectedProduct.sales_angles,
            } : undefined}
            client={content.client ? {
              name: content.client.name,
            } : undefined}
            script={formData.script}
            spherePhase={formData.sphere_phase}
            guidelines={{
              editor: formData.editor_guidelines,
              strategist: formData.strategist_guidelines,
              trafficker: formData.trafficker_guidelines,
              designer: formData.designer_guidelines,
              admin: formData.admin_guidelines,
            }}
          />
        </SectionCard>
      )}

      {/* Notes */}
      <SectionCard title="Notas Adicionales">
        <EditableField
          permissions={permissions}
          resource="content.comments"
          editMode={effectiveEditMode}
          readOnly={readOnly}
          editComponent={
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              className="min-h-[100px]"
            />
          }
          viewComponent={<p className="text-sm">{formData.notes || 'Sin notas'}</p>}
        />
      </SectionCard>
    </div>
  );
}
