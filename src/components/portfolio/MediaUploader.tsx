import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Image, Video, X, Camera, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

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
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    setThumbnail(null);
    setCustomThumbnailFile(null);
    
    // Auto-generate thumbnail for videos
    if (isVideo) {
      setShowThumbnailSelector(false);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes para la miniatura');
      return;
    }

    setCustomThumbnailFile(selectedFile);
    setThumbnail(URL.createObjectURL(selectedFile));
    setShowThumbnailSelector(false);
  };

  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      // Capture initial frame at 1 second or start
      const initialTime = Math.min(1, videoRef.current.duration);
      videoRef.current.currentTime = initialTime;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setThumbnail(dataUrl);
    setCustomThumbnailFile(null);
  }, []);

  const handleVideoTimeUpdate = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setVideoTime(time);
    }
  }, []);

  const handleVideoSeeked = useCallback(() => {
    captureFrame();
  }, [captureFrame]);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const isVideo = file.type.startsWith('video/');
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}/${type}s/${timestamp}.${ext}`;

      // Upload main file to storage
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;
      let thumbnailUrl: string | null = null;

      // Upload thumbnail if it's a video and we have one
      if (isVideo && (thumbnail || customThumbnailFile)) {
        let thumbnailBlob: Blob;
        
        if (customThumbnailFile) {
          thumbnailBlob = customThumbnailFile;
        } else if (thumbnail && thumbnail.startsWith('data:')) {
          // Convert base64 to blob
          const response = await fetch(thumbnail);
          thumbnailBlob = await response.blob();
        } else {
          // Capture frame if no thumbnail exists
          captureFrame();
          if (thumbnail && thumbnail.startsWith('data:')) {
            const response = await fetch(thumbnail);
            thumbnailBlob = await response.blob();
          } else {
            thumbnailBlob = new Blob();
          }
        }

        if (thumbnailBlob.size > 0) {
          const thumbFileName = `${userId}/${type}s/thumbs/${timestamp}.jpg`;
          
          const { error: thumbError } = await supabase.storage
            .from('portfolio')
            .upload(thumbFileName, thumbnailBlob, {
              contentType: 'image/jpeg'
            });

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage
              .from('portfolio')
              .getPublicUrl(thumbFileName);
            thumbnailUrl = thumbUrlData.publicUrl;
          }
        }
      }

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
            thumbnail_url: thumbnailUrl,
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
    setThumbnail(null);
    setCustomThumbnailFile(null);
    setShowThumbnailSelector(false);
    setVideoTime(0);
    setVideoDuration(0);
    onClose();
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-3">
              <div className="relative aspect-[9/16] max-h-[350px] bg-zinc-800 rounded-xl overflow-hidden">
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={preview}
                    className="w-full h-full object-contain"
                    onLoadedMetadata={handleVideoLoaded}
                    onSeeked={handleVideoSeeked}
                    muted
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
                    setThumbnail(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Thumbnail selector for videos */}
              {isVideo && type === 'post' && (
                <div className="bg-zinc-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm font-medium">Miniatura del video</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowThumbnailSelector(!showThumbnailSelector)}
                      className="text-white/60 hover:text-white h-7 px-2"
                    >
                      {showThumbnailSelector ? 'Ocultar' : 'Cambiar'}
                    </Button>
                  </div>

                  {/* Current thumbnail preview */}
                  {thumbnail && (
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-zinc-700">
                      <img 
                        src={thumbnail} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center">
                        Miniatura
                      </div>
                    </div>
                  )}

                  {showThumbnailSelector && (
                    <div className="space-y-3">
                      {/* Timeline slider */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVideoTimeUpdate(Math.max(0, videoTime - 0.5))}
                            className="h-7 w-7 p-0 text-white/60 hover:text-white"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="flex-1">
                            <Slider
                              value={[videoTime]}
                              min={0}
                              max={videoDuration || 100}
                              step={0.1}
                              onValueChange={([value]) => handleVideoTimeUpdate(value)}
                              className="cursor-pointer"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVideoTimeUpdate(Math.min(videoDuration, videoTime + 0.5))}
                            className="h-7 w-7 p-0 text-white/60 hover:text-white"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40 px-9">
                          <span>{formatTime(videoTime)}</span>
                          <span>{formatTime(videoDuration)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={captureFrame}
                          className="flex-1 h-8 text-xs border-white/20 text-white hover:bg-white/10"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Capturar frame
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="flex-1 h-8 text-xs border-white/20 text-white hover:bg-white/10"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Subir imagen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailSelect}
            className="hidden"
          />

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
