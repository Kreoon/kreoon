import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TalentGateConfig {
  enabled: boolean;
  bypass_admins: boolean;
}

const DEFAULT_CONFIG: TalentGateConfig = {
  enabled: true,
  bypass_admins: true
};

export function useTalentGateConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["talent-gate-config"],
    queryFn: async (): Promise<TalentGateConfig> => {
      const { data, error } = await supabase.rpc("get_talent_gate_config");

      if (error) {
        console.error("[useTalentGateConfig] Error fetching config:", error);
        return DEFAULT_CONFIG;
      }

      return {
        enabled: data?.enabled ?? true,
        bypass_admins: data?.bypass_admins ?? true
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });

  const updateMutation = useMutation({
    mutationFn: async (newConfig: Partial<TalentGateConfig>) => {
      const currentConfig = config || DEFAULT_CONFIG;
      const updatedConfig = { ...currentConfig, ...newConfig };

      const { error } = await supabase
        .from("security_settings")
        .update({
          setting_value: updatedConfig,
          updated_at: new Date().toISOString()
        })
        .eq("setting_key", "talent_access_gate");

      if (error) throw error;
      return updatedConfig;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["talent-gate-config"], data);
    }
  });

  return {
    config: config || DEFAULT_CONFIG,
    isLoading,
    isEnabled: config?.enabled ?? true,
    bypassAdmins: config?.bypass_admins ?? true,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
}
