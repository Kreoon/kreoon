import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, Mail, Volume2, VolumeX, Clock, BellRing, Vibrate, Globe,
  Mic, MicOff, Sparkles, Eye, EyeOff, BellOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useKiro } from "@/contexts/KiroContext";
import { kiroSounds } from "@/components/kiro/sounds/KiroSounds";

interface NotificationPreferences {
  pushEnabled: boolean;
  pushContent: boolean;
  pushAssignments: boolean;
  pushPayments: boolean;
  pushComments: boolean;
  pushMentions: boolean;
  emailEnabled: boolean;
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never';
  emailContent: boolean;
  emailAssignments: boolean;
  emailPayments: boolean;
  inAppEnabled: boolean;
  inAppSound: boolean;
  inAppVibration: boolean;
  soundVolume: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  groupNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  pushContent: true,
  pushAssignments: true,
  pushPayments: true,
  pushComments: true,
  pushMentions: true,
  emailEnabled: true,
  emailDigest: 'instant',
  emailContent: true,
  emailAssignments: true,
  emailPayments: true,
  inAppEnabled: true,
  inAppSound: true,
  inAppVibration: true,
  soundVolume: 70,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  groupNotifications: true,
};

export function KiroNotificationSettingsTab() {
  const { toast } = useToast();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const { kiroSettings, updateKiroSettings, kiroVoice } = useKiro();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      try {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error loading notification preferences:', e);
      }
    }
  }, []);

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('notificationPreferences', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRequestPushPermission = async () => {
    if (permission === 'denied') {
      toast({
        title: "Permiso bloqueado",
        description: "Las notificaciones fueron bloqueadas previamente. Haz clic en el icono de candado en la barra de direcciones, busca 'Notificaciones' y cambia a 'Permitir'.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }
    try {
      const granted = await requestPermission();
      if (granted) {
        updatePreference('pushEnabled', true);
        toast({ title: "Notificaciones push activadas", description: "Recibirás notificaciones en este dispositivo." });
      } else {
        toast({
          title: "Permiso no concedido",
          description: "Puedes habilitarlo desde el icono de candado en la barra de direcciones.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error al solicitar permisos", variant: "destructive" });
    }
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('Notificación de prueba', {
        body: 'Kiro te enviará notificaciones como esta.',
        icon: '/pwa-192x192.png',
      });
    } else {
      toast({ title: "Notificación de prueba", description: "Kiro te notifica cuando algo importante sucede." });
    }
  };

  const handleTestSound = () => {
    kiroSounds.play('notification');
  };

  const handleTestVoice = () => {
    if (kiroVoice?.speak) {
      kiroVoice.speak('Hola, soy Kiro, tu asistente de notificaciones', 'happy');
    }
  };

  return (
    <div className="space-y-6">
      {/* Kiro Sound & Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sonidos y Voz de Kiro
          </CardTitle>
          <CardDescription>
            Configura cómo Kiro te alerta con sonidos y voz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {kiroSettings.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label>Sonidos de Kiro</Label>
                <p className="text-xs text-muted-foreground">Efectos de sonido al recibir notificaciones</p>
              </div>
            </div>
            <Switch
              checked={kiroSettings.soundEnabled}
              onCheckedChange={(checked) => {
                updateKiroSettings({ soundEnabled: checked });
                kiroSounds.setEnabled(checked);
              }}
            />
          </div>

          {kiroSettings.soundEnabled && (
            <div className="space-y-2 pl-6">
              <Label className="text-sm text-muted-foreground">
                Volumen: {Math.round(kiroSettings.soundVolume * 100)}%
              </Label>
              <Slider
                value={[kiroSettings.soundVolume * 100]}
                onValueChange={([value]) => {
                  updateKiroSettings({ soundVolume: value / 100 });
                  kiroSounds.setVolume(value / 100);
                }}
                max={100}
                step={5}
                className="w-full"
              />
              <Button variant="outline" size="sm" onClick={handleTestSound}>
                Probar sonido
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {kiroSettings.voiceEnabled ? (
                <Mic className="h-4 w-4 text-muted-foreground" />
              ) : (
                <MicOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label>Voz de Kiro</Label>
                <p className="text-xs text-muted-foreground">Kiro anuncia las notificaciones con voz</p>
              </div>
            </div>
            <Switch
              checked={kiroSettings.voiceEnabled}
              onCheckedChange={(checked) => updateKiroSettings({ voiceEnabled: checked })}
            />
          </div>

          {kiroSettings.voiceEnabled && (
            <div className="space-y-2 pl-6">
              <Label className="text-sm text-muted-foreground">
                Volumen de voz: {Math.round(kiroSettings.voiceVolume * 100)}%
              </Label>
              <Slider
                value={[kiroSettings.voiceVolume * 100]}
                onValueChange={([value]) => updateKiroSettings({ voiceVolume: value / 100 })}
                max={100}
                step={5}
                className="w-full"
              />
              <Button variant="outline" size="sm" onClick={handleTestVoice}>
                Probar voz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kiro Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Comportamiento de Kiro
          </CardTitle>
          <CardDescription>
            Controla cómo Kiro muestra las alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Toasts flotantes</Label>
                <p className="text-xs text-muted-foreground">Mostrar alertas emergentes de Kiro</p>
              </div>
            </div>
            <Switch
              checked={kiroSettings.showToasts}
              onCheckedChange={(checked) => updateKiroSettings({ showToasts: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOff className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Solo urgentes</Label>
                <p className="text-xs text-muted-foreground">Mostrar solo notificaciones urgentes</p>
              </div>
            </div>
            <Switch
              checked={kiroSettings.onlyUrgentToasts}
              onCheckedChange={(checked) => updateKiroSettings({ onlyUrgentToasts: checked })}
              disabled={!kiroSettings.showToasts}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Kiro visible al iniciar</Label>
                <p className="text-xs text-muted-foreground">Mostrar a Kiro automáticamente al abrir la app</p>
              </div>
            </div>
            <Switch
              checked={kiroSettings.visibleOnStart}
              onCheckedChange={(checked) => updateKiroSettings({ visibleOnStart: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label>Vibración</Label>
                <p className="text-xs text-muted-foreground">Vibrar en dispositivos móviles</p>
              </div>
            </div>
            <Switch
              checked={preferences.inAppVibration}
              onCheckedChange={(checked) => updatePreference('inAppVibration', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones Push
          </CardTitle>
          <CardDescription>
            Kiro te envía notificaciones push en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSupported ? (
            <div className="p-4 rounded-sm bg-muted text-center">
              <p className="text-muted-foreground">Tu navegador no soporta notificaciones push</p>
            </div>
          ) : permission === 'denied' ? (
            <div className="p-4 rounded-sm bg-destructive/10 border border-destructive/20 text-center space-y-3">
              <BellRing className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm font-medium text-destructive">Las notificaciones están bloqueadas</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en el icono de candado en la barra de direcciones, busca "Notificaciones" y cámbialo a "Permitir".
              </p>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Recargar página después de permitir
              </Button>
            </div>
          ) : permission !== 'granted' ? (
            <div className="p-4 rounded-sm bg-primary/5 border border-primary/20 text-center space-y-3">
              <BellRing className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Habilita las notificaciones push para que Kiro te alerte en tiempo real</p>
              <Button onClick={handleRequestPushPermission} variant="default">Habilitar notificaciones</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones push habilitadas</Label>
                  <p className="text-sm text-muted-foreground">Activa o desactiva todas las notificaciones push</p>
                </div>
                <Switch
                  checked={preferences.pushEnabled}
                  onCheckedChange={(checked) => updatePreference('pushEnabled', checked)}
                />
              </div>

              {preferences.pushEnabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Tipos de notificaciones:</p>
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <Label>Actualizaciones de contenido</Label>
                        </div>
                        <Switch
                          checked={preferences.pushContent}
                          onCheckedChange={(checked) => updatePreference('pushContent', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <Label>Nuevas asignaciones</Label>
                        </div>
                        <Switch
                          checked={preferences.pushAssignments}
                          onCheckedChange={(checked) => updatePreference('pushAssignments', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">💰</span>
                          <Label>Pagos</Label>
                        </div>
                        <Switch
                          checked={preferences.pushPayments}
                          onCheckedChange={(checked) => updatePreference('pushPayments', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">💬</span>
                          <Label>Comentarios</Label>
                        </div>
                        <Switch
                          checked={preferences.pushComments}
                          onCheckedChange={(checked) => updatePreference('pushComments', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">@</span>
                          <Label>Menciones</Label>
                        </div>
                        <Switch
                          checked={preferences.pushMentions}
                          onCheckedChange={(checked) => updatePreference('pushMentions', checked)}
                        />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <Button variant="outline" onClick={testNotification}>Enviar notificación de prueba</Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notificaciones por Email
          </CardTitle>
          <CardDescription>Resúmenes y alertas importantes en tu correo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por email</Label>
              <p className="text-sm text-muted-foreground">Recibe notificaciones en tu correo electrónico</p>
            </div>
            <Switch
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
            />
          </div>

          {preferences.emailEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Frecuencia de resumen</Label>
                <Select
                  value={preferences.emailDigest}
                  onValueChange={(value: 'instant' | 'daily' | 'weekly' | 'never') =>
                    updatePreference('emailDigest', value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instantáneo</SelectItem>
                    <SelectItem value="daily">Resumen diario</SelectItem>
                    <SelectItem value="weekly">Resumen semanal</SelectItem>
                    <SelectItem value="never">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-4">
                <p className="text-sm font-medium">Tipos de notificaciones:</p>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Actualizaciones de contenido</Label>
                    <Switch
                      checked={preferences.emailContent}
                      onCheckedChange={(checked) => updatePreference('emailContent', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Nuevas asignaciones</Label>
                    <Switch
                      checked={preferences.emailAssignments}
                      onCheckedChange={(checked) => updatePreference('emailAssignments', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Pagos</Label>
                    <Switch
                      checked={preferences.emailPayments}
                      onCheckedChange={(checked) => updatePreference('emailPayments', checked)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horas de silencio
            <Badge variant="secondary">Opcional</Badge>
          </CardTitle>
          <CardDescription>Pausa las notificaciones de Kiro durante horarios específicos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar horas de silencio</Label>
              <p className="text-sm text-muted-foreground">Kiro no te notificará durante este horario</p>
            </div>
            <Switch
              checked={preferences.quietHoursEnabled}
              onCheckedChange={(checked) => updatePreference('quietHoursEnabled', checked)}
            />
          </div>

          {preferences.quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Select value={preferences.quietHoursStart} onValueChange={(value) => updatePreference('quietHoursStart', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0') + ':00';
                        return <SelectItem key={hour} value={hour}>{hour}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hora de fin</Label>
                  <Select value={preferences.quietHoursEnd} onValueChange={(value) => updatePreference('quietHoursEnd', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0') + ':00';
                        return <SelectItem key={hour} value={hour}>{hour}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Kiro se pausará de {preferences.quietHoursStart} a {preferences.quietHoursEnd}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
