import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIModule {
  id: string;
  organization_id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  is_active: boolean;
  provider: string;
  model: string;
  required_role: string;
  last_execution_at: string | null;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

// Predefined modules that will be auto-registered
export const PREDEFINED_AI_MODULES = [
  {
    key: 'board_cards',
    name: 'Tablero – Tarjetas',
    description: 'Análisis de tarjetas, riesgo de atraso, siguiente estado recomendado, reasignación sugerida'
  },
  {
    key: 'board_states',
    name: 'Tablero – Estados',
    description: 'Detección de estados saturados, recomendación de división/fusión, optimización de nombres y reglas'
  },
  {
    key: 'board_flows',
    name: 'Tablero – Flujos',
    description: 'Análisis del flujo completo, cuellos de botella, reglas automáticas sugeridas'
  },
  {
    key: 'content_detail',
    name: 'Content – Detalle de Contenido',
    description: 'Análisis de guiones, evaluación de calidad, sugerencias de mejora, validaciones antes de aprobar'
  },
  {
    key: 'scripts',
    name: 'Generación de Guiones',
    description: 'Creación y mejora de guiones para contenido'
  },
  {
    key: 'thumbnails',
    name: 'Generación de Miniaturas',
    description: 'Generación de prompts para thumbnails con IA'
  },
  {
    key: 'sistema_up',
    name: 'Sistema UP',
    description: 'Copiloto de puntos, logros y gamificación'
  }
];

export function useAIModules(organizationId?: string) {
  const [modules, setModules] = useState<AIModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchModules = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organization_ai_modules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('module_name');

      if (error) throw error;
      setModules((data as AIModule[]) || []);
    } catch (error) {
      console.error('Error fetching AI modules:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Auto-register predefined modules
  const ensureModulesExist = useCallback(async () => {
    if (!organizationId) return;

    try {
      for (const mod of PREDEFINED_AI_MODULES) {
        await supabase.rpc('register_ai_module', {
          _org_id: organizationId,
          _module_key: mod.key,
          _module_name: mod.name,
          _description: mod.description
        });
      }
      await fetchModules();
    } catch (error) {
      console.error('Error registering AI modules:', error);
    }
  }, [organizationId, fetchModules]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // Toggle module active status
  const toggleModule = async (moduleKey: string, isActive: boolean) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organization_ai_modules')
        .update({ is_active: isActive })
        .eq('organization_id', organizationId)
        .eq('module_key', moduleKey);

      if (error) throw error;
      
      toast.success(isActive ? 'Módulo IA activado' : 'Módulo IA desactivado');
      await fetchModules();
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error('Error al actualizar el módulo');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Update module provider and model
  const updateModuleConfig = async (moduleKey: string, provider: string, model: string) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organization_ai_modules')
        .update({ provider, model })
        .eq('organization_id', organizationId)
        .eq('module_key', moduleKey);

      if (error) throw error;
      
      toast.success('Configuración de IA actualizada');
      await fetchModules();
    } catch (error) {
      console.error('Error updating module config:', error);
      toast.error('Error al actualizar la configuración');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Check if a specific module is active
  const isModuleActive = (moduleKey: string): boolean => {
    const mod = modules.find(m => m.module_key === moduleKey);
    return mod?.is_active ?? false;
  };

  // Get module configuration
  const getModuleConfig = (moduleKey: string): { isActive: boolean; provider: string; model: string } | null => {
    const mod = modules.find(m => m.module_key === moduleKey);
    if (!mod) return null;
    return {
      isActive: mod.is_active,
      provider: mod.provider,
      model: mod.model
    };
  };

  return {
    modules,
    loading,
    saving,
    toggleModule,
    updateModuleConfig,
    isModuleActive,
    getModuleConfig,
    ensureModulesExist,
    refetch: fetchModules
  };
}
