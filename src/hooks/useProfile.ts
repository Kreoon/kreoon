import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

// Complete profile interface with ALL fields from profiles table
export interface ProfileData {
  id: string;
  // Basic info
  full_name: string;
  email: string;
  username: string;
  bio: string;
  tagline: string;
  avatar_url: string;
  cover_url: string;
  // Location
  city: string;
  country: string;
  address: string;
  phone: string;
  // Documents
  document_type: string;
  document_number: string;
  // Professional info
  best_at: string;
  experience_level: string;
  availability_status: string;
  rate_per_content: number | null;
  rate_currency: string;
  // Tags/Arrays
  interests: string[];
  specialties_tags: string[];
  content_categories: string[];
  industries: string[];
  style_keywords: string[];
  languages: string[];
  // Social media
  instagram: string;
  tiktok: string;
  facebook: string;
  social_linkedin: string;
  social_youtube: string;
  social_twitter: string;
  portfolio_url: string;
  // Settings
  is_public: boolean;
  // Currency
  display_currency: string;
  // Organization
  current_organization_id: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export const DEFAULT_PROFILE: Omit<ProfileData, 'id' | 'email' | 'created_at' | 'updated_at'> = {
  full_name: '',
  username: '',
  bio: '',
  tagline: '',
  avatar_url: '',
  cover_url: '',
  city: '',
  country: '',
  address: '',
  phone: '',
  document_type: '',
  document_number: '',
  best_at: '',
  experience_level: 'junior',
  availability_status: 'available',
  rate_per_content: null,
  rate_currency: 'COP',
  interests: [],
  specialties_tags: [],
  content_categories: [],
  industries: [],
  style_keywords: [],
  languages: [],
  instagram: '',
  tiktok: '',
  facebook: '',
  social_linkedin: '',
  social_youtube: '',
  social_twitter: '',
  portfolio_url: '',
  is_public: true,
  display_currency: 'USD',
  current_organization_id: null,
};

interface UseProfileOptions {
  /** Use sonner toast instead of shadcn toast */
  useSonner?: boolean;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

interface UseProfileReturn {
  profile: ProfileData | null;
  loading: boolean;
  saving: boolean;
  hasChanges: boolean;
  usernameError: string | null;
  checkingUsername: boolean;
  // Actions
  updateField: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  updateFields: (updates: Partial<ProfileData>) => void;
  save: () => Promise<boolean>;
  refresh: () => Promise<void>;
  // Avatar helpers
  uploadAvatar: (file: File) => Promise<string | null>;
  uploadCover: (file: File) => Promise<string | null>;
  // Tag helpers
  addTag: (field: keyof ProfileData, tag: string) => void;
  removeTag: (field: keyof ProfileData, tag: string) => void;
}

/**
 * Centralized hook for managing user profile data.
 * All profile editors should use this hook to ensure data consistency.
 */
// Helper: convert raw profile row (from auth or DB) to ProfileData
function toProfileData(raw: any): ProfileData {
  return {
    id: raw.id,
    full_name: raw.full_name || '',
    email: raw.email || '',
    username: raw.username || '',
    bio: raw.bio || '',
    tagline: raw.tagline || '',
    avatar_url: raw.avatar_url || '',
    cover_url: raw.cover_url || '',
    city: raw.city || '',
    country: raw.country || '',
    address: raw.address || '',
    phone: raw.phone || '',
    document_type: raw.document_type || '',
    document_number: raw.document_number || '',
    best_at: raw.best_at || '',
    experience_level: raw.experience_level || 'junior',
    availability_status: raw.availability_status || 'available',
    rate_per_content: raw.rate_per_content || null,
    rate_currency: raw.rate_currency || 'COP',
    interests: raw.interests || [],
    specialties_tags: raw.specialties_tags || [],
    content_categories: raw.content_categories || [],
    industries: raw.industries || [],
    style_keywords: raw.style_keywords || [],
    languages: raw.languages || [],
    instagram: raw.instagram || '',
    tiktok: raw.tiktok || '',
    facebook: raw.facebook || '',
    social_linkedin: raw.social_linkedin || '',
    social_youtube: raw.social_youtube || '',
    social_twitter: raw.social_twitter || '',
    portfolio_url: raw.portfolio_url || '',
    is_public: raw.is_public ?? true,
    display_currency: raw.display_currency || 'USD',
    current_organization_id: raw.current_organization_id || null,
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || '',
  };
}

export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { useSonner = false, autoFetch = true } = options;
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const originalUsernameRef = useRef<string>('');
  const initializedFromAuthRef = useRef(false);

  // Calculate hasChanges
  const hasChanges = profile !== null && originalProfile !== null && 
    JSON.stringify(profile) !== JSON.stringify(originalProfile);

  // Show toast helper
  const showToast = useCallback((title: string, description?: string, variant: 'default' | 'destructive' = 'default') => {
    if (useSonner) {
      if (variant === 'destructive') {
        sonnerToast.error(title);
      } else {
        sonnerToast.success(title);
      }
    } else {
      toast({ title, description, variant });
    }
  }, [useSonner, toast]);

