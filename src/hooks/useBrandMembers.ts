import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { BrandMemberWithProfile } from '@/types/brands';

const sb = supabase as any;

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [4, 4].map(() =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return segments.join('-');
}

export function useBrandMembers(brandId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: members = [],
    isLoading,
  } = useQuery({
    queryKey: ['brand-members', brandId],
    queryFn: async () => {
      if (!brandId) return [];

      const { data, error } = await sb
        .from('brand_members')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for each member
      const userIds = (data || []).map((m: any) => m.user_id);
      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id) || undefined,
      })) as BrandMemberWithProfile[];
    },
    enabled: !!brandId,
  });

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingRequests = members.filter(m => m.status === 'pending');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['brand-members', brandId] });
  };

  const acceptMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await sb
        .from('brand_members')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Miembro aceptado');
    },
    onError: () => toast.error('Error al aceptar miembro'),
  });

  const rejectMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await sb
        .from('brand_members')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Solicitud rechazada');
    },
    onError: () => toast.error('Error al rechazar solicitud'),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await sb
        .from('brand_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Miembro removido');
    },
    onError: () => toast.error('Error al remover miembro'),
  });

  const generateInviteCode = async () => {
    if (!brandId) return null;
    const code = generateCode();
    const { error } = await sb
      .from('brands')
      .update({ invite_code: code, updated_at: new Date().toISOString() })
      .eq('id', brandId);

    if (error) {
      toast.error('Error al generar codigo');
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ['user-brands', user?.id] });
    toast.success('Codigo de invitacion generado');
    return code;
  };

  return {
    members,
    activeMembers,
    pendingRequests,
    isLoading,
    acceptMember: acceptMember.mutateAsync,
    rejectMember: rejectMember.mutateAsync,
    removeMember: removeMember.mutateAsync,
    generateInviteCode,
  };
}
