import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AI_MODULE_DEFINITIONS, LEGACY_MODULE_MAPPINGS, getModuleDefinition } from '@/lib/aiModuleKeys';

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
  category: string | null;
  permission_level: string | null;
  monthly_limit: number | null;
  last_execution_at: string | null;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

// Re-export for backwards compatibility
export { AI_MODULE_DEFINITIONS as PREDEFINED_AI_MODULES } from '@/lib/aiModuleKeys';

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

  // Auto-register ALL standard modules
  const ensureModulesExist = useCallback(async () => {
    if (!organizationId) return;

    try {
      for (const mod of AI_MODULE_DEFINITIONS) {
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

  // Update module with full config (including permission level and limits)
  const updateModuleFull = async (
    moduleKey: string,
    config: {
      is_active: boolean;
      provider: string;
      model: string;
      permission_level: string;
      monthly_limit: number | null;
    }
  ) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organization_ai_modules')
        .update({
          is_active: config.is_active,
          provider: config.provider,
          model: config.model,
          permission_level: config.permission_level,
          monthly_limit: config.monthly_limit,
        })
        .eq('organization_id', organizationId)
        .eq('module_key', moduleKey);

      if (error) throw error;
      
      toast.success('Configuración guardada');
      await fetchModules();
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Error al guardar la configuración');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Check if a specific module is active
  const isModuleActive = (moduleKey: string): boolean => {
    // Check for legacy key mapping
    const standardKey = LEGACY_MODULE_MAPPINGS[moduleKey] || moduleKey;
    const mod = modules.find(m => m.module_key === standardKey);
    return mod?.is_active ?? false;
  };

  // Get module configuration
  const getModuleConfig = (moduleKey: string): { isActive: boolean; provider: string; model: string } | null => {
    const standardKey = LEGACY_MODULE_MAPPINGS[moduleKey] || moduleKey;
    const mod = modules.find(m => m.module_key === standardKey);
    if (!mod) return null;
    return {
      isActive: mod.is_active,
      provider: mod.provider,
      model: mod.model
    };
  };

  // Get modules grouped by category
  const getModulesByCategory = () => {
    const grouped: Record<string, AIModule[]> = {
      board: [],
      content: [],
      up: [],
      live: [],
      general: [],
    };

    modules.forEach(mod => {
      const definition = getModuleDefinition(mod.module_key);
      const category = definition?.category || 'general';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(mod);
    });

    return grouped;
  };

  return {
    modules,
    loading,
    saving,
    toggleModule,
    updateModuleConfig,
    updateModuleFull,
    isModuleActive,
    getModuleConfig,
    getModulesByCategory,
    ensureModulesExist,
    refetch: fetchModules
  };
}
