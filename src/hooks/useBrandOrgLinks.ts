import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BrandOrgLink {
  id: string;
  brand_id: string;
  organization_id: string;
  linked_by: string | null;
  linked_at: string;
  status: 'active' | 'inactive';
}

export interface LinkedOrg extends BrandOrgLink {
  organizations: { name: string; logo_url: string | null } | null;
}

export interface LinkedBrand extends BrandOrgLink {
  brands: { name: string; logo_url: string | null; slug: string } | null;
}

/** Orgs a las que está vinculada una brand */
export function useBrandOrgLinks(brandId: string | undefined) {
  return useQuery({
    queryKey: ['brand-org-links', brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_organization_links')
        .select('*, organizations(name, logo_url)')
        .eq('brand_id', brandId!)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as LinkedOrg[];
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Brands vinculadas a una org */
export function useOrgLinkedBrands(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-linked-brands', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_organization_links')
        .select('*, brands(name, logo_url, slug)')
        .eq('organization_id', orgId!)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as LinkedBrand[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Busca brands disponibles para vincular.
 * includeLinked=true: incluye brands ya vinculadas via junction (para modo Fusionar,
 * donde queremos poder asignar una brand que ya tiene junction a un cliente de la org).
 */
export function useAvailableBrands(orgId: string | undefined, searchTerm: string, includeLinked = false) {
  return useQuery({
    queryKey: ['available-brands', orgId, searchTerm, includeLinked],
    queryFn: async () => {
      let query = supabase
        .from('brands')
        .select('id, name, slug, logo_url, owner_id')
        .order('name');

      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      if (!includeLinked) {
        // Solo para tab "Vincular brand nueva": excluir las ya vinculadas
        const { data: linked } = await supabase
          .from('brand_organization_links')
          .select('brand_id')
          .eq('organization_id', orgId!)
          .eq('status', 'active');

        const linkedIds = (linked || []).map(l => l.brand_id);
        if (linkedIds.length > 0) {
          query = query.not('id', 'in', `(${linkedIds.join(',')})`);
        }
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
  });
}

/** Vincula una brand a una org */
export function useLinkBrand() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      brandId,
      orgId,
      existingOrgClientId,
    }: {
      brandId: string;
      orgId: string;
      existingOrgClientId?: string;
    }) => {
      const { data, error } = await supabase.rpc('link_brand_to_org', {
        p_brand_id: brandId,
        p_org_id: orgId,
        p_existing_org_client_id: existingOrgClientId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { brandId, orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['brand-org-links', brandId] });
      queryClient.invalidateQueries({ queryKey: ['org-linked-brands', orgId] });
      queryClient.invalidateQueries({ queryKey: ['available-brands', orgId] });
      toast({ title: 'Brand vinculada', description: 'La brand ahora aparece en tu lista de clientes.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error al vincular',
        description: err.message || 'No se pudo vincular la brand.',
        variant: 'destructive',
      });
    },
  });
}

/** Desvincula una brand de una org */
export function useUnlinkBrand() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ brandId, orgId }: { brandId: string; orgId: string }) => {
      const { error } = await supabase.rpc('unlink_brand_from_org', {
        p_brand_id: brandId,
        p_org_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { brandId, orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['brand-org-links', brandId] });
      queryClient.invalidateQueries({ queryKey: ['org-linked-brands', orgId] });
      queryClient.invalidateQueries({ queryKey: ['available-brands', orgId] });
      toast({ title: 'Brand desvinculada', description: 'La brand ya no aparece en esta organización.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error al desvincular',
        description: err.message || 'No se pudo desvincular la brand.',
        variant: 'destructive',
      });
    },
  });
}
