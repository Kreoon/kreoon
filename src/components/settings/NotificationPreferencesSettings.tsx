import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bell, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface OrgPreference {
  id: string;
  organization_id: string;
  event_type: string;
  channel_email: boolean;
  channel_in_app: boolean;
  channel_push: boolean;
}

interface UserSetting {
  id: string;
  user_id: string;
  event_type: string;
  channel_email: boolean | null;
  channel_in_app: boolean | null;
  channel_push: boolean | null;
}

const EVENT_TYPES = [
  { key: 'content_status_change', label: 'Cambio de estado de contenido', description: 'Cuando un contenido cambia de estado' },
  { key: 'content_assigned', label: 'Asignación de contenido', description: 'Cuando te asignan un contenido' },
  { key: 'comment_mention', label: 'Mención en comentario', description: 'Cuando alguien te menciona' },
  { key: 'deadline_reminder', label: 'Recordatorio de fecha límite', description: 'Alertas antes de fechas límite' },
  { key: 'script_approved', label: 'Guión aprobado', description: 'Cuando se aprueba un guión' },
  { key: 'video_uploaded', label: 'Video subido', description: 'Cuando se sube un video' },
];

export function NotificationPreferencesSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orgPreferences, setOrgPreferences] = useState<OrgPreference[]>([]);
  const [userSettings, setUserSettings] = useState<UserSetting[]>([]);

  const orgId = profile?.current_organization_id;

  useEffect(() => {
    if (orgId && user?.id) {
      fetchData();
    }
  }, [orgId, user?.id]);

  const fetchData = async () => {
    if (!orgId || !user?.id) return;
    setLoading(true);
    try {
      const { data: orgData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', orgId);

      if (orgData && orgData.length > 0) {
        setOrgPreferences(orgData);
      } else {
        const defaults = EVENT_TYPES.map(e => ({
          organization_id: orgId,
          event_type: e.key,
          channel_email: false,
          channel_in_app: true,
          channel_push: true,
        }));
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert(defaults)
          .select();
        setOrgPreferences(newPrefs || []);
      }

      const { data: userData } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id);
      setUserSettings(userData || []);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrgPreference = async (eventType: string, field: 'channel_email' | 'channel_in_app' | 'channel_push', value: boolean) => {
    const pref = orgPreferences.find(p => p.event_type === eventType);
    if (!pref) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', pref.id);

      if (error) throw error;
      setOrgPreferences(prefs => 
        prefs.map(p => p.id === pref.id ? { ...p, [field]: value } : p)
      );
      toast({ title: 'Preferencia actualizada' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferencias de Notificación
          </CardTitle>
          <CardDescription>
            Configura qué notificaciones recibir y por qué canal. Kiro respeta estas reglas al mostrarte alertas.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos de Notificación</CardTitle>
          <CardDescription>
            Configura qué eventos generan notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {EVENT_TYPES.map(event => {
            const pref = orgPreferences.find(p => p.event_type === event.key);
            return (
              <div key={event.key} className="border rounded-sm p-4 space-y-4">
                <div>
                  <Label className="text-base">{event.label}</Label>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <div className="flex gap-6 pl-4 border-l-2 border-muted">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pref?.channel_in_app ?? true}
                      onCheckedChange={(v) => updateOrgPreference(event.key, 'channel_in_app', v)}
                    />
                    <Label className="text-sm">In-app</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pref?.channel_push ?? true}
                      onCheckedChange={(v) => updateOrgPreference(event.key, 'channel_push', v)}
                    />
                    <Label className="text-sm">Push</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pref?.channel_email ?? false}
                      onCheckedChange={(v) => updateOrgPreference(event.key, 'channel_email', v)}
                    />
                    <Label className="text-sm">Email</Label>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
