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
      const ext = selectedFile.name.split('.').pop();
      const fileName = `featured/${userId}/${Date.now()}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: true });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(fileName);
      const videoUrl = urlData.publicUrl;

      setProgress(95);

      // Generate thumbnail
      const thumbnailDataUrl = await generateThumbnail(videoUrl);
      let thumbnailUrl = '';

      if (thumbnailDataUrl) {
        // Upload thumbnail
        const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
        const thumbFileName = `featured/${userId}/${Date.now()}_thumb.jpg`;
        
        await supabase.storage
          .from('portfolio')
          .upload(thumbFileName, thumbnailBlob, { cacheControl: '3600', upsert: true });
        
        const { data: thumbData } = supabase.storage.from('portfolio').getPublicUrl(thumbFileName);
        thumbnailUrl = thumbData.publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          featured_video_url: videoUrl,
          featured_video_thumbnail: thumbnailUrl,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProgress(100);
      toast.success('Video destacado actualizado');
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
        className="border-social-border text-social-foreground hover:bg-social-muted"
      >
        <Video className="h-4 w-4 mr-2" />
        {currentVideoUrl ? 'Cambiar video' : 'Subir video'}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg bg-social-card border-social-border">
          <DialogHeader>
            <DialogTitle className="text-social-foreground">Video de presentación</DialogTitle>
            <DialogDescription className="text-social-muted-foreground">
              Sube un video horizontal (16:9) que destaque tu perfil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewUrl ? (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
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
                className="aspect-video rounded-lg border-2 border-dashed border-social-border hover:border-social-accent/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 bg-social-muted/30"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-social-muted-foreground" />
                <div className="text-center">
                  <p className="text-social-foreground font-medium">Arrastra o haz clic para subir</p>
                  <p className="text-sm text-social-muted-foreground">MP4, MOV, WebM (max 100MB)</p>
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
                <p className="text-sm text-center text-social-muted-foreground">
                  Subiendo... {progress}%
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={uploading}
                className="text-social-foreground hover:bg-social-muted"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-social-accent hover:bg-social-accent/90 text-social-accent-foreground"
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
