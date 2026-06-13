import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  AcademyMemberPresence,
  AcademySpaceProfile,
  AcademyNotification,
} from '@/types/academy-v3';

/**
 * Crea un channel realtime de forma idempotente y segura para StrictMode.
 * Devuelve cleanup que llama removeChannel.
 * Usa Math.random + Date.now en el nombre para garantizar unicidad por mount,
 * evitando el error "cannot add postgres_changes callbacks after subscribe()".
 */
function createRealtimeChannel(
  baseName: string,
  configure: (channel: any) => any
): () => void {
  const uniqueName = `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = (supabase as any).channel(uniqueName);
  configure(channel);
  channel.subscribe();
  return () => {
    (supabase as any).removeChannel(channel);
  };
}

// ── PRESENCE REALTIME ──
export function useSpacePresence(spaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!spaceId || !user) return;

    const update = async () => {
      await (supabase as any).from('academy_member_presence').upsert(
        {
          space_id: spaceId,
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
          current_page: 'community',
        },
        { onConflict: 'space_id,user_id' }
      );
    };

    update();
    const interval = setInterval(update, 30_000);

    const cleanup = createRealtimeChannel(`presence-${spaceId}`, (channel) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academy_member_presence',
          filter: `space_id=eq.${spaceId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['academy', 'presence', spaceId] })
      );
    });

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [spaceId, user, qc]);

  return useQuery({
    queryKey: ['academy', 'presence', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from('academy_member_presence')
        .select('*, user:profiles!user_id(full_name, avatar_url)')
        .eq('space_id', spaceId)
        .gte('last_seen_at', cutoff)
        .order('last_seen_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcademyMemberPresence[];
    },
    enabled: !!spaceId,
    refetchInterval: 30_000,
  });
}

// ── SPACE PROFILE (perfil del usuario en el space) ──
export function useMySpaceProfile(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'space-profile', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return null;
      const { data, error } = await (supabase as any)
        .from('academy_space_profiles')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as AcademySpaceProfile | null;
    },
    enabled: !!spaceId && !!user,
  });
}

export function useUpsertSpaceProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      spaceId,
      updates,
    }: {
      spaceId: string;
      updates: Partial<AcademySpaceProfile>;
    }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await (supabase as any)
        .from('academy_space_profiles')
        .upsert(
          { ...updates, space_id: spaceId, user_id: user.id },
          { onConflict: 'space_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as AcademySpaceProfile;
    },
    onSuccess: (_, { spaceId }) =>
      qc.invalidateQueries({ queryKey: ['academy', 'space-profile', spaceId] }),
  });
}

// ── NOTIFICATIONS ──
export function useAcademyNotifications(spaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!spaceId || !user) return;
    return createRealtimeChannel(`notif-${spaceId}-${user.id}`, (channel) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'academy_notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ['academy', 'notifications', spaceId] })
      );
    });
  }, [spaceId, user, qc]);

  return useQuery({
    queryKey: ['academy', 'notifications', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_notifications')
        .select('*, sender:profiles!sender_id(full_name, avatar_url)')
        .eq('space_id', spaceId)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AcademyNotification[];
    },
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
  });
}

export function useUnreadNotificationsCount(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'notifications-unread', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return 0;
      const { count, error } = await (supabase as any)
        .from('academy_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!spaceId && !!user,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!user) return;
      await (supabase as any)
        .from('academy_notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('space_id', spaceId)
        .eq('is_read', false);
    },
    onSuccess: (_, spaceId) => {
      qc.invalidateQueries({ queryKey: ['academy', 'notifications', spaceId] });
      qc.invalidateQueries({ queryKey: ['academy', 'notifications-unread', spaceId] });
    },
  });
}

// ── MIEMBROS DEL SPACE ──
// academy_memberships no tiene FK hacia academy_space_profiles ni academy_space_points
// (la relación es por par compuesto space_id+user_id sin FK).
// PostgREST no puede inferir esos joins, así que hacemos 3 queries en paralelo
// y unimos en cliente por user_id.
export function useSpaceMembers(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['academy', 'members', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];

      const [membershipsRes, profilesRes, pointsRes] = await Promise.all([
        (supabase as any)
          .from('academy_memberships')
          .select('*, user:profiles!fk_academy_memberships_user_profile(full_name, avatar_url, email)')
          .eq('space_id', spaceId)
          .eq('is_active', true)
          .order('joined_at', { ascending: false }),
        (supabase as any)
          .from('academy_space_profiles')
          .select('user_id, bio, title, intro_completed, instagram_url, tiktok_url, linkedin_url, website_url')
          .eq('space_id', spaceId),
        (supabase as any)
          .from('academy_space_points')
          .select('user_id, total_points, level, current_week_points')
          .eq('space_id', spaceId),
      ]);

      if (membershipsRes.error) throw membershipsRes.error;
      // Los otros dos son nice-to-have: si fallan, devolvemos arrays vacíos sin romper
      const profilesByUser = new Map<string, any>(
        (profilesRes.data ?? []).map((p: any) => [p.user_id, p])
      );
      const pointsByUser = new Map<string, any>(
        (pointsRes.data ?? []).map((p: any) => [p.user_id, p])
      );

      return (membershipsRes.data ?? []).map((m: any) => ({
        ...m,
        space_profile: profilesByUser.get(m.user_id) ?? null,
        points: pointsByUser.get(m.user_id) ?? null,
      }));
    },
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── FOLLOWS ──
export function useToggleFollow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      spaceId,
      targetUserId,
    }: {
      spaceId: string;
      targetUserId: string;
    }) => {
      if (!user) throw new Error('No user');
      const { data: existing } = await (supabase as any)
        .from('academy_member_follows')
        .select('id')
        .eq('space_id', spaceId)
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (existing) {
        await (supabase as any).from('academy_member_follows').delete().eq('id', existing.id);
        return { following: false };
      }

      await (supabase as any)
        .from('academy_member_follows')
        .insert({ space_id: spaceId, follower_id: user.id, following_id: targetUserId });
      return { following: true };
    },
    onSuccess: (_, { spaceId }) =>
      qc.invalidateQueries({ queryKey: ['academy', 'members', spaceId] }),
  });
}

export function useMyFollows(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'my-follows', spaceId, user?.id],
    // Devuelve string[] (no Set): el cache de React Query se persiste a JSON
    // en la PWA y un Set se serializa a {} (perdiendo .has). Un array sobrevive.
    queryFn: async (): Promise<string[]> => {
      if (!spaceId || !user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_member_follows')
        .select('following_id')
        .eq('space_id', spaceId)
        .eq('follower_id', user.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.following_id as string);
    },
    enabled: !!spaceId && !!user,
  });
}
