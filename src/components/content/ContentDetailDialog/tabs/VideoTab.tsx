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
import { PermissionsGate } from '../blocks/PermissionsGate';
import { SectionCard } from '../components/SectionCard';
import { TabProps } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Video, Share2, Image, Lock, Download, Loader2, ExternalLink
} from 'lucide-react';

// Download Video Button Component
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Debes iniciar sesión', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: contentId, video_url: videoUrl }
      });

      if (error) throw error;

      if (data.download_url) {
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = `${title}_variable_${variantIndex + 1}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Descarga iniciada', description: 'El video se está descargando' });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({ 
        title: 'Error al descargar', 
        description: error instanceof Error ? error.message : 'No se pudo descargar el video',
        variant: 'destructive' 
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={downloading}
      className="h-7 px-2 text-xs"
    >
      {downloading ? (
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
      ) : (
        <Download className="h-3 w-3 mr-1" />
      )}
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
  selectedProduct
}: VideoTabProps) {
  const currentStatus = content?.status || null;
  const { user, isAdmin, isClient } = useAuth();
  const canEditVideo = permissions.can('content.video', 'edit');
  const isReadOnly = permissions.isReadOnly('content.video');

  // Determine if download is allowed
  const approvedStatuses = ['approved', 'paid', 'delivered'];
  const canDownloadVideo = isAdmin || (isClient && approvedStatuses.includes(currentStatus || ''));

  return (
    <div className="space-y-6">
      {/* Publish to Portfolio Toggle - Only for Admin */}
      <PermissionsGate 
        permissions={permissions} 
        resource="content.video.thumbnail" 
        action="edit"
      >
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Publicar en Portafolio</p>
              <p className="text-xs text-muted-foreground">
                Este video será visible públicamente en /portfolio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {formData.is_published && (
              <Badge variant="secondary" className="bg-success/10 text-success">
                Publicado
              </Badge>
            )}
            <Checkbox
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) => {
                setFormData((prev) => ({ ...prev, is_published: !!checked }));
                if (!editMode) setEditMode(true);
              }}
            />
          </div>
        </div>
      </PermissionsGate>

      {/* Thumbnail Section - Admin only */}
      <PermissionsGate 
        permissions={permissions} 
        resource="content.video.thumbnail" 
        action="edit"
      >
        <div className="space-y-4">
          <AIThumbnailGenerator
            contentId={content?.id || ''}
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
            <p className="text-xs text-muted-foreground mb-3">
              O sube una imagen personalizada manualmente.
            </p>
            <ThumbnailSelector
              contentId={content?.id || ''}
              currentThumbnail={content?.thumbnail_url}
              onThumbnailChange={() => onUpdate?.()}
              disabled={false}
            />
          </SectionCard>
        </div>
      </PermissionsGate>

      {/* Restriction notice */}
      {isReadOnly && editMode && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
          <Lock className="h-4 w-4 text-warning" />
          <span>Solo el estratega asignado o un admin pueden editar esta sección</span>
        </div>
      )}

      {/* Videos + Comments grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Videos Finales */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Video className="h-4 w-4" /> Videos Finales (Variables)
            </h4>
            
            {editMode && canEditVideo && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Cantidad:</Label>
                <Select
                  value={String(formData.hooks_count)}
                  onValueChange={(value) => {
                    const newCount = parseInt(value);
                    const newUrls = Array.from({ length: newCount }, (_, i) => formData.video_urls[i] || '');
                    setFormData((prev) => ({ ...prev, hooks_count: newCount, video_urls: newUrls }));
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!editMode && formData.hooks_count > 1 && (
            <Badge variant="secondary" className="w-fit">
              {formData.hooks_count} variables configuradas
            </Badge>
          )}
          
          {/* Use BunnyMultiVideoUploader for editing */}
          {editMode && canEditVideo ? (
            <BunnyMultiVideoUploader
              contentId={content?.id || ''}
              title={content?.title || 'video'}
              currentUrls={formData.video_urls}
              hooksCount={formData.hooks_count}
              onUploadComplete={(urls) => {
                setFormData((prev) => ({ ...prev, video_urls: urls }));
                onUpdate?.();
              }}
              disabled={!canEditVideo}
            />
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {formData.video_urls.map((videoUrl: string, index: number) => (
                <div key={index} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variable {index + 1}</span>
                    <div className="flex items-center gap-2">
                      {videoUrl && canDownloadVideo && (
                        <DownloadVideoButton 
                          contentId={content?.id || ''}
                          videoUrl={videoUrl}
                          variantIndex={index}
                          title={content?.title || 'video'}
                        />
                      )}
                      {videoUrl && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {videoUrl ? (
                    <div className="aspect-[9/16] max-h-[300px] rounded-lg overflow-hidden bg-black">
                      <AutoPauseVideo src={videoUrl} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-[9/16] max-h-[300px] rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Sin video</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section - uses contentId */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">💬 Comentarios</h4>
          <CommentsSection contentId={content?.id || ''} />
        </div>
      </div>

      {/* Notes Section */}
      <SectionCard title="Notas Adicionales">
        {editMode ? (
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas adicionales sobre el contenido..."
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-sm">{formData.notes || 'Sin notas'}</p>
        )}
      </SectionCard>
    </div>
  );
}
