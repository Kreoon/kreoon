import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ContentQueue, QueueSlot } from '../types/social.types';
import { DEFAULT_QUEUE_SLOTS, DEFAULT_TIMEZONE } from '../config/constants';

export function useContentQueue(accountId?: string, groupId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: queues = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['content-queues', orgId, accountId, groupId],
    queryFn: async () => {
      let query = supabase
        .from('content_queue')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ContentQueue[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const createQueue = useMutation({
    mutationFn: async (input: {
      account_id?: string;
      group_id?: string;
      name?: string;
      timezone?: string;
      schedule_slots?: QueueSlot[];
    }) => {
      const { data, error } = await supabase
        .from('content_queue')
        .insert({
          organization_id: orgId!,
          account_id: input.account_id || null,
          group_id: input.group_id || null,
          name: input.name || 'Cola principal',
          timezone: input.timezone || DEFAULT_TIMEZONE,
          schedule_slots: input.schedule_slots || DEFAULT_QUEUE_SLOTS,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ContentQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-queues'] });
    },
  });

  const updateQueue = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentQueue> & { id: string }) => {
      const { data, error } = await supabase
        .from('content_queue')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ContentQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-queues'] });
    },
  });

  const deleteQueue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_queue')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-queues'] });
    },
  });

  const updateSlots = useMutation({
    mutationFn: async ({ queueId, slots }: { queueId: string; slots: QueueSlot[] }) => {
      const { data, error } = await supabase
        .from('content_queue')
        .update({ schedule_slots: slots } as any)
        .eq('id', queueId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ContentQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-queues'] });
    },
  });

  // Get the primary queue for a given account
  const primaryQueue = accountId
    ? queues.find(q => q.account_id === accountId) || null
    : null;

  return {
    queues,
    primaryQueue,
    isLoading,
    error: error as Error | null,
    refetch,
    createQueue,
    updateQueue,
    deleteQueue,
    updateSlots,
  };
}
