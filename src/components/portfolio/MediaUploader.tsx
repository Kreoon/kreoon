import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Image, Video, X } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUploaderProps {
  userId: string;
  type: 'post' | 'story';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MediaUploader({
  userId,
  type,
  isOpen,
  onClose,
  onSuccess,
}: MediaUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error('Solo se permiten imágenes y videos');
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('El archivo es muy grande (máx. 50MB)');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const isVideo = file.type.startsWith('video/');
      const ext = file.name.split('.').pop();
      const fileName = `${userId}/${type}s/${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;

      // Insert into database
      if (type === 'story') {
        const { error: dbError } = await supabase
          .from('portfolio_stories')
          .insert({
            user_id: userId,
            media_url: mediaUrl,
            media_type: isVideo ? 'video' : 'image',
          });

        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('portfolio_posts')
          .insert({
            user_id: userId,
            media_url: mediaUrl,
            media_type: isVideo ? 'video' : 'image',
            caption: caption || null,
          });

        if (dbError) throw dbError;
      }

      toast.success(type === 'story' ? 'Historia publicada' : 'Post publicado');
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {type === 'story' ? 'Nueva historia' : 'Nuevo post'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[9/16] max-h-[400px] bg-zinc-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors"
            >
              <div className="flex gap-4 mb-4">
                <Image className="h-10 w-10 text-white/40" />
                <Video className="h-10 w-10 text-white/40" />
              </div>
              <p className="text-white/60 text-sm">Toca para seleccionar</p>
              <p className="text-white/40 text-xs mt-1">Imagen o video vertical</p>
            </div>
          ) : (
            <div className="relative aspect-[9/16] max-h-[400px] bg-zinc-800 rounded-xl overflow-hidden">
              {file?.type.startsWith('video/') ? (
                <video
                  src={preview}
                  className="w-full h-full object-contain"
                  controls
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {type === 'post' && preview && (
            <Textarea
              placeholder="Escribe un caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-zinc-800 border-white/10 text-white placeholder:text-white/40 resize-none"
              rows={2}
            />
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Publicar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
