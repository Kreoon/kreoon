import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

export interface OrgOwnerStatus {
  isOrgOwner: boolean;
  isPlatformRoot: boolean;
  currentOrgId: string | null;
  currentOrgName: string | null;
  loading: boolean;
}

const ORG_OWNER_TIMEOUT_MS = 8000;

type PromiseLikeAny<T> = PromiseLike<T>;

function withTimeout<T>(promise: PromiseLikeAny<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(`timeout:${label}`)), ms);

    promise.then(
      (res) => {
        window.clearTimeout(id);
        resolve(res as T);
      },
      (err) => {
        window.clearTimeout(id);
        reject(err);
      }
    );
  });
}

/**
 * Hook to determine if the current user is:
 * - Platform root admin (jacsolucionesgraficas@gmail.com)
 * - Organization owner (is_owner = true in organization_members for their current org)
 *
 * This is critical for access control between platform-level and org-level permissions.
 */
export function useOrgOwner(): OrgOwnerStatus {
  const { user, profile } = useAuth();
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // IMPORTANT: during migrations the profile row might not match auth.uid().
  // Root checks must rely on the authenticated user's email (authoritative),
  // not only on the profile record.
  const isPlatformRoot = user?.email ? ROOT_EMAILS.includes(user.email) : false;

  useEffect(() => {
    let cancelled = false;

    const checkOwnerStatus = async () => {
      // Always reset loading when inputs change
      setLoading(true);

      if (!user || !profile?.current_organization_id) {
        if (cancelled) return;
        setIsOrgOwner(false);
        setCurrentOrgId(null);
        setCurrentOrgName(null);
        setLoading(false);
        return;
      }

      const orgId = profile.current_organization_id;

      try {
        // Run queries in parallel + guard against hung network requests
        const [memberRes, orgRes] = await Promise.all([
          withTimeout(
            supabase
              .from('organization_members')
              .select('is_owner')
              .eq('user_id', user.id)
              .eq('organization_id', orgId)
              .maybeSingle(),
            ORG_OWNER_TIMEOUT_MS,
            'org_owner_member'
          ),
          withTimeout(
            supabase
              .from('organizations')
              .select('name')
              .eq('id', orgId)
              .maybeSingle(),
            ORG_OWNER_TIMEOUT_MS,
            'org_owner_org'
          ),
        ]);

        if (cancelled) return;

        setIsOrgOwner(memberRes.data?.is_owner || false);
        setCurrentOrgId(orgId);
        setCurrentOrgName(orgRes.data?.name || null);
      } catch (error) {
        // IMPORTANT: never leave the app in an infinite loading state
        console.error('Error checking org owner status:', error);
        if (cancelled) return;
        setIsOrgOwner(false);
        setCurrentOrgId(orgId);
        setCurrentOrgName(null);
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
    loading,
  };
}

