import { useState, useEffect } from 'react';
import { Store, Globe, Palette, FileText, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OrgSettings {
  marketplace_enabled: boolean;
  portfolio_enabled: boolean;
  portfolio_title: string;
  portfolio_description: string;
  portfolio_cover: string;
  portfolio_color: string;
  slug: string;
}

export default function OrgMarketplaceSection() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OrgSettings>({
    marketplace_enabled: true,
    portfolio_enabled: false,
    portfolio_title: '',
    portfolio_description: '',
    portfolio_cover: '',
    portfolio_color: '#8B5CF6',
    slug: '',
  });

  const orgId = profile?.current_organization_id;

  useEffect(() => {
    if (!orgId) return;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('marketplace_enabled, portfolio_enabled, portfolio_title, portfolio_description, portfolio_cover, portfolio_color, slug')
        .eq('id', orgId)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          marketplace_enabled: data.marketplace_enabled !== false,
          portfolio_enabled: data.portfolio_enabled === true,
          portfolio_title: data.portfolio_title || '',
          portfolio_description: data.portfolio_description || '',
          portfolio_cover: data.portfolio_cover || '',
          portfolio_color: data.portfolio_color || '#8B5CF6',
          slug: data.slug || '',
        });
      }
      setLoading(false);
    };

    fetch();
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from('organizations')
      .update({
        marketplace_enabled: settings.marketplace_enabled,
        portfolio_enabled: settings.portfolio_enabled,
        portfolio_title: settings.portfolio_title || null,
        portfolio_description: settings.portfolio_description || null,
        portfolio_cover: settings.portfolio_cover || null,
        portfolio_color: settings.portfolio_color,
      })
      .eq('id', orgId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Configuración actualizada correctamente' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const portfolioUrl = settings.slug ? `${window.location.origin}/org/${settings.slug}/talento` : '';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <Store className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Marketplace & Portafolio</h2>
          <p className="text-sm text-muted-foreground">
            Controla el acceso al marketplace y configura tu portafolio público
          </p>
        </div>
      </div>

      {/* Marketplace Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Control de Acceso al Marketplace
          </CardTitle>
          <CardDescription>
            Activa o desactiva el marketplace para los miembros de tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Marketplace habilitado</Label>
              <p className="text-xs text-muted-foreground">
                Cuando está desactivado, los miembros no verán el marketplace en el sidebar ni podrán acceder a sus rutas
              </p>
            </div>
            <Switch
              checked={settings.marketplace_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, marketplace_enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Public Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Portafolio Público
          </CardTitle>
          <CardDescription>
            Muestra el talento de tu organización en una página pública accesible para cualquier persona
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Portafolio público habilitado</Label>
              <p className="text-xs text-muted-foreground">
                Activa la página pública de tu organización
              </p>
            </div>
            <Switch
              checked={settings.portfolio_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, portfolio_enabled: checked }))}
            />
          </div>

          {settings.portfolio_enabled && (
            <>
              {/* Public URL */}
              {portfolioUrl && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <Label className="text-xs text-muted-foreground mb-1 block">URL Pública</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-primary font-mono flex-1 truncate">{portfolioUrl}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(portfolioUrl);
                        toast({ title: 'Copiado', description: 'URL copiada al portapapeles' });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Título del portafolio
                </Label>
                <Input
                  placeholder="Ej: Nuestro equipo de creadores"
                  value={settings.portfolio_title}
                  onChange={(e) => setSettings(prev => ({ ...prev, portfolio_title: e.target.value }))}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Describe brevemente el talento de tu organización..."
                  value={settings.portfolio_description}
                  onChange={(e) => setSettings(prev => ({ ...prev, portfolio_description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                />
              </div>

              {/* Cover URL */}
              <div className="space-y-2">
                <Label>URL de imagen de portada</Label>
                <Input
                  placeholder="https://..."
                  value={settings.portfolio_cover}
                  onChange={(e) => setSettings(prev => ({ ...prev, portfolio_cover: e.target.value }))}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  Color principal
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.portfolio_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, portfolio_color: e.target.value }))}
                    className="h-10 w-14 rounded-md border cursor-pointer"
                  />
                  <Input
                    value={settings.portfolio_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, portfolio_color: e.target.value }))}
                    className="w-32 font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
