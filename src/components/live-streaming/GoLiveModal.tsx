/**
 * GoLiveModal - Modal para iniciar una transmisión en vivo
 * Preview de cámara, configuración y botón para ir en vivo
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
  Radio,
  Settings,
  ShoppingBag,
  Camera,
  RefreshCw,
  Copy,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import { useWebcamStream } from '@/hooks/useWebcamStream';
import { useLiveStream } from '@/hooks/useLiveStream';
import { LIVE_CATEGORIES, type GoLiveFormState } from '@/types/live-streaming.types';
import { cn } from '@/lib/utils';

interface GoLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLiveStarted?: () => void;
}

export function GoLiveModal({ open, onOpenChange, onLiveStarted }: GoLiveModalProps) {
  const [step, setStep] = useState<'setup' | 'preview' | 'live' | 'rtmp'>('setup');
  const [form, setForm] = useState<GoLiveFormState>({
    title: '',
    description: '',
    category: 'talk',
    isShoppingEnabled: false,
    allowComments: true,
    allowReactions: true,
    isUnlisted: false,
  });
  const [rtmpCopied, setRtmpCopied] = useState<'url' | 'key' | null>(null);
  const [rtmpCredentials, setRtmpCredentials] = useState<{
    rtmpsUrl: string;
    streamKey: string;
    playbackUrl: string;
  } | null>(null);

  const {
    stream,
    videoRef,
    isCapturing,
    hasPermission,
    videoEnabled,
    audioEnabled,
    audioLevel,
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    startCapture,
    stopCapture,
    toggleVideo,
    toggleAudio,
    switchCamera,
    switchMicrophone,
    requestPermissions,
  } = useWebcamStream();

  const {
    status,
    prepareForLive,
    goLive,
    endLive,
    viewers,
    likes,
    duration,
  } = useLiveStream();

  // Solicitar permisos al abrir
  useEffect(() => {
    if (open && hasPermission === null) {
      requestPermissions();
    }
  }, [open, hasPermission, requestPermissions]);

  // Iniciar captura al pasar a preview
  useEffect(() => {
    if (step === 'preview' && !isCapturing) {
      startCapture();
    }
  }, [step, isCapturing, startCapture]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!open) {
      stopCapture();
      setStep('setup');
    }
  }, [open, stopCapture]);

  const handleProceedToPreview = async () => {
    if (!form.title.trim()) {
      return;
    }

    // Preparar stream en Cloudflare
    const credentials = await prepareForLive(form);
    if (credentials) {
      // Guardar credenciales RTMP por si el usuario quiere usar OBS
      if (credentials.rtmpsUrl && credentials.streamKey) {
        setRtmpCredentials({
          rtmpsUrl: credentials.rtmpsUrl,
          streamKey: credentials.streamKey,
          playbackUrl: credentials.playbackUrl || '',
        });
      }
      setStep('preview');
    }
  };

  const handleShowRTMP = async () => {
    if (!form.title.trim()) {
      return;
    }

    // Si ya tenemos credenciales, ir directo a RTMP
    if (rtmpCredentials) {
      setStep('rtmp');
      return;
    }

    // Preparar stream para obtener credenciales RTMP
    const credentials = await prepareForLive(form);
    if (credentials?.rtmpsUrl && credentials?.streamKey) {
      setRtmpCredentials({
        rtmpsUrl: credentials.rtmpsUrl,
        streamKey: credentials.streamKey,
        playbackUrl: credentials.playbackUrl || '',
      });
      setStep('rtmp');
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'key') => {
    await navigator.clipboard.writeText(text);
    setRtmpCopied(type);
    setTimeout(() => setRtmpCopied(null), 2000);
  };

  const handleGoLive = async () => {
    if (!stream) {
      await startCapture();
      return;
    }

    const success = await goLive(stream);
    if (success) {
      setStep('live');
      onLiveStarted?.();
    }
  };

  const handleEndLive = async () => {
    await endLive();
    onOpenChange(false);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        {step === 'setup' && (
          <>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-red-500" />
                Iniciar Transmisión en Vivo
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="¿De qué vas a hablar hoy?"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Cuéntale a tu audiencia de qué se trata..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIVE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="shopping" className="cursor-pointer">
                    Habilitar Live Shopping
                  </Label>
                </div>
                <Switch
                  id="shopping"
                  checked={form.isShoppingEnabled}
                  onCheckedChange={(v) => setForm({ ...form, isShoppingEnabled: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="comments" className="cursor-pointer">
                  Permitir comentarios
                </Label>
                <Switch
                  id="comments"
                  checked={form.allowComments}
                  onCheckedChange={(v) => setForm({ ...form, allowComments: v })}
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleProceedToPreview}
                  className="w-full"
                  disabled={!form.title.trim() || status === 'connecting'}
                >
                  {status === 'connecting' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparando...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Usar Cámara Web
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleShowRTMP}
                  variant="outline"
                  className="w-full"
                  disabled={!form.title.trim() || status === 'connecting'}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Usar OBS / Software Externo
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
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

              {/* Audio level indicator */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
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

            <div className="p-4 space-y-4">
              {/* Device selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Cámara</Label>
                  <Select value={selectedCamera || ''} onValueChange={switchCamera}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar cámara" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map((cam) => (
                        <SelectItem key={cam.deviceId} value={cam.deviceId}>
                          {cam.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Micrófono</Label>
                  <Select value={selectedMic || ''} onValueChange={switchMicrophone}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar micrófono" />
                    </SelectTrigger>
                    <SelectContent>
                      {microphones.map((mic) => (
                        <SelectItem key={mic.deviceId} value={mic.deviceId}>
                          {mic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
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

                <Button variant="outline" size="icon" onClick={() => setStep('setup')}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              {/* Go Live button */}
              <Button
                onClick={handleGoLive}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={status === 'connecting'}
                size="lg"
              >
                {status === 'connecting' ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Radio className="h-5 w-5 mr-2" />
                    Ir en Vivo
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'live' && (
          <>
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

              {/* Live badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-red-600 text-white px-2 py-1 rounded text-sm font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  EN VIVO
                </span>
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {formatDuration(duration)}
                </span>
              </div>

              {/* Stats */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                  👁 {viewers}
                </span>
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                  ❤️ {likes}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
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
                    const nextCamera = cameras.find((c) => c.deviceId !== selectedCamera);
                    if (nextCamera) switchCamera(nextCamera.deviceId);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* End Live button */}
              <Button
                onClick={handleEndLive}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                Terminar Transmisión
              </Button>
            </div>
          </>
        )}

        {step === 'rtmp' && rtmpCredentials && (
          <>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-500" />
                Transmitir con OBS / Software Externo
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Copia estos datos en tu software de streaming (OBS, Streamlabs, etc.)
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Servidor RTMPS</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                      {rtmpCredentials.rtmpsUrl}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(rtmpCredentials.rtmpsUrl, 'url')}
                    >
                      {rtmpCopied === 'url' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Clave de transmisión</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-xs break-all font-mono">
                      {rtmpCredentials.streamKey}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(rtmpCredentials.streamKey, 'key')}
                    >
                      {rtmpCopied === 'key' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-sm p-4">
                <h4 className="font-medium text-sm mb-2">Configuración en OBS:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Ve a <strong>Configuración → Emisión</strong></li>
                  <li>Servicio: <strong>Personalizado</strong></li>
                  <li>Pega el servidor y la clave</li>
                  <li>Haz clic en <strong>Iniciar transmisión</strong></li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                  Volver
                </Button>
                <Button
                  onClick={() => {
                    // Marcar como "esperando conexión RTMP"
                    onLiveStarted?.();
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  <Radio className="h-4 w-4 mr-2" />
                  Listo, voy a OBS
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
