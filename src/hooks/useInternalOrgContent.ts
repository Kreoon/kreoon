import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from './useOrgOwner';

interface AmbassadorWithRole {
  id: string;
  name: string;
  roles: string[];
}

interface InternalOrgContentState {
  /** Whether the current content/client is internal organization content */
  isInternalOrgContent: boolean;
  /** List of ambassadors who also have the creator role */
  ambassadorCreators: AmbassadorWithRole[];
  /** List of ambassadors who also have the editor role */
  ambassadorEditors: AmbassadorWithRole[];
  /** All ambassadors (for backward compatibility) */
  ambassadors: AmbassadorWithRole[];
  /** Loading state for ambassador data */
  loading: boolean;
}

interface InternalOrgContentActions {
  /** Check if a client ID represents internal organization content */
  checkIsInternalOrgContent: (clientId: string | null | undefined) => boolean;
  /** Check if a user ID has ambassador badge */
  isAmbassador: (userId: string | null | undefined) => boolean;
  /** Get default form values for internal organization content */
  getInternalContentDefaults: () => {
    creator_payment: number;
    editor_payment: number;
    is_ambassador_content: boolean;
    content_type: string;
    is_paid: boolean;
    reward_type: string;
  };
  /** Validate if a creator can be assigned to internal content */
  validateCreatorForInternalContent: (creatorId: string | null | undefined) => {
    valid: boolean;
    error?: string;
  };
}

export type UseInternalOrgContentReturn = InternalOrgContentState & InternalOrgContentActions;

/**
 * Single source of truth for internal organization content detection and handling.
 * 
 * RULES:
 * 1. isInternalOrgContent = content.client_id matches organization's internal brand client
 * 2. Only ambassadors WITH the creator role can be assigned as creators
 * 3. Only ambassadors WITH the editor role can be assigned as editors
 * 4. Internal content has NO monetary payments (only UP points)
 * 5. Content type is automatically marked as 'ambassador_internal'
 */
export function useInternalOrgContent(clientId?: string | null): UseInternalOrgContentReturn {
  const { currentOrgId } = useOrgOwner();
  const [internalBrandClientId, setInternalBrandClientId] = useState<string | null>(null);
  const [ambassadors, setAmbassadors] = useState<AmbassadorWithRole[]>([]);
  const [ambassadorCreators, setAmbassadorCreators] = useState<AmbassadorWithRole[]>([]);
  const [ambassadorEditors, setAmbassadorEditors] = useState<AmbassadorWithRole[]>([]);
  const [ambassadorIds, setAmbassadorIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch function - extracted so it can be called on demand
  const fetchData = useCallback(async () => {
    if (!currentOrgId) {
      setInternalBrandClientId(null);
      setAmbassadors([]);
      setAmbassadorCreators([]);
      setAmbassadorEditors([]);
      setAmbassadorIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch internal brand client
      const { data: internalClient } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', currentOrgId)
        .eq('is_internal_brand', true)
        .maybeSingle();

      setInternalBrandClientId(internalClient?.id || null);

      // Fetch ambassadors from organization_member_badges
      const { data: ambassadorBadges } = await supabase
        .from('organization_member_badges')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('badge', 'ambassador')
        .eq('is_active', true);

      if (ambassadorBadges?.length) {
        const userIds = ambassadorBadges.map(b => b.user_id);
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        // Fetch roles for these ambassadors
        const { data: memberRoles } = await supabase
          .from('organization_member_roles')
          .select('user_id, role')
          .eq('organization_id', currentOrgId)
          .in('user_id', userIds);

        // Group roles by user
        const rolesByUser: Record<string, string[]> = {};
        memberRoles?.forEach(mr => {
          if (!rolesByUser[mr.user_id]) {
            rolesByUser[mr.user_id] = [];
          }
          rolesByUser[mr.user_id].push(mr.role);
        });

        // Build ambassador list with roles
        const ambassadorList: AmbassadorWithRole[] = profiles?.map(p => ({ 
          id: p.id, 
          name: p.full_name || 'Sin nombre',
          roles: rolesByUser[p.id] || []
        })) || [];

        // Filter ambassadors by role
        const creatorsWithBadge = ambassadorList.filter(a => a.roles.includes('creator'));
        const editorsWithBadge = ambassadorList.filter(a => a.roles.includes('editor'));

        setAmbassadors(ambassadorList);
        setAmbassadorCreators(creatorsWithBadge);
        setAmbassadorEditors(editorsWithBadge);
        setAmbassadorIds(new Set(userIds));
      } else {
        setAmbassadors([]);
        setAmbassadorCreators([]);
        setAmbassadorEditors([]);
        setAmbassadorIds(new Set());
      }
    } catch (error) {
      console.error('Error fetching internal org content data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes on organization_member_badges
    if (!currentOrgId) return;

    const channel = supabase
      .channel(`ambassador-badges-${currentOrgId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'organization_member_badges',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          console.log('Ambassador badge change detected:', payload);
          // Refetch data when any badge changes
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_member_roles',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          console.log('Member role change detected:', payload);
          // Refetch data when roles change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, fetchData]);

  // Check if client ID represents internal organization content
  const checkIsInternalOrgContent = useCallback((checkClientId: string | null | undefined): boolean => {
    if (!checkClientId || !internalBrandClientId) return false;
    return checkClientId === internalBrandClientId;
  }, [internalBrandClientId]);

  // Check if user is an ambassador
  const isAmbassador = useCallback((userId: string | null | undefined): boolean => {
    if (!userId) return false;
    return ambassadorIds.has(userId);
  }, [ambassadorIds]);

  // Computed: is current client internal org content
  const isInternalOrgContent = useMemo(() => {
    return checkIsInternalOrgContent(clientId);
  }, [clientId, checkIsInternalOrgContent]);

  // Get default form values for internal content
  const getInternalContentDefaults = useCallback(() => ({
    creator_payment: 0,
    editor_payment: 0,
    is_ambassador_content: true,
    content_type: 'ambassador_internal',
    is_paid: false,
    reward_type: 'UP'
  }), []);

  // Validate creator for internal content
  const validateCreatorForInternalContent = useCallback((creatorId: string | null | undefined): {
    valid: boolean;
    error?: string;
  } => {
    if (!creatorId) {
      return { valid: false, error: 'Debes seleccionar un embajador para contenido de marca interna' };
    }
    
    if (!isAmbassador(creatorId)) {
      return { valid: false, error: 'Solo usuarios con insignia de Embajador pueden crear contenido interno de la organización' };
    }
    
    return { valid: true };
  }, [isAmbassador]);

  return {
    isInternalOrgContent,
    ambassadors,
    ambassadorCreators,
    ambassadorEditors,
    loading,
    checkIsInternalOrgContent,
    isAmbassador,
    getInternalContentDefaults,
    validateCreatorForInternalContent
  };
}
