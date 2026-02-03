import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCRIPT_ROLE_PROMPTS } from "@/lib/ai/prompts/scripts";

// Mapeo: creator -> script (compatibilidad con interfaz existente)
const ROLE_TO_KEY: Record<string, string> = {
  creator: "script",
  editor: "editor",
  strategist: "strategist",
  trafficker: "trafficker",
  designer: "designer",
  admin: "admin",
};

// Default prompts desde fuente única - SCRIPT_ROLE_PROMPTS
export const DEFAULT_SCRIPT_PROMPTS = Object.fromEntries(
  Object.entries(SCRIPT_ROLE_PROMPTS).map(([role, config]) => [
    ROLE_TO_KEY[role] ?? role,
    config.systemPrompt,
  ])
) as ScriptPromptsConfig;

export interface ScriptPromptsConfig {
  script: string;
  editor: string;
  strategist: string;
  trafficker: string;
  designer: string;
  admin: string;
}

export function useScriptPrompts(organizationId: string | undefined) {
  const [prompts, setPrompts] = useState<ScriptPromptsConfig>(DEFAULT_SCRIPT_PROMPTS);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    fetchPrompts();
  }, [organizationId]);

  const fetchPrompts = async () => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabase
        .from('organization_ai_prompts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('module_key', 'scripts')
        .maybeSingle();

      if (error) throw error;

      if (data?.is_active && data?.prompt_config) {
        const config = data.prompt_config as any;
        // Check if full prompts are saved
        if (config.full_prompts) {
          setPrompts({
            script: config.full_prompts.script || DEFAULT_SCRIPT_PROMPTS.script,
            editor: config.full_prompts.editor || DEFAULT_SCRIPT_PROMPTS.editor,
            strategist: config.full_prompts.strategist || DEFAULT_SCRIPT_PROMPTS.strategist,
            trafficker: config.full_prompts.trafficker || DEFAULT_SCRIPT_PROMPTS.trafficker,
            designer: config.full_prompts.designer || DEFAULT_SCRIPT_PROMPTS.designer,
            admin: config.full_prompts.admin || DEFAULT_SCRIPT_PROMPTS.admin,
          });
          setIsCustom(true);
        }
      }
    } catch (error: any) {
      // Silently handle permission errors - use defaults instead
      if (error?.code !== '42501') {
        console.error('Error fetching script prompts:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    prompts,
    loading,
    isCustom,
    refetch: fetchPrompts,
  };
}
