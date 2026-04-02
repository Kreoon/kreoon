import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Loader2, 
  Sparkles, 
  Shield, 
  Eye, 
  Play, 
  Settings2,
  BarChart2,
  Clock,
  Save
} from 'lucide-react';
import { getModuleDefinition, AI_MODULE_CATEGORIES } from '@/lib/aiModuleKeys';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AIModuleData {
  id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  is_active: boolean;
  provider: string;
  model: string;
  category?: string;
  permission_level?: string;
  monthly_limit?: number | null;
  execution_count: number;
  last_execution_at: string | null;
}

interface EnabledProvider {
  key: string;
  label: string;
  models: Array<{ value: string; label: string }>;
}

interface AIModuleConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: AIModuleData | null;
  enabledProviders: EnabledProvider[];
  saving: boolean;
  onSave: (config: {
    is_active: boolean;
    provider: string;
    model: string;
    permission_level: string;
    monthly_limit: number | null;
  }) => Promise<void>;
}

const PERMISSION_LEVELS = [
  { value: 'view', label: 'Solo Ver', description: 'Puede ver resultados de IA', icon: Eye },
  { value: 'execute', label: 'Ejecutar', description: 'Puede ejecutar análisis de IA', icon: Play },
  { value: 'configure', label: 'Configurar', description: 'Puede modificar configuración del módulo', icon: Settings2 },
];

export function AIModuleConfigDrawer({
  open,
  onOpenChange,
  module,
  enabledProviders,
  saving,
  onSave,
}: AIModuleConfigDrawerProps) {
  const [isActive, setIsActive] = useState(false);
  const [provider, setProvider] = useState('kreoon');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [permissionLevel, setPermissionLevel] = useState('execute');
  const [monthlyLimit, setMonthlyLimit] = useState<string>('');

  useEffect(() => {
    if (module) {
      setIsActive(module.is_active);
      setProvider(module.provider || 'kreoon');
      setModel(module.model || 'google/gemini-2.5-flash');
      setPermissionLevel(module.permission_level || 'execute');
      setMonthlyLimit(module.monthly_limit?.toString() || '');
    }
  }, [module]);

  const handleSave = async () => {
    await onSave({
      is_active: isActive,
      provider,
      model,
      permission_level: permissionLevel,
      monthly_limit: monthlyLimit ? parseInt(monthlyLimit) : null,
    });
    onOpenChange(false);
  };

  const currentProviderConfig = enabledProviders.find(p => p.key === provider);
  const moduleDefinition = module ? getModuleDefinition(module.module_key) : null;
  const categoryInfo = moduleDefinition ? AI_MODULE_CATEGORIES[moduleDefinition.category] : null;

  if (!module) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Configuración del Módulo
          </SheetTitle>
          <SheetDescription>
            {module.module_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Module Info */}
          <div className="p-4 rounded-sm bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{module.module_name}</span>
              {categoryInfo && (
                <Badge variant="outline" className="text-xs">
                  {categoryInfo.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {module.description || moduleDefinition?.description}
            </p>
            <code className="text-xs text-muted-foreground font-mono">
              {module.module_key}
            </code>
          </div>

          {/* Stats */}
          {module.execution_count > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BarChart2 className="h-4 w-4" />
                {module.execution_count} ejecuciones
              </span>
              {module.last_execution_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(module.last_execution_at), 'dd MMM HH:mm', { locale: es })}
                </span>
              )}
            </div>
          )}

          <Separator />

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Estado</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'El módulo está activo' : 'El módulo está desactivado'}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={saving}
            />
          </div>

          {isActive && (
            <>
              <Separator />

              {/* Provider Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Proveedor de IA
                </Label>
                <Select
                  value={provider}
                  onValueChange={(value) => {
                    setProvider(value);
                    // Reset model to first available
                    const newProviderConfig = enabledProviders.find(p => p.key === value);
                    if (newProviderConfig?.models[0]) {
                      setModel(newProviderConfig.models[0].value);
                    }
                  }}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledProviders.map(p => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={model}
                  onValueChange={setModel}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProviderConfig?.models.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Permission Level */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Nivel de Permiso Requerido
                </Label>
                <div className="space-y-2">
                  {PERMISSION_LEVELS.map((level) => {
                    const Icon = level.icon;
                    return (
                      <div
                        key={level.value}
                        className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                          permissionLevel === level.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setPermissionLevel(level.value)}
                      >
                        <Icon className={`h-4 w-4 ${permissionLevel === level.value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                        {permissionLevel === level.value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Limit */}
              <div className="space-y-2">
                <Label>Límite Mensual (opcional)</Label>
                <Input
                  type="number"
                  placeholder="Sin límite"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  disabled={saving}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo de ejecuciones por mes. Dejar vacío para sin límite.
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
