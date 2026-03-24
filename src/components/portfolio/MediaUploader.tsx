import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Image, Video, X, Camera, Upload, ChevronLeft, ChevronRight, Music, VolumeX, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  
  // Music settings for stories
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState('');
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [videoVolume, setVideoVolume] = useState(1);
  const [showMusicSettings, setShowMusicSettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Solo se permiten imágenes y videos');
      return;
    }

    // Videos now go through Bunny Stream for automatic transcoding
    // All formats accepted (MOV, MP4, WebM, AVI, MKV, etc.)

    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error('El archivo es muy grande (máx. 100MB)');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setThumbnail(null);
    setCustomThumbnailFile(null);

    if (isVideo) {
      setShowThumbnailSelector(false);
    }
  };

  const handleMusicSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('audio/')) {
      toast.error('Solo se permiten archivos de audio');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('El archivo de audio es muy grande (máx. 10MB)');
      return;
    }

    setMusicFile(selectedFile);
    setMusicName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    
    // Preview audio
    if (audioPreviewRef.current) {
      audioPreviewRef.current.src = URL.createObjectURL(selectedFile);
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
      const ext = file.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();

      // For videos, use Bunny Stream for automatic transcoding
      if (isVideo) {
        const supabaseUrl = (supabase as any).supabaseUrl as string;

        // Step 1: Create video entry in Bunny (lightweight JSON call)
        const createRes = await fetch(`${supabaseUrl}/functions/v1/bunny-portfolio-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            user_id: userId,
            type,
            file_name: file.name,
          }),
        });

        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al subir el video');
        }

        const result = await createRes.json();
        if (!result.success) {
          throw new Error(result.error || 'Error al crear video en Bunny');
        }

        // Step 2: Upload file directly to Bunny
        const uploadRes = await fetch(result.upload_url, {
          method: 'PUT',
          headers: {
            'AccessKey': result.access_key,
            'Content-Type': 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Error subiendo a Bunny: ${uploadRes.status}`);
        }

        // Step 3: Save DB record (post/story) via edge function
        await fetch(`${supabaseUrl}/functions/v1/bunny-portfolio-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-record',
            type,
            user_id: userId,
            embed_url: result.embed_url,
            thumbnail_url: result.thumbnail_url,
            caption,
          }),
        });

        console.log('[MediaUploader] Video uploaded to Bunny:', result);

        toast.success(
          type === 'story' ? 'Historia publicada' : 'Post publicado',
          { description: 'El video se está procesando para mejor compatibilidad.' }
        );
        handleClose();
        onSuccess();
        return;
      }

      // For images, use standard Supabase storage
      const fileName = `${userId}/${type}s/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      const mediaUrl = urlData.publicUrl;
      let musicUrl: string | null = null;

      // Handle music for stories (images only - videos go through Bunny)
      if (type === 'story') {
        if (musicFile) {
          const musicExt = musicFile.name.split('.').pop();
          const musicFileName = `${userId}/stories/music/${timestamp}.${musicExt}`;

          const { error: musicError } = await supabase.storage
            .from('portfolio')
            .upload(musicFileName, musicFile);

          if (!musicError) {
            const { data: musicUrlData } = supabase.storage
              .from('portfolio')
              .getPublicUrl(musicFileName);
            musicUrl = musicUrlData.publicUrl;
          }
        }
      }

      // Determine music name
      const finalMusicName = musicFile ? musicName : null;

      // Insert into database (images only - videos handled by edge function)
      if (type === 'story') {
        const { error: dbError } = await supabase
          .from('portfolio_stories')
          .insert({
            user_id: userId,
            media_url: mediaUrl,
            media_type: 'image',
            music_url: musicUrl,
            music_name: finalMusicName,
            mute_video_audio: false,
            music_volume: musicFile ? musicVolume : 0.5,
            video_volume: 1,
          });

        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('portfolio_posts')
          .insert({
            user_id: userId,
            media_url: mediaUrl,
            media_type: 'image',
            caption: caption || null,
            thumbnail_url: null,
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
    setMusicFile(null);
    setMusicName('');
    setMuteVideoAudio(false);
    setMusicVolume(0.5);
    setVideoVolume(1);
    setShowMusicSettings(false);
    onClose();
  };

  const removeMusicFile = () => {
    setMusicFile(null);
    setMusicName('');
    if (audioPreviewRef.current) {
      audioPreviewRef.current.src = '';
    }
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

              {/* Thumbnail selector for videos (posts only) */}
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

              {/* Music settings for stories */}
              {type === 'story' && (
                <div className="bg-zinc-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      <span className="text-white/70 text-sm font-medium">Música</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMusicSettings(!showMusicSettings)}
                      className="text-white/60 hover:text-white h-7 px-2"
                    >
                      {showMusicSettings ? 'Ocultar' : musicFile ? 'Editar' : 'Agregar'}
                    </Button>
                  </div>

                  {/* Show selected music preview */}
                  {musicFile && !showMusicSettings && (
                    <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2">
                      <Music className="h-3 w-3 text-primary" />
                      <div className="flex-1 min-w-0">
                        <span className="text-white/80 text-xs truncate block">
                          {musicName || musicFile.name}
                        </span>
                      </div>
                      <button
                        onClick={removeMusicFile}
                        className="text-white/40 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {showMusicSettings && (
                    <div className="space-y-4">
                      {!musicFile ? (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => musicInputRef.current?.click()}
                            className="w-full h-10 text-xs border-white/20 text-white hover:bg-white/10"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Subir archivo de audio
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2">
                            <Music className="h-3 w-3 text-primary" />
                            <span className="text-white/80 text-xs truncate flex-1">{musicFile?.name}</span>
                            <button
                              onClick={removeMusicFile}
                              className="text-white/40 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-white/60 text-xs">Nombre de la canción</Label>
                            <Input
                              value={musicName}
                              onChange={(e) => setMusicName(e.target.value)}
                              placeholder="Nombre de la música"
                              className="bg-zinc-700 border-white/10 text-white h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Volume controls */}
                      {(musicFile || isVideo) && (
                        <div className="space-y-3 pt-2 border-t border-white/10">
                          <p className="text-white/50 text-xs">Ajustar volúmenes</p>

                          {isVideo && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="h-3 w-3 text-white/60" />
                                  <span className="text-white/70 text-xs">Audio del video</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={!muteVideoAudio}
                                    onCheckedChange={(checked) => setMuteVideoAudio(!checked)}
                                    className="scale-75"
                                  />
                                </div>
                              </div>
                              {!muteVideoAudio && (
                                <Slider
                                  value={[videoVolume * 100]}
                                  min={0}
                                  max={100}
                                  step={1}
                                  onValueChange={([value]) => setVideoVolume(value / 100)}
                                  className="w-full"
                                />
                              )}
                            </div>
                          )}

                          {musicFile && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Music className="h-3 w-3 text-primary" />
                                <span className="text-white/70 text-xs">Volumen de la música</span>
                              </div>
                              <Slider
                                value={[musicVolume * 100]}
                                min={0}
                                max={100}
                                step={1}
                                onValueChange={([value]) => setMusicVolume(value / 100)}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      )}
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

          <input
            ref={musicInputRef}
            type="file"
            accept="audio/*"
            onChange={handleMusicSelect}
            className="hidden"
          />

          {/* Hidden elements */}
          <canvas ref={canvasRef} className="hidden" />
          <audio ref={audioPreviewRef} className="hidden" />

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
