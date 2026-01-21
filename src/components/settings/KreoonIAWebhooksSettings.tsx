import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Webhook, Users, Video, Target, PenTool, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';

interface WebhookSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

const WEBHOOK_CONFIG = [
  { 
    key: 'kreoon_ia_webhook_script', 
    label: 'Guión Creador',
    description: 'Genera el guión principal para el creador de contenido',
    icon: Video,
    color: 'text-purple-500'
  },
  { 
    key: 'kreoon_ia_webhook_editor', 
    label: 'Pautas Editor',
    description: 'Genera las pautas de edición de video',
    icon: PenTool,
    color: 'text-blue-500'
  },
  { 
    key: 'kreoon_ia_webhook_trafficker', 
    label: 'Pautas Trafficker',
    description: 'Genera las pautas para campañas de pauta',
    icon: Target,
    color: 'text-green-500'
  },
  { 
    key: 'kreoon_ia_webhook_strategist', 
    label: 'Pautas Estratega',
    description: 'Genera las pautas estratégicas del contenido',
    icon: Users,
    color: 'text-orange-500'
  },
  { 
    key: 'kreoon_ia_webhook_designer', 
    label: 'Pautas Diseñador',
    description: 'Genera las pautas de diseño gráfico',
    icon: PenTool,
    color: 'text-pink-500'
  },
  { 
    key: 'kreoon_ia_webhook_admin', 
    label: 'Pautas Admin/PM',
    description: 'Genera las pautas administrativas y de gestión',
    icon: ClipboardList,
    color: 'text-gray-500'
  },
];

export function KreoonIAWebhooksSettings() {
  const [settings, setSettings] = useState<WebhookSetting[]>([]);
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
        .in('key', WEBHOOK_CONFIG.map(w => w.key))
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
      console.error('Error fetching webhook settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las configuraciones de webhooks',
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
          value: editedValues[key] || '',
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      toast({
        title: 'Guardado',
        description: 'Webhook actualizado correctamente'
      });

      fetchSettings();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el webhook',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving('all');
    try {
      for (const config of WEBHOOK_CONFIG) {
        const value = editedValues[config.key] || '';
        await supabase
          .from('app_settings')
          .update({ 
            value,
            updated_at: new Date().toISOString()
          })
          .eq('key', config.key);
      }

      toast({
        title: 'Guardado',
        description: 'Todos los webhooks actualizados correctamente'
      });

      fetchSettings();
    } catch (error) {
      console.error('Error saving all webhooks:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar algunos webhooks',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const getConfiguredCount = () => {
    return WEBHOOK_CONFIG.filter(config => {
      const setting = settings.find(s => s.key === config.key);
      return setting?.value && setting.value.trim() !== '';
    }).length;
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Webhooks KREOON IA</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configura las URLs de los webhooks de n8n para el generador de guiones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getConfiguredCount() === 6 ? "default" : "secondary"}>
            {getConfiguredCount()}/6 configurados
          </Badge>
          <Button
            onClick={handleSaveAll}
            disabled={saving === 'all'}
            size="sm"
            className="gap-2"
          >
            {saving === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar todos
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {WEBHOOK_CONFIG.map((config) => {
          const Icon = config.icon;
          const setting = settings.find(s => s.key === config.key);
          const hasChanges = (editedValues[config.key] || '') !== (setting?.value || '');
          const isConfigured = setting?.value && setting.value.trim() !== '';

          return (
            <Card key={config.key} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </div>
                  {isConfigured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={config.key} className="sr-only">
                      URL del Webhook
                    </Label>
                    <Input
                      id={config.key}
                      value={editedValues[config.key] || ''}
                      onChange={(e) => setEditedValues(prev => ({
                        ...prev,
                        [config.key]: e.target.value
                      }))}
                      placeholder="https://n8n.tudominio.com/webhook/..."
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    onClick={() => handleSave(config.key)}
                    disabled={!hasChanges || saving === config.key}
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {saving === config.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Los webhooks deben devolver un JSON con el formato{' '}
            <code className="bg-background px-1 py-0.5 rounded text-xs">
              {`{ "bloques_html": { "guion": "...", "pautas_editor": "...", ... } }`}
            </code>
            {' '}compatible con el generador de scripts de proyectos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
