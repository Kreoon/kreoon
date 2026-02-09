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

      // Find brand by invite code
      const { data: brand, error: findError } = await sb
        .from('brands')
        .select('id, name')
        .eq('invite_code', code.trim().toUpperCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!brand) throw new Error('Codigo de invitacion no valido');

      // Join directly as active member
      const { error: joinError } = await sb
        .from('brand_members')
        .insert({
          brand_id: brand.id,
          user_id: user.id,
          role: 'member',
          status: 'active',
        });

      if (joinError) {
        if (joinError.code === '23505') {
          throw new Error('Ya perteneces a esta marca');
        }
        throw joinError;
      }

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
