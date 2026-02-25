import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Editable fields the creator can modify
export interface CreatorProfileData {
  // Identity
  display_name: string;
  slug: string;
  bio: string;
  bio_full: string;
  // Media
  avatar_url: string;
  banner_url: string;
  showreel_url: string;
  showreel_thumbnail: string;
  // Location
  location_city: string;
  location_country: string;
  // Specialization
  categories: string[];
  content_types: string[];
  languages: string[];
  platforms: string[];
  marketplace_roles: string[];
  // Social
  social_links: Record<string, string>;
  // Pricing
  base_price: number | null;
  currency: string;
  accepts_product_exchange: boolean;
  exchange_conditions: string;
  // Availability
  is_available: boolean;
  response_time_hours: number;
}

export interface CreatorRole {
  id: string;
  label: string;
  category: string;
  description: string;
  icon: string | null;
}

const DEFAULT_PROFILE: CreatorProfileData = {
  display_name: '',
  slug: '',
  bio: '',
  bio_full: '',
  avatar_url: '',
  banner_url: '',
  showreel_url: '',
  showreel_thumbnail: '',
  location_city: '',
  location_country: 'CO',
  categories: [],
  content_types: [],
  languages: ['es'],
  platforms: [],
  marketplace_roles: [],
  social_links: {},
  base_price: null,
  currency: 'USD',
  accepts_product_exchange: false,
  exchange_conditions: '',
  is_available: true,
  response_time_hours: 24,
};

export function useCreatorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch creator profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['creator-profile', user?.id],
    queryFn: async (): Promise<CreatorProfileData | null> => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        display_name: data.display_name || '',
        slug: data.slug || '',
        bio: data.bio || '',
        bio_full: data.bio_full || '',
        avatar_url: data.avatar_url || '',
        banner_url: data.banner_url || '',
        showreel_url: data.showreel_url || '',
        showreel_thumbnail: data.showreel_thumbnail || '',
        location_city: data.location_city || '',
        location_country: data.location_country || 'CO',
        categories: data.categories || [],
        content_types: data.content_types || [],
        languages: data.languages || ['es'],
        platforms: data.platforms || [],
        marketplace_roles: data.marketplace_roles || [],
        social_links: data.social_links || {},
        base_price: data.base_price ?? null,
        currency: data.currency || 'USD',
        accepts_product_exchange: data.accepts_product_exchange || false,
        exchange_conditions: data.exchange_conditions || '',
        is_available: data.is_available ?? true,
        response_time_hours: data.response_time_hours || 24,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch creator roles from DB (NOT hardcoded)
  const { data: roles = [] } = useQuery({
    queryKey: ['creator-roles'],
    queryFn: async (): Promise<CreatorRole[]> => {
      const { data, error } = await (supabase as any)
        .from('creator_roles')
        .select('id, label, category, description, icon')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache - roles rarely change
  });

  // Save (upsert) creator profile
  const saveMutation = useMutation({
    mutationFn: async (data: CreatorProfileData) => {
      if (!user?.id) throw new Error('No autenticado');

      const payload = {
        user_id: user.id,
        display_name: data.display_name,
        slug: data.slug || null,
        bio: data.bio || null,
        bio_full: data.bio_full || null,
        avatar_url: data.avatar_url || null,
        banner_url: data.banner_url || null,
        showreel_url: data.showreel_url || null,
        showreel_thumbnail: data.showreel_thumbnail || null,
        location_city: data.location_city || null,
        location_country: data.location_country || 'CO',
        categories: data.categories,
        content_types: data.content_types,
        languages: data.languages,
        platforms: data.platforms,
        marketplace_roles: data.marketplace_roles,
        social_links: data.social_links,
        base_price: data.base_price,
        currency: data.currency || 'USD',
        accepts_product_exchange: data.accepts_product_exchange,
        exchange_conditions: data.exchange_conditions || null,
        is_available: data.is_available,
        response_time_hours: data.response_time_hours,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('creator_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile', user?.id] });
      toast.success('Perfil de creador guardado');
    },
    onError: (error: Error) => {
      console.error('[useCreatorProfile] Save error:', error);
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  // Upload file to portfolio bucket
  const uploadFile = useCallback(async (file: File, prefix: string): Promise<string | null> => {
    if (!user?.id) return null;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB');
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${prefix}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error(`[useCreatorProfile] Upload ${prefix} error:`, error);
      toast.error('No se pudo subir la imagen');
      return null;
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  const uploadAvatar = useCallback((file: File) => uploadFile(file, 'creator-avatar'), [uploadFile]);
  const uploadBanner = useCallback((file: File) => uploadFile(file, 'creator-banner'), [uploadFile]);

  return {
    profile: profile ?? DEFAULT_PROFILE,
    isNew: profile === null,
    loading: profileLoading,
    error: profileError,
    roles,
    uploading,
    saving: saveMutation.isPending,
    save: saveMutation.mutateAsync,
    uploadAvatar,
    uploadBanner,
  };
}
