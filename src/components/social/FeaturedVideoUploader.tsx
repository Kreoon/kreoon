import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Video, Upload, X, Loader2 } from 'lucide-react';

interface FeaturedVideoUploaderProps {
  userId: string;
  currentVideoUrl?: string;
  onUploadComplete: (videoUrl: string, thumbnailUrl: string) => void;
}

export function FeaturedVideoUploader({ 
  userId, 
  currentVideoUrl,
  onUploadComplete 
}: FeaturedVideoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video type
    if (!file.type.startsWith('video/')) {
      toast.error('Por favor selecciona un archivo de video');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('El video debe ser menor a 100MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = true;
      
      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      video.onerror = () => {
        resolve(''); // Return empty if thumbnail generation fails
      };
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 85));
      }, 300);

      // Step 1: Create video entry in Bunny (lightweight JSON call)
      const supabaseUrl = (supabase as any).supabaseUrl as string;

      const createRes = await fetch(`${supabaseUrl}/functions/v1/bunny-portfolio-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user_id: userId,
          type: 'featured',
          file_name: selectedFile.name,
        }),
      });

      if (!createRes.ok) {
        clearInterval(progressInterval);
        const errorData = await createRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al subir el video');
      }

      const result = await createRes.json();
      if (!result.success) {
        clearInterval(progressInterval);
        throw new Error(result.error || 'Error al crear video en Bunny');
      }

      // Step 2: Upload file directly to Bunny
      const uploadRes = await fetch(result.upload_url, {
        method: 'PUT',
        headers: {
          'AccessKey': result.access_key,
          'Content-Type': 'application/octet-stream',
        },
        body: selectedFile,
      });

      clearInterval(progressInterval);

      if (!uploadRes.ok) {
        throw new Error(`Error subiendo a Bunny: ${uploadRes.status}`);
      }

      console.log('[FeaturedVideoUploader] Video uploaded to Bunny:', result);

      setProgress(95);

      const videoUrl = result.embed_url || result.mp4_url;
      const thumbnailUrl = result.thumbnail_url || '';

      // Update profile with Bunny URLs
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          featured_video_url: videoUrl,
          featured_video_thumbnail: thumbnailUrl,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProgress(100);
      toast.success('Video destacado actualizado', {
        description: 'El video se está procesando para mejor compatibilidad.'
      });
      onUploadComplete(videoUrl, thumbnailUrl);
      handleClose();
    } catch (error) {
      console.error('Error uploading featured video:', error);
      toast.error('Error al subir el video');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="border-border text-foreground hover:bg-background"
      >
        <Video className="h-4 w-4 mr-2" />
        {currentVideoUrl ? 'Cambiar video' : 'Subir video'}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Video de presentación</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Sube un video horizontal (16:9) que destaque tu perfil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewUrl ? (
              <div className="relative aspect-video rounded-sm overflow-hidden bg-black">
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="aspect-video rounded-sm border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 bg-background/30"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-foreground font-medium">Arrastra o haz clic para subir</p>
                  <p className="text-sm text-muted-foreground">MP4, MOV, WebM (max 100MB)</p>
                </div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Subiendo... {progress}%
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={uploading}
                className="text-foreground hover:bg-background"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir video
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
