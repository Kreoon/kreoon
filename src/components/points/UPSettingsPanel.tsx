import { useState } from 'react';
import { useUPSettings, UPSetting } from '@/hooks/useUPSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, Zap, Trophy, TrendingUp, Clock, AlertTriangle, 
  Star, Flame, Gift, Eye, Save
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

export function UPSettingsPanel() {
  const { settings, loading, updateSetting } = useUPSettings();
  const { toast } = useToast();
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);

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
