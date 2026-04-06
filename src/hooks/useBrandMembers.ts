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
        .select(`
          id,
          user_id,
          role,
          status,
          invited_by,
          created_at,
          updated_at,
          profiles!inner (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.id,
        brand_id: brandId,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        invited_by: m.invited_by,
        created_at: m.created_at,
        updated_at: m.updated_at,
        profile: m.profiles
          ? {
              id: m.profiles.id,
              full_name: m.profiles.full_name,
              email: m.profiles.email,
              avatar_url: m.profiles.avatar_url,
            }
          : undefined,
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
    onMutate: async (memberId: string) => {
      await queryClient.cancelQueries({ queryKey: ['brand-members', brandId] });
      const previousMembers = queryClient.getQueryData<BrandMemberWithProfile[]>(['brand-members', brandId]);

      queryClient.setQueryData<BrandMemberWithProfile[]>(
        ['brand-members', brandId],
        (old) => old?.map(m => m.id === memberId ? { ...m, status: 'active' as const } : m) ?? []
      );

      return { previousMembers };
    },
    onError: (_err, _memberId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['brand-members', brandId], context.previousMembers);
      }
      toast.error('Error al aceptar miembro');
    },
    onSuccess: () => {
      toast.success('Miembro aceptado');
    },
    onSettled: () => {
      invalidate();
    },
  });

  const rejectMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await sb
        .from('brand_members')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
    },
    onMutate: async (memberId: string) => {
      await queryClient.cancelQueries({ queryKey: ['brand-members', brandId] });
      const previousMembers = queryClient.getQueryData<BrandMemberWithProfile[]>(['brand-members', brandId]);

      queryClient.setQueryData<BrandMemberWithProfile[]>(
        ['brand-members', brandId],
        (old) => old?.map(m => m.id === memberId ? { ...m, status: 'rejected' as const } : m) ?? []
      );

      return { previousMembers };
    },
    onError: (_err, _memberId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['brand-members', brandId], context.previousMembers);
      }
      toast.error('Error al rechazar solicitud');
    },
    onSuccess: () => {
      toast.success('Solicitud rechazada');
    },
    onSettled: () => {
      invalidate();
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await sb
        .from('brand_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onMutate: async (memberId: string) => {
      await queryClient.cancelQueries({ queryKey: ['brand-members', brandId] });
      const previousMembers = queryClient.getQueryData<BrandMemberWithProfile[]>(['brand-members', brandId]);

      queryClient.setQueryData<BrandMemberWithProfile[]>(
        ['brand-members', brandId],
        (old) => old?.filter(m => m.id !== memberId) ?? []
      );

      return { previousMembers };
    },
    onError: (_err, _memberId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['brand-members', brandId], context.previousMembers);
      }
      toast.error('Error al remover miembro');
    },
    onSuccess: () => {
      toast.success('Miembro removido');
    },
    onSettled: () => {
      invalidate();
    },
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
