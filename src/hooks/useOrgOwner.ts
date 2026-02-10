import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

export interface OrgOwnerStatus {
  isOrgOwner: boolean;
  isPlatformRoot: boolean;
  currentOrgId: string | null;
  currentOrgName: string | null;
  marketplaceEnabled: boolean;
  loading: boolean;
}

const ORG_CONTEXT_TIMEOUT_MS = 15000;

// Module-level cache to deduplicate concurrent calls from multiple hook instances
const orgContextCache = new Map<string, { data: { is_owner: boolean; org_name: string | null; marketplace_enabled: boolean }; ts: number }>();
const inflightOrgContext = new Map<string, Promise<{ is_owner: boolean; org_name: string | null; marketplace_enabled: boolean } | null>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function fetchOrgContextCached(orgId: string): Promise<{ is_owner: boolean; org_name: string | null; marketplace_enabled: boolean } | null> {
  // Check cache
  const cached = orgContextCache.get(orgId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // Dedup in-flight requests
  const existing = inflightOrgContext.get(orgId);
  if (existing) return existing;

  const work = (async () => {
    try {
      // Single RPC replaces 3 separate queries:
      // organization_members(is_owner) + organizations(name) + organizations(marketplace_enabled)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout:org_context')), ORG_CONTEXT_TIMEOUT_MS)
      );

      const fetchPromise = supabase.rpc('get_user_org_context', { p_organization_id: orgId });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.warn('[useOrgOwner] RPC error, falling back:', error);
        return null;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      const result = {
        is_owner: row.is_owner || false,
        org_name: row.org_name || null,
        marketplace_enabled: row.marketplace_enabled !== false,
      };
      orgContextCache.set(orgId, { data: result, ts: Date.now() });
      return result;
    } finally {
      inflightOrgContext.delete(orgId);
    }
  })();

  inflightOrgContext.set(orgId, work);
  return work;
}

// Allow external invalidation (e.g., after settings change)
export function invalidateOrgContextCache(orgId?: string) {
  if (orgId) {
    orgContextCache.delete(orgId);
  } else {
    orgContextCache.clear();
  }
}

/**
 * Hook to determine if the current user is:
 * - Platform root admin (jacsolucionesgraficas@gmail.com)
 * - Organization owner (is_owner = true in organization_members for their current org)
 * Also returns org name and marketplace_enabled in a single query.
 */
export function useOrgOwner(): OrgOwnerStatus {
  const { user, profile } = useAuth();
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const isPlatformRoot = user?.email ? ROOT_EMAILS.includes(user.email) : false;

  useEffect(() => {
    let cancelled = false;

    const checkOwnerStatus = async () => {
      setLoading(true);

      if (!user || !profile?.current_organization_id) {
        if (cancelled) return;
        setIsOrgOwner(false);
        setCurrentOrgId(null);
        setCurrentOrgName(null);
        setMarketplaceEnabled(true);
        setLoading(false);
        return;
      }

      const orgId = profile.current_organization_id;

      try {
        const result = await fetchOrgContextCached(orgId);

        if (cancelled) return;

        if (result) {
          setIsOrgOwner(result.is_owner);
          setCurrentOrgId(orgId);
          setCurrentOrgName(result.org_name);
          setMarketplaceEnabled(result.marketplace_enabled);
        } else {
          setIsOrgOwner(false);
          setCurrentOrgId(orgId);
          setCurrentOrgName(null);
          setMarketplaceEnabled(true);
        }
      } catch (error) {
        const isTimeout = error instanceof Error && error.message?.startsWith('timeout:');
        if (!isTimeout) console.error('Error checking org owner status:', error);
        if (cancelled) return;
        setIsOrgOwner(false);
        setCurrentOrgId(orgId);
        setCurrentOrgName(null);
        setMarketplaceEnabled(true);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    checkOwnerStatus();

    return () => {
      cancelled = true;
    };
  }, [user, profile?.current_organization_id]);

  return {
    isOrgOwner,
    isPlatformRoot,
    currentOrgId,
    currentOrgName,
    marketplaceEnabled,
    loading,
  };
}
