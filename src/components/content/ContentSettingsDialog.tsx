import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CollaboratorSelector } from '@/components/content/CollaboratorSelector';
import { ThumbnailSelector } from '@/components/content/ThumbnailSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Eye, Heart, Calendar, Pin, Image } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onSuccess?: () => void;
}

interface ContentData {
  id: string;
  title: string;
  caption: string | null;
  description: string | null;
  creator_id: string | null;
  views_count: number;
  likes_count: number;
  is_published: boolean;
  created_at: string;
  thumbnail_url: string | null;
}

export function ContentSettingsDialog({ 
  open, 
  onOpenChange, 
  contentId,
  onSuccess 
}: ContentSettingsDialogProps) {
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && contentId) {
      fetchContent();
    }
  }, [open, contentId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content')
        .select('id, title, caption, description, creator_id, views_count, likes_count, is_published, created_at, thumbnail_url')
        .eq('id', contentId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setContent(data);
        // Remove [PINNED] tag from caption for editing
        const cleanCaption = (data.caption || '').replace('[PINNED]', '').trim();
        setCaption(cleanCaption);
        setDescription(data.description || '');
        setIsPublished(data.is_published || false);
        setThumbnailUrl(data.thumbnail_url);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Error al cargar el contenido');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;
    
    setSaving(true);
    try {
      // Preserve [PINNED] tag if it was there
      const wasPinned = content.caption?.includes('[PINNED]');
      const finalCaption = wasPinned ? `${caption}[PINNED]` : caption;

      const { error } = await supabase
        .from('content')
        .update({
          caption: finalCaption || null,
          description: description || null,
          is_published: isPublished,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (error) throw error;

      toast.success('Contenido actualizado');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return '-';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración del contenido</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : content ? (
          <div className="space-y-6">
            {/* Title (read-only) */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <p className="font-medium">{content.title}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{content.views_count.toLocaleString()} vistas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                <span>{content.likes_count.toLocaleString()} likes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(content.created_at)}</span>
              </div>
            </div>

            <Separator />

            {/* Thumbnail */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                <Label>Miniatura</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Sube una imagen personalizada o usa la miniatura automática del video.
              </p>
              <ThumbnailSelector
                contentId={contentId}
                currentThumbnail={thumbnailUrl}
                onThumbnailChange={(url) => {
                  setThumbnailUrl(url);
                  onSuccess?.();
                }}
                showRemove={true}
              />
            </div>

            <Separator />

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escribe un caption para tu contenido..."
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Usa @usuario para mencionar y #hashtag para etiquetar
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción adicional del contenido..."
                className="min-h-[60px] resize-none"
              />
            </div>

            <Separator />

            {/* Collaborators */}
            <CollaboratorSelector
              contentId={contentId}
              creatorId={content.creator_id}
              onChange={onSuccess}
            />

            <Separator />

            {/* Published toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Publicado</Label>
                <p className="text-xs text-muted-foreground">
                  El contenido será visible en el portfolio público
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>

            {/* Save button */}
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No se encontró el contenido
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
