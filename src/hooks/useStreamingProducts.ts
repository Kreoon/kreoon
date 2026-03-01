/**
 * useStreamingProducts - Productos para live shopping v2
 * CRUD + feature/unfeature + flash offers + métricas
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  StreamingProduct,
  CreateProductInput,
  CreateFlashOfferInput,
  UseStreamingProductsReturn,
} from '@/types/streaming.types';

const QUERY_KEY = 'streaming-products-v2';

interface UseStreamingProductsOptions {
  sessionId: string | null;
}

export function useStreamingProducts({ sessionId }: UseStreamingProductsOptions): UseStreamingProductsReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products for session
  const {
    data: products = [],
    isLoading: loading,
  } = useQuery({
    queryKey: [QUERY_KEY, sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('streaming_products_v2')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as StreamingProduct[];
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds for live data
  });

  // Featured product
  const featuredProduct = useMemo(() => {
    return products.find((p) => p.is_featured) || null;
  }, [products]);

  // Add product
  const addMutation = useMutation({
    mutationFn: async (input: CreateProductInput): Promise<StreamingProduct> => {
      const maxOrder = Math.max(...products.map((p) => p.display_order), 0);

      const { data, error } = await supabase
        .from('streaming_products_v2')
        .insert({
          session_id: input.session_id,
          product_id: input.product_id,
          external_product_url: input.external_product_url,
          title: input.title,
          description: input.description,
          image_url: input.image_url,
          original_price_usd: input.original_price_usd,
          live_price_usd: input.live_price_usd,
          total_stock: input.total_stock,
          cta_text: input.cta_text || 'Comprar ahora',
          cta_url: input.cta_url,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StreamingProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
      toast({ title: 'Producto agregado', description: 'El producto está listo para el live' });
    },
    onError: (error) => {
      console.error('[useStreamingProducts] Add error:', error);
      toast({ title: 'Error', description: 'No se pudo agregar el producto', variant: 'destructive' });
    },
  });

  // Update product
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StreamingProduct> }) => {
      const { error } = await supabase
        .from('streaming_products_v2')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    },
    onError: (error) => {
      console.error('[useStreamingProducts] Update error:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el producto', variant: 'destructive' });
    },
  });

  // Remove product
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('streaming_products_v2').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
      toast({ title: 'Eliminado', description: 'Producto eliminado del live' });
    },
    onError: (error) => {
      console.error('[useStreamingProducts] Remove error:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
    },
  });

  // Feature product (using RPC for atomicity)
  const featureProduct = useCallback(
    async (id: string) => {
      if (!sessionId) return;

      const { error } = await supabase.rpc('feature_streaming_product', {
        p_session_id: sessionId,
        p_product_id: id,
      });

      if (error) {
        toast({ title: 'Error', description: 'No se pudo destacar el producto', variant: 'destructive' });
        return;
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
      toast({ title: '¡Producto destacado!', description: 'El producto se muestra en pantalla' });
    },
    [sessionId, queryClient, toast]
  );

  // Unfeature product
  const unfeatureProduct = useCallback(async () => {
    if (!sessionId) return;

    const { error } = await supabase
      .from('streaming_products_v2')
      .update({ is_featured: false, featured_at: null })
      .eq('session_id', sessionId)
      .eq('is_featured', true);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo quitar el destacado', variant: 'destructive' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
  }, [sessionId, queryClient, toast]);

  // Create flash offer (using RPC)
  const createFlashOffer = useCallback(
    async (input: CreateFlashOfferInput) => {
      const { error } = await supabase.rpc('create_flash_offer', {
        p_product_id: input.product_id,
        p_flash_price: input.flash_price_usd,
        p_duration_minutes: input.duration_minutes,
        p_stock: input.stock || null,
      });

      if (error) {
        toast({ title: 'Error', description: 'No se pudo crear la oferta flash', variant: 'destructive' });
        return;
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
      toast({
        title: '⚡ ¡Oferta Flash activada!',
        description: `${input.duration_minutes} minutos de descuento`,
      });
    },
    [sessionId, queryClient, toast]
  );

  // End flash offer
  const endFlashOffer = useCallback(
    async (productId: string) => {
      const { error } = await supabase
        .from('streaming_products_v2')
        .update({
          flash_offer_active: false,
          flash_offer_price_usd: null,
          flash_offer_ends_at: null,
          flash_offer_stock: null,
        })
        .eq('id', productId);

      if (error) {
        toast({ title: 'Error', description: 'No se pudo terminar la oferta', variant: 'destructive' });
        return;
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
      toast({ title: 'Oferta terminada', description: 'La oferta flash ha finalizado' });
    },
    [sessionId, queryClient, toast]
  );

  // Reorder products
  const reorderProducts = useCallback(
    async (productIds: string[]) => {
      const updates = productIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      // Batch update
      for (const update of updates) {
        await supabase
          .from('streaming_products_v2')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    },
    [sessionId, queryClient]
  );

  return {
    products,
    featuredProduct,
    loading,
    addProduct: addMutation.mutateAsync,
    updateProduct: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    removeProduct: removeMutation.mutateAsync,
    featureProduct,
    unfeatureProduct,
    createFlashOffer,
    endFlashOffer,
    reorderProducts,
  };
}

export default useStreamingProducts;
