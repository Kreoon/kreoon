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
export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { useSonner = false, autoFetch = true } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const originalUsernameRef = useRef<string>('');

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

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

      // Prefer lookup by auth user id
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // If not found, try email lookup for root admins (migration ID mismatch)
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
        const profileData = data as any;
        const fullProfile: ProfileData = {
          id: profileData.id,
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          tagline: profileData.tagline || '',
          avatar_url: profileData.avatar_url || '',
          cover_url: profileData.cover_url || '',
          city: profileData.city || '',
          country: profileData.country || '',
          address: profileData.address || '',
          phone: profileData.phone || '',
          document_type: profileData.document_type || '',
          document_number: profileData.document_number || '',
          best_at: profileData.best_at || '',
          experience_level: profileData.experience_level || 'junior',
          availability_status: profileData.availability_status || 'available',
          rate_per_content: profileData.rate_per_content || null,
          rate_currency: profileData.rate_currency || 'COP',
          interests: profileData.interests || [],
          specialties_tags: profileData.specialties_tags || [],
          content_categories: profileData.content_categories || [],
          industries: profileData.industries || [],
          style_keywords: profileData.style_keywords || [],
          languages: profileData.languages || [],
          instagram: profileData.instagram || '',
          tiktok: profileData.tiktok || '',
          facebook: profileData.facebook || '',
          social_linkedin: profileData.social_linkedin || '',
          social_youtube: profileData.social_youtube || '',
          social_twitter: profileData.social_twitter || '',
          portfolio_url: profileData.portfolio_url || '',
          is_public: profileData.is_public ?? true,
          current_organization_id: profileData.current_organization_id || null,
          created_at: profileData.created_at || '',
          updated_at: profileData.updated_at || '',
        };
        
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

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchProfile();
    }
  }, [autoFetch, user?.id, fetchProfile]);

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
      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

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

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName);
      updateField('cover_url', data.publicUrl);
      showToast('Portada actualizada');
      return data.publicUrl;
    } catch (error) {
      console.error('[useProfile] Error uploading cover:', error);
      showToast('Error', 'No se pudo subir la imagen', 'destructive');
      return null;
    }
  }, [user?.id, updateField, showToast]);

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
