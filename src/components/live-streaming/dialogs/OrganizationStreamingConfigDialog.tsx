import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrganizationConfig {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  allowed_providers: string[];
  max_channels: number;
  max_concurrent_streams: number;
  monthly_minutes_limit: number | null;
  can_transmit: boolean;
  can_resell: boolean;
  can_live_shopping: boolean;
}

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
}

interface OrganizationStreamingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS = [
  { key: 'restream', label: 'Restream' },
  { key: 'watchity', label: 'Watchity' },
  { key: 'custom_rtmp', label: 'RTMP Personalizado' },
];

export function OrganizationStreamingConfigDialog({ open, onOpenChange }: OrganizationStreamingConfigDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [configs, setConfigs] = useState<Map<string, OrganizationConfig>>(new Map());
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  // Fetch organizations and their configs
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        // Fetch organizations
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('id, name, logo_url')
          .order('name');
        
        setOrganizations(orgsData || []);

        // Fetch existing configs
        const { data: configsData } = await supabase
          .from('organization_streaming_config')
          .select('*');

        const configMap = new Map<string, OrganizationConfig>();
        (configsData || []).forEach((config: OrganizationConfig) => {
          configMap.set(config.organization_id, config);
        });
        setConfigs(configMap);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open]);

  const getOrCreateConfig = (orgId: string): OrganizationConfig => {
    return configs.get(orgId) || {
      id: '',
      organization_id: orgId,
      is_enabled: false,
      allowed_providers: ['restream', 'watchity', 'custom_rtmp'],
      max_channels: 3,
      max_concurrent_streams: 1,
      monthly_minutes_limit: null,
      can_transmit: true,
      can_resell: false,
      can_live_shopping: true,
    };
  };

  const updateConfig = (orgId: string, updates: Partial<OrganizationConfig>) => {
    const current = getOrCreateConfig(orgId);
    const updated = { ...current, ...updates };
    const newConfigs = new Map(configs);
    newConfigs.set(orgId, updated);
    setConfigs(newConfigs);
  };

  const saveConfig = async (orgId: string) => {
    setSaving(true);
    try {
      const config = getOrCreateConfig(orgId);
      const payload = {
        organization_id: orgId,
        is_enabled: config.is_enabled,
        allowed_providers: config.allowed_providers,
        max_channels: config.max_channels,
        max_concurrent_streams: config.max_concurrent_streams,
        monthly_minutes_limit: config.monthly_minutes_limit,
        can_transmit: config.can_transmit,
        can_resell: config.can_resell,
        can_live_shopping: config.can_live_shopping,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase
          .from('organization_streaming_config')
          .update(payload as never)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('organization_streaming_config')
          .insert(payload as never)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          updateConfig(orgId, { id: (data as OrganizationConfig).id });
        }
      }

      toast({ title: 'Configuración guardada' });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = (orgId: string, provider: string) => {
    const config = getOrCreateConfig(orgId);
    const providers = config.allowed_providers.includes(provider)
      ? config.allowed_providers.filter(p => p !== provider)
      : [...config.allowed_providers, provider];
    updateConfig(orgId, { allowed_providers: providers });
  };

  const selectedConfig = selectedOrg ? getOrCreateConfig(selectedOrg) : null;
  const selectedOrgData = organizations.find(o => o.id === selectedOrg);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Configuración por Organización
          </DialogTitle>
          <DialogDescription>
            Configura los permisos de Live Streaming para cada organización
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 max-h-[60vh]">
          {/* Organization List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-2 bg-muted/50 border-b">
              <span className="text-sm font-medium">Organizaciones</span>
            </div>
            <div className="overflow-y-auto max-h-[400px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay organizaciones
                </p>
              ) : (
                organizations.map((org) => {
                  const config = configs.get(org.id);
                  return (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg(org.id)}
                      className={`
                        w-full p-3 text-left border-b last:border-b-0 transition-colors
                        ${selectedOrg === org.id ? 'bg-primary/10' : 'hover:bg-muted/50'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{org.name}</span>
                        {config?.is_enabled && (
                          <Badge variant="default" className="text-xs">ON</Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Config Panel */}
          <div className="col-span-2 border rounded-lg p-4 space-y-4 overflow-y-auto max-h-[400px]">
            {!selectedOrg ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Selecciona una organización</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <h4 className="font-semibold">{selectedOrgData?.name}</h4>
                    <p className="text-sm text-muted-foreground">Configuración de streaming</p>
                  </div>
                  <Switch
                    checked={selectedConfig?.is_enabled || false}
                    onCheckedChange={(checked) => updateConfig(selectedOrg, { is_enabled: checked })}
                  />
                </div>

                {selectedConfig?.is_enabled && (
                  <>
                    {/* Providers */}
                    <div className="space-y-2">
                      <Label>Proveedores Permitidos</Label>
                      <div className="flex flex-wrap gap-2">
                        {PROVIDERS.map((provider) => (
                          <Badge
                            key={provider.key}
                            variant={selectedConfig.allowed_providers.includes(provider.key) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleProvider(selectedOrg, provider.key)}
                          >
                            {selectedConfig.allowed_providers.includes(provider.key) && (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            {provider.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Máx. Canales</Label>
                        <Input
                          type="number"
                          value={selectedConfig.max_channels}
                          onChange={(e) => updateConfig(selectedOrg, { max_channels: parseInt(e.target.value) || 3 })}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Streams Simultáneos</Label>
                        <Input
                          type="number"
                          value={selectedConfig.max_concurrent_streams}
                          onChange={(e) => updateConfig(selectedOrg, { max_concurrent_streams: parseInt(e.target.value) || 1 })}
                          min={1}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Minutos Mensuales (vacío = sin límite)</Label>
                        <Input
                          type="number"
                          value={selectedConfig.monthly_minutes_limit || ''}
                          onChange={(e) => updateConfig(selectedOrg, { 
                            monthly_minutes_limit: e.target.value ? parseInt(e.target.value) : null 
                          })}
                          placeholder="Sin límite"
                        />
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3">
                      <Label>Permisos Adicionales</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <span className="text-sm font-medium">Puede vender servicio</span>
                            <p className="text-xs text-muted-foreground">Revender lives a sus clientes</p>
                          </div>
                          <Switch
                            checked={selectedConfig.can_resell}
                            onCheckedChange={(checked) => updateConfig(selectedOrg, { can_resell: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <span className="text-sm font-medium">Live Shopping</span>
                            <p className="text-xs text-muted-foreground">Productos durante transmisión</p>
                          </div>
                          <Switch
                            checked={selectedConfig.can_live_shopping}
                            onCheckedChange={(checked) => updateConfig(selectedOrg, { can_live_shopping: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => saveConfig(selectedOrg)} 
                      disabled={saving}
                      className="w-full"
                    >
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Guardar Configuración
                    </Button>
                  </>
                )}

                {!selectedConfig?.is_enabled && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Activa el switch para configurar esta organización</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
