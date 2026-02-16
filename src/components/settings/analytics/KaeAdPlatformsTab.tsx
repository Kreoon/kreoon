import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { useKaeConfig } from '@/hooks/useKaeConfig';

const PLATFORM_INFO: Record<string, { label: string; color: string; docsUrl: string; fields: string[] }> = {
  meta: {
    label: 'Meta (Facebook/Instagram)',
    color: 'bg-blue-500',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api',
    fields: ['pixel_id', 'access_token', 'dataset_id'],
  },
  tiktok: {
    label: 'TikTok',
    color: 'bg-black',
    docsUrl: 'https://business-api.tiktok.com/portal/docs?id=1771101027431425',
    fields: ['pixel_id', 'access_token'],
  },
  google: {
    label: 'Google Ads',
    color: 'bg-green-500',
    docsUrl: 'https://developers.google.com/analytics/devguides/collection/protocol/ga4',
    fields: ['pixel_id', 'access_token'],
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'bg-sky-600',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api',
    fields: ['access_token'],
  },
};

const FIELD_LABELS: Record<string, string> = {
  pixel_id: 'Pixel ID / Measurement ID',
  access_token: 'Access Token / API Secret',
  dataset_id: 'Dataset ID',
};

export function KaeAdPlatformsTab() {
  const { platforms, loading, saving, savePlatform } = useKaeConfig();
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, unknown>>({});

  const startEdit = (platform: typeof platforms[0]) => {
    setEditingPlatform(platform.platform);
    setFormState({
      enabled: platform.enabled,
      pixel_id: platform.pixel_id || '',
      access_token: platform.access_token || '',
      dataset_id: platform.dataset_id || '',
      test_mode: platform.test_mode,
      test_event_code: platform.test_event_code || '',
    });
  };

  const handleSave = async (platformName: string) => {
    await savePlatform({
      platform: platformName,
      enabled: formState.enabled as boolean,
      pixel_id: (formState.pixel_id as string) || null,
      access_token: (formState.access_token as string) || null,
      dataset_id: (formState.dataset_id as string) || null,
      test_mode: formState.test_mode as boolean,
      test_event_code: (formState.test_event_code as string) || null,
    });
    setEditingPlatform(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {platforms.map((platform) => {
        const info = PLATFORM_INFO[platform.platform];
        if (!info) return null;
        const isEditing = editingPlatform === platform.platform;

        return (
          <Card key={platform.platform}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${info.color}`} />
                  <CardTitle className="text-lg">{info.label}</CardTitle>
                  <Badge variant={platform.enabled ? 'default' : 'secondary'}>
                    {platform.enabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {platform.test_mode && platform.enabled && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Test Mode
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={info.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => startEdit(platform)}>
                      Configurar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSave(platform.platform)}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
              {!isEditing && platform.pixel_id && (
                <CardDescription>
                  ID: {platform.pixel_id.slice(0, 8)}...
                </CardDescription>
              )}
            </CardHeader>

            {isEditing && (
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formState.enabled as boolean}
                      onCheckedChange={(v) => setFormState((s) => ({ ...s, enabled: v }))}
                    />
                    <Label>Habilitado</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formState.test_mode as boolean}
                      onCheckedChange={(v) => setFormState((s) => ({ ...s, test_mode: v }))}
                    />
                    <Label>Modo Test</Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {info.fields.map((field) => (
                    <div key={field} className="space-y-1.5">
                      <Label htmlFor={`${platform.platform}-${field}`}>
                        {FIELD_LABELS[field] || field}
                      </Label>
                      <Input
                        id={`${platform.platform}-${field}`}
                        type={field === 'access_token' ? 'password' : 'text'}
                        value={(formState[field] as string) || ''}
                        onChange={(e) => setFormState((s) => ({ ...s, [field]: e.target.value }))}
                        placeholder={`Ingresa ${FIELD_LABELS[field] || field}`}
                      />
                    </div>
                  ))}
                  {formState.test_mode && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`${platform.platform}-test-code`}>Test Event Code</Label>
                      <Input
                        id={`${platform.platform}-test-code`}
                        value={(formState.test_event_code as string) || ''}
                        onChange={(e) => setFormState((s) => ({ ...s, test_event_code: e.target.value }))}
                        placeholder="Código de prueba (opcional)"
                      />
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={() => setEditingPlatform(null)}>
                  Cancelar
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
