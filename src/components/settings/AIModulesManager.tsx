import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Bot, 
  Loader2, 
  Check, 
  X, 
  Clock, 
  BarChart2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  LayoutDashboard,
  FileVideo,
  Trophy,
  Radio,
  Settings2,
  ChevronRight,
  Users,
  Building2
} from 'lucide-react';
import { useAIModules } from '@/hooks/useAIModules';
import { AI_MODULE_CATEGORIES, getModuleDefinition } from '@/lib/aiModuleKeys';
import { AIModuleConfigDrawer } from './AIModuleConfigDrawer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AIModulesManagerProps {
  organizationId: string;
  enabledProviders: Array<{ key: string; label: string; models: Array<{ value: string; label: string }> }>;
}

const CATEGORY_ICONS = {
  board: LayoutDashboard,
  content: FileVideo,
  up: Trophy,
  live: Radio,
  talent: Users,
  general: Bot,
  organization: Building2,
};

export function AIModulesManager({ organizationId, enabledProviders }: AIModulesManagerProps) {
  const {
    modules,
    loading,
    saving,
    toggleModule,
    updateModuleFull,
    getModulesByCategory,
    ensureModulesExist,
    refetch
  } = useAIModules(organizationId);

  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Auto-register predefined modules when component mounts
    ensureModulesExist();
  }, [ensureModulesExist]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleOpenDrawer = (mod: any) => {
    setSelectedModule(mod);
    setDrawerOpen(true);
  };

  const handleSaveModule = async (config: any) => {
    if (!selectedModule) return;
    await updateModuleFull(selectedModule.module_key, config);
  };

  const groupedModules = getModulesByCategory();
  const activeCount = modules.filter(m => m.is_active).length;
  const totalCount = modules.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Módulos con IA
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeCount} de {totalCount} módulos activos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Warning */}
      <div className="rounded-sm border bg-amber-500/10 border-amber-500/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">Importante</p>
            <p className="text-muted-foreground">
              Los módulos de IA están desactivados por defecto. Activa solo los que necesites para controlar costos y seguridad.
            </p>
          </div>
        </div>
      </div>

      {/* Modules by Category */}
      {Object.entries(groupedModules).map(([category, categoryModules]) => {
        if (categoryModules.length === 0) return null;
        
        const categoryInfo = AI_MODULE_CATEGORIES[category as keyof typeof AI_MODULE_CATEGORIES];
        const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Bot;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CategoryIcon className="h-4 w-4" />
              {categoryInfo?.label || category}
              <Badge variant="outline" className="text-xs ml-auto">
                {categoryModules.filter(m => m.is_active).length} / {categoryModules.length}
              </Badge>
            </div>

            <div className="grid gap-2">
              {categoryModules.map((mod) => {
                const definition = getModuleDefinition(mod.module_key);
                
                return (
                  <div
                    key={mod.id}
                    className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${
                      mod.is_active 
                        ? 'border-primary/30 bg-primary/5' 
                        : 'border-border hover:border-border/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={mod.is_active}
                                onCheckedChange={(checked) => toggleModule(mod.module_key, checked)}
                                disabled={saving}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {mod.is_active ? 'Desactivar' : 'Activar'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {mod.module_name}
                          </span>
                          {mod.is_active && (
                            <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          )}
                        </div>
                        
                        {/* Stats inline */}
                        {mod.execution_count > 0 && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BarChart2 className="h-3 w-3" />
                              {mod.execution_count}
                            </span>
                            {mod.last_execution_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(mod.last_execution_at), 'dd/MM HH:mm', { locale: es })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Provider/Model badge when active */}
                    {mod.is_active && (
                      <div className="flex items-center gap-2 mx-3">
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {mod.provider}
                        </Badge>
                      </div>
                    )}

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDrawer(mod)}
                      className="shrink-0"
                    >
                      <Settings2 className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {modules.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No hay módulos de IA registrados</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={ensureModulesExist}
          >
            Registrar módulos predefinidos
          </Button>
        </div>
      )}

      {/* Config Drawer */}
      <AIModuleConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        module={selectedModule}
        enabledProviders={enabledProviders}
        saving={saving}
        onSave={handleSaveModule}
      />
    </div>
  );
}
