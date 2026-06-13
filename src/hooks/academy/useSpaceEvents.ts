import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AcademySpaceEvent, RsvpStatus } from '@/types/academy-community';

export function useSpaceEvents(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'events', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_space_events')
        .select(`
          *,
          organizer:profiles!organizer_id(full_name, avatar_url),
          my_rsvp:academy_event_rsvps!event_id(status)
        `)
        .eq('space_id', spaceId)
        .eq('is_published', true)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AcademySpaceEvent[];
    },
    enabled: !!spaceId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AcademySpaceEvent> & { space_id: string; title: string; starts_at: string; ends_at: string }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_space_events')
        .insert({ ...input, organizer_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AcademySpaceEvent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'events'] }),
  });
}

export function useRsvpEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: RsvpStatus }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_event_rsvps')
        .upsert(
          { event_id: eventId, user_id: user.id, status },
          { onConflict: 'event_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'events'] }),
  });
}
