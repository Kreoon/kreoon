import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CreatorProfileData {
  id: string;
  user_id: string;
  display_name: string;
  slug: string | null;
  bio: string | null;
  bio_full: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location_city: string | null;
  location_country: string;
  country_flag: string;
  categories: string[];
  content_types: string[];
  languages: string[];
  platforms: string[];
  social_links: Record<string, string>;
  level: 'bronze' | 'silver' | 'gold' | 'elite';
  is_verified: boolean;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  completed_projects: number;
  base_price: number | null;
  currency: string;
  accepts_product_exchange: boolean;
  exchange_conditions: string | null;
  response_time_hours: number;
  on_time_delivery_pct: number;
  repeat_clients_pct: number;
  marketplace_roles: string[];
  is_active: boolean;
  profile_customization: ProfileCustomization;
  showreel_video_id: string | null;
  showreel_url: string | null;
  showreel_thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileCustomization {
  theme?: string;
  primary_color?: string;
  secondary_color?: string;
  card_style?: 'glass' | 'solid' | 'outlined';
  cover_style?: 'gradient' | 'image' | 'video';
  sections_order?: string[];
  sections_visible?: Record<string, boolean>;
}

const DEFAULT_CUSTOMIZATION: ProfileCustomization = {
  theme: 'dark_purple',
  card_style: 'glass',
  cover_style: 'image',
  sections_order: ['about', 'services', 'portfolio', 'stats', 'reviews'],
  sections_visible: { about: true, services: true, portfolio: true, stats: true, reviews: true },
};

interface UseCreatorProfileOptions {
  userId?: string; // If provided, fetch this user's profile (view mode)
  autoCreate?: boolean; // Auto-create profile if not found
}

interface UseCreatorProfileReturn {
  profile: CreatorProfileData | null;
  loading: boolean;
  saving: boolean;
  hasChanges: boolean;
  exists: boolean;
  updateField: <K extends keyof CreatorProfileData>(field: K, value: CreatorProfileData[K]) => void;
  updateFields: (updates: Partial<CreatorProfileData>) => void;
  save: () => Promise<boolean>;
  refresh: () => Promise<void>;
  createProfile: (initialData?: Partial<CreatorProfileData>) => Promise<CreatorProfileData | null>;
}

export function useCreatorProfile(options: UseCreatorProfileOptions = {}): UseCreatorProfileReturn {
  const { userId, autoCreate = false } = options;
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<CreatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasChanges = profile !== null && originalProfile !== null &&
    JSON.stringify(profile) !== JSON.stringify(originalProfile);

  const exists = profile !== null;

  const mapRow = (row: Record<string, unknown>): CreatorProfileData => ({
    id: row.id as string,
    user_id: row.user_id as string,
    display_name: row.display_name as string || '',
    slug: row.slug as string | null,
    bio: row.bio as string | null,
    bio_full: row.bio_full as string | null,
    avatar_url: row.avatar_url as string | null,
    banner_url: row.banner_url as string | null,
    location_city: row.location_city as string | null,
    location_country: row.location_country as string || 'CO',
    country_flag: row.country_flag as string || '',
    categories: (row.categories as string[]) || [],
    content_types: (row.content_types as string[]) || [],
    languages: (row.languages as string[]) || ['es'],
    platforms: (row.platforms as string[]) || [],
    social_links: (row.social_links as Record<string, string>) || {},
    level: (row.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    is_verified: (row.is_verified as boolean) || false,
    is_available: row.is_available !== false,
    rating_avg: Number(row.rating_avg) || 0,
    rating_count: Number(row.rating_count) || 0,
    completed_projects: Number(row.completed_projects) || 0,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    currency: (row.currency as string) || 'USD',
    accepts_product_exchange: (row.accepts_product_exchange as boolean) || false,
    exchange_conditions: row.exchange_conditions as string | null,
    response_time_hours: Number(row.response_time_hours) || 24,
    on_time_delivery_pct: Number(row.on_time_delivery_pct) || 100,
    repeat_clients_pct: Number(row.repeat_clients_pct) || 0,
    marketplace_roles: (row.marketplace_roles as string[]) || [],
    is_active: row.is_active !== false,
    profile_customization: (row.profile_customization as ProfileCustomization) || { ...DEFAULT_CUSTOMIZATION },
    showreel_video_id: row.showreel_video_id as string | null,
    showreel_url: row.showreel_url as string | null,
    showreel_thumbnail: row.showreel_thumbnail as string | null,
    created_at: row.created_at as string || '',
    updated_at: row.updated_at as string || '',
  });

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('creator_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const mapped = mapRow(data);
        setProfile(mapped);
        setOriginalProfile(mapped);
      } else {
        setProfile(null);
        setOriginalProfile(null);
      }
    } catch (err) {
      console.error('[useCreatorProfile] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const createProfile = useCallback(async (initialData?: Partial<CreatorProfileData>): Promise<CreatorProfileData | null> => {
    if (!user?.id) return null;

    setSaving(true);
    try {
      // Get display name + username from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url, bio, city, country, tagline, specialties_tags, content_categories, languages, instagram, tiktok, social_youtube, social_linkedin, social_twitter')
        .eq('id', user.id)
        .maybeSingle();

      const insertData = {
        user_id: user.id,
        display_name: initialData?.display_name || profileData?.full_name || 'Creador',
        // Use username as marketplace URL slug
        slug: (profileData as any)?.username || undefined,
        avatar_url: initialData?.avatar_url || profileData?.avatar_url || null,
        bio: initialData?.bio || profileData?.bio || null,
        bio_full: initialData?.bio_full || profileData?.tagline || null,
        location_city: initialData?.location_city || profileData?.city || null,
        location_country: initialData?.location_country || profileData?.country || 'CO',
        categories: initialData?.categories || (profileData as any)?.content_categories || [],
        languages: initialData?.languages || (profileData as any)?.languages || ['es'],
        social_links: {
          ...(profileData?.instagram ? { instagram: profileData.instagram } : {}),
          ...(profileData?.tiktok ? { tiktok: profileData.tiktok } : {}),
          ...((profileData as any)?.social_youtube ? { youtube: (profileData as any).social_youtube } : {}),
          ...((profileData as any)?.social_linkedin ? { linkedin: (profileData as any).social_linkedin } : {}),
          ...((profileData as any)?.social_twitter ? { twitter: (profileData as any).social_twitter } : {}),
        },
        marketplace_roles: initialData?.marketplace_roles || [],
        content_types: initialData?.content_types || [],
        platforms: initialData?.platforms || [],
        is_active: true,
        profile_customization: DEFAULT_CUSTOMIZATION,
        ...(initialData ? Object.fromEntries(
          Object.entries(initialData).filter(([k]) =>
            !['id', 'created_at', 'updated_at', 'rating_avg', 'rating_count', 'completed_projects'].includes(k)
          )
        ) : {}),
      };

      const { data, error } = await (supabase as any)
        .from('creator_profiles')
        .insert(insertData)
        .select('*')
        .single();

      if (error) throw error;

      const mapped = mapRow(data);
      setProfile(mapped);
      setOriginalProfile(mapped);
      toast.success('Perfil de marketplace creado');
      return mapped;
    } catch (err) {
      console.error('[useCreatorProfile] Error creating:', err);
      toast.error('Error al crear el perfil');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const updateField = useCallback(<K extends keyof CreatorProfileData>(
    field: K,
    value: CreatorProfileData[K]
  ) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const updateFields = useCallback((updates: Partial<CreatorProfileData>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!profile?.id) return false;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        display_name: profile.display_name,
        bio: profile.bio,
        bio_full: profile.bio_full,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        location_city: profile.location_city,
        location_country: profile.location_country,
        country_flag: profile.country_flag,
        categories: profile.categories,
        content_types: profile.content_types,
        languages: profile.languages,
        platforms: profile.platforms,
        social_links: profile.social_links,
        is_available: profile.is_available,
        base_price: profile.base_price,
        currency: profile.currency,
        accepts_product_exchange: profile.accepts_product_exchange,
        exchange_conditions: profile.exchange_conditions,
        response_time_hours: profile.response_time_hours,
        marketplace_roles: profile.marketplace_roles,
        is_active: profile.is_active,
        profile_customization: profile.profile_customization,
        showreel_video_id: profile.showreel_video_id,
        showreel_url: profile.showreel_url,
        showreel_thumbnail: profile.showreel_thumbnail,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('creator_profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      setOriginalProfile(profile);
      toast.success('Perfil guardado');
      return true;
    } catch (err) {
      console.error('[useCreatorProfile] Error saving:', err);
      toast.error('Error al guardar el perfil');
      return false;
    } finally {
      setSaving(false);
    }
  }, [profile]);

  return {
    profile,
    loading,
    saving,
    hasChanges,
    exists,
    updateField,
    updateFields,
    save,
    refresh: fetchProfile,
    createProfile,
  };
}
