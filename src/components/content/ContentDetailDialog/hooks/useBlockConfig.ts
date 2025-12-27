import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Content } from '@/types/database';
import { BlockKey, DEFAULT_BLOCKS, BLOCK_METADATA } from '../Config/types';

interface BlockConfig {
  block_key: string;
  is_visible: boolean;
  sort_order: number;
  layout_type: string;
}

interface BlockPermission {
  block_key: string;
  role: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_approve: boolean;
  can_lock: boolean;
}

interface BlockStateRule {
  block_key: string;
  status_id: string | null;
  is_locked: boolean;
  is_hidden: boolean;
  editable_roles: string[] | null;
}

interface AdvancedConfig {
  enable_comments: boolean;
  require_approval_before_advance: boolean;
  client_read_only_mode: boolean;
  enable_custom_fields: boolean;
  content_types: string[];
  text_editor_features: Record<string, boolean>;
}

interface ContentWithOrgFields extends Content {
  organization_id?: string | null;
  custom_status_id?: string | null;
}

export interface BlockConfigHook {
  loading: boolean;
  blocks: BlockConfig[];
  permissions: BlockPermission[];
  stateRules: BlockStateRule[];
  advanced: AdvancedConfig | null;
  // Helper functions
  isBlockVisible: (blockKey: BlockKey) => boolean;
  isBlockLocked: (blockKey: BlockKey) => boolean;
  isBlockHidden: (blockKey: BlockKey) => boolean;
  canViewBlock: (blockKey: BlockKey) => boolean;
  canEditBlock: (blockKey: BlockKey) => boolean;
  canApproveBlock: (blockKey: BlockKey) => boolean;
  getVisibleBlocks: () => BlockKey[];
  getSortedBlocks: () => BlockKey[];
}

