import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  AcademySpaceEventFull,
  GoogleCalendarConnection,
  EventInvitationStatus,
} from '@/types/academy-v3';

export function useSpaceCalendar(spaceId: string | undefined, month?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'calendar', spaceId, month, user?.id],
    queryFn: async () => {
      if (!spaceId) return [];
      const now = new Date();
      const start = month ? new Date(month + '-01') : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 2, 0, 23, 59, 59);

      const { data, error } = await (supabase as any)
        .from('academy_space_events')
        .select(
          `
          *,
          organizer:profiles!organizer_id(full_name, avatar_url),
          my_invitation:academy_event_invitations(id, status, google_calendar_added)
        `
        )
        .eq('space_id', spaceId)
        .eq('is_published', true)
        .is('cancelled_at', null)
        .gte('starts_at', start.toISOString())
        .lte('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AcademySpaceEventFull[];
    },
    enabled: !!spaceId && !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGoogleCalendarConnection(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'gcal-connection', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data } = await (supabase as any)
        .from('academy_google_calendar_tokens')
        .select('space_id, calendar_id, calendar_name, is_active, connected_at, last_synced_at')
        .eq('space_id', spaceId)
        .maybeSingle();
      return data as GoogleCalendarConnection | null;
    },
    enabled: !!spaceId,
    staleTime: 60_000,
  });
}

export function useConnectGoogleCalendar() {
  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { data, error } = await (supabase.functions as any).invoke('academy-google-calendar', {
        body: { action: 'get_auth_url', space_id: spaceId },
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
      return data;
    },
  });
}

export function useExchangeGoogleCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { code: string; spaceId: string }) => {
      const { data, error } = await (supabase.functions as any).invoke('academy-google-calendar', {
        body: { action: 'exchange_code', code: args.code, space_id: args.spaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ['academy', 'gcal-connection', args.spaceId] });
    },
  });
}

export function useCreateSpaceEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      space_id: string;
      title: string;
      description?: string;
      type: string;
      starts_at: string;
      ends_at: string;
      timezone?: string;
      meeting_url?: string;
      auto_invite_all?: boolean;
      cover_image_url?: string;
      sync_to_google?: boolean;
    }) => {
      if (!user) throw new Error('No user');

      const { data: result, error } = await (supabase as any).rpc(
        'create_space_event_with_invitations',
        {
          p_space_id: input.space_id,
          p_organizer_id: user.id,
          p_title: input.title,
          p_description: input.description ?? '',
          p_type: input.type,
          p_starts_at: input.starts_at,
          p_ends_at: input.ends_at,
          p_timezone: input.timezone ?? 'America/Bogota',
          p_meeting_url: input.meeting_url ?? null,
          p_auto_invite_all: input.auto_invite_all ?? true,
          p_max_attendees: null,
          p_cover_image_url: input.cover_image_url ?? null,
        }
      );
      if (error) throw error;

      if (input.sync_to_google && result?.event_id) {
        try {
          await (supabase.functions as any).invoke('academy-google-calendar', {
            body: { action: 'create_event', event_id: result.event_id, space_id: input.space_id },
          });
        } catch (e) {
          console.warn('[create_event] sync google_calendar failed', e);
        }
      }

      return result;
    },
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: ['academy', 'calendar', input.space_id] });
      qc.invalidateQueries({ queryKey: ['academy', 'notifications', input.space_id] });
    },
  });
}

export function useCancelSpaceEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { event_id: string; space_id: string; reason?: string }) => {
      const { data, error } = await (supabase.functions as any).invoke('academy-google-calendar', {
        body: {
          action: 'cancel_event',
          event_id: args.event_id,
          space_id: args.space_id,
          reason: args.reason ?? null,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { space_id }) => {
      qc.invalidateQueries({ queryKey: ['academy', 'calendar', space_id] });
    },
  });
}

export function useRespondToInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      event_id: string;
      space_id: string;
      status: EventInvitationStatus;
      add_to_google_cal?: boolean;
    }) => {
      if (!user) throw new Error('No user');
      const { error } = await (supabase as any)
        .from('academy_event_invitations')
        .update({ status: args.status, responded_at: new Date().toISOString() })
        .eq('event_id', args.event_id)
        .eq('user_id', user.id);
      if (error) throw error;

      if (args.add_to_google_cal && args.status === 'accepted') {
        try {
          await (supabase.functions as any).invoke('academy-google-calendar', {
            body: { action: 'add_to_member_cal', event_id: args.event_id },
          });
        } catch (e) {
          console.warn('[add_to_member_cal] failed', e);
        }
      }

      return { status: args.status };
    },
    onSuccess: (_, { space_id }) =>
      qc.invalidateQueries({ queryKey: ['academy', 'calendar', space_id] }),
  });
}

export function useMyMemberCalendarStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'member-cal-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from('academy_member_calendar_tokens')
        .select('connected_at, is_active')
        .eq('user_id', user.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectMemberCalendar() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.functions as any).invoke('academy-google-calendar', {
        body: { action: 'get_member_auth_url' },
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
      return data;
    },
  });
}

export function useExchangeMemberCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await (supabase.functions as any).invoke('academy-google-calendar', {
        body: { action: 'member_exchange_code', code },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'member-cal-status'] }),
  });
}
