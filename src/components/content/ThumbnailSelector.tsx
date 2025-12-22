import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Loader2, Check, X, Image, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThumbnailSelectorProps {
  contentId: string;
  videoUrl: string;
  currentThumbnail?: string | null;
  onThumbnailChange?: (thumbnailUrl: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Extract video ID from Bunny URL
function extractVideoId(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];
  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];
  return null;
}

// Convert embed URL to direct video URL for frame capture
function getDirectVideoUrl(url: string): string | null {
  if (!url) return null;
  
  // Extract library ID and video ID from embed URL
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    const [, libraryId, videoId] = embedMatch;
    return `https://vz-${libraryId}.b-cdn.net/${videoId}/play_720p.mp4`;
  }
  
  // Already a direct URL
  if (url.includes('b-cdn.net') && url.includes('.mp4')) {
    return url;
  }
  
  return url;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ThumbnailSelector({
  contentId,
  videoUrl,
  currentThumbnail,
  onThumbnailChange,
  disabled = false,
  compact = false
}: ThumbnailSelectorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [mode, setMode] = useState<'view' | 'capture' | 'uploading'>('view');
  const [uploading, setUploading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  
  const directVideoUrl = getDirectVideoUrl(videoUrl);

  // Load video for frame capture
  const loadVideo = useCallback(() => {
    if (!directVideoUrl || !videoRef.current) return;
    
    setVideoLoaded(false);
    setVideoError(false);
    videoRef.current.src = directVideoUrl;
    videoRef.current.load();
  }, [directVideoUrl]);

  useEffect(() => {
    if (mode === 'capture') {
      loadVideo();
    }
  }, [mode, loadVideo]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVideoLoaded(true);
      // Seek to first second for initial frame
      videoRef.current.currentTime = 1;
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
    setVideoLoaded(false);
    toast({
      title: 'Error al cargar video',
      description: 'No se pudo cargar el video para captura de frame',
      variant: 'destructive'
    });
  };

  const handleTimeChange = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedFrame(dataUrl);
    setPreviewThumbnail(dataUrl);
  };

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

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setCapturedFrame(result);
      setPreviewThumbnail(result);
      setMode('capture');
    };
    reader.readAsDataURL(file);
  };

  const uploadThumbnail = async () => {
    if (!capturedFrame) return;
    
    setUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedFrame);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `thumbnails/${contentId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
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
        description: 'La miniatura se guardó correctamente'
      });
      
      setMode('view');
      setCapturedFrame(null);
      setPreviewThumbnail(null);
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la miniatura',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelCapture = () => {
    setMode('view');
    setCapturedFrame(null);
    setPreviewThumbnail(null);
    setVideoLoaded(false);
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
          onClick={() => setMode('capture')}
          disabled={disabled || !videoUrl}
        >
          <Camera className="h-3 w-3 mr-1" />
          Capturar
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Upload className="h-3 w-3 mr-1" />
          Subir
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
      <canvas ref={canvasRef} className="hidden" />
      
      {mode === 'view' && (
        <div className="space-y-3">
          {/* Current thumbnail preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
            {currentThumbnail ? (
              <img 
                src={currentThumbnail} 
                alt="Miniatura actual" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin miniatura</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMode('capture')}
              disabled={disabled || !videoUrl}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar frame
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir imagen
            </Button>
          </div>
        </div>
      )}

      {mode === 'capture' && (
        <div className="space-y-4">
          {/* Video preview for frame selection */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            {previewThumbnail ? (
              <img 
                src={previewThumbnail} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            ) : videoError ? (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <X className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Error al cargar video</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadVideo}
                    className="mt-2 text-white/70 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : !videoLoaded ? (
              <div className="w-full h-full flex items-center justify-center text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onLoadedMetadata={handleVideoLoaded}
                onError={handleVideoError}
                muted
                playsInline
                crossOrigin="anonymous"
              />
            )}
            
            {/* Hidden video for initial load */}
            {!previewThumbnail && !videoLoaded && !videoError && (
              <video
                ref={videoRef}
                className="hidden"
                onLoadedMetadata={handleVideoLoaded}
                onError={handleVideoError}
                muted
                playsInline
                crossOrigin="anonymous"
              />
            )}
          </div>
          
          {/* Time slider */}
          {videoLoaded && !previewThumbnail && videoDuration > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Selecciona el frame</span>
                <span>{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
              </div>
              <Slider
                value={[currentTime]}
                min={0}
                max={videoDuration}
                step={0.1}
                onValueChange={handleTimeChange}
                disabled={!videoLoaded}
              />
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={cancelCapture}
              disabled={uploading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            {!previewThumbnail ? (
              <Button
                onClick={captureFrame}
                disabled={!videoLoaded || uploading}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedFrame(null);
                    setPreviewThumbnail(null);
                  }}
                  disabled={uploading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Otro frame
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}