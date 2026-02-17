import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Smartphone, Volume2, VolumeX, Clock, BellRing, Vibrate, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationPreferences {
  // Push notifications
  pushEnabled: boolean;
  pushContent: boolean;
  pushAssignments: boolean;
  pushPayments: boolean;
  pushComments: boolean;
  pushMentions: boolean;
  
  // Email notifications
  emailEnabled: boolean;
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never';
  emailContent: boolean;
  emailAssignments: boolean;
  emailPayments: boolean;
  
  // In-app notifications
  inAppEnabled: boolean;
  inAppSound: boolean;
  inAppVibration: boolean;
  soundVolume: number;
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Notification grouping
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

export function NotificationSettings() {
  const { toast } = useToast();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from localStorage on mount
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
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias de notificaciones se han actualizado.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPushPermission = async () => {
    // Check if permission was previously denied
    if (permission === 'denied') {
      toast({
        title: "Permiso bloqueado",
        description: "Las notificaciones fueron bloqueadas previamente. Para habilitarlas: 1) Haz clic en el icono de candado en la barra de direcciones, 2) Busca 'Notificaciones' y cambia a 'Permitir', 3) Recarga la página.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    try {
      const granted = await requestPermission();
      if (granted) {
        updatePreference('pushEnabled', true);
        toast({
          title: "Notificaciones push activadas",
          description: "Recibirás notificaciones en este dispositivo.",
        });
      } else {
        // User clicked "Block" or closed the prompt
        toast({
          title: "Permiso no concedido",
          description: "Si rechazaste el permiso, puedes habilitarlo desde el icono de candado en la barra de direcciones → Notificaciones → Permitir.",
          variant: "destructive",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error al solicitar permisos",
        description: "Ocurrió un error. Intenta recargar la página o verifica que estés en una conexión segura (HTTPS).",
        variant: "destructive",
      });
    }
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('Notificación de prueba', {
        body: 'Esta es una notificación de prueba para verificar que todo funciona correctamente.',
        icon: '/pwa-192x192.png',
      });
    } else {
      toast({
        title: "Notificación de prueba",
        description: "Esta es una notificación de prueba.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones Push
          </CardTitle>
          <CardDescription>
            Recibe notificaciones en tiempo real en tu dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSupported ? (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-muted-foreground">
                Tu navegador no soporta notificaciones push
              </p>
            </div>
          ) : permission === 'denied' ? (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center space-y-3">
              <BellRing className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm font-medium text-destructive">
                Las notificaciones están bloqueadas
              </p>
              <p className="text-sm text-muted-foreground">
                Para habilitarlas, haz clic en el icono de candado 🔒 en la barra de direcciones del navegador, busca "Notificaciones" y cámbialo a "Permitir".
              </p>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Recargar página después de permitir
              </Button>
            </div>
          ) : permission !== 'granted' ? (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center space-y-3">
              <BellRing className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Habilita las notificaciones push para recibir alertas en tiempo real
              </p>
              <Button onClick={handleRequestPushPermission} variant="default">
                Habilitar notificaciones
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones push habilitadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Activa o desactiva todas las notificaciones push
                  </p>
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
                  <Button variant="outline" onClick={testNotification}>
                    Enviar notificación de prueba
                  </Button>
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
          <CardDescription>
            Recibe resúmenes y alertas importantes en tu correo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por email</Label>
              <p className="text-sm text-muted-foreground">
                Recibe notificaciones en tu correo electrónico
              </p>
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

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notificaciones In-App
          </CardTitle>
          <CardDescription>
            Configura sonidos, vibraciones y comportamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones in-app</Label>
              <p className="text-sm text-muted-foreground">
                Muestra notificaciones dentro de la aplicación
              </p>
            </div>
            <Switch
              checked={preferences.inAppEnabled}
              onCheckedChange={(checked) => updatePreference('inAppEnabled', checked)}
            />
          </div>

          {preferences.inAppEnabled && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {preferences.inAppSound ? (
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label>Sonido de notificación</Label>
                  </div>
                  <Switch
                    checked={preferences.inAppSound}
                    onCheckedChange={(checked) => updatePreference('inAppSound', checked)}
                  />
                </div>

                {preferences.inAppSound && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Volumen: {preferences.soundVolume}%
                    </Label>
                    <Slider
                      value={[preferences.soundVolume]}
                      onValueChange={([value]) => updatePreference('soundVolume', value)}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vibrate className="h-4 w-4 text-muted-foreground" />
                    <Label>Vibración</Label>
                  </div>
                  <Switch
                    checked={preferences.inAppVibration}
                    onCheckedChange={(checked) => updatePreference('inAppVibration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label>Agrupar notificaciones</Label>
                  </div>
                  <Switch
                    checked={preferences.groupNotifications}
                    onCheckedChange={(checked) => updatePreference('groupNotifications', checked)}
                  />
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
          <CardDescription>
            Pausa las notificaciones durante horarios específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar horas de silencio</Label>
              <p className="text-sm text-muted-foreground">
                No recibirás notificaciones durante este horario
              </p>
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
                  <Select
                    value={preferences.quietHoursStart}
                    onValueChange={(value) => updatePreference('quietHoursStart', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0') + ':00';
                        return (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hora de fin</Label>
                  <Select
                    value={preferences.quietHoursEnd}
                    onValueChange={(value) => updatePreference('quietHoursEnd', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0') + ':00';
                        return (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Las notificaciones se pausarán de {preferences.quietHoursStart} a {preferences.quietHoursEnd}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar preferencias"}
        </Button>
      </div>
    </div>
  );
}