  // Fetch profile from DB (only when explicitly refreshing or auth didn't have data)
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!data) {
        const { data: authRes } = await supabase.auth.getUser();
        const email = authRes.user?.email;

        if (email && ROOT_EMAILS.includes(email)) {
          const emailRes = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();

          data = emailRes.data as any;
          error = emailRes.error as any;
        }
      }

      if (error) throw error;

      if (data) {
        const fullProfile = toProfileData(data);
        setProfile(fullProfile);
        setOriginalProfile(fullProfile);
        originalUsernameRef.current = fullProfile.username;
      }
    } catch (error) {
      console.error('[useProfile] Error fetching:', error);
      showToast('Error', 'No se pudo cargar el perfil', 'destructive');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showToast]);

  // Validate username
  useEffect(() => {
    if (!profile?.username || profile.username === originalUsernameRef.current) {
      setUsernameError(null);
      return;
    }

    const validateUsername = async () => {
      const username = profile.username;
      
      // Format validation
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setUsernameError('Solo letras, números y guiones bajos');
        return;
      }
      if (username.length < 3) {
        setUsernameError('Mínimo 3 caracteres');
        return;
      }
      if (username.length > 30) {
        setUsernameError('Máximo 30 caracteres');
        return;
      }

      // Check availability
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .neq('id', user?.id || '')
          .maybeSingle();

        if (error) throw error;
        setUsernameError(data ? 'Este username ya está en uso' : null);
      } catch (error) {
        console.error('[useProfile] Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const debounce = setTimeout(validateUsername, 500);
    return () => clearTimeout(debounce);
  }, [profile?.username, user?.id]);

  // Initialize from auth profile to avoid redundant DB query
  useEffect(() => {
    if (!autoFetch || !user?.id) return;

    // If auth already has the profile, hydrate from it (no extra DB call)
    if (authProfile && !initializedFromAuthRef.current) {
      initializedFromAuthRef.current = true;
      const fullProfile = toProfileData(authProfile);
      setProfile(fullProfile);
      setOriginalProfile(fullProfile);
      originalUsernameRef.current = fullProfile.username;
      setLoading(false);
      return;
    }

    // Fallback: auth doesn't have profile yet (shouldn't happen normally)
    if (!authProfile && !initializedFromAuthRef.current) {
      fetchProfile();
    }
  }, [autoFetch, user?.id, authProfile, fetchProfile]);

  // Update single field
  const updateField = useCallback(<K extends keyof ProfileData>(
    field: K, 
    value: ProfileData[K]
  ) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates: Partial<ProfileData>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Trigger AI token evaluation after profile changes
  const triggerTokenEvaluation = useCallback(async (profileId: string) => {
    try {
      console.log('[useProfile] Triggering AI token evaluation for profile:', profileId);
      const { data, error } = await supabase.functions.invoke('evaluate-profile-tokens', {
        body: { profile_id: profileId, force_recalculate: true }
      });

      if (error) {
        console.error('[useProfile] Token evaluation error:', error);
        return;
      }

      if (data?.success) {
        console.log('[useProfile] Token evaluation complete:', data.token_cost, 'tokens');
        // Update local profile with new token cost
        setProfile(prev => prev ? {
          ...prev,
          ai_token_cost: data.token_cost,
          ai_token_cost_updated_at: new Date().toISOString(),
          ai_token_cost_reason: data.reason
        } : null);
      }
    } catch (error) {
      console.error('[useProfile] Failed to trigger token evaluation:', error);
    }
  }, []);

  // Save profile and sync with client if applicable
  const save = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !profile) return false;

    if (usernameError) {
      showToast('Username inválido', usernameError, 'destructive');
      return false;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username?.toLowerCase().trim() || null,
          bio: profile.bio,
          tagline: profile.tagline,
          avatar_url: profile.avatar_url,
          cover_url: profile.cover_url,
          city: profile.city,
          country: profile.country,
          address: profile.address,
          phone: profile.phone,
          document_type: profile.document_type,
          document_number: profile.document_number,
          best_at: profile.best_at,
          experience_level: profile.experience_level,
          availability_status: profile.availability_status,
          rate_per_content: profile.rate_per_content,
          rate_currency: profile.rate_currency,
          interests: profile.interests,
          specialties_tags: profile.specialties_tags,
          content_categories: profile.content_categories,
          industries: profile.industries,
          style_keywords: profile.style_keywords,
          languages: profile.languages,
          instagram: profile.instagram,
          tiktok: profile.tiktok,
          facebook: profile.facebook,
          social_linkedin: profile.social_linkedin,
          social_youtube: profile.social_youtube,
          social_twitter: profile.social_twitter,
          portfolio_url: profile.portfolio_url,
          is_public: profile.is_public,
          display_currency: profile.display_currency,
          updated_at: new Date().toISOString(),
        })
        // Use loaded profile id (can differ from auth id in migration scenarios)
        .eq('id', profile.id);

      if (error) throw error;

      // Sync common fields to client record if user owns a client
      await syncProfileToClient(profile);

      // Sync username → creator_profiles.slug so marketplace URL stays in sync
      if (profile.username) {
        await (supabase as any)
          .from('creator_profiles')
          .update({ slug: profile.username.toLowerCase().trim() })
          .eq('user_id', profile.id);
      }

      setOriginalProfile(profile);
      originalUsernameRef.current = profile.username;
      showToast('Perfil actualizado', 'Tus cambios se han guardado correctamente');

      // Trigger AI token evaluation in the background (don't await to not block UI)
      triggerTokenEvaluation(profile.id);

      return true;
    } catch (error) {
      console.error('[useProfile] Error saving:', error);
      showToast('Error', 'No se pudieron guardar los cambios', 'destructive');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id, profile, usernameError, showToast, triggerTokenEvaluation]);

  // Sync profile fields to associated client record (bidirectional sync)
  const syncProfileToClient = async (profileData: ProfileData) => {
    if (!user?.id) return;

    try {
      // Find clients where this user is an owner
      const { data: clientUsers } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id)
        .eq('role', 'owner');

      if (!clientUsers || clientUsers.length === 0) return;

      // Update each client with synced fields
      for (const cu of clientUsers) {
        await supabase
          .from('clients')
          .update({
            contact_email: profileData.email || undefined,
            contact_phone: profileData.phone || undefined,
            bio: profileData.bio || undefined,
            city: profileData.city || undefined,
            country: profileData.country || undefined,
            address: profileData.address || undefined,
            instagram: profileData.instagram || undefined,
            tiktok: profileData.tiktok || undefined,
            facebook: profileData.facebook || undefined,
            linkedin: profileData.social_linkedin || undefined,
            portfolio_url: profileData.portfolio_url || undefined,
            document_type: profileData.document_type || undefined,
            document_number: profileData.document_number || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cu.client_id);
      }
    } catch (error) {
      console.error('[useProfile] Error syncing to client:', error);
      // Don't throw - this is a secondary operation
    }
  };

  // Upload avatar
  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    // Validate
    if (!file.type.startsWith('image/')) {
      showToast('Error', 'Por favor selecciona una imagen válida', 'destructive');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Error', 'La imagen no debe superar los 5MB', 'destructive');
      return null;
    }

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${ext}`;

      // Delete old avatar if exists
      if (profile?.avatar_url?.includes('avatars')) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      updateField('avatar_url', data.publicUrl);

      // Persist to profiles DB immediately (don't wait for "Save" button)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (dbError) {
        console.error('[useProfile] Error saving avatar URL to profiles:', dbError);
        showToast('Error', 'La imagen se subió pero no se guardó en tu perfil. Intenta de nuevo.', 'destructive');
        return null;
      }

      showToast('Avatar actualizado');
      return data.publicUrl;
    } catch (error) {
      console.error('[useProfile] Error uploading avatar:', error);
      showToast('Error', 'No se pudo subir la imagen', 'destructive');
      return null;
    }
  }, [user?.id, profile?.avatar_url, updateField, showToast]);

  // Upload cover
  const uploadCover = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    if (!file.type.startsWith('image/')) {
      showToast('Error', 'Por favor selecciona una imagen válida', 'destructive');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Error', 'La imagen no debe superar los 5MB', 'destructive');
      return null;
    }

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/cover_${Date.now()}.${ext}`;

      // Delete old cover if exists (cleanup to avoid orphan files)
      if (profile?.cover_url?.includes('portfolio')) {
        const oldPath = profile.cover_url.split('/portfolio/')[1];
        if (oldPath) {
          await supabase.storage.from('portfolio').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName);
      updateField('cover_url', data.publicUrl);

      // Persist to profiles DB immediately (don't wait for "Save" button)
      await supabase
        .from('profiles')
        .update({ cover_url: data.publicUrl })
        .eq('id', user.id);

      showToast('Portada actualizada');
      return data.publicUrl;
    } catch (error) {
      console.error('[useProfile] Error uploading cover:', error);
      showToast('Error', 'No se pudo subir la imagen', 'destructive');
      return null;
    }
  }, [user?.id, profile?.cover_url, updateField, showToast]);

  // Add tag
  const addTag = useCallback((field: keyof ProfileData, tag: string) => {
    if (!tag.trim() || !profile) return;
    const currentTags = (profile[field] as string[]) || [];
    if (!currentTags.includes(tag.trim())) {
      updateField(field, [...currentTags, tag.trim()] as ProfileData[typeof field]);
    }
  }, [profile, updateField]);

  // Remove tag
  const removeTag = useCallback((field: keyof ProfileData, tag: string) => {
    if (!profile) return;
    const currentTags = (profile[field] as string[]) || [];
    updateField(field, currentTags.filter(t => t !== tag) as ProfileData[typeof field]);
  }, [profile, updateField]);

  return {
    profile,
    loading,
    saving,
    hasChanges,
    usernameError,
    checkingUsername,
    updateField,
    updateFields,
    save,
    refresh: fetchProfile,
    uploadAvatar,
    uploadCover,
    addTag,
    removeTag,
  };
}
