import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useAuth } from "@/hooks/useAuth";
import { AmbassadorLevel } from "@/types/database";

export interface AmbassadorBadge {
  id: string;
  user_id: string;
  organization_id: string;
  badge: string;
  level: AmbassadorLevel;
  granted_at: string;
  granted_by: string | null;
  is_active: boolean;
}

export interface AmbassadorWithBadge {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  badge: AmbassadorBadge | null;
  roles: string[];
}

export function useAmbassadorBadge() {
  const { toast } = useToast();
  const { currentOrgId } = useOrgOwner();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [myBadge, setMyBadge] = useState<AmbassadorBadge | null>(null);

  /**
   * Check if a user has the ambassador badge
   */
  const hasBadge = useCallback(async (userId: string): Promise<boolean> => {
    if (!currentOrgId) return false;

    const { data, error } = await supabase
      .from('organization_member_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', currentOrgId)
      .eq('badge', 'ambassador')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking ambassador badge:', error);
      return false;
    }

    return !!data;
  }, [currentOrgId]);

  /**
   * Get the ambassador badge level for a user
   */
  const getBadgeLevel = useCallback(async (userId: string): Promise<AmbassadorLevel | null> => {
    if (!currentOrgId) return null;

    const { data, error } = await supabase
      .from('organization_member_badges')
      .select('level')
      .eq('user_id', userId)
      .eq('organization_id', currentOrgId)
      .eq('badge', 'ambassador')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting badge level:', error);
      return null;
    }

    return data?.level as AmbassadorLevel | null;
  }, [currentOrgId]);

  /**
   * Get full badge info for a user
   */
  const getBadge = useCallback(async (userId: string): Promise<AmbassadorBadge | null> => {
    if (!currentOrgId) return null;

    const { data, error } = await supabase
      .from('organization_member_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', currentOrgId)
      .eq('badge', 'ambassador')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting badge:', error);
      return null;
    }

    return data as AmbassadorBadge | null;
  }, [currentOrgId]);

  /**
   * Grant ambassador badge to a user
   */
  const grantBadge = useCallback(async (
    userId: string,
    level: AmbassadorLevel = 'bronze'
  ): Promise<boolean> => {
    if (!currentOrgId) {
      toast({ variant: "destructive", description: "No hay organización seleccionada" });
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_member_badges')
        .upsert({
          user_id: userId,
          organization_id: currentOrgId,
          badge: 'ambassador',
          level,
          granted_by: user?.id,
          is_active: true,
          granted_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,organization_id,badge'
        })
        .select()
        .single();

      if (error) throw error;

      toast({ description: `Insignia de Embajador ${level} otorgada exitosamente` });
      return true;
    } catch (error: any) {
      console.error('Error granting badge:', error);
      toast({ variant: "destructive", description: error.message || "Error al otorgar insignia" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, user, toast]);

  /**
   * Update ambassador badge level
   */
  const updateBadgeLevel = useCallback(async (
    userId: string,
    level: AmbassadorLevel
  ): Promise<boolean> => {
    if (!currentOrgId) {
      toast({ variant: "destructive", description: "No hay organización seleccionada" });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_member_badges')
        .update({ level, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('organization_id', currentOrgId)
        .eq('badge', 'ambassador');

      if (error) throw error;

      toast({ description: `Nivel actualizado a ${level}` });
      return true;
    } catch (error: any) {
      console.error('Error updating badge level:', error);
      toast({ variant: "destructive", description: error.message || "Error al actualizar nivel" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, toast]);

  /**
   * Revoke ambassador badge from a user
   */
  const revokeBadge = useCallback(async (userId: string): Promise<boolean> => {
    if (!currentOrgId) {
      toast({ variant: "destructive", description: "No hay organización seleccionada" });
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organization_member_badges')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id
        })
        .eq('user_id', userId)
        .eq('organization_id', currentOrgId)
        .eq('badge', 'ambassador');

      if (error) throw error;

      toast({ description: "Insignia de Embajador revocada" });
      return true;
    } catch (error: any) {
      console.error('Error revoking badge:', error);
      toast({ variant: "destructive", description: error.message || "Error al revocar insignia" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, user, toast]);

  /**
   * Get all users with ambassador badge in the organization
   */
  const getAmbassadors = useCallback(async (): Promise<AmbassadorWithBadge[]> => {
    if (!currentOrgId) return [];

    setLoading(true);
    try {
      // Get all active ambassador badges
      const { data: badges, error: badgeError } = await supabase
        .from('organization_member_badges')
        .select(`
          *,
          profile:profiles!user_id(id, full_name, email, avatar_url)
        `)
        .eq('organization_id', currentOrgId)
        .eq('badge', 'ambassador')
        .eq('is_active', true);

      if (badgeError) throw badgeError;

      // Get roles for each user
      const userIds = badges?.map(b => (b.profile as any)?.id).filter(Boolean) || [];
      
      const { data: memberRoles, error: rolesError } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId)
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Combine data
      const ambassadors: AmbassadorWithBadge[] = (badges || []).map(b => {
        const profile = b.profile as any;
        const userRoles = memberRoles?.filter(r => r.user_id === profile?.id).map(r => r.role) || [];
        
        return {
          user_id: profile?.id || '',
          full_name: profile?.full_name || '',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url,
          badge: {
            id: b.id,
            user_id: b.user_id,
            organization_id: b.organization_id,
            badge: b.badge,
            level: b.level as AmbassadorLevel,
            granted_at: b.granted_at,
            granted_by: b.granted_by,
            is_active: b.is_active
          },
          roles: userRoles
        };
      });

      return ambassadors;
    } catch (error: any) {
      console.error('Error fetching ambassadors:', error);
      toast({ variant: "destructive", description: "Error al cargar embajadores" });
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, toast]);

  /**
   * Get users eligible for ambassador badge (creators/editors without badge)
   */
  const getEligibleUsers = useCallback(async (): Promise<AmbassadorWithBadge[]> => {
    if (!currentOrgId) return [];

    setLoading(true);
    try {
      // Get all org members with creator or editor role
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profile:profiles!user_id(id, full_name, email, avatar_url)
        `)
        .eq('organization_id', currentOrgId);

      if (membersError) throw membersError;

      // Get their roles
      const userIds = members?.map(m => m.user_id) || [];
      
      const { data: memberRoles, error: rolesError } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId)
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Get existing badges
      const { data: existingBadges, error: badgesError } = await supabase
        .from('organization_member_badges')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('badge', 'ambassador')
        .eq('is_active', true);

      if (badgesError) throw badgesError;

      const usersWithBadge = new Set(existingBadges?.map(b => b.user_id) || []);

      // Filter to creators/editors without badge
      const eligible: AmbassadorWithBadge[] = (members || [])
        .filter(m => {
          const userRoles = memberRoles?.filter(r => r.user_id === m.user_id).map(r => r.role) || [];
          const isCreatorOrEditor = userRoles.includes('creator') || userRoles.includes('editor');
          const hasBadge = usersWithBadge.has(m.user_id);
          return isCreatorOrEditor && !hasBadge;
        })
        .map(m => {
          const profile = m.profile as any;
          const userRoles = memberRoles?.filter(r => r.user_id === m.user_id).map(r => r.role) || [];
          
          return {
            user_id: m.user_id,
            full_name: profile?.full_name || '',
            email: profile?.email || '',
            avatar_url: profile?.avatar_url,
            badge: null,
            roles: userRoles
          };
        });

      return eligible;
    } catch (error: any) {
      console.error('Error fetching eligible users:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  // Load current user's badge on mount
  useEffect(() => {
    const loadMyBadge = async () => {
      if (user?.id && currentOrgId) {
        const badge = await getBadge(user.id);
        setMyBadge(badge);
      }
    };
    loadMyBadge();
  }, [user?.id, currentOrgId, getBadge]);

  // Subscribe to badge changes
  useEffect(() => {
    if (!currentOrgId) return;

    const channel = supabase
      .channel('ambassador-badges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_member_badges',
          filter: `organization_id=eq.${currentOrgId}`
        },
        async (payload) => {
          // Refresh current user's badge if it was theirs
          if (user?.id && (payload.new as any)?.user_id === user.id) {
            const badge = await getBadge(user.id);
            setMyBadge(badge);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, user?.id, getBadge]);

  return {
    loading,
    myBadge,
    hasBadge,
    getBadge,
    getBadgeLevel,
    grantBadge,
    updateBadgeLevel,
    revokeBadge,
    getAmbassadors,
    getEligibleUsers
  };
}
