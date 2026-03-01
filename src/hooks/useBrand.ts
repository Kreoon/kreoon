import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Brand, BrandMember, CreateBrandInput } from '@/types/brands';

const sb = supabase as any;

export function useBrand() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all brands the user is an active member of (or owns)
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

      // 2. Also check for owned brands WITHOUT membership (orphaned brands)
      const { data: ownedBrands, error: ownedError } = await sb
        .from('brands')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedError) throw ownedError;

      // 3. Get brands from memberships
      let brands: Brand[] = [];
      if (memberships?.length) {
        const brandIds = memberships.map((m: BrandMember) => m.brand_id);
        const { data: memberBrands, error: brandError } = await sb
          .from('brands')
          .select('*')
          .in('id', brandIds);

        if (brandError) throw brandError;
        brands = memberBrands || [];
      }

      // 4. Check for orphaned owned brands (owner but no membership)
      const allMemberships = memberships || [];
      for (const ownedBrand of (ownedBrands || [])) {
        const hasMembership = allMemberships.some((m: BrandMember) => m.brand_id === ownedBrand.id);
        if (!hasMembership) {
          // Orphaned brand found - recreate membership
          console.log('Recreating membership for orphaned brand:', ownedBrand.id);
          const { data: newMembership, error: insertError } = await sb
            .from('brand_members')
            .insert({
              brand_id: ownedBrand.id,
              user_id: user.id,
              role: 'owner',
              status: 'active',
            })
            .select()
            .single();

          if (!insertError && newMembership) {
            allMemberships.push(newMembership);
            // Add the brand if not already in list
            if (!brands.some(b => b.id === ownedBrand.id)) {
              brands.push(ownedBrand);
            }
          }
        } else {
          // Has membership, make sure brand is in list
          if (!brands.some(b => b.id === ownedBrand.id)) {
            brands.push(ownedBrand);
          }
        }
      }

      // 5. Get active_brand_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_brand_id')
        .eq('id', user.id)
        .maybeSingle();

      return {
        brands: brands as Brand[],
        memberships: allMemberships as BrandMember[],
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

  // Check if user already owns a brand (limit: 1 brand per user)
  const ownedBrands = brands.filter(b => b.owner_id === user?.id);
  const canCreateBrand = ownedBrands.length === 0;

  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: async (input: CreateBrandInput) => {
      if (!user?.id) throw new Error('No autenticado');

      // Check if user already owns a brand (limit: 1)
      const { data: existingBrands, error: checkError } = await sb
        .from('brands')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (checkError) throw checkError;
      if (existingBrands && existingBrands.length > 0) {
        throw new Error('Ya tienes una empresa creada. Solo puedes tener 1 empresa por cuenta.');
      }

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
    canCreateBrand, // User can only create 1 brand
    createBrand: createBrandMutation.mutateAsync,
    isCreating: createBrandMutation.isPending,
    switchBrand,
    refetch,
  };
}
