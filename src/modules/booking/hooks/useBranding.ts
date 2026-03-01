// Hook para gestionar personalización de marca del booking

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { BookingBranding, BookingBrandingInput } from '../types';

export function useBranding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const brandingQuery = useQuery({
    queryKey: ['booking-branding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('booking_branding')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as BookingBranding | null;
    },
    enabled: !!user?.id,
  });

  const saveBranding = useMutation({
    mutationFn: async (input: BookingBrandingInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if branding exists
      const { data: existing } = await supabase
        .from('booking_branding')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('booking_branding')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as BookingBranding;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('booking_branding')
          .insert({
            user_id: user.id,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;
        return data as BookingBranding;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-branding', user?.id] });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/booking-logo-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('booking-assets')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('booking-assets')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  return {
    branding: brandingQuery.data,
    isLoading: brandingQuery.isLoading,
    error: brandingQuery.error,
    saveBranding: saveBranding.mutateAsync,
    uploadLogo,
    isSaving: saveBranding.isPending,
  };
}

// Hook para obtener branding de un usuario (público, sin auth)
export function usePublicBranding(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-booking-branding', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('booking_branding')
        .select('logo_url, primary_color, accent_color, background_color, welcome_text, footer_text, show_kreoon_branding')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as Partial<BookingBranding> | null;
    },
    enabled: !!userId,
  });
}
