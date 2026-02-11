import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Edit2, ExternalLink, Hash, Image, Save, Video, FileText, X, Check } from "lucide-react";
import { MarketingCalendarItem, PLATFORMS, CONTENT_TYPES } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarItemDetailDialogProps {
  item: MarketingCalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function CalendarItemDetailDialog({ item, open, onOpenChange, onUpdate }: CalendarItemDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingRefreshRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      onUpdate();
    }
    onOpenChange(nextOpen);
  };
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    copy_text: "",
    hashtags: [] as string[],
    status: "",
    scheduled_time: "",
  });

  if (!item) return null;

  const startEditing = () => {
    setEditData({
      title: item.title,
      description: item.description || "",
      copy_text: item.copy_text || "",
      hashtags: item.hashtags || [],
      status: item.status,
      scheduled_time: item.scheduled_time || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_content_calendar')
        .update({
          title: editData.title,
          description: editData.description || null,
          copy_text: editData.copy_text || null,
          hashtags: editData.hashtags,
          status: editData.status,
          scheduled_time: editData.scheduled_time || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Contenido actualizado');
      setIsEditing(false);
      pendingRefreshRef.current = true;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('marketing_content_calendar')
        .update(updates)
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`Estado actualizado a ${getStatusLabel(newStatus)}`);
      pendingRefreshRef.current = true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned': return 'Planeado';
      case 'in_progress': return 'En Progreso';
      case 'ready': return 'Listo';
      case 'published': return 'Publicado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'ready': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
      case 'reel':
      case 'live':
        return Video;
      case 'post':
      case 'carousel':
        return Image;
      default:
        return FileText;
    }
  };

  const platform = PLATFORMS.find(p => p.value === item.platform);
  const contentType = CONTENT_TYPES.find(t => t.value === item.content_type);
  const Icon = getContentTypeIcon(item.content_type);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {isEditing ? (
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="text-lg font-semibold"
                />
              ) : (
                item.title
              )}
            </DialogTitle>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Edit2 className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Platform */}
          <div className="flex items-center gap-4 flex-wrap">
            <Badge className={cn(platform?.color, "text-white")}>
              {platform?.label}
            </Badge>
            <Badge variant="outline">
              {contentType?.label}
            </Badge>
            <Badge className={cn(getStatusColor(item.status), "text-white")}>
              {getStatusLabel(item.status)}
            </Badge>
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(item.scheduled_date), "EEEE, d 'de' MMMM yyyy", { locale: es })}</span>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={editData.scheduled_time}
                  onChange={(e) => setEditData({ ...editData, scheduled_time: e.target.value })}
                  className="w-32"
                />
              </div>
            ) : item.scheduled_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{item.scheduled_time}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descripción</Label>
            {isEditing ? (
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
                placeholder="Descripción del contenido..."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {item.description || "Sin descripción"}
              </p>
            )}
          </div>

          {/* Copy Text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Texto / Copy</Label>
            {isEditing ? (
              <Textarea
                value={editData.copy_text}
                onChange={(e) => setEditData({ ...editData, copy_text: e.target.value })}
                rows={4}
                placeholder="Texto para publicar..."
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {item.copy_text || "Sin copy definido"}
              </div>
            )}
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Hash className="h-4 w-4" />
              Hashtags
            </Label>
            {isEditing ? (
              <Input
                value={editData.hashtags.join(' ')}
                onChange={(e) => setEditData({ 
                  ...editData, 
                  hashtags: e.target.value.split(' ').filter(h => h.trim()) 
                })}
                placeholder="#hashtag1 #hashtag2"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.hashtags && item.hashtags.length > 0 ? (
                  item.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Sin hashtags</span>
                )}
              </div>
            )}
          </div>

          {/* Media Preview */}
          {item.media_urls && item.media_urls.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Media</Label>
              <div className="grid grid-cols-3 gap-2">
                {item.media_urls.map((url, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published URL */}
          {item.published_url && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">URL Publicación</Label>
              <a
                href={item.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Ver publicación
              </a>
            </div>
          )}

          {/* Performance (if published) */}
          {item.status === 'published' && item.performance && Object.keys(item.performance).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rendimiento</Label>
              <div className="grid grid-cols-4 gap-4">
                {item.performance.reach && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">{item.performance.reach.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Alcance</div>
                  </div>
                )}
                {item.performance.impressions && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">{item.performance.impressions.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Impresiones</div>
                  </div>
                )}
                {item.performance.likes && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">{item.performance.likes.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                )}
                {item.performance.comments && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold">{item.performance.comments.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Comentarios</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Status Actions */}
          {!isEditing && item.status !== 'published' && item.status !== 'cancelled' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cambiar Estado</Label>
              <div className="flex gap-2 flex-wrap">
                {item.status === 'planned' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus('in_progress')}>
                    Iniciar Progreso
                  </Button>
                )}
                {item.status === 'in_progress' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus('ready')}>
                    Marcar Listo
                  </Button>
                )}
                {item.status === 'ready' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('published')}>
                    <Check className="h-4 w-4 mr-1" />
                    Marcar Publicado
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => updateStatus('cancelled')}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button onClick={saveChanges} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
