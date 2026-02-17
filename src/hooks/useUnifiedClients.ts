import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedClientEntity, ClientUser, UnassignedClientUser } from '@/types/unifiedClient.types';

export function useUnifiedClients(orgId: string | undefined) {
  return useQuery({
    queryKey: ['unified-clients', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unified_clients', {
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as unknown as UnifiedClientEntity[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches all platform users linked to companies in this org */
export function useOrgClientUsers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-client-users', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_client_users' as any, {
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as unknown as ClientUser[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches org members with role=client NOT linked to any company */
export function useUnassignedClientMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ['unassigned-client-members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unassigned_client_members' as any, {
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as unknown as UnassignedClientUser[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
