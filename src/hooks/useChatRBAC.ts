import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatVisibleUser {
  user_id: string;
  can_chat: boolean;
  can_add_to_group: boolean;
}

export interface ChatRBACRule {
  id: string;
  organization_id: string;
  source_role: string;
  target_role: string;
  can_chat: boolean;
  can_see_in_list: boolean;
  can_add_to_group: boolean;
}

export function useChatRBAC() {
  const { user, profile } = useAuth();
  const [visibleUsers, setVisibleUsers] = useState<ChatVisibleUser[]>([]);
  const [rbacRules, setRbacRules] = useState<ChatRBACRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const orgId = profile?.current_organization_id;

  // Fetch user's role in org
  useEffect(() => {
    if (!user?.id || !orgId) return;

    const fetchRole = async () => {
      const { data } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .maybeSingle();
      
      setUserRole(data?.role || null);
    };

    fetchRole();
  }, [user?.id, orgId]);

  // Fetch visible users using DB function
  const fetchVisibleUsers = useCallback(async () => {
    if (!user?.id || !orgId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_chat_visible_users', {
          _user_id: user.id,
          _org_id: orgId
        });

      if (error) throw error;
      setVisibleUsers(data || []);
    } catch (error) {
      console.error('Error fetching visible users:', error);
      setVisibleUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, orgId]);

  // Fetch RBAC rules for admin panel
  const fetchRBACRules = useCallback(async () => {
    if (!orgId) return;

    try {
      const { data, error } = await supabase
        .from('chat_rbac_rules')
        .select('*')
        .eq('organization_id', orgId);

      if (error) throw error;
      setRbacRules(data || []);
    } catch (error) {
      console.error('Error fetching RBAC rules:', error);
    }
  }, [orgId]);

  // Check if user can chat with another user
  const canChatWith = useCallback((targetUserId: string): boolean => {
    const visible = visibleUsers.find(u => u.user_id === targetUserId);
    return visible?.can_chat ?? false;
  }, [visibleUsers]);

  // Check if user can add another user to group
  const canAddToGroup = useCallback((targetUserId: string): boolean => {
    const visible = visibleUsers.find(u => u.user_id === targetUserId);
    return visible?.can_add_to_group ?? false;
  }, [visibleUsers]);

  // Update RBAC rule
  const updateRule = useCallback(async (
    sourceRole: string,
    targetRole: string,
    updates: Partial<Pick<ChatRBACRule, 'can_chat' | 'can_see_in_list' | 'can_add_to_group'>>
  ) => {
    if (!orgId) return;

    try {
      const { error } = await supabase
        .from('chat_rbac_rules')
        .upsert({
          organization_id: orgId,
          source_role: sourceRole,
          target_role: targetRole,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,source_role,target_role'
        });

      if (error) throw error;
      await fetchRBACRules();
    } catch (error) {
      console.error('Error updating RBAC rule:', error);
      throw error;
    }
  }, [orgId, fetchRBACRules]);

  // Initialize default rules for org
  const initializeDefaultRules = useCallback(async () => {
    if (!orgId) return;

    try {
      const { error } = await supabase
        .rpc('create_default_chat_rbac_rules', { _org_id: orgId });

      if (error) throw error;
      await fetchRBACRules();
    } catch (error) {
      console.error('Error initializing RBAC rules:', error);
      throw error;
    }
  }, [orgId, fetchRBACRules]);

  useEffect(() => {
    fetchVisibleUsers();
    fetchRBACRules();
  }, [fetchVisibleUsers, fetchRBACRules]);

  return {
    visibleUsers,
    rbacRules,
    loading,
    userRole,
    canChatWith,
    canAddToGroup,
    updateRule,
    initializeDefaultRules,
    refetchVisibleUsers: fetchVisibleUsers,
    refetchRules: fetchRBACRules
  };
}
