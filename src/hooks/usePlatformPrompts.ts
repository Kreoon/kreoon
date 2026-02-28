/**
 * Hook para gestionar prompts de plataforma desde la base de datos
 * Solo disponible para platform root
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PromptVariable {
  key: string;
  required: boolean;
  default?: string;
}

export interface PlatformPrompt {
  id: string;
  module: string;
  prompt_key: string;
  name: string;
  description: string | null;
  system_prompt: string;
  user_prompt: string | null;
  temperature: number;
  max_tokens: number;
  model: string;
  variables: PromptVariable[];
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PromptUpdateData {
  name?: string;
  description?: string;
  system_prompt?: string;
  user_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  model?: string;
  variables?: PromptVariable[];
  category?: string;
  tags?: string[];
  is_active?: boolean;
}

/**
 * Obtener todos los prompts activos
 */
export function usePlatformPrompts(module?: string) {
  return useQuery({
    queryKey: ['platform-prompts', module],
    queryFn: async () => {
      let query = (supabase as any)
        .from('platform_prompts')
        .select('*')
        .eq('is_active', true)
        .order('module')
        .order('prompt_key');

      if (module) {
        query = query.eq('module', module);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PlatformPrompt[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Obtener un prompt especifico por module + key
 */
export function usePlatformPrompt(module: string, promptKey: string) {
  return useQuery({
    queryKey: ['platform-prompt', module, promptKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('platform_prompts')
        .select('*')
        .eq('module', module)
        .eq('prompt_key', promptKey)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as PlatformPrompt;
    },
    enabled: !!module && !!promptKey,
  });
}

/**
 * Obtener modulos disponibles
 */
export function usePromptModules() {
  return useQuery({
    queryKey: ['platform-prompt-modules'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('platform_prompts')
        .select('module')
        .eq('is_active', true);

      if (error) throw error;

      // Extraer modulos unicos
      const modules = [...new Set((data as any[]).map(d => d.module))];
      return modules.sort();
    },
  });
}

/**
 * Actualizar un prompt
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: PromptUpdateData;
    }) => {
      const { data: result, error } = await (supabase as any)
        .from('platform_prompts')
        .update({
          ...data,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as PlatformPrompt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-prompts'] });
      queryClient.invalidateQueries({
        queryKey: ['platform-prompt', data.module, data.prompt_key],
      });
      toast.success('Prompt actualizado');
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });
}

/**
 * Crear un nuevo prompt
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PlatformPrompt, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
      const { data: result, error } = await (supabase as any)
        .from('platform_prompts')
        .insert({
          ...data,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result as PlatformPrompt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-prompts'] });
      toast.success('Prompt creado');
    },
    onError: (error: any) => {
      toast.error(`Error al crear: ${error.message}`);
    },
  });
}

/**
 * Eliminar (desactivar) un prompt
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('platform_prompts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-prompts'] });
      toast.success('Prompt eliminado');
    },
    onError: (error: any) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });
}

/**
 * Interpolate variables in a prompt template
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Hook para obtener un prompt listo para usar con variables interpoladas
 */
export function useInterpolatedPrompt(
  module: string,
  promptKey: string,
  variables: Record<string, string | number | undefined>
) {
  const { data: prompt, ...rest } = usePlatformPrompt(module, promptKey);

  const interpolated = prompt
    ? {
        system: interpolatePrompt(prompt.system_prompt, variables),
        user: prompt.user_prompt
          ? interpolatePrompt(prompt.user_prompt, variables)
          : null,
        config: {
          temperature: prompt.temperature,
          maxTokens: prompt.max_tokens,
          model: prompt.model,
        },
      }
    : null;

  return { ...rest, data: prompt, interpolated };
}
