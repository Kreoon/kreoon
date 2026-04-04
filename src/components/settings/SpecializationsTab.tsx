import { useState, useMemo } from 'react';
import { Briefcase, Loader2, Save, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useUserSpecializations } from '@/hooks/useUserSpecializations';
import {
  SPECIALIZATION_CONFIG,
  SPECIALIZATIONS_BY_ROLE,
  MAX_SPECIALIZATIONS_PER_USER,
  getSpecializationIcon,
} from '@/lib/specializations';
import { getBaseRole, getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import type { Specialization, SpecializationCategory, AppRole } from '@/types/database';

/**
 * SpecializationsTab - Tab para gestionar especializaciones del usuario
 * Muestra los roles actuales y permite seleccionar hasta 5 especializaciones
 */
export function SpecializationsTab() {
  const { profile: creatorProfile, loading: cpLoading } = useCreatorProfile();
  const {
    specializations: selectedSpecs,
    loading: specsLoading,
    updateSpecializations,
  } = useUserSpecializations();

  const [localSpecs, setLocalSpecs] = useState<Specialization[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sincronizar con especializaciones cargadas
  useMemo(() => {
    if (!specsLoading && selectedSpecs) {
      setLocalSpecs(selectedSpecs);
    }
  }, [selectedSpecs, specsLoading]);

  // Obtener roles del usuario desde marketplace_roles
  const userRoles = useMemo(() => {
    if (!creatorProfile?.marketplace_roles) return [];
    return creatorProfile.marketplace_roles
      .map(role => getBaseRole(role as AppRole))
      .filter((role): role is AppRole => role !== null);
  }, [creatorProfile]);

  // Obtener categorías de especialización basadas en los roles
  const availableCategories = useMemo(() => {
    const categoryMap: Partial<Record<AppRole, SpecializationCategory>> = {
      content_creator: 'content_creator',
      editor: 'editor',
      digital_strategist: 'digital_strategist',
      creative_strategist: 'creative_strategist',
      client: 'client',
    };

    const categories = new Set<SpecializationCategory>();
    userRoles.forEach(role => {
      const category = categoryMap[role];
      if (category && SPECIALIZATIONS_BY_ROLE[category]) {
        categories.add(category);
      }
    });

    // Si no tiene roles definidos, mostrar todas las categorías de talento
    if (categories.size === 0) {
      return ['content_creator', 'editor', 'digital_strategist', 'creative_strategist'] as SpecializationCategory[];
    }

    return Array.from(categories);
  }, [userRoles]);

  const handleToggleSpec = (spec: Specialization) => {
    setLocalSpecs(prev => {
      const isSelected = prev.includes(spec);
      if (isSelected) {
        return prev.filter(s => s !== spec);
      } else {
        if (prev.length >= MAX_SPECIALIZATIONS_PER_USER) {
          toast.error(`Máximo ${MAX_SPECIALIZATIONS_PER_USER} especializaciones`);
          return prev;
        }
        return [...prev, spec];
      }
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateSpecializations(localSpecs);
      if (success) {
        toast.success('Especializaciones guardadas');
        setHasChanges(false);
      } else {
        toast.error('Error al guardar especializaciones');
      }
    } catch (err) {
      console.error('Error saving specializations:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (cpLoading || specsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const selectedCount = localSpecs.length;
  const isMaxReached = selectedCount >= MAX_SPECIALIZATIONS_PER_USER;

  // Mapeo de nombres de categorías en español
  const categoryLabels: Record<SpecializationCategory, string> = {
    content_creator: 'Creación de Contenido',
    editor: 'Edición y Post-Producción',
    digital_strategist: 'Estrategia Digital',
    creative_strategist: 'Estrategia Creativa',
    client: 'Cliente / Marca',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
            <Briefcase className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <CardTitle>Especializaciones</CardTitle>
            <CardDescription>
              Define tus áreas de expertise para que las marcas te encuentren
            </CardDescription>
          </div>
          <Badge
            variant={isMaxReached ? "destructive" : "secondary"}
            className="text-sm"
          >
            {selectedCount}/{MAX_SPECIALIZATIONS_PER_USER}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roles actuales */}
        {userRoles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Tus roles actuales</p>
            <div className="flex flex-wrap gap-2">
              {userRoles.map(role => (
                <Badge
                  key={role}
                  variant="outline"
                  className={cn("text-sm py-1", getRoleBadgeColor(role))}
                >
                  {getRoleLabel(role)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Alerta si no hay roles */}
        {userRoles.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No tienes roles asignados en tu perfil de marketplace.
              Mostrando todas las especializaciones disponibles.
            </AlertDescription>
          </Alert>
        )}

        {/* Especializaciones por categoría */}
        <div className="space-y-6">
          {availableCategories.map(category => {
            const specs = SPECIALIZATIONS_BY_ROLE[category] || [];
            if (specs.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {categoryLabels[category]}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({specs.length} disponibles)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {specs.map(specId => {
                    const config = SPECIALIZATION_CONFIG[specId];
                    if (!config) return null;

                    const isSelected = localSpecs.includes(specId);
                    const Icon = getSpecializationIcon(specId);
                    const isDisabled = !isSelected && isMaxReached;

                    return (
                      <Button
                        key={specId}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleSpec(specId)}
                        disabled={isDisabled}
                        className={cn(
                          "transition-all gap-1.5",
                          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : Icon ? (
                          <Icon className="h-3.5 w-3.5" />
                        ) : null}
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Especializaciones seleccionadas */}
        {localSpecs.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Tus especializaciones seleccionadas:</p>
            <div className="flex flex-wrap gap-2">
              {localSpecs.map(specId => {
                const config = SPECIALIZATION_CONFIG[specId];
                if (!config) return null;
                return (
                  <Badge
                    key={specId}
                    className={cn("cursor-pointer", config.bgColor, config.color)}
                    onClick={() => handleToggleSpec(specId)}
                  >
                    {config.label}
                    <span className="ml-1 opacity-60">×</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón guardar */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="min-w-[120px]"
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Guardar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SpecializationsTab;
