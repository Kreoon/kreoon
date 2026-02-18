import { useState, useEffect, useRef } from 'react';
import { Image, Palette, Save, Loader2, Upload, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface BrandingSettings {
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  platform_name: string;
  pwa_icon_192_url: string;
  pwa_icon_512_url: string;
  og_image_url: string;
}

export default function WhiteLabelBrandingTab() {
  const { profile } = useAuth();
  const { capabilities } = useWhiteLabel();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BrandingSettings>({
    logo_url: '',
    logo_dark_url: '',
    favicon_url: '',
    primary_color: '#8B5CF6',
    secondary_color: '',
    platform_name: '',
    pwa_icon_192_url: '',
    pwa_icon_512_url: '',
    og_image_url: '',
  });

  const orgId = profile?.current_organization_id;

  useEffect(() => {
    if (!orgId) return;

    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('logo_url, logo_dark_url, favicon_url, primary_color, secondary_color, platform_name, pwa_icon_192_url, pwa_icon_512_url, og_image_url')
        .eq('id', orgId)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          logo_url: data.logo_url || '',
          logo_dark_url: data.logo_dark_url || '',
          favicon_url: data.favicon_url || '',
          primary_color: data.primary_color || '#8B5CF6',
          secondary_color: data.secondary_color || '',
          platform_name: data.platform_name || '',
          pwa_icon_192_url: data.pwa_icon_192_url || '',
          pwa_icon_512_url: data.pwa_icon_512_url || '',
          og_image_url: data.og_image_url || '',
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    const updates: Record<string, string | null> = {
      logo_url: settings.logo_url || null,
      primary_color: settings.primary_color || '#8B5CF6',
      platform_name: settings.platform_name || null,
    };

    // Only include fields the plan allows
    if (capabilities.customLogoDark) {
      updates.logo_dark_url = settings.logo_dark_url || null;
    }
    if (capabilities.customFavicon) {
      updates.favicon_url = settings.favicon_url || null;
    }
    if (capabilities.customSecondaryColor) {
      updates.secondary_color = settings.secondary_color || null;
    }
    if (capabilities.customPwaIcons) {
      updates.pwa_icon_192_url = settings.pwa_icon_192_url || null;
      updates.pwa_icon_512_url = settings.pwa_icon_512_url || null;
    }
    if (capabilities.customOgImage) {
      updates.og_image_url = settings.og_image_url || null;
    }

    const { error } = await (supabase as any)
      .from('organizations')
      .update(updates)
      .eq('id', orgId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Marca visual actualizada. Recarga la página para ver los cambios.' });
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

  return (
    <div className="space-y-6">
      {/* Logo Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" />
            Logo Principal
          </CardTitle>
          <CardDescription>
            Logo que se mostrará en sidebar, navegación y emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL del logo</Label>
            <Input
              placeholder="https://..."
              value={settings.logo_url}
              onChange={(e) => setSettings(prev => ({ ...prev, logo_url: e.target.value }))}
            />
          </div>

          {settings.logo_url && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
              <img
                src={settings.logo_url}
                alt="Logo preview"
                className="h-12 w-12 rounded-lg object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-sm text-muted-foreground">Vista previa</span>
            </div>
          )}

          {/* Logo Dark - Pro+ */}
          {capabilities.customLogoDark ? (
            <div className="space-y-2">
              <Label>URL del logo (modo oscuro)</Label>
              <Input
                placeholder="https://..."
                value={settings.logo_dark_url}
                onChange={(e) => setSettings(prev => ({ ...prev, logo_dark_url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Logo alternativo para fondos oscuros.
              </p>
            </div>
          ) : (
            <LockedField label="Logo modo oscuro" plan="Growth" />
          )}
        </CardContent>
      </Card>

      {/* Nombre de Plataforma */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nombre de Plataforma</CardTitle>
          <CardDescription>
            {capabilities.replaceKreoonBranding
              ? 'Reemplaza "KREOON" en toda la interfaz'
              : 'Nombre personalizado (visible en plan Growth o superior)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Mi Plataforma"
              value={settings.platform_name}
              onChange={(e) => setSettings(prev => ({ ...prev, platform_name: e.target.value }))}
              maxLength={40}
            />
            {!capabilities.replaceKreoonBranding && (
              <p className="text-xs text-amber-400">
                Con tu plan actual, el nombre se guarda pero "KREOON" seguirá visible en la interfaz.
                Actualiza a Growth o superior para reemplazarlo.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Colores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colores
          </CardTitle>
          <CardDescription>
            Define los colores de tu marca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Color primario</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                className="h-10 w-14 rounded-md border cursor-pointer"
              />
              <Input
                value={settings.primary_color}
                onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-32 font-mono"
                maxLength={7}
              />
            </div>
          </div>

          {capabilities.customSecondaryColor ? (
            <div className="space-y-2">
              <Label>Color secundario</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.secondary_color || '#6366F1'}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="h-10 w-14 rounded-md border cursor-pointer"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-32 font-mono"
                  maxLength={7}
                  placeholder="#6366F1"
                />
              </div>
            </div>
          ) : (
            <LockedField label="Color secundario" plan="Growth" />
          )}
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Favicon & PWA</CardTitle>
          <CardDescription>
            Iconos del navegador y de la aplicación PWA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {capabilities.customFavicon ? (
            <div className="space-y-2">
              <Label>URL del favicon</Label>
              <Input
                placeholder="https://... (PNG o ICO, 32x32 recomendado)"
                value={settings.favicon_url}
                onChange={(e) => setSettings(prev => ({ ...prev, favicon_url: e.target.value }))}
              />
            </div>
          ) : (
            <LockedField label="Favicon personalizado" plan="Growth" />
          )}

          {capabilities.customPwaIcons ? (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Icono PWA 192x192</Label>
                <Input
                  placeholder="https://... (PNG, 192x192px)"
                  value={settings.pwa_icon_192_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, pwa_icon_192_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icono PWA 512x512</Label>
                <Input
                  placeholder="https://... (PNG, 512x512px)"
                  value={settings.pwa_icon_512_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, pwa_icon_512_url: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <LockedField label="Iconos PWA personalizados" plan="Growth" />
          )}
        </CardContent>
      </Card>

      {/* OG Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Imagen Social (OG Image)</CardTitle>
          <CardDescription>
            Imagen que aparece al compartir enlaces en redes sociales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {capabilities.customOgImage ? (
            <div className="space-y-2">
              <Label>URL de imagen OG</Label>
              <Input
                placeholder="https://... (1200x630 recomendado)"
                value={settings.og_image_url}
                onChange={(e) => setSettings(prev => ({ ...prev, og_image_url: e.target.value }))}
              />
              {settings.og_image_url && (
                <div className="mt-2 rounded-lg border overflow-hidden max-w-md">
                  <img
                    src={settings.og_image_url}
                    alt="OG preview"
                    className="w-full h-auto"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          ) : (
            <LockedField label="Imagen OG personalizada" plan="Growth" />
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar marca visual
        </Button>
      </div>
    </div>
  );
}

/** Small locked field indicator showing which plan is needed */
function LockedField({ label, plan }: { label: string; plan: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 px-4 py-3 opacity-60">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
        Plan {plan}+
      </span>
    </div>
  );
}
