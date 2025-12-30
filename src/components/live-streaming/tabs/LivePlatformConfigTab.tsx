import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, Shield, DollarSign, Clock, Users, 
  Radio, ShoppingCart, MessageSquare, Save, Eye, EyeOff,
  Package, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlatformConfig {
  id: string;
  restream_client_id: string | null;
  restream_client_secret_encrypted: string | null;
  restream_scopes: string[];
  default_price_per_hour: number;
  default_currency: string;
  hour_packages: Array<{ hours: number; price: number; name: string }>;
  chat_enabled: boolean;
  multi_creator_enabled: boolean;
  srt_streaming_enabled: boolean;
  live_shopping_enabled: boolean;
  max_hours_per_event: number;
  max_simultaneous_events_per_org: number;
}

const DEFAULT_SCOPES = [
  'profile.read',
  'channel.read', 
  'channel.write',
  'stream.read',
  'chat.read'
];

export function LivePlatformConfigTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState<PlatformConfig | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('live_platform_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig({
          ...data,
          restream_scopes: data.restream_scopes || DEFAULT_SCOPES,
          hour_packages: data.hour_packages || []
        });
      }
    } catch (error) {
      console.error('Error fetching platform config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('live_platform_config')
        .update({
          restream_client_id: config.restream_client_id,
          restream_client_secret_encrypted: config.restream_client_secret_encrypted,
          restream_scopes: config.restream_scopes,
          default_price_per_hour: config.default_price_per_hour,
          default_currency: config.default_currency,
          hour_packages: config.hour_packages,
          chat_enabled: config.chat_enabled,
          multi_creator_enabled: config.multi_creator_enabled,
          srt_streaming_enabled: config.srt_streaming_enabled,
          live_shopping_enabled: config.live_shopping_enabled,
          max_hours_per_event: config.max_hours_per_event,
          max_simultaneous_events_per_org: config.max_simultaneous_events_per_org,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({ title: 'Configuración guardada', description: 'Los cambios se aplicarán a todas las organizaciones.' });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<PlatformConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  const updatePackage = (index: number, updates: Partial<{ hours: number; price: number; name: string }>) => {
    if (!config) return;
    const newPackages = [...config.hour_packages];
    newPackages[index] = { ...newPackages[index], ...updates };
    updateConfig({ hour_packages: newPackages });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!config) {
    return <div className="text-center p-8 text-muted-foreground">No se encontró configuración de plataforma</div>;
  }

  return (
    <div className="space-y-6">
      {/* Restream API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Configuración de Restream API
          </CardTitle>
          <CardDescription>
            Credenciales OAuth de la aplicación Restream. Estas credenciales son globales y nunca se exponen a clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={config.restream_client_id || ''}
                onChange={(e) => updateConfig({ restream_client_id: e.target.value })}
                placeholder="Tu Restream Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="client_secret"
                  type={showSecret ? 'text' : 'password'}
                  value={config.restream_client_secret_encrypted || ''}
                  onChange={(e) => updateConfig({ restream_client_secret_encrypted: e.target.value })}
                  placeholder="Tu Restream Client Secret"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>OAuth Scopes</Label>
            <div className="flex flex-wrap gap-2">
              {config.restream_scopes.map((scope) => (
                <Badge key={scope} variant="secondary">{scope}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Estos scopes definen los permisos que KREOON solicita a Restream.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Configuración de Precios
          </CardTitle>
          <CardDescription>
            Define los paquetes de horas que se venden a las organizaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price_per_hour">Precio por Hora (USD)</Label>
              <Input
                id="price_per_hour"
                type="number"
                value={config.default_price_per_hour}
                onChange={(e) => updateConfig({ default_price_per_hour: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda por Defecto</Label>
              <Input
                id="currency"
                value={config.default_currency}
                onChange={(e) => updateConfig({ default_currency: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Paquetes de Horas
            </Label>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {config.hour_packages.map((pkg, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <Input
                      value={pkg.name}
                      onChange={(e) => updatePackage(index, { name: e.target.value })}
                      placeholder="Nombre del paquete"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Horas</Label>
                        <Input
                          type="number"
                          value={pkg.hours}
                          onChange={(e) => updatePackage(index, { hours: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Precio</Label>
                        <Input
                          type="number"
                          value={pkg.price}
                          onChange={(e) => updatePackage(index, { price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Feature Flags
          </CardTitle>
          <CardDescription>
            Activa o desactiva funcionalidades globales de la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Chat en Vivo</p>
                  <p className="text-sm text-muted-foreground">Permite chat durante transmisiones</p>
                </div>
              </div>
              <Switch
                checked={config.chat_enabled}
                onCheckedChange={(checked) => updateConfig({ chat_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Multi-Creador</p>
                  <p className="text-sm text-muted-foreground">Múltiples creadores por evento</p>
                </div>
              </div>
              <Switch
                checked={config.multi_creator_enabled}
                onCheckedChange={(checked) => updateConfig({ multi_creator_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Live Shopping</p>
                  <p className="text-sm text-muted-foreground">Venta de productos durante transmisión</p>
                </div>
              </div>
              <Switch
                checked={config.live_shopping_enabled}
                onCheckedChange={(checked) => updateConfig({ live_shopping_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">SRT Streaming</p>
                  <p className="text-sm text-muted-foreground">Streaming de baja latencia (futuro)</p>
                </div>
              </div>
              <Switch
                checked={config.srt_streaming_enabled}
                onCheckedChange={(checked) => updateConfig({ srt_streaming_enabled: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Límites y Restricciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_hours">Máximo de Horas por Evento</Label>
              <Input
                id="max_hours"
                type="number"
                value={config.max_hours_per_event}
                onChange={(e) => updateConfig({ max_hours_per_event: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_simultaneous">Máximo de Eventos Simultáneos por Org</Label>
              <Input
                id="max_simultaneous"
                type="number"
                value={config.max_simultaneous_events_per_org}
                onChange={(e) => updateConfig({ max_simultaneous_events_per_org: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}
