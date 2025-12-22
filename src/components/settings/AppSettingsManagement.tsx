import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Save, Loader2 } from 'lucide-react';

interface AppSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export function AppSettingsManagement() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      setSettings(data || []);
      
      // Initialize edited values
      const values: Record<string, string> = {};
      data?.forEach(s => {
        values[s.key] = s.value;
      });
      setEditedValues(values);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las configuraciones',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: editedValues[key],
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      toast({
        title: 'Guardado',
        description: 'La configuración se actualizó correctamente'
      });

      fetchSettings();
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const getSettingIcon = (key: string) => {
    if (key.includes('whatsapp')) return MessageCircle;
    return MessageCircle;
  };

  const getSettingLabel = (key: string) => {
    const labels: Record<string, string> = {
      'whatsapp_access_request': 'WhatsApp para Solicitudes de Acceso'
    };
    return labels[key] || key;
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
      <div>
        <h2 className="text-lg font-semibold">Configuración General</h2>
        <p className="text-sm text-muted-foreground">
          Administra las configuraciones generales de la plataforma
        </p>
      </div>

      <div className="space-y-4">
        {settings.map((setting) => {
          const Icon = getSettingIcon(setting.key);
          const hasChanges = editedValues[setting.key] !== setting.value;

          return (
            <Card key={setting.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{getSettingLabel(setting.key)}</CardTitle>
                </div>
                {setting.description && (
                  <CardDescription>{setting.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor={setting.key} className="sr-only">
                      {getSettingLabel(setting.key)}
                    </Label>
                    <Input
                      id={setting.key}
                      value={editedValues[setting.key] || ''}
                      onChange={(e) => setEditedValues(prev => ({
                        ...prev,
                        [setting.key]: e.target.value
                      }))}
                      placeholder="Ingresa el valor"
                    />
                  </div>
                  <Button
                    onClick={() => handleSave(setting.key)}
                    disabled={!hasChanges || saving === setting.key}
                    size="sm"
                    className="gap-2"
                  >
                    {saving === setting.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar
                  </Button>
                </div>
                {setting.key === 'whatsapp_access_request' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Formato: código de país + número (ej: 573113842399)
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {settings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay configuraciones disponibles
          </div>
        )}
      </div>
    </div>
  );
}
