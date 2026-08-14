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

export interface ArchivedClient {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

/** Fetches companies archived (soft-deleted) in this org, for the "Archivadas" view */
export function useArchivedClients(orgId: string | undefined) {
  return useQuery({
    queryKey: ['archived-clients', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, logo_url, contact_email, deleted_at, deleted_by')
        .eq('organization_id', orgId!)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ArchivedClient[];
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}
