import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TalentList, TalentListMember } from '@/components/marketplace/types/marketplace';

export function useTalentLists(organizationId: string | null) {
  const { data: lists = [], isLoading: loading } = useQuery({
    queryKey: ['talent-lists', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('org_talent_lists')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TalentList[];
    },
    enabled: !!organizationId,
  });

  return { lists, loading };
}

export function useTalentListMembers(listId: string | undefined) {
  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['talent-list-members', listId],
    queryFn: async () => {
      if (!listId) return [];
      const { data, error } = await (supabase as any)
        .from('org_talent_list_members')
        .select(`
          id, list_id, creator_user_id, added_by, added_at, notes
        `)
        .eq('list_id', listId)
        .order('added_at', { ascending: false });
      if (error) throw error;

      // Fetch creator profiles
      const memberData = data || [];
      if (memberData.length === 0) return [];

      const userIds = memberData.map((m: any) => m.creator_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return memberData.map((m: any) => ({
        ...m,
        creator: profileMap.get(m.creator_user_id) || null,
      })) as TalentListMember[];
    },
    enabled: !!listId,
  });

  return { members, loading };
}
