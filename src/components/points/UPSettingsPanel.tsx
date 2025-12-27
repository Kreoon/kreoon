import { useState, useEffect } from 'react';
import { useUPSettings, UPSetting } from '@/hooks/useUPSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, Zap, Trophy, TrendingUp, Clock, AlertTriangle, 
  Star, Flame, Gift, Eye, Save, Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  general: { label: 'General', icon: Settings, color: 'text-primary' },
  levels: { label: 'Niveles', icon: Trophy, color: 'text-yellow-500' },
  points: { label: 'Puntos', icon: Zap, color: 'text-cyan-400' },
  display: { label: 'Visualización', icon: Eye, color: 'text-success' }
};

const SETTING_ICONS: Record<string, any> = {
  level_thresholds: Trophy,
  base_completion_points: Star,
  early_delivery_bonus: TrendingUp,
  late_delivery_penalty: Clock,
  correction_penalty: AlertTriangle,
  perfect_streak_bonus: Flame,
  approval_bonus: Gift,
  viral_hook_bonus: Zap,
  system_enabled: Settings,
  show_leaderboard_public: Eye
};

interface MultiCurrencyConfig {
  secondary_currency_enabled: boolean;
  secondary_currency_name: string;
  secondary_currency_icon: string;
}

export function UPSettingsPanel() {
  const { settings, loading, updateSetting } = useUPSettings();
  const { currentOrgId } = useOrgOwner();
  const { toast } = useToast();
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  
  // Multi-currency state
  const [currencyConfig, setCurrencyConfig] = useState<MultiCurrencyConfig>({
    secondary_currency_enabled: false,
    secondary_currency_name: 'XP',
    secondary_currency_icon: '⭐'
  });
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencySaving, setCurrencySaving] = useState(false);

  useEffect(() => {
    fetchCurrencyConfig();
  }, []);

  const fetchCurrencyConfig = async () => {
    setCurrencyLoading(true);
    try {
      // Fetch first setting row to get currency config (all rows share the same values)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/up_settings?select=secondary_currency_enabled,secondary_currency_name,secondary_currency_icon&limit=1`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          setCurrencyConfig({
            secondary_currency_enabled: data[0].secondary_currency_enabled ?? false,
            secondary_currency_name: data[0].secondary_currency_name ?? 'XP',
            secondary_currency_icon: data[0].secondary_currency_icon ?? '⭐'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching currency config:', error);
    } finally {
      setCurrencyLoading(false);
    }
  };

  const saveCurrencyConfig = async () => {
    setCurrencySaving(true);
    try {
      // Update all up_settings rows with currency config
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/up_settings`,
        {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            secondary_currency_enabled: currencyConfig.secondary_currency_enabled,
            secondary_currency_name: currencyConfig.secondary_currency_name,
            secondary_currency_icon: currencyConfig.secondary_currency_icon
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update:', errorText);
        throw new Error('Failed to update');
      }
      toast({ title: 'Configuración de moneda guardada' });
    } catch (error) {
      console.error('Error saving currency config:', error);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setCurrencySaving(false);
    }
  };

  const handleValueChange = (key: string, field: string, newValue: any) => {
    setEditingValues(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || settings.find(s => s.key === key)?.value || {}),
        [field]: newValue
      }
    }));
  };

  const handleSave = async (setting: UPSetting) => {
    setSaving(setting.key);
    try {
      const newValue = editingValues[setting.key] || setting.value;
      await updateSetting(setting.key, newValue);
      setEditingValues(prev => {
        const { [setting.key]: _, ...rest } = prev;
        return rest;
      });
      toast({
        title: 'Configuración guardada',
        description: `${setting.label} actualizado correctamente.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración.',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const getValue = (setting: UPSetting) => {
    return editingValues[setting.key] || setting.value;
  };

  const hasChanges = (key: string) => {
    return editingValues[key] !== undefined;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // Agrupar settings por categoría
  const groupedSettings = settings.reduce((acc, setting) => {
    const category = setting.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, UPSetting[]>);

  const renderSettingControl = (setting: UPSetting) => {
    const value = getValue(setting);
    const SettingIcon = SETTING_ICONS[setting.key] || Zap;

    // Level thresholds - special case
    if (setting.key === 'level_thresholds') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['bronze', 'silver', 'gold', 'diamond'].map(level => (
            <div key={level} className="space-y-1">
              <Label className="text-xs capitalize flex items-center gap-1">
                {level === 'bronze' && '🥉'}
                {level === 'silver' && '🥈'}
                {level === 'gold' && '🥇'}
                {level === 'diamond' && '💎'}
                {level}
              </Label>
              <Input
                type="number"
                value={value[level] || 0}
                onChange={(e) => handleValueChange(setting.key, level, parseInt(e.target.value) || 0)}
                className="h-9"
              />
            </div>
          ))}
        </div>
      );
    }

    // Boolean enabled/disabled
    if (value.enabled !== undefined && Object.keys(value).length === 1) {
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={value.enabled}
            onCheckedChange={(checked) => handleValueChange(setting.key, 'enabled', checked)}
          />
          <span className={cn(
            "text-sm font-medium",
            value.enabled ? "text-success" : "text-muted-foreground"
          )}>
            {value.enabled ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </div>
      );
    }

    // Bonus with enabled toggle
    if (value.enabled !== undefined && value.value !== undefined) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={value.enabled}
              onCheckedChange={(checked) => handleValueChange(setting.key, 'enabled', checked)}
            />
            <span className={cn(
              "text-sm font-medium",
              value.enabled ? "text-success" : "text-muted-foreground"
            )}>
              {value.enabled ? 'Habilitado' : 'Deshabilitado'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Puntos:</Label>
            <Input
              type="number"
              value={value.value || 0}
              onChange={(e) => handleValueChange(setting.key, 'value', parseInt(e.target.value) || 0)}
              className="w-24 h-8"
              disabled={!value.enabled}
            />
          </div>
        </div>
      );
    }

    // Simple value
    if (value.value !== undefined) {
      return (
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={value.value || 0}
            onChange={(e) => handleValueChange(setting.key, 'value', parseInt(e.target.value) || 0)}
            className="w-24 h-9"
          />
          <span className="text-sm text-muted-foreground">puntos</span>
        </div>
      );
    }

    // Streak bonus
    if (value.streak_count !== undefined) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Puntos:</Label>
            <Input
              type="number"
              value={value.value || 0}
              onChange={(e) => handleValueChange(setting.key, 'value', parseInt(e.target.value) || 0)}
              className="w-20 h-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Cada:</Label>
            <Input
              type="number"
              value={value.streak_count || 5}
              onChange={(e) => handleValueChange(setting.key, 'streak_count', parseInt(e.target.value) || 5)}
              className="w-16 h-8"
            />
            <span className="text-xs text-muted-foreground">entregas</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Multi-Currency Configuration */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Multi-Moneda
          </CardTitle>
          <CardDescription>
            Configura una moneda secundaria opcional (XP, Reputación, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currencyLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Moneda Secundaria</h4>
                  <p className="text-sm text-muted-foreground">
                    Habilitar una segunda moneda además de UP
                  </p>
                </div>
                <Switch
                  checked={currencyConfig.secondary_currency_enabled}
                  onCheckedChange={(checked) => 
                    setCurrencyConfig(prev => ({ ...prev, secondary_currency_enabled: checked }))
                  }
                />
              </div>

              {currencyConfig.secondary_currency_enabled && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-2">
                    <Label>Nombre de la moneda</Label>
                    <Input
                      value={currencyConfig.secondary_currency_name}
                      onChange={(e) => 
                        setCurrencyConfig(prev => ({ ...prev, secondary_currency_name: e.target.value }))
                      }
                      placeholder="XP, Reputación, Estrellas..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ícono</Label>
                    <Input
                      value={currencyConfig.secondary_currency_icon}
                      onChange={(e) => 
                        setCurrencyConfig(prev => ({ ...prev, secondary_currency_icon: e.target.value }))
                      }
                      placeholder="⭐, 💎, 🌟..."
                      className="text-center text-xl"
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={saveCurrencyConfig} 
                disabled={currencySaving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {currencySaving ? 'Guardando...' : 'Guardar configuración de moneda'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {Object.entries(groupedSettings).map(([category, categorySettings]) => {
        const categoryInfo = CATEGORY_LABELS[category] || CATEGORY_LABELS.general;
        const CategoryIcon = categoryInfo.icon;

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CategoryIcon className={cn("w-5 h-5", categoryInfo.color)} />
                {categoryInfo.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorySettings.map(setting => {
                const SettingIcon = SETTING_ICONS[setting.key] || Zap;
                
                return (
                  <div 
                    key={setting.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      hasChanges(setting.key) ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <SettingIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium">{setting.label}</h4>
                          {setting.description && (
                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {hasChanges(setting.key) && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(setting)}
                          disabled={saving === setting.key}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {saving === setting.key ? 'Guardando...' : 'Guardar'}
                        </Button>
                      )}
                    </div>
                    
                    {renderSettingControl(setting)}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
