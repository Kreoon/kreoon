import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from './useOrgOwner';

interface InternalBrandClient {
  id: string;
  name: string;
  organization_id: string;
  is_internal_brand: boolean;
}

/**
 * Hook to ensure the organization has an internal brand client.
 * This client can have products, packages, and all features like any other client.
 * Used for ambassador/internal content creation.
 */
export function useInternalBrandClient() {
  const { currentOrgId, currentOrgName } = useOrgOwner();
  const [internalBrandClient, setInternalBrandClient] = useState<InternalBrandClient | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create the internal brand client for the current organization
  const ensureInternalBrandClient = useCallback(async () => {
    if (!currentOrgId || !currentOrgName) {
      setInternalBrandClient(null);
      setLoading(false);
      return null;
    }

    setLoading(true);

    try {
      // Check if internal brand client already exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, name, organization_id, is_internal_brand')
        .eq('organization_id', currentOrgId)
        .eq('is_internal_brand', true)
        .maybeSingle();

      if (existingClient) {
        setInternalBrandClient(existingClient as InternalBrandClient);
        setLoading(false);
        return existingClient;
      }

      // Create internal brand client for the organization
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          name: currentOrgName,
          organization_id: currentOrgId,
          is_internal_brand: true,
          is_public: false,
          bio: `Marca interna de ${currentOrgName} para contenido de embajadores`
        })
        .select('id, name, organization_id, is_internal_brand')
        .single();

      if (error) {
        console.error('Error creating internal brand client:', error);
        setLoading(false);
        return null;
      }

      setInternalBrandClient(newClient as InternalBrandClient);
      setLoading(false);
      return newClient;
    } catch (error) {
      console.error('Error in ensureInternalBrandClient:', error);
      setLoading(false);
      return null;
    }
  }, [currentOrgId, currentOrgName]);

  // Auto-fetch on mount and when org changes
  useEffect(() => {
    ensureInternalBrandClient();
  }, [ensureInternalBrandClient]);

  return {
    internalBrandClient,
    loading,
    ensureInternalBrandClient,
    /** The current organization ID */
    currentOrgId,
    /** Check if a client ID is the internal brand */
    isInternalBrand: (clientId: string | null | undefined) => 
      clientId === internalBrandClient?.id
  };
}
