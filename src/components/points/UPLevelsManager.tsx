import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Save, Sword, Shield, Crown, Sparkles,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UPLevelsManagerProps {
  organizationId?: string;
}

const DEFAULT_THRESHOLDS = {
  bronze: 0,
  silver: 100,
  gold: 250,
  diamond: 500
};

const LEVEL_CONFIG = [
  { 
    key: 'bronze', 
    label: 'Escudero', 
    icon: Sword, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    description: 'Nivel inicial para todos los usuarios'
  },
  { 
    key: 'silver', 
    label: 'Caballero', 
    icon: Shield, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/20 border-slate-400/30',
    description: 'Usuarios con buen rendimiento'
  },
  { 
    key: 'gold', 
    label: 'Comandante', 
    icon: Crown, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20 border-yellow-500/30',
    description: 'Usuarios destacados'
  },
  { 
    key: 'diamond', 
    label: 'Gran Maestre', 
    icon: Sparkles, 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/20 border-cyan-400/30',
    description: 'Los mejores del reino'
  }
];

export function UPLevelsManager({ organizationId }: UPLevelsManagerProps) {
  const { toast } = useToast();
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('up_settings')
        .select('value')
        .eq('key', 'level_thresholds')
        .maybeSingle();

      if (error) {
        console.error('Error fetching thresholds:', error);
        return;
      }

      if (data?.value && typeof data.value === 'string') {
        try {
          setThresholds(JSON.parse(data.value));
        } catch (e) {
          console.error('Error parsing thresholds:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching thresholds:', err);
    }
  };

  const handleChange = (level: string, value: number) => {
    setThresholds(prev => ({ ...prev, [level]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('up_settings')
        .upsert({
          key: 'level_thresholds',
          value: JSON.stringify(thresholds),
          label: 'Umbrales de niveles',
          description: 'Umbrales de puntos para cada nivel'
        } as any, { onConflict: 'key' });

      if (error) throw error;

      toast({ title: 'Niveles actualizados' });
      setHasChanges(false);
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configuración de Niveles</h3>
          <p className="text-sm text-muted-foreground">
            Define los umbrales de puntos para cada nivel
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEVEL_CONFIG.map((level, index) => {
          const Icon = level.icon;
          const prevLevel = LEVEL_CONFIG[index - 1];
          const nextLevel = LEVEL_CONFIG[index + 1];
          
          return (
            <Card key={level.key} className={cn("border-2", level.bgColor)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", level.bgColor)}>
                    <Icon className={cn("w-6 h-6", level.color)} />
                  </div>
                  <div>
                    <span className={cn("font-semibold", level.color)}>{level.label}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {level.key}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>{level.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Puntos Mínimos
                    </Label>
                    <Input 
                      type="number"
                      value={thresholds[level.key as keyof typeof thresholds]}
                      onChange={(e) => handleChange(level.key, parseInt(e.target.value) || 0)}
                      disabled={level.key === 'bronze'}
                      className={level.key === 'bronze' ? 'opacity-50' : ''}
                    />
                    {level.key === 'bronze' && (
                      <p className="text-xs text-muted-foreground">
                        El nivel inicial siempre comienza en 0
                      </p>
                    )}
                  </div>

                  {/* Range visualization */}
                  <div className="p-3 rounded-lg bg-background/50 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Rango:</span>
                      <span className="font-medium">
                        {thresholds[level.key as keyof typeof thresholds]} UP
                        {nextLevel ? (
                          <span> - {thresholds[nextLevel.key as keyof typeof thresholds] - 1} UP</span>
                        ) : (
                          <span className="text-cyan-400"> - ∞</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Vista Previa de Progresión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {LEVEL_CONFIG.map((level, index) => {
              const Icon = level.icon;
              const threshold = thresholds[level.key as keyof typeof thresholds];
              const nextThreshold = LEVEL_CONFIG[index + 1] 
                ? thresholds[LEVEL_CONFIG[index + 1].key as keyof typeof thresholds]
                : null;

              return (
                <div key={level.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center text-center">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center border-2",
                      level.bgColor
                    )}>
                      <Icon className={cn("w-6 h-6", level.color)} />
                    </div>
                    <span className={cn("text-xs font-medium mt-1", level.color)}>
                      {level.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {threshold} UP
                    </span>
                  </div>
                  {nextThreshold !== null && (
                    <div className="flex-1 h-1 bg-border mx-2 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-transparent" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
