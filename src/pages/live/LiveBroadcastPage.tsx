/**
 * LiveBroadcastPage - Panel de control del creador durante una transmisión en vivo
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useWebcamStream } from '@/hooks/useWebcamStream';
import { useAuth } from '@/hooks/useAuth';
import { LiveChat, LiveBadge, GoLiveModal } from '@/components/live-streaming';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  Heart,
  MessageCircle,
  Clock,
  RefreshCw,
  StopCircle,
  Share2,
  Settings,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LiveBroadcastPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);

  const {
    status,
    streamId,
    streamInfo,
    viewers,
    likes,
    comments,
    duration,
    endLive,
    updateStreamInfo,
  } = useLiveStream();

  const {
    videoRef,
    videoEnabled,
    audioEnabled,
    audioLevel,
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    toggleVideo,
    toggleAudio,
    switchCamera,
    switchMicrophone,
  } = useWebcamStream();

  // Redirigir si no hay stream activo
  useEffect(() => {
    if (status === 'idle' && !streamId) {
      setShowGoLiveModal(true);
    }
  }, [status, streamId]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndLive = async () => {
    const result = await endLive();
    if (result) {
      navigate('/live');
    }
  };

  const handleShare = async () => {
    if (!streamInfo?.creator?.slug) return;

    const url = `${window.location.origin}/live/${streamInfo.creator.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: streamInfo.title || 'En Vivo',
          text: 'Estoy transmitiendo en vivo en KREOON',
          url,
        });
      } catch {
        // Cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Inicia sesión para transmitir</h1>
          <Button onClick={() => navigate('/auth')}>Iniciar sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Panel de Transmisión | KREOON</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Main - Video preview */}
            <div className="lg:col-span-2 space-y-4">
              {/* Video */}
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                      'w-full h-full object-cover',
                      !videoEnabled && 'hidden'
                    )}
                  />

                  {!videoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <VideoOff className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Status overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    {status === 'live' ? (
                      <LiveBadge size="lg" />
                    ) : status === 'connecting' ? (
                      <span className="bg-yellow-600 text-white px-3 py-1 rounded font-medium flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Conectando...
                      </span>
                    ) : (
                      <span className="bg-gray-600 text-white px-3 py-1 rounded font-medium">
                        Vista previa
                      </span>
                    )}
                    {status === 'live' && (
                      <span className="bg-black/60 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(duration)}
                      </span>
                    )}
                  </div>

                  {/* Stats overlay */}
                  {status === 'live' && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <span className="bg-black/60 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {viewers}
                      </span>
                      <span className="bg-black/60 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {likes}
                      </span>
                    </div>
                  )}

                  {/* Audio level */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                    {audioEnabled ? (
                      <Mic className="h-4 w-4 text-white" />
                    ) : (
                      <MicOff className="h-4 w-4 text-red-500" />
                    )}
                    <div className="w-20 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-75"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={videoEnabled ? 'outline' : 'destructive'}
                        size="icon"
                        onClick={toggleVideo}
                      >
                        {videoEnabled ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <VideoOff className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant={audioEnabled ? 'outline' : 'destructive'}
                        size="icon"
                        onClick={toggleAudio}
                      >
                        {audioEnabled ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const nextCamera = cameras.find(
                            (c) => c.deviceId !== selectedCamera
                          );
                          if (nextCamera) switchCamera(nextCamera.deviceId);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowSettings(true)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'live' && (
                        <Button variant="outline" onClick={handleShare}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Compartir
                        </Button>
                      )}

                      {status === 'live' ? (
                        <Button
                          variant="destructive"
                          onClick={() => setShowEndDialog(true)}
                        >
                          <StopCircle className="h-4 w-4 mr-2" />
                          Terminar
                        </Button>
                      ) : (
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => setShowGoLiveModal(true)}
                        >
                          Ir en Vivo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick stats */}
              {status === 'live' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{viewers}</p>
                      <p className="text-xs text-muted-foreground">Espectadores</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold">{likes}</p>
                      <p className="text-xs text-muted-foreground">Me gusta</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MessageCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{comments}</p>
                      <p className="text-xs text-muted-foreground">Comentarios</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Stream info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Información del stream</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Título</Label>
                    <p className="font-medium truncate">
                      {streamInfo?.title || 'Sin título'}
                    </p>
                  </div>
                  {streamInfo?.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {streamInfo.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat placeholder */}
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    El chat aparecerá aquí cuando estés en vivo
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Go Live Modal */}
      <GoLiveModal
        open={showGoLiveModal}
        onOpenChange={setShowGoLiveModal}
        onLiveStarted={() => setShowGoLiveModal(false)}
      />

      {/* End stream dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Terminar transmisión?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu transmisión finalizará y todos los espectadores serán desconectados.
              Duración total: {formatDuration(duration)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndLive} className="bg-red-600 hover:bg-red-700">
              Terminar transmisión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
