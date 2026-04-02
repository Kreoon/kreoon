import { useRef, useState, useMemo } from 'react';
import {
  Upload, Video, Image as ImageIcon, Trash2, Star, Loader2, FolderOpen, Pencil,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { usePortfolioItems, PortfolioItemData } from '@/hooks/usePortfolioItems';
import { extractBunnyIds } from '@/hooks/useHLSPlayer';
import { toast } from 'sonner';

export function PortfolioTab() {
  const { profile: creatorProfile, loading: cpLoading, createProfile } = useCreatorProfile();
  const [isCreating, setIsCreating] = useState(false);
  const creatorId = creatorProfile?.id || '';
  const {
    items, loading, adding,
    uploadVideo, uploadImage, deleteItem, togglePin, updateItem,
  } = usePortfolioItems({ creatorProfileId: creatorId });

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItemData | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creatorId) return;
    await uploadVideo(file, creatorId, { title: file.name.replace(/\.[^.]+$/, '') });
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creatorId) return;
    await uploadImage(file, creatorId, { title: file.name.replace(/\.[^.]+$/, '') });
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteItem(id);
    setDeletingId(null);
  };

  const handleCreateProfile = async () => {
    setIsCreating(true);
    await createProfile();
    setIsCreating(false);
  };

  if (cpLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Si no tiene perfil de creador, mostrar opción para crearlo
  if (!creatorProfile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Configura tu perfil de creador</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Para subir contenido a tu portafolio, primero necesitas activar tu perfil de creador en el marketplace.
          </p>
          <Button onClick={handleCreateProfile} disabled={isCreating}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Activar perfil de creador
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Tu Portafolio</CardTitle>
            <CardDescription>Sube videos e imágenes de tu trabajo para mostrar en el marketplace</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={adding}
            >
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
              Subir Video
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={adding}
            >
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              Subir Imagen
            </Button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Tu portafolio está vacío</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Sube videos e imágenes de tu trabajo para que las marcas puedan ver tu estilo y calidad
            </p>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={() => videoInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Subir primer video
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {items.length} {items.length === 1 ? 'item' : 'items'} · {items.filter(i => i.is_featured).length}/3 destacados
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {items.map(item => (
                <PortfolioItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  onTogglePin={() => togglePin(item.id)}
                  onEdit={() => setEditingItem(item)}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Edit dialog */}
      {editingItem && (
        <EditPortfolioItemDialog
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (id, data) => {
            const ok = await updateItem(id, data);
            if (ok) {
              toast.success('Item actualizado');
              setEditingItem(null);
            }
            return ok;
          }}
        />
      )}
    </Card>
  );
}

// ── Edit Dialog ──────────────────────────────────────────

function EditPortfolioItemDialog({
  item,
  open,
  onClose,
  onSave,
}: {
  item: PortfolioItemData;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<PortfolioItemData>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [tags, setTags] = useState(item.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const parsedTags = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    await onSave(item.id, {
      title: title.trim() || null,
      description: description.trim() || null,
      tags: parsedTags,
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar contenido</DialogTitle>
          <DialogDescription>
            Agrega un titulo y descripcion para mejorar el SEO y que las marcas entiendan tu trabajo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="portfolio-title">Titulo</Label>
            <Input
              id="portfolio-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: UGC para marca de skincare"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">{title.length}/120</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio-description">Descripcion / Copy</Label>
            <Textarea
              id="portfolio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el contenido, el objetivo, la marca, el resultado..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio-tags">Tags (separados por coma)</Label>
            <Input
              id="portfolio-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ugc, skincare, unboxing, review"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Portfolio Item Card ──────────────────────────────────

// Default Bunny library ID for building embed URLs when only video_id is available
const DEFAULT_BUNNY_LIBRARY_ID = '568434';

function buildBunnyEmbedUrl(libraryId: string, videoId: string): string {
  const params = new URLSearchParams({
    autoplay: 'false',
    preload: 'true',
    responsive: 'true',
  });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}

function PortfolioItemCard({
  item,
  onDelete,
  onTogglePin,
  onEdit,
  isDeleting,
}: {
  item: PortfolioItemData;
  onDelete: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  isDeleting: boolean;
}) {
  const bunnyIds = useMemo(
    () => (item.media_url ? extractBunnyIds(item.media_url) : null),
    [item.media_url],
  );
  // Can use iframe if we have IDs from URL OR if we have bunny_video_id directly
  const hasNumericLibraryId = !!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));
  const canUseIframe = item.media_type === 'video' && (hasNumericLibraryId || !!item.bunny_video_id);

  // Use library ID from URL if numeric, otherwise use default
  const effectiveLibraryId = hasNumericLibraryId ? bunnyIds!.libraryId : DEFAULT_BUNNY_LIBRARY_ID;
  const effectiveVideoId = bunnyIds?.videoId || item.bunny_video_id;
  const embedUrl = canUseIframe && effectiveVideoId
    ? buildBunnyEmbedUrl(effectiveLibraryId, effectiveVideoId)
    : null;

  return (
    <div className="relative group rounded-sm overflow-hidden border border-border bg-black aspect-[9/16]">
      {/* Content */}
      {item.media_type === 'video' ? (
        embedUrl ? (
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <video
            src={item.media_url}
            poster={item.thumbnail_url || undefined}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <img
          src={item.media_url}
          alt={item.title || 'Portfolio item'}
          className="w-full h-full object-cover"
        />
      )}

      {/* Featured badge */}
      {item.is_featured && (
        <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-black text-[10px] gap-1">
          <Star className="h-3 w-3 fill-black" />
          Destacado
        </Badge>
      )}

      {/* Type badge */}
      <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">
        {item.media_type === 'video' ? 'Video' : 'Imagen'}
      </Badge>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <div className="w-full space-y-2">
          {item.title && (
            <p className="text-white text-xs font-medium truncate">{item.title}</p>
          )}
          {item.description && (
            <p className="text-white/70 text-[10px] line-clamp-2">{item.description}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs flex-1"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={onTogglePin}
            >
              <Star className={`h-3 w-3 ${item.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
