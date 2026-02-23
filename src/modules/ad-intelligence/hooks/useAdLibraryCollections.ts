import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdLibraryCollection, AdLibraryCollectionItem } from "../types/ad-intelligence.types";

export function useAdLibraryCollections() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const collectionsQuery = useQuery({
    queryKey: ["ad-library-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_library_collections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AdLibraryCollection[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createCollection = useMutation({
    mutationFn: async (params: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("ad_library_collections")
        .insert({
          ...params,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AdLibraryCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-collections"] });
      toast({ title: "Colección creada" });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from("ad_library_collections")
        .delete()
        .eq("id", collectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-collections"] });
      toast({ title: "Colección eliminada" });
    },
  });

  const addToCollection = useMutation({
    mutationFn: async (params: { collectionId: string; adId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("ad_library_collection_items")
        .insert({
          collection_id: params.collectionId,
          ad_id: params.adId,
          notes: params.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AdLibraryCollectionItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-collection-items"] });
      toast({ title: "Anuncio agregado a colección" });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast({ title: "Ya existe en esta colección", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const removeFromCollection = useMutation({
    mutationFn: async (params: { collectionId: string; adId: string }) => {
      const { error } = await supabase
        .from("ad_library_collection_items")
        .delete()
        .eq("collection_id", params.collectionId)
        .eq("ad_id", params.adId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-collection-items"] });
      toast({ title: "Anuncio removido de colección" });
    },
  });

  return {
    collections: collectionsQuery.data || [],
    isLoading: collectionsQuery.isLoading,
    createCollection: createCollection.mutateAsync,
    isCreating: createCollection.isPending,
    deleteCollection: deleteCollection.mutateAsync,
    addToCollection: addToCollection.mutateAsync,
    removeFromCollection: removeFromCollection.mutateAsync,
  };
}

export function useCollectionItems(collectionId: string | null) {
  return useQuery({
    queryKey: ["ad-library-collection-items", collectionId],
    queryFn: async () => {
      if (!collectionId) return [];
      const { data, error } = await supabase
        .from("ad_library_collection_items")
        .select("*, ad:ad_library_ads(*)")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (AdLibraryCollectionItem & { ad: any })[];
    },
    enabled: !!collectionId,
    staleTime: 5 * 60 * 1000,
  });
}
