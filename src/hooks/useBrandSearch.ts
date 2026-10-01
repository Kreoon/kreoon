import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Brand } from '@/types/brands';

const sb = supabase as any;

export function useBrandSearch(searchTerm: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<Brand[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await sb
          .from('brands')
          .select('id, name, slug, logo_url, industry, city, country, is_verified')
          .ilike('name', `%${searchTerm.trim()}%`)
          .limit(10);

        if (error) throw error;
        setResults((data || []) as Brand[]);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Request to join a brand
  const requestJoin = useMutation({
    mutationFn: async (brandId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await sb
        .from('brand_members')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          role: 'member',
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya tienes una solicitud para esta marca');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Solicitud enviada. El administrador de la marca la revisara.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al enviar solicitud');
    },
  });

  // Join by invite code
  const joinByCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error('No autenticado');

      // El código se valida en el servidor (join_brand_with_code); antes se validaba en el navegador
      const { data: brandId, error: joinError } = await sb.rpc('join_brand_with_code', { p_code: code });
      if (joinError) {
        if (joinError.code === '23505' || /Ya perteneces/i.test(joinError.message || '')) {
          throw new Error('Ya perteneces a esta marca');
        }
        if (/no valido/i.test(joinError.message || '')) throw new Error('Codigo de invitacion no valido');
        throw joinError;
      }

      const { data: brandRow } = await sb.from('brands').select('id, name').eq('id', brandId).maybeSingle();
      const brand = (brandRow as { id: string; name: string } | null) ?? { id: brandId as string, name: 'la marca' };

      // Set as active brand
      await supabase
        .from('profiles')
        .update({ active_brand_id: brand.id } as any)
        .eq('id', user.id);

      queryClient.invalidateQueries({ queryKey: ['user-brands', user?.id] });
      return brand as { id: string; name: string };
    },
    onSuccess: (brand) => {
      toast.success(`Te has unido a "${brand.name}"`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al unirse con codigo');
    },
  });

  return {
    results,
    isSearching,
    requestJoin: requestJoin.mutateAsync,
    isRequesting: requestJoin.isPending,
    joinByCode: joinByCode.mutateAsync,
    isJoining: joinByCode.isPending,
  };
}
