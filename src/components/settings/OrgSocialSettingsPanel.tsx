import { useState } from 'react';
import { useOrgSocialSettings } from '@/hooks/useOrgSocialSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Globe, Building2, Users, Video, Compass, UserCircle, 
  Eye, UserPlus, Loader2, Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrgSocialSettingsPanel() {
  const { settings, loading, saving, updateSettings } = useOrgSocialSettings();

  const handleToggle = async (key: string, value: boolean) => {
    const success = await updateSettings({ [key]: value });
    if (success) {
      toast.success('Configuración actualizada');
    } else {
      toast.error('Error al actualizar');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Red Social
          </CardTitle>
          <CardDescription>
            Configura cómo tu organización interactúa con la red social pública.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>No hay una organización configurada.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPublicEnabled = settings.public_network_enabled;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Red Social
            </CardTitle>
            <CardDescription className="mt-1">
              Configura cómo tu organización interactúa con la red social pública.
            </CardDescription>
          </div>
          <Badge variant={isPublicEnabled ? 'default' : 'secondary'}>
            {isPublicEnabled ? 'Pública' : 'Solo organización'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isPublicEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {isPublicEnabled ? <Globe className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <Label className="text-base font-medium">Red Pública Activada</Label>
              <p className="text-sm text-muted-foreground">
                {isPublicEnabled 
                  ? "Los miembros pueden ver contenido externo según la configuración" 
                  : "Los miembros solo ven contenido de la organización"}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublicEnabled}
            onCheckedChange={(checked) => handleToggle('public_network_enabled', checked)}
            disabled={saving}
          />
        </div>

        {/* Section Toggles - Only show if public is enabled */}
        <div className={cn("space-y-4 transition-opacity", !isPublicEnabled && "opacity-50 pointer-events-none")}>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Secciones Públicas
          </h4>

          <SettingRow
            icon={<Users className="h-4 w-4" />}
            label="Feed 'Para Ti'"
            description="Mostrar contenido de creadores públicos externos en el feed"
            checked={settings.feed_public}
            onToggle={(v) => handleToggle('feed_public', v)}
            disabled={saving || !isPublicEnabled}
          />

          <SettingRow
            icon={<Compass className="h-4 w-4" />}
            label="Explorar"
            description="Permitir descubrir creadores y contenido externo"
            checked={settings.explore_public}
            onToggle={(v) => handleToggle('explore_public', v)}
            disabled={saving || !isPublicEnabled}
          />

          <SettingRow
            icon={<Video className="h-4 w-4" />}
            label="Videos"
            description="Mostrar videos de creadores públicos externos"
            checked={settings.videos_public}
            onToggle={(v) => handleToggle('videos_public', v)}
            disabled={saving || !isPublicEnabled}
          />

          <SettingRow
            icon={<UserCircle className="h-4 w-4" />}
            label="Perfiles Públicos"
            description="Permitir ver perfiles de usuarios externos"
            checked={settings.profiles_public}
            onToggle={(v) => handleToggle('profiles_public', v)}
            disabled={saving || !isPublicEnabled}
          />
        </div>

        <Separator />

        {/* Interaction Settings */}
        <div className={cn("space-y-4 transition-opacity", !isPublicEnabled && "opacity-50 pointer-events-none")}>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Interacciones
          </h4>

          <SettingRow
            icon={<UserPlus className="h-4 w-4" />}
            label="Seguir Externos"
            description="Los miembros pueden seguir a usuarios fuera de la organización"
            checked={settings.allow_external_follow}
            onToggle={(v) => handleToggle('allow_external_follow', v)}
            disabled={saving || !isPublicEnabled}
          />

          <SettingRow
            icon={<Eye className="h-4 w-4" />}
            label="Ser Descubiertos"
            description="Usuarios externos pueden encontrar perfiles de miembros de la organización"
            checked={settings.allow_external_discovery}
            onToggle={(v) => handleToggle('allow_external_discovery', v)}
            disabled={saving || !isPublicEnabled}
          />
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingRow({
  icon,
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
