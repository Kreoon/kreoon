import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedClientEntity, ClientUser, UnassignedClientUser } from '@/types/unifiedClient.types';
import type { RelationshipStrength } from '@/types/crm.types';

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

interface MarkUserAsLeadArgs {
  userId: string;
  orgId: string;
  notas?: string;
  temperatura?: RelationshipStrength;
}

/**
 * Marca a un usuario de la pestaña "Usuarios" como lead: crea un org_contacts
 * (contact_type='lead') vinculado a él, para poder remarketearlo después.
 */
export function useMarkUserAsLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, orgId, notas, temperatura }: MarkUserAsLeadArgs) => {
      const { data, error } = await supabase.rpc('admin_marcar_usuario_como_lead' as any, {
        p_user_id: userId,
        p_org_id: orgId,
        p_notas: notas || null,
        p_temperatura: temperatura || null,
      });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (_data, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['org-client-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      toast({ description: 'Usuario marcado como lead' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'No se pudo marcar como lead', variant: 'destructive' });
    },
  });
}

interface UnmarkLeadArgs {
  contactId: string;
  orgId: string;
}

/** Quita la marca de lead de un usuario (elimina el org_contacts vinculado) */
export function useUnmarkLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ contactId }: UnmarkLeadArgs) => {
      const { error } = await supabase.rpc('admin_quitar_marca_de_lead' as any, {
        p_contact_id: contactId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['org-client-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      toast({ description: 'Se quitó la marca de lead' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'No se pudo quitar la marca', variant: 'destructive' });
    },
  });
}
