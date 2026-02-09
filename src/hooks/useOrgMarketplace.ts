import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to check if the current user's organization has marketplace enabled.
 * Returns marketplaceEnabled (boolean) and loading state.
 *
 * For users without an organization, marketplace is always enabled (they are
 * independent marketplace users).
 */
export function useOrgMarketplace() {
  const { user, profile } = useAuth();
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      setLoading(true);

      // Users without an org always have marketplace access
      if (!user || !profile?.current_organization_id) {
        if (!cancelled) {
          setMarketplaceEnabled(true);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('organizations')
          .select('marketplace_enabled')
          .eq('id', profile.current_organization_id)
          .maybeSingle();

        if (!cancelled) {
          if (error) {
            // On error, default to enabled to not block users
            setMarketplaceEnabled(true);
          } else {
            // Default to true if field doesn't exist yet (pre-migration)
            setMarketplaceEnabled(data?.marketplace_enabled !== false);
          }
        }
      } catch {
        if (!cancelled) setMarketplaceEnabled(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user, profile?.current_organization_id]);

  return { marketplaceEnabled, loading };
}