export function useBlockConfig(
  content: Content | null,
  organizationId?: string | null
): BlockConfigHook {
  const { user, isAdmin, isCreator, isEditor, isClient } = useAuth();
  const [blocks, setBlocks] = useState<BlockConfig[]>([]);
  const [permissions, setPermissions] = useState<BlockPermission[]>([]);
  const [stateRules, setStateRules] = useState<BlockStateRule[]>([]);
  const [advanced, setAdvanced] = useState<AdvancedConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const contentExt = content as ContentWithOrgFields | null;

  // Determine effective role
  const effectiveRole = useMemo(() => {
    if (isAdmin) return 'admin';
    if (content?.strategist_id === user?.id) return 'strategist';
    if (isCreator && content?.creator_id === user?.id) return 'creator';
    if (isEditor && content?.editor_id === user?.id) return 'editor';
    if (isClient) return 'client';
    return 'guest';
  }, [isAdmin, isCreator, isEditor, isClient, content, user?.id]);

  // Fetch configuration from database
  const fetchConfig = useCallback(async () => {
    const orgId = organizationId || contentExt?.organization_id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all config in parallel
      const [blocksRes, permsRes, rulesRes, advancedRes] = await Promise.all([
        supabase
          .from('content_block_config')
          .select('*')
          .eq('organization_id', orgId),
        supabase
          .from('content_block_permissions')
          .select('*')
          .eq('organization_id', orgId)
          .eq('role', effectiveRole),
        supabase
          .from('content_block_state_rules')
          .select('*')
          .eq('organization_id', orgId),
        supabase
          .from('content_advanced_config')
          .select('*')
          .eq('organization_id', orgId)
          .maybeSingle(),
      ]);

      setBlocks((blocksRes.data || []) as any);
      setPermissions((permsRes.data || []) as any);
      setStateRules((rulesRes.data || []) as any);

      if (advancedRes.data) {
        setAdvanced({
          enable_comments: advancedRes.data.enable_comments,
          require_approval_before_advance: advancedRes.data.require_approval_before_advance,
          client_read_only_mode: advancedRes.data.client_read_only_mode,
          enable_custom_fields: advancedRes.data.enable_custom_fields,
          content_types: (advancedRes.data.content_types as string[]) || [],
          text_editor_features: (advancedRes.data.text_editor_features as Record<string, boolean>) || {},
        });
      } else {
        setAdvanced(null);
      }
    } catch (err) {
      console.error('Error fetching block config:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, contentExt?.organization_id, effectiveRole]);

  // Initial fetch + refetch when org/role changes
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Realtime refresh when config changes
  useEffect(() => {
    const orgId = organizationId || contentExt?.organization_id;
    if (!orgId) return;

    const channel = supabase
      .channel(`content-config-${orgId}-${effectiveRole}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_block_config', filter: `organization_id=eq.${orgId}` },
        () => fetchConfig()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_block_state_rules', filter: `organization_id=eq.${orgId}` },
        () => fetchConfig()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_block_permissions', filter: `organization_id=eq.${orgId}` },
        () => fetchConfig()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_advanced_config', filter: `organization_id=eq.${orgId}` },
        () => fetchConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, contentExt?.organization_id, effectiveRole, fetchConfig]);

  // Check if block is visible in org config
  const isBlockVisible = useCallback((blockKey: BlockKey): boolean => {
    const block = blocks.find(b => b.block_key === blockKey);
    // If no config exists, default to visible
    return block?.is_visible ?? true;
  }, [blocks]);

  // Check if block is locked for current status
  const isBlockLocked = useCallback((blockKey: BlockKey): boolean => {
    const currentStatusId = contentExt?.custom_status_id;
    if (!currentStatusId) return false;

    const rule = stateRules.find(
      r => r.block_key === blockKey && r.status_id === currentStatusId
    );
    
    if (rule?.is_locked) {
      // Check if current role can still edit
      if (rule.editable_roles?.includes(effectiveRole)) {
        return false;
      }
      return true;
    }
    
    return false;
  }, [stateRules, contentExt?.custom_status_id, effectiveRole]);

  // Check if block is hidden for current status
  const isBlockHidden = useCallback((blockKey: BlockKey): boolean => {
    const currentStatusId = contentExt?.custom_status_id;
    if (!currentStatusId) return false;

    const rule = stateRules.find(
      r => r.block_key === blockKey && r.status_id === currentStatusId
    );
    
    return rule?.is_hidden ?? false;
  }, [stateRules, contentExt?.custom_status_id]);

  // Check if user can view block
  const canViewBlock = useCallback((blockKey: BlockKey): boolean => {
    // FIRST: Check org-level visibility (applies to ALL users including admin)
    // This is set in the "Bloques" tab - if hidden here, NO ONE sees it
    if (!isBlockVisible(blockKey)) return false;
    
    // SECOND: Check status-based hidden (applies to all users)
    if (isBlockHidden(blockKey)) return false;
    
    // THIRD: Check role-based permission from content_block_permissions
    // This applies to ALL roles including admin
    const perm = permissions.find(p => p.block_key === blockKey);
    if (perm) {
      // If there's a permission configured for this role, respect it
      return perm.can_view;
    }
    
    // If no permission configured for this role, default to true
    return true;
  }, [isBlockVisible, isBlockHidden, permissions]);

  // Check if user can edit block
  const canEditBlock = useCallback((blockKey: BlockKey): boolean => {
    // Check if block is locked for current status
    if (isBlockLocked(blockKey)) return false;
    
    // Check client read-only mode
    if (isClient && advanced?.client_read_only_mode) return false;
    
    // Check role-based permission from content_block_permissions
    const perm = permissions.find(p => p.block_key === blockKey);
    if (perm) {
      // If there's a permission configured for this role, respect it
      return perm.can_edit;
    }
    
    // If no permission configured, default based on role
    // Admin defaults to true, others default to false
    return isAdmin;
  }, [isClient, isAdmin, isBlockLocked, permissions, advanced?.client_read_only_mode]);

  // Check if user can approve block
  const canApproveBlock = useCallback((blockKey: BlockKey): boolean => {
    const perm = permissions.find(p => p.block_key === blockKey);
    return perm?.can_approve ?? isAdmin;
  }, [permissions, isAdmin]);

  // Get visible blocks for current user
  const getVisibleBlocks = useCallback((): BlockKey[] => {
    return DEFAULT_BLOCKS.filter(blockKey => canViewBlock(blockKey));
  }, [canViewBlock]);

  // Get sorted blocks
  const getSortedBlocks = useCallback((): BlockKey[] => {
    const visible = getVisibleBlocks();
    
    return visible.sort((a, b) => {
      const aBlock = blocks.find(bl => bl.block_key === a);
      const bBlock = blocks.find(bl => bl.block_key === b);
      return (aBlock?.sort_order ?? 0) - (bBlock?.sort_order ?? 0);
    });
  }, [getVisibleBlocks, blocks]);

  return {
    loading,
    blocks,
    permissions,
    stateRules,
    advanced,
    isBlockVisible,
    isBlockLocked,
    isBlockHidden,
    canViewBlock,
    canEditBlock,
    canApproveBlock,
    getVisibleBlocks,
    getSortedBlocks,
  };
}
