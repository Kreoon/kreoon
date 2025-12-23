import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Check, X, Image } from 'lucide-react';

interface ThumbnailSelectorProps {
  contentId: string;
  currentThumbnail?: string | null;
  onThumbnailChange?: (thumbnailUrl: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ThumbnailSelector({
  contentId,
  currentThumbnail,
  onThumbnailChange,
  disabled = false,
  compact = false
}: ThumbnailSelectorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
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
      // Upload to storage
      const fileName = `${contentId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('content-thumbnails')
        .upload(fileName, previewFile, {
          contentType: previewFile.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content-thumbnails')
        .getPublicUrl(fileName);

      // Update content with new thumbnail
      const { error: updateError } = await supabase
        .from('content')
        .update({ thumbnail_url: publicUrl })
        .eq('id', contentId);

      if (updateError) throw updateError;

      onThumbnailChange?.(publicUrl);
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
          disabled={disabled || uploading}
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
          disabled={disabled || uploading}
        >
          <Upload className="h-3 w-3 mr-1" />
          {currentThumbnail ? 'Cambiar' : 'Subir'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />
      
      {/* Current or preview thumbnail */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
        {previewImage ? (
          <img 
            src={previewImage} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
        ) : currentThumbnail ? (
          <img 
            src={currentThumbnail} 
            alt="Miniatura actual" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Miniatura automática al subir video</p>
            </div>
          </div>
        )}
        
        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      {previewImage ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={cancelPreview}
            disabled={uploading}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={uploadThumbnail}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentThumbnail ? 'Cambiar miniatura' : 'Subir miniatura'}
        </Button>
      )}
    </div>
  );
}
