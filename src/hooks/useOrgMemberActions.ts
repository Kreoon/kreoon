import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PurgeMemberArgs {
  userId: string;
  orgId: string;
  userName: string;
  clearClientLinks?: boolean;
}

interface RemoveMemberArgs {
  userId: string;
  orgId: string;
  userName: string;
}

/**
 * Depurar: removes all roles → user becomes a Lead (stays in org_members).
 * Optionally clears client_users links (for clients-hub).
 */
export function usePurgeMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, orgId, clearClientLinks }: PurgeMemberArgs) => {
      // 1. Delete all roles
      const { error: rolesError } = await supabase
        .from('organization_member_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (rolesError) throw rolesError;

      // 2. Null out legacy denormalized role column
      const { error: memberError } = await (supabase as any)
        .from('organization_members')
        .update({ role: null })
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (memberError) throw memberError;

      // 3. Optionally clear client_users links
      if (clearClientLinks) {
        const { data: orgClients } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', orgId);

        const clientIds = (orgClients || []).map(c => c.id);
        if (clientIds.length > 0 && clientIds.length <= 50) {
          await supabase
            .from('client_users')
            .delete()
            .eq('user_id', userId)
            .in('client_id', clientIds);
        }
      }
    },
    onSuccess: (_, { orgId, userName }) => {
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-client-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-client-members', orgId] });
      toast({ description: `${userName} depurado — ahora aparece como Lead` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Eliminar: fully removes user from the organization.
 * Deletes roles + membership + clears current_organization_id.
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, orgId }: RemoveMemberArgs) => {
      // 1. Delete roles first
      const { error: rolesError } = await supabase
        .from('organization_member_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (rolesError) throw rolesError;

      // 2. Delete membership
      const { error: memberError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (memberError) throw memberError;

      // 3. Clear current_organization_id only if it matches this org
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ current_organization_id: null })
        .eq('id', userId)
        .eq('current_organization_id', orgId);
      if (profileError) throw profileError;
    },
    onSuccess: (_, { orgId, userName }) => {
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-client-users', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-client-members', orgId] });
      toast({ description: `${userName} eliminado de la organización` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
