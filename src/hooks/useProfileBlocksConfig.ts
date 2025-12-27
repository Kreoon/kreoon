import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ProfileBlock } from './usePortfolioPermissions';
import { Json } from '@/integrations/supabase/types';

const DEFAULT_BLOCKS: ProfileBlock[] = [
  { key: 'hero', label: 'Hero', enabled: true, order: 0, visibility: 'public', is_internal: false },
  { key: 'highlights', label: 'Highlights', enabled: true, order: 1, visibility: 'public', is_internal: false },
  { key: 'portfolio_grid', label: 'Portfolio', enabled: true, order: 2, visibility: 'public', is_internal: false },
  { key: 'skills', label: 'Skills', enabled: true, order: 3, visibility: 'public', is_internal: false },
  { key: 'certifications', label: 'Certifications', enabled: true, order: 4, visibility: 'public', is_internal: false },
  { key: 'testimonials', label: 'Testimonials', enabled: true, order: 5, visibility: 'public', is_internal: false },
  { key: 'public_stats', label: 'Stats', enabled: true, order: 6, visibility: 'public', is_internal: false },
  { key: 'collections', label: 'Collections', enabled: true, order: 7, visibility: 'public', is_internal: false },
  { key: 'internal_verification', label: 'Verification', enabled: true, order: 100, visibility: 'org_admin', is_internal: true },
  { key: 'private_contact', label: 'Private Contact', enabled: true, order: 101, visibility: 'org_admin', is_internal: true },
  { key: 'legal_id', label: 'Legal ID', enabled: true, order: 102, visibility: 'org_admin', is_internal: true },
  { key: 'payment_info', label: 'Payment Info', enabled: true, order: 103, visibility: 'org_admin', is_internal: true },
  { key: 'internal_notes', label: 'Internal Notes', enabled: true, order: 104, visibility: 'org_admin', is_internal: true },
  { key: 'internal_metrics', label: 'Internal Metrics', enabled: true, order: 105, visibility: 'org_admin', is_internal: true },
];

export interface ProfileBlocksConfigHook {
  blocks: ProfileBlock[];
  loading: boolean;
  saving: boolean;
  updateBlocks: (blocks: ProfileBlock[]) => Promise<boolean>;
  toggleBlock: (key: string) => Promise<boolean>;
  reorderBlocks: (orderedKeys: string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useProfileBlocksConfig(profileType: 'user' | 'company' = 'user'): ProfileBlocksConfigHook {
  const { user, profile } = useAuth();
  const organizationId = profile?.current_organization_id;
  const [blocks, setBlocks] = useState<ProfileBlock[]>(DEFAULT_BLOCKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!organizationId) {
      setBlocks(DEFAULT_BLOCKS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profile_blocks_config')
        .select('blocks')
        .eq('organization_id', organizationId)
        .eq('profile_type', profileType)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[useProfileBlocksConfig] Error:', error);
      }

      if (data?.blocks) {
        // Parse JSON blocks safely
        const rawBlocks = data.blocks as Json;
        const configBlocks: ProfileBlock[] = Array.isArray(rawBlocks) 
          ? (rawBlocks as unknown as ProfileBlock[])
          : [];
        
        // Merge with defaults to ensure all blocks exist
        const mergedBlocks = DEFAULT_BLOCKS.map(defaultBlock => {
          const configBlock = configBlocks.find(b => b.key === defaultBlock.key);
          return configBlock ? { ...defaultBlock, ...configBlock } : defaultBlock;
        });
        // Add any custom blocks from config that aren't in defaults
        const customBlocks = configBlocks.filter(
          b => !DEFAULT_BLOCKS.find(d => d.key === b.key)
        );
        setBlocks([...mergedBlocks, ...customBlocks].sort((a, b) => a.order - b.order));
      } else {
        setBlocks(DEFAULT_BLOCKS);
      }
    } catch (error) {
      console.error('[useProfileBlocksConfig] Error:', error);
      setBlocks(DEFAULT_BLOCKS);
    } finally {
      setLoading(false);
    }
  }, [organizationId, profileType]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateBlocks = useCallback(async (newBlocks: ProfileBlock[]): Promise<boolean> => {
    if (!organizationId || !user?.id) return false;

    setSaving(true);
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('profile_blocks_config')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('profile_type', profileType)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('profile_blocks_config')
          .update({
            blocks: newBlocks as unknown as Json,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_blocks_config')
          .insert({
            organization_id: organizationId,
            profile_type: profileType,
            blocks: newBlocks as unknown as Json,
            updated_by: user.id,
          });
        if (error) throw error;
      }

      setBlocks(newBlocks.sort((a, b) => a.order - b.order));
      return true;
    } catch (error) {
      console.error('[useProfileBlocksConfig] Update error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [organizationId, user?.id, profileType]);

  const toggleBlock = useCallback(async (key: string): Promise<boolean> => {
    const newBlocks = blocks.map(b => 
      b.key === key ? { ...b, enabled: !b.enabled } : b
    );
    return updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const reorderBlocks = useCallback(async (orderedKeys: string[]): Promise<boolean> => {
    const newBlocks = orderedKeys.map((key, index) => {
      const block = blocks.find(b => b.key === key);
      return block ? { ...block, order: index } : null;
    }).filter(Boolean) as ProfileBlock[];
    
    // Add any blocks not in the order list at the end
    const missingBlocks = blocks.filter(b => !orderedKeys.includes(b.key));
    missingBlocks.forEach((block, i) => {
      newBlocks.push({ ...block, order: orderedKeys.length + i });
    });

    return updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  return {
    blocks,
    loading,
    saving,
    updateBlocks,
    toggleBlock,
    reorderBlocks,
    refetch: fetchConfig,
  };
}
