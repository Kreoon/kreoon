import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/lib/bunnyUpload';
import { Upload, Loader2, Check, X, Image, Trash2 } from 'lucide-react';

interface ThumbnailSelectorProps {
  contentId: string;
  currentThumbnail?: string | null;
  onThumbnailChange?: (thumbnailUrl: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
  showRemove?: boolean;
}

export function ThumbnailSelector({
  contentId,
  currentThumbnail,
  onThumbnailChange,
  disabled = false,
  compact = false,
  showRemove = true
}: ThumbnailSelectorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  // Clear preview when content changes
  useEffect(() => {
    setPreviewImage(null);
    setPreviewFile(null);
  }, [contentId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Archivo no válido',
        description: 'Por favor selecciona una imagen',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'La imagen no puede superar los 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setPreviewFile(file);
    };
    reader.readAsDataURL(file);
  };

  const uploadThumbnail = async () => {
    if (!previewFile) return;

    setUploading(true);
    try {
      // Upload to Bunny CDN
      const result = await uploadImage(previewFile, contentId);

      // Update content with new thumbnail
      const { error: updateError } = await supabase
        .from('content')
        .update({ thumbnail_url: result.cdnUrl })
        .eq('id', contentId);

      if (updateError) throw updateError;

      onThumbnailChange?.(result.cdnUrl);
      toast({
        title: 'Miniatura actualizada',
        description: 'La miniatura se guardó correctamente',
      });

      setPreviewImage(null);
      setPreviewFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la miniatura',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeThumbnail = async () => {
    setRemoving(true);
    try {
      // Update content to remove thumbnail
      const { error: updateError } = await supabase
        .from('content')
        .update({ thumbnail_url: null })
        .eq('id', contentId);

      if (updateError) throw updateError;

      onThumbnailChange?.(null);
      toast({
        title: 'Miniatura eliminada',
        description: 'La miniatura se eliminó correctamente',
      });
    } catch (error) {
      console.error('Error removing thumbnail:', error);
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar la miniatura',
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const cancelPreview = () => {
    setPreviewImage(null);
    setPreviewFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compact version for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading || removing}
        />
        
        {currentThumbnail ? (
          <div className="relative w-12 h-12 rounded overflow-hidden border">
            <img 
              src={currentThumbnail} 
              alt="Miniatura" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded border border-dashed flex items-center justify-center bg-muted">
            <Image className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || removing}
        >
          <Upload className="h-3 w-3 mr-1" />
          {currentThumbnail ? 'Cambiar' : 'Subir'}
        </Button>
        
        {showRemove && currentThumbnail && (
          <Button
            variant="ghost"
            size="sm"
            onClick={removeThumbnail}
            disabled={disabled || uploading || removing}
            className="text-destructive hover:text-destructive"
          >
            {removing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading || removing}
      />
      
      {/* Current thumbnail preview */}
      {currentThumbnail && !previewImage && (
        <div className="relative w-24 h-32 rounded-sm overflow-hidden border bg-black">
          <img 
            src={currentThumbnail} 
            alt="Miniatura actual" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {previewImage ? (
        <div className="space-y-2">
          <div className="relative w-24 h-32 rounded-sm overflow-hidden border">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelPreview}
              disabled={uploading}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={uploadThumbnail}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || removing}
          >
            <Upload className="h-3 w-3 mr-1" />
            {currentThumbnail ? 'Cambiar miniatura' : 'Subir miniatura'}
          </Button>
          
          {showRemove && currentThumbnail && (
            <Button
              variant="ghost"
              size="sm"
              onClick={removeThumbnail}
              disabled={disabled || uploading || removing}
              className="text-destructive hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              Quitar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
