import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from './useOrgOwner';

interface InternalBrandClient {
  id: string;
  name: string;
  organization_id: string;
  is_internal_brand: boolean;
}

// Module-level concurrency guard: one in-flight promise per org.
// Prevents race condition when multiple components call the hook simultaneously.
const inflightByOrg = new Map<string, Promise<InternalBrandClient | null>>();

async function fetchOrCreateInternalBrandClient(
  orgId: string,
  orgName: string
): Promise<InternalBrandClient | null> {
  const existing = inflightByOrg.get(orgId);
  if (existing) return existing;

  const work = (async () => {
    try {
      // Use .limit(1) before .maybeSingle() to safely handle legacy duplicates
      // (plain .maybeSingle() returns 406 error when count >= 2)
      const { data: existingClient, error: selectError } = await supabase
        .from('clients')
        .select('id, name, organization_id, is_internal_brand')
        .eq('organization_id', orgId)
        .eq('is_internal_brand', true)
        .limit(1)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking internal brand client:', selectError);
        return null;
      }

      if (existingClient) {
        return existingClient as InternalBrandClient;
      }

      // Create — the partial unique index prevents duplicates at DB level
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          name: orgName,
          organization_id: orgId,
          is_internal_brand: true,
          is_public: false,
          bio: `Marca interna de ${orgName} para contenido de embajadores`
        })
        .select('id, name, organization_id, is_internal_brand')
        .single();

      if (insertError) {
        // Unique constraint violation = another caller won the race
        if (insertError.code === '23505') {
          const { data: raceWinner } = await supabase
            .from('clients')
            .select('id, name, organization_id, is_internal_brand')
            .eq('organization_id', orgId)
            .eq('is_internal_brand', true)
            .limit(1)
            .maybeSingle();
          return raceWinner as InternalBrandClient | null;
        }
        console.error('Error creating internal brand client:', insertError);
        return null;
      }

      return newClient as InternalBrandClient;
    } finally {
      inflightByOrg.delete(orgId);
    }
  })();

  inflightByOrg.set(orgId, work);
  return work;
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

  // Store orgName in ref so it doesn't trigger re-runs of the effect
  const orgNameRef = useRef(currentOrgName);
  orgNameRef.current = currentOrgName;

  useEffect(() => {
    let cancelled = false;

    if (!currentOrgId || !orgNameRef.current) {
      setInternalBrandClient(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchOrCreateInternalBrandClient(currentOrgId, orgNameRef.current).then(
      (client) => {
        if (!cancelled) {
          setInternalBrandClient(client);
          setLoading(false);
        }
      }
    );

    return () => { cancelled = true; };
  }, [currentOrgId]);

  return {
    internalBrandClient,
    loading,
    ensureInternalBrandClient: () =>
      currentOrgId && orgNameRef.current
        ? fetchOrCreateInternalBrandClient(currentOrgId, orgNameRef.current)
        : Promise.resolve(null),
    currentOrgId,
    isInternalBrand: (clientId: string | null | undefined) =>
      clientId === internalBrandClient?.id
  };
}
