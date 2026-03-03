import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TalentDNA, TalentDNAData, TalentDNAProfileMapping } from '@/types/talent-dna';

export type { TalentDNA, TalentDNAData, EmotionalAnalysis } from '@/types/talent-dna';

export interface UploadProgress {
  stage: 'uploading' | 'transcribing' | 'generating';
  percentage: number;
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useTalentDNA() {
  const { user } = useAuth();
  const [dna, setDna] = useState<TalentDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch active DNA for current user
  const fetchDNA = useCallback(async () => {
    if (!user?.id) {
      setDna(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('talent_dna')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[useTalentDNA] Fetch error:', fetchError);
        setError(fetchError.message);
      } else {
        setDna(data as TalentDNA | null);
        if (data?.status === 'processing') {
          setProcessing(true);
        }
      }
    } catch (err) {
      console.error('[useTalentDNA] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDNA();
  }, [fetchDNA]);

  // Poll while processing
  useEffect(() => {
    if (!processing || !user?.id) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('talent_dna')
        .select('status, dna_data')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.status === 'completed' || data?.status === 'error') {
        setProcessing(false);
        clearInterval(interval);
        await fetchDNA();
        if (data.status === 'completed') {
          toast.success('ADN de Talento generado exitosamente');
        } else {
          toast.error('Error al procesar el ADN');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [processing, user?.id, fetchDNA]);

  // Step 1: Transcribe audio via transcribe-audio-gemini edge function
  const transcribeAudio = useCallback(async (file: File): Promise<{ transcription: string; emotional_analysis: Record<string, unknown> }> => {
    const formData = new FormData();
    formData.append('audio', file);

    const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio-gemini', {
      body: formData,
    });

    if (fnError) {
      throw new Error(fnError.message || 'Error al transcribir audio');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Error al transcribir audio');
    }

    return {
      transcription: data.transcription,
      emotional_analysis: data.emotional_analysis || {},
    };
  }, []);

  // Process DNA: transcribe audio + generate talent DNA
  const processDNA = useCallback(async (audioBlob: Blob) => {
    if (!user?.id) return;

    setProcessing(true);
    setError(null);
    setUploadProgress({ stage: 'uploading', percentage: 20 });

    try {
      const file = new File([audioBlob], 'talent-dna-audio.webm', { type: audioBlob.type || 'audio/webm' });

      // Step 1: Transcribe + emotional analysis
      setUploadProgress({ stage: 'transcribing', percentage: 40 });
      toast.info('Transcribiendo y analizando audio...');
      const { transcription, emotional_analysis } = await transcribeAudio(file);

      // Step 2: Generate DNA
      setUploadProgress({ stage: 'generating', percentage: 75 });
      toast.info('Generando ADN de Talento...');

      const { data, error: fnError } = await supabase.functions.invoke('generate-talent-dna', {
        body: { transcription, emotional_analysis },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Error al procesar ADN');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido al procesar ADN');
      }

      await fetchDNA();
      setProcessing(false);
      toast.success('ADN de Talento generado exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar ADN';
      setError(message);
      setProcessing(false);
      toast.error(message);
      await fetchDNA();
    } finally {
      setUploadProgress(null);
    }
  }, [user?.id, transcribeAudio, fetchDNA]);

  // Update DNA data manually (edit mode)
  const updateDNA = useCallback(async (updatedData: Partial<TalentDNAData>) => {
    if (!user?.id || !dna?.dna_data) return;

    try {
      const mergedData = { ...dna.dna_data, ...updatedData };
      const { error: updateError } = await supabase
        .from('talent_dna')
        .update({ dna_data: mergedData as unknown as Record<string, unknown> })
        .eq('id', dna.id);

      if (updateError) throw updateError;

      setDna(prev => prev ? { ...prev, dna_data: mergedData } : null);
      toast.success('ADN actualizado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar';
      toast.error(message);
    }
  }, [user?.id, dna]);

  // Delete active DNA (returns to wizard)
  const deleteDNA = useCallback(async () => {
    if (!user?.id || !dna?.id) return;

    try {
      const { error: delError } = await supabase
        .from('talent_dna')
        .delete()
        .eq('id', dna.id);

      if (delError) throw delError;

      setDna(null);
      toast.success('ADN eliminado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(message);
    }
  }, [user?.id, dna]);

  // Apply DNA to creator_profiles
  const applyToProfile = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !dna?.dna_data) {
      toast.error('No hay ADN para aplicar');
      return false;
    }

    const data = dna.dna_data;

    try {
      // Map DNA to creator_profiles fields
      const profileUpdate: TalentDNAProfileMapping = {
        bio: data.creator_identity.tagline,
        bio_full: data.creator_identity.bio_full,
        experience_level: data.creator_identity.experience_level,
        unique_factor: data.creator_identity.unique_factor,
        primary_category: data.specialization.niches[0] || null,
        secondary_categories: data.specialization.niches.slice(1),
        content_types: data.specialization.content_formats,
        content_style: data.content_style.tone_descriptors,
        marketplace_roles: data.marketplace_roles.slice(0, 5), // Max 5
        platforms: data.platforms,
        languages: data.languages,
        specialization_tags: data.specialization.specialized_services,
      };

      // Check if creator_profile exists
      const { data: existingProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('creator_profiles')
          .update({
            ...profileUpdate,
            talent_dna_id: dna.id,
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('creator_profiles')
          .insert({
            user_id: user.id,
            ...profileUpdate,
            talent_dna_id: dna.id,
          });

        if (insertError) throw insertError;
      }

      // Mark DNA as applied
      await supabase
        .from('talent_dna')
        .update({ applied_to_profile: true })
        .eq('id', dna.id);

      setDna(prev => prev ? { ...prev, applied_to_profile: true } : null);
      toast.success('Perfil actualizado con tu ADN de Talento');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al aplicar el ADN';
      console.error('[useTalentDNA] Apply error:', err);
      toast.error(message);
      return false;
    }
  }, [user?.id, dna]);

  return {
    dna,
    loading,
    processing,
    error,
    uploadProgress,
    processDNA,
    updateDNA,
    deleteDNA,
    applyToProfile,
    refetch: fetchDNA,
  };
}
