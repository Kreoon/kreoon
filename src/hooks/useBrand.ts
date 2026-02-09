import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Brand, BrandMember, CreateBrandInput } from '@/types/brands';

const sb = supabase as any;

export function useBrand() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all brands the user is an active member of
  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['user-brands', user?.id],
    queryFn: async () => {
      if (!user?.id) return { brands: [], memberships: [], activeBrandId: null };

      // 1. Get active memberships
      const { data: memberships, error: memError } = await sb
        .from('brand_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (memError) throw memError;
      if (!memberships?.length) return { brands: [], memberships: [], activeBrandId: null };

      // 2. Get brand details
      const brandIds = memberships.map((m: BrandMember) => m.brand_id);
      const { data: brands, error: brandError } = await sb
        .from('brands')
        .select('*')
        .in('id', brandIds);

      if (brandError) throw brandError;

      // 3. Get active_brand_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_brand_id')
        .eq('id', user.id)
        .maybeSingle();

      return {
        brands: (brands || []) as Brand[],
        memberships: (memberships || []) as BrandMember[],
        activeBrandId: (profile as any)?.active_brand_id as string | null,
      };
    },
    enabled: !!user?.id,
  });

  const brands = data?.brands || [];
  const memberships = data?.memberships || [];
  const activeBrandId = data?.activeBrandId;

  // Determine active brand
  const activeBrand = activeBrandId
    ? brands.find(b => b.id === activeBrandId) || brands[0] || null
    : brands[0] || null;

  const hasBrand = brands.length > 0;
  const isOwner = activeBrand ? activeBrand.owner_id === user?.id : false;

  const activeMembership = activeBrand
    ? memberships.find(m => m.brand_id === activeBrand.id)
    : null;

  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: async (input: CreateBrandInput) => {
      if (!user?.id) throw new Error('No autenticado');

      // Insert brand
      const { data: brand, error: brandError } = await sb
        .from('brands')
        .insert({
          ...input,
          owner_id: user.id,
        })
        .select()
        .single();

      if (brandError) {
        if (brandError.code === '23505' && brandError.message?.includes('slug')) {
          throw new Error('Ya existe una marca con ese nombre. Intenta con otro.');
        }
        throw brandError;
      }

      // Insert owner membership
      const { error: memberError } = await sb
        .from('brand_members')
        .insert({
          brand_id: brand.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        });

      if (memberError) throw memberError;

      // Set as active brand
      await supabase
        .from('profiles')
        .update({ active_brand_id: brand.id } as any)
        .eq('id', user.id);

      return brand as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-brands', user?.id] });
      toast.success('Marca creada exitosamente');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear la marca');
    },
  });

  // Switch active brand
  const switchBrand = async (brandId: string) => {
    if (!user?.id) return;
    await supabase
      .from('profiles')
      .update({ active_brand_id: brandId } as any)
      .eq('id', user.id);
    queryClient.invalidateQueries({ queryKey: ['user-brands', user?.id] });
  };

  return {
    brands,
    activeBrand,
    activeMembership,
    hasBrand,
    isOwner,
    isLoading,
    createBrand: createBrandMutation.mutateAsync,
    isCreating: createBrandMutation.isPending,
    switchBrand,
    refetch,
  };
}
