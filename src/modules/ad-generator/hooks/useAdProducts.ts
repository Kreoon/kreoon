import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AdProduct } from '../types/ad-generator.types';

export function useAdProducts() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ad-products', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_generator_products' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AdProduct[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  const createProduct = useMutation({
    mutationFn: async ({ name, description, client_id, crm_product_id }: { name: string; description?: string; client_id?: string | null; crm_product_id?: string | null }) => {
      const { data, error } = await supabase
        .from('ad_generator_products' as any)
        .insert({
          organization_id: orgId!,
          created_by: profile!.id,
          name,
          description: description || null,
          client_id: client_id || null,
          crm_product_id: crm_product_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AdProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-products', orgId] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; product_images?: string[] }) => {
      const { data, error } = await supabase
        .from('ad_generator_products' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AdProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-products', orgId] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('ad_generator_products' as any)
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-products', orgId] });
    },
  });

  return {
    products,
    isLoading,
    error: error as Error | null,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
