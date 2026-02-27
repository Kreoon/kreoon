import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// DEPRECATED: ROOT_EMAILS hardcoded - now using is_superadmin from database
// Kept for backward compatibility but is_superadmin takes precedence
const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

/** Raw white-label branding data from the org context RPC */
export interface OrgBrandingData {
  name: string;
  slug: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  platformName: string | null;
  senderEmail: string | null;
  senderName: string | null;
  supportEmail: string | null;
  customDomain: string | null;
  resendDomainVerified: boolean;
  pwaIcon192Url: string | null;
  pwaIcon512Url: string | null;
  ogImageUrl: string | null;
  selectedPlan: string;
  whiteLabelConfig: Record<string, unknown>;
}

export interface OrgOwnerStatus {
  isOrgOwner: boolean;
  isPlatformRoot: boolean;
  currentOrgId: string | null;
  currentOrgName: string | null;
  marketplaceEnabled: boolean;
  clientMarketplaceEnabled: boolean;
  orgBranding: OrgBrandingData | null;
  orgTimezone: string;
  loading: boolean;
}

interface CachedOrgContext {
  is_owner: boolean;
  org_name: string | null;
  marketplace_enabled: boolean;
  client_marketplace_enabled: boolean;
  // White-label fields
  org_slug: string | null;
  org_logo_url: string | null;
  org_logo_dark_url: string | null;
  org_favicon_url: string | null;
  org_primary_color: string | null;
  org_secondary_color: string | null;
  org_platform_name: string | null;
  org_sender_email: string | null;
  org_sender_name: string | null;
  org_support_email: string | null;
  org_custom_domain: string | null;
  org_resend_domain_verified: boolean;
  org_pwa_icon_192_url: string | null;
  org_pwa_icon_512_url: string | null;
  org_og_image_url: string | null;
  org_selected_plan: string | null;
  org_white_label_config: Record<string, unknown> | null;
  org_timezone: string | null;
}

const ORG_CONTEXT_TIMEOUT_MS = 15000;

// Module-level cache to deduplicate concurrent calls from multiple hook instances
const orgContextCache = new Map<string, { data: CachedOrgContext; ts: number }>();
const inflightOrgContext = new Map<string, Promise<CachedOrgContext | null>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function fetchOrgContextCached(orgId: string): Promise<CachedOrgContext | null> {
  // Check cache
  const cached = orgContextCache.get(orgId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // Dedup in-flight requests
  const existing = inflightOrgContext.get(orgId);
  if (existing) return existing;

  const work = (async () => {
    try {
      // Single RPC replaces 3 separate queries + white-label fields
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

      const result: CachedOrgContext = {
        is_owner: row.is_owner || false,
        org_name: row.org_name || null,
        marketplace_enabled: row.marketplace_enabled !== false,
        client_marketplace_enabled: row.client_marketplace_enabled === true,
        // White-label fields (gracefully handle missing fields for backward compat)
        org_slug: row.org_slug || null,
        org_logo_url: row.org_logo_url || null,
        org_logo_dark_url: row.org_logo_dark_url || null,
        org_favicon_url: row.org_favicon_url || null,
        org_primary_color: row.org_primary_color || null,
        org_secondary_color: row.org_secondary_color || null,
        org_platform_name: row.org_platform_name || null,
        org_sender_email: row.org_sender_email || null,
        org_sender_name: row.org_sender_name || null,
        org_support_email: row.org_support_email || null,
        org_custom_domain: row.org_custom_domain || null,
        org_resend_domain_verified: row.org_resend_domain_verified || false,
        org_pwa_icon_192_url: row.org_pwa_icon_192_url || null,
        org_pwa_icon_512_url: row.org_pwa_icon_512_url || null,
        org_og_image_url: row.org_og_image_url || null,
        org_selected_plan: row.org_selected_plan || null,
        org_white_label_config: row.org_white_label_config || null,
        org_timezone: row.org_timezone || null,
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

/** Convert cached RPC row to OrgBrandingData */
function toBrandingData(row: CachedOrgContext): OrgBrandingData {
  return {
    name: row.org_name || '',
    slug: row.org_slug,
    logoUrl: row.org_logo_url,
    logoDarkUrl: row.org_logo_dark_url,
    faviconUrl: row.org_favicon_url,
    primaryColor: row.org_primary_color || '#8B5CF6',
    secondaryColor: row.org_secondary_color,
    platformName: row.org_platform_name,
    senderEmail: row.org_sender_email,
    senderName: row.org_sender_name,
    supportEmail: row.org_support_email,
    customDomain: row.org_custom_domain,
    resendDomainVerified: row.org_resend_domain_verified,
    pwaIcon192Url: row.org_pwa_icon_192_url,
    pwaIcon512Url: row.org_pwa_icon_512_url,
    ogImageUrl: row.org_og_image_url,
    selectedPlan: row.org_selected_plan || 'starter',
    whiteLabelConfig: row.org_white_label_config || {},
  };
}

/**
 * Hook to determine if the current user is:
 * - Platform root admin (jacsolucionesgraficas@gmail.com)
 * - Organization owner (is_owner = true in organization_members for their current org)
 * Also returns org name, marketplace_enabled, and white-label branding in a single query.
 */
export function useOrgOwner(): OrgOwnerStatus {
  const { user, profile } = useAuth();
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);
  const [clientMarketplaceEnabled, setClientMarketplaceEnabled] = useState(false);
  const [orgBranding, setOrgBranding] = useState<OrgBrandingData | null>(null);
  const [orgTimezone, setOrgTimezone] = useState<string>('America/Bogota');
  const [loading, setLoading] = useState(true);

  // IMPORTANT: during migrations the profile row might not match auth.uid().
  // Root checks must rely on the authenticated user's email (authoritative),
  // not only on the profile record.
  // NEW: Also check is_superadmin from database (takes precedence)
  const isPlatformRoot = profile?.is_superadmin === true || (user?.email ? ROOT_EMAILS.includes(user.email) : false);

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
        setClientMarketplaceEnabled(false);
        setOrgBranding(null);
        setOrgTimezone('America/Bogota');
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
          setClientMarketplaceEnabled(result.client_marketplace_enabled);
          setOrgBranding(toBrandingData(result));
          setOrgTimezone(result.org_timezone || 'America/Bogota');
        } else {
          setIsOrgOwner(false);
          setCurrentOrgId(orgId);
          setCurrentOrgName(null);
          setMarketplaceEnabled(true);
          setClientMarketplaceEnabled(false);
          setOrgBranding(null);
          setOrgTimezone('America/Bogota');
        }
      } catch (error) {
        const isTimeout = error instanceof Error && error.message?.startsWith('timeout:');
        if (!isTimeout) console.error('Error checking org owner status:', error);
        if (cancelled) return;
        setIsOrgOwner(false);
        setCurrentOrgId(orgId);
        setCurrentOrgName(null);
        setMarketplaceEnabled(true);
        setClientMarketplaceEnabled(false);
        setOrgBranding(null);
        setOrgTimezone('America/Bogota');
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
    clientMarketplaceEnabled,
    orgBranding,
    orgTimezone,
    loading,
  };
}
