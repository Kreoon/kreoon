import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { 
  BlockConfig, 
  BlockPermission, 
  BlockStateRule, 
  AdvancedConfig,
  ContentConfigState,
  BlockKey,
  TextEditorFeatures
} from './types';

const DEFAULT_TEXT_FEATURES = {
  headings: true,
  bold: true,
  italic: true,
  underline: true,
  lists: true,
  quotes: true,
  code: true,
  highlight: true,
  emojis: true,
  comments: true,
  history: true,
};

export function useContentConfig(organizationId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<ContentConfigState>({
    blocks: [],
    permissions: [],
    stateRules: [],
    advanced: null,
    loading: true,
  });

  // Fetch all configuration
  const fetchConfig = useCallback(async () => {
    if (!organizationId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const [blocksRes, permissionsRes, stateRulesRes, advancedRes] = await Promise.all([
        supabase.from('content_block_config').select('*').eq('organization_id', organizationId),
        supabase.from('content_block_permissions').select('*').eq('organization_id', organizationId),
        supabase.from('content_block_state_rules').select('*').eq('organization_id', organizationId),
        supabase.from('content_advanced_config').select('*').eq('organization_id', organizationId).maybeSingle(),
      ]);

      const advancedData = advancedRes.data ? {
        ...advancedRes.data,
        content_types: advancedRes.data.content_types as string[],
        text_editor_features: advancedRes.data.text_editor_features as unknown as TextEditorFeatures,
      } : null;

      setState({
        blocks: (blocksRes.data || []) as BlockConfig[],
        permissions: (permissionsRes.data || []) as BlockPermission[],
        stateRules: (stateRulesRes.data || []) as BlockStateRule[],
        advanced: advancedData as AdvancedConfig | null,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching content config:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update block visibility
  const updateBlockVisibility = useCallback(async (blockKey: BlockKey, isVisible: boolean) => {
    if (!organizationId) return;

    try {
      const { error } = await supabase
        .from('content_block_config')
        .upsert({
          organization_id: organizationId,
          block_key: blockKey,
          is_visible: isVisible,
        }, { onConflict: 'organization_id,block_key' });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        blocks: prev.blocks.some(b => b.block_key === blockKey)
          ? prev.blocks.map(b => b.block_key === blockKey ? { ...b, is_visible: isVisible } : b)
          : [...prev.blocks, { 
              id: '', 
              organization_id: organizationId, 
              block_key: blockKey, 
              is_visible: isVisible, 
              sort_order: 0, 
              layout_type: 'tab' as const 
            }]
      }));

      toast.success('Configuración actualizada');
    } catch (error) {
      console.error('Error updating block visibility:', error);
      toast.error('Error al actualizar la configuración');
    }
  }, [organizationId]);

  // Update block order
  const updateBlockOrder = useCallback(async (orderedBlocks: { block_key: BlockKey; sort_order: number }[]) => {
    if (!organizationId) return;

    try {
      const upserts = orderedBlocks.map(b => ({
        organization_id: organizationId,
        block_key: b.block_key,
        sort_order: b.sort_order,
        is_visible: true,
      }));

      const { error } = await supabase
        .from('content_block_config')
        .upsert(upserts, { onConflict: 'organization_id,block_key' });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        blocks: prev.blocks.map(b => {
          const updated = orderedBlocks.find(ob => ob.block_key === b.block_key);
          return updated ? { ...b, sort_order: updated.sort_order } : b;
        })
      }));

      toast.success('Orden actualizado');
    } catch (error) {
      console.error('Error updating block order:', error);
      toast.error('Error al actualizar el orden');
    }
  }, [organizationId]);

  // Update block permission
  const updateBlockPermission = useCallback(async (
    blockKey: BlockKey, 
    role: string, 
    permission: Partial<Omit<BlockPermission, 'id' | 'organization_id' | 'block_key' | 'role'>>
  ) => {
    if (!organizationId) return;

    try {
      const existingPerm = state.permissions.find(
        p => p.block_key === blockKey && p.role === role
      );

      const newPerm = {
        organization_id: organizationId,
        block_key: blockKey,
        role,
        can_view: permission.can_view ?? existingPerm?.can_view ?? false,
        can_create: permission.can_create ?? existingPerm?.can_create ?? false,
        can_edit: permission.can_edit ?? existingPerm?.can_edit ?? false,
        can_approve: permission.can_approve ?? existingPerm?.can_approve ?? false,
        can_lock: permission.can_lock ?? existingPerm?.can_lock ?? false,
      };

      const { error } = await supabase
        .from('content_block_permissions')
        .upsert(newPerm, { onConflict: 'organization_id,block_key,role' });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        permissions: prev.permissions.some(p => p.block_key === blockKey && p.role === role)
          ? prev.permissions.map(p => 
              p.block_key === blockKey && p.role === role 
                ? { ...p, ...permission } 
                : p
            )
          : [...prev.permissions, { ...newPerm, id: '' }]
      }));

      toast.success('Permisos actualizados');
    } catch (error) {
      console.error('Error updating block permission:', error);
      toast.error('Error al actualizar los permisos');
    }
  }, [organizationId, state.permissions]);

  // Update state rule
  const updateStateRule = useCallback(async (
    statusId: string,
    blockKey: BlockKey,
    rule: Partial<Omit<BlockStateRule, 'id' | 'organization_id' | 'status_id' | 'block_key'>>
  ) => {
    if (!organizationId) return;

    try {
      const existingRule = state.stateRules.find(
        r => r.status_id === statusId && r.block_key === blockKey
      );

      const newRule = {
        organization_id: organizationId,
        status_id: statusId,
        block_key: blockKey,
        is_locked: rule.is_locked ?? existingRule?.is_locked ?? false,
        is_hidden: rule.is_hidden ?? existingRule?.is_hidden ?? false,
        editable_roles: rule.editable_roles ?? existingRule?.editable_roles ?? [],
      };

      const { error } = await supabase
        .from('content_block_state_rules')
        .upsert(newRule, { onConflict: 'organization_id,status_id,block_key' });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        stateRules: prev.stateRules.some(r => r.status_id === statusId && r.block_key === blockKey)
          ? prev.stateRules.map(r => 
              r.status_id === statusId && r.block_key === blockKey 
                ? { ...r, ...rule } 
                : r
            )
          : [...prev.stateRules, { ...newRule, id: '' }]
      }));

      toast.success('Regla de estado actualizada');
    } catch (error) {
      console.error('Error updating state rule:', error);
      toast.error('Error al actualizar la regla');
    }
  }, [organizationId, state.stateRules]);

  // Update advanced config
  const updateAdvancedConfig = useCallback(async (
    config: Partial<Omit<AdvancedConfig, 'id' | 'organization_id'>>
  ) => {
    if (!organizationId) return;

    try {
      const newConfig = {
        organization_id: organizationId,
        enable_comments: config.enable_comments ?? state.advanced?.enable_comments ?? true,
        require_approval_before_advance: config.require_approval_before_advance ?? state.advanced?.require_approval_before_advance ?? false,
        client_read_only_mode: config.client_read_only_mode ?? state.advanced?.client_read_only_mode ?? true,
        enable_custom_fields: config.enable_custom_fields ?? state.advanced?.enable_custom_fields ?? true,
        content_types: (config.content_types ?? state.advanced?.content_types ?? ['UGC', 'Ads', 'Orgánico']) as unknown as Json,
        text_editor_features: (config.text_editor_features ?? state.advanced?.text_editor_features ?? DEFAULT_TEXT_FEATURES) as unknown as Json,
      };

      const { error } = await supabase
        .from('content_advanced_config')
        .upsert([newConfig], { onConflict: 'organization_id' });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        advanced: {
          id: prev.advanced?.id ?? '',
          organization_id: organizationId,
          enable_comments: config.enable_comments ?? prev.advanced?.enable_comments ?? true,
          require_approval_before_advance: config.require_approval_before_advance ?? prev.advanced?.require_approval_before_advance ?? false,
          client_read_only_mode: config.client_read_only_mode ?? prev.advanced?.client_read_only_mode ?? true,
          enable_custom_fields: config.enable_custom_fields ?? prev.advanced?.enable_custom_fields ?? true,
          content_types: config.content_types ?? prev.advanced?.content_types ?? ['UGC', 'Ads', 'Orgánico'],
          text_editor_features: config.text_editor_features ?? prev.advanced?.text_editor_features ?? DEFAULT_TEXT_FEATURES,
        }
      }));

      toast.success('Configuración avanzada actualizada');
    } catch (error) {
      console.error('Error updating advanced config:', error);
      toast.error('Error al actualizar la configuración');
    }
  }, [organizationId, state.advanced]);

  // Get effective visibility for a block
  const isBlockVisible = useCallback((blockKey: BlockKey): boolean => {
    const config = state.blocks.find(b => b.block_key === blockKey);
    return config?.is_visible ?? true; // Default to visible if not configured
  }, [state.blocks]);

  // Get effective permission for a role on a block
  const getBlockPermission = useCallback((blockKey: BlockKey, role: string): BlockPermission | null => {
    return state.permissions.find(p => p.block_key === blockKey && p.role === role) ?? null;
  }, [state.permissions]);

  // Get state rule for a status and block
  const getStateRule = useCallback((statusId: string, blockKey: BlockKey): BlockStateRule | null => {
    return state.stateRules.find(r => r.status_id === statusId && r.block_key === blockKey) ?? null;
  }, [state.stateRules]);

  return {
    ...state,
    fetchConfig,
    updateBlockVisibility,
    updateBlockOrder,
    updateBlockPermission,
    updateStateRule,
    updateAdvancedConfig,
    isBlockVisible,
    getBlockPermission,
    getStateRule,
  };
}
