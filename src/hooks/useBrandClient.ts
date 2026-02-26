import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrand } from './useBrand';

interface BrandClient {
  id: string;
  name: string;
  brand_id: string;
  logo_url?: string;
  bio?: string;
}

// Module-level concurrency guard: one in-flight promise per brand
const inflightByBrand = new Map<string, Promise<BrandClient | null>>();

async function fetchOrCreateBrandClient(
  brandId: string,
  brandName: string,
  userId: string
): Promise<BrandClient | null> {
  const existing = inflightByBrand.get(brandId);
  if (existing) return existing;

  const work = (async () => {
    try {
      // Check if client already exists for this brand
      const { data: existingClient, error: selectError } = await supabase
        .from('clients')
        .select('id, name, brand_id, logo_url, bio')
        .eq('brand_id', brandId)
        .limit(1)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking brand client:', selectError);
        return null;
      }

      if (existingClient) {
        return existingClient as BrandClient;
      }

      // Try to create using RPC (handles permissions properly)
      const { data: clientId, error: rpcError } = await supabase
        .rpc('create_brand_client', {
          p_brand_id: brandId,
          p_user_id: userId,
        });

      if (rpcError) {
        console.error('Error creating brand client via RPC:', rpcError);

        // Fallback: try direct insert (may fail due to RLS)
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert({
            name: brandName,
            brand_id: brandId,
            is_internal_brand: false,
            is_public: false,
            bio: `Cliente de marca independiente: ${brandName}`,
          })
          .select('id, name, brand_id, logo_url, bio')
          .single();

        if (insertError) {
          // Unique constraint = another caller won the race
          if (insertError.code === '23505') {
            const { data: raceWinner } = await supabase
              .from('clients')
              .select('id, name, brand_id, logo_url, bio')
              .eq('brand_id', brandId)
              .limit(1)
              .maybeSingle();
            return raceWinner as BrandClient | null;
          }
          console.error('Error creating brand client:', insertError);
          return null;
        }

        // Add user to client_users
        if (newClient) {
          await supabase
            .from('client_users')
            .insert({
              client_id: newClient.id,
              user_id: userId,
              role: 'owner',
            })
            .single();
        }

        return newClient as BrandClient;
      }

      // RPC succeeded, fetch the created client
      if (clientId) {
        const { data: createdClient } = await supabase
          .from('clients')
          .select('id, name, brand_id, logo_url, bio')
          .eq('id', clientId)
          .single();
        return createdClient as BrandClient | null;
      }

      return null;
    } finally {
      inflightByBrand.delete(brandId);
    }
  })();

  inflightByBrand.set(brandId, work);
  return work;
}

/**
 * Hook to get or create the client associated with a brand.
 * This allows brand members to access all client features:
 * - Products & Strategy
 * - Content Board
 * - Packages
 * - etc.
 */
export function useBrandClient() {
  const { activeBrand, hasBrand, isLoading: brandLoading } = useBrand();
  const [brandClient, setBrandClient] = useState<BrandClient | null>(null);
  const [loading, setLoading] = useState(true);

  // Store refs to avoid triggering effect on every render
  const brandIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (brandLoading) {
      return;
    }

    if (!hasBrand || !activeBrand) {
      setBrandClient(null);
      setLoading(false);
      return;
    }

    // Skip if same brand
    if (brandIdRef.current === activeBrand.id && brandClient) {
      setLoading(false);
      return;
    }

    brandIdRef.current = activeBrand.id;
    setLoading(true);

    fetchOrCreateBrandClient(
      activeBrand.id,
      activeBrand.name,
      activeBrand.owner_id
    ).then((client) => {
      if (!cancelled) {
        setBrandClient(client);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeBrand?.id, activeBrand?.name, activeBrand?.owner_id, hasBrand, brandLoading]);

  return {
    brandClient,
    loading: loading || brandLoading,
    activeBrand,
    hasBrand,
    clientId: brandClient?.id || null,
    // Helper to get client ID for queries
    ensureBrandClient: async () => {
      if (!activeBrand) return null;
      return fetchOrCreateBrandClient(
        activeBrand.id,
        activeBrand.name,
        activeBrand.owner_id
      );
    },
  };
}
