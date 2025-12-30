import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface OrgSocialSettings {
  id: string;
  organization_id: string;
  public_network_enabled: boolean;
  feed_public: boolean;
  explore_public: boolean;
  videos_public: boolean;
  profiles_public: boolean;
  allow_external_follow: boolean;
  allow_external_discovery: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<OrgSocialSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  public_network_enabled: true,
  feed_public: true,
  explore_public: true,
  videos_public: true,
  profiles_public: true,
  allow_external_follow: true,
  allow_external_discovery: true,
};

export function useOrgSocialSettings() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<OrgSocialSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const organizationId = profile?.current_organization_id;

  const fetchSettings = useCallback(async () => {
    if (!organizationId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organization_social_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('organization_social_settings')
            .insert({ organization_id: organizationId })
            .select()
            .single();

          if (!insertError && newData) {
            setSettings(newData as OrgSocialSettings);
          }
        } else {
          console.error('[useOrgSocialSettings] Error:', error);
        }
      } else {
        setSettings(data as OrgSocialSettings);
      }
    } catch (error) {
      console.error('[useOrgSocialSettings] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<OrgSocialSettings>) => {
    if (!settings?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organization_social_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) {
        console.error('[useOrgSocialSettings] Update error:', error);
        return false;
      }

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('[useOrgSocialSettings] Update error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings?.id]);

  // Helper functions to check visibility for each section
  const canViewPublicFeed = settings?.public_network_enabled && settings?.feed_public;
  const canViewPublicExplore = settings?.public_network_enabled && settings?.explore_public;
  const canViewPublicVideos = settings?.public_network_enabled && settings?.videos_public;
  const canViewPublicProfiles = settings?.public_network_enabled && settings?.profiles_public;
  const canFollowExternal = settings?.public_network_enabled && settings?.allow_external_follow;
  const canBeDiscovered = settings?.public_network_enabled && settings?.allow_external_discovery;

  // For users without org (independent), all public features are enabled
  const isIndependent = !organizationId;

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refetch: fetchSettings,
    // Visibility helpers (true if independent or if org allows it)
    canViewPublicFeed: isIndependent || canViewPublicFeed !== false,
    canViewPublicExplore: isIndependent || canViewPublicExplore !== false,
    canViewPublicVideos: isIndependent || canViewPublicVideos !== false,
    canViewPublicProfiles: isIndependent || canViewPublicProfiles !== false,
    canFollowExternal: isIndependent || canFollowExternal !== false,
    canBeDiscovered: isIndependent || canBeDiscovered !== false,
    isIndependent,
  };
}
