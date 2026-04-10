import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { BunnyMultiVideoUploader } from '@/components/content/BunnyMultiVideoUploader';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
import { CommentsSection } from '@/components/content/CommentsSection';
import { supabase } from '@/integrations/supabase/client';
import { markLocalUpdate } from '@/hooks/useContent';
import { Video, Share2, Lock, ExternalLink, Info } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

export default function VideoTab({
  project,
  formData,
  setFormData,
  editMode,
  setEditMode,
  permissions,
  readOnly = false,
}: UnifiedTabProps) {
  // Only content projects have the video tab
  if (project.source !== 'content') {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Info className="h-4 w-4" />
        <span className="text-sm">Esta pestana no esta disponible para este tipo de proyecto.</span>
      </div>
    );
  }

  const canEditVideo = permissions.can('project.video', 'edit') && !readOnly;
  const canPublish = permissions.can('project.video.publish', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;

  const videoUrls: string[] = formData.video_urls || [];
  const hooksCount: number = formData.hooks_count || 1;

  return (
    <div className="space-y-6">
      {/* Publish to Portfolio */}
      {canPublish && (
        <div className="flex items-center justify-between p-4 rounded-sm border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Publicar en Portafolio</p>
              <p className="text-xs text-muted-foreground">Visible publicamente en la red social</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {formData.is_published && <Badge variant="secondary" className="bg-success/10 text-success">Publicado</Badge>}
            <Checkbox
              checked={formData.is_published}
              onCheckedChange={(checked) => {
                setFormData((prev: Record<string, any>) => ({ ...prev, is_published: !!checked }));
                if (!editMode) setEditMode(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {(!canEditVideo || readOnly) && effectiveEditMode && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-sm text-sm">
          <Lock className="h-4 w-4 text-warning" />
          <span>{readOnly ? 'Este tab es de solo lectura' : 'No tienes permisos para editar videos en este proyecto'}</span>
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
                <SearchableSelect
                  value={String(hooksCount)}
                  onValueChange={(v) => {
                    const newCount = parseInt(v);
                    const newUrls = Array.from({ length: newCount }, (_, i) => videoUrls[i] || '');
                    setFormData((prev: Record<string, any>) => ({ ...prev, hooks_count: newCount, video_urls: newUrls }));
                  }}
                  options={[1,2,3,4,5,6,7,8,9,10].map(n => ({ value: String(n), label: String(n) }))}
                  triggerClassName="w-20 h-9"
                />
              </div>
            )}
          </div>

          {!effectiveEditMode && hooksCount > 1 && (
            <Badge variant="secondary">{hooksCount} variables</Badge>
          )}

          {effectiveEditMode && canEditVideo ? (
            <BunnyMultiVideoUploader
              contentId={project.id}
              title={project.title || 'video'}
              currentUrls={videoUrls}
              hooksCount={hooksCount}
              onUploadComplete={(urls) => {
                setFormData((prev: Record<string, any>) => ({ ...prev, video_urls: urls }));
                if (!editMode) setEditMode(true);
                // Auto-save video URLs to DB immediately via RPC
                markLocalUpdate(project.id, 5 * 60 * 1000);
                supabase
                  .rpc('update_content_by_id', {
                    p_content_id: project.id,
                    p_updates: { video_urls: urls.filter((u: string) => u.trim() !== '') }
                  })
                  .then(({ error }) => {
                    if (error) console.error('[VideoTab] Failed to auto-save video URLs:', error);
                  });
              }}
              disabled={!canEditVideo}
            />
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {videoUrls.map((url: string, i: number) => (
                <div key={i} className="space-y-2 p-3 rounded-sm border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variable {i + 1}</span>
                    {url && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />Abrir
                        </a>
                      </Button>
                    )}
                  </div>
                  {url ? (
                    <div className="aspect-[9/16] max-h-[300px] rounded-sm overflow-hidden bg-black">
                      <AutoPauseVideo src={url} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-[9/16] max-h-[300px] rounded-sm border-2 border-dashed flex items-center justify-center">
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
          <h4 className="font-medium">Comentarios</h4>
          <CommentsSection contentId={project.id} />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-sm border p-4 space-y-3">
        <h4 className="font-medium text-sm">Notas Adicionales</h4>
        {effectiveEditMode ? (
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData((prev: Record<string, any>) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas adicionales..."
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{formData.notes || 'Sin notas'}</p>
        )}
      </div>
    </div>
  );
}
