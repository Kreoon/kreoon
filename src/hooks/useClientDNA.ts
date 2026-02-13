import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AudienceLocation } from '@/lib/locations-data';
import type { ClientDNA, DNAData } from '@/types/client-dna';

export type { ClientDNA, DNAData, EmotionalAnalysis, AudienceLocation } from '@/types/client-dna';

export interface UploadProgress {
  stage: 'uploading' | 'transcribing' | 'generating';
  percentage: number;
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useClientDNA(clientId: string | null) {
  const [dna, setDna] = useState<ClientDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch active DNA for this client
  const fetchDNA = useCallback(async () => {
    if (!clientId) {
      setDna(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('client_dna')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[useClientDNA] Fetch error:', fetchError);
        setError(fetchError.message);
      } else {
        setDna(data as ClientDNA | null);
        if (data?.status === 'processing') {
          setProcessing(true);
        }
      }
    } catch (err) {
      console.error('[useClientDNA] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchDNA();
  }, [fetchDNA]);

  // Poll while processing
  useEffect(() => {
    if (!processing || !clientId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('client_dna')
        .select('status, dna_data')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.status === 'completed' || data?.status === 'error') {
        setProcessing(false);
        clearInterval(interval);
        await fetchDNA();
        if (data.status === 'completed') {
          toast.success('ADN del cliente generado exitosamente');
        } else {
          toast.error('Error al procesar el ADN');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [processing, clientId, fetchDNA]);

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

  // Process DNA: transcribe audio + generate strategic DNA
  const processDNA = useCallback(async (audioBlob: Blob, locations: AudienceLocation[]) => {
    if (!clientId) return;

    setProcessing(true);
    setError(null);
    setUploadProgress({ stage: 'uploading', percentage: 20 });

    try {
      const file = new File([audioBlob], 'dna-audio.webm', { type: audioBlob.type || 'audio/webm' });

      // Step 1: Transcribe + emotional analysis
      setUploadProgress({ stage: 'transcribing', percentage: 40 });
      toast.info('Transcribiendo y analizando audio...');
      const { transcription, emotional_analysis } = await transcribeAudio(file);

      // Step 2: Generate DNA
      setUploadProgress({ stage: 'generating', percentage: 75 });
      toast.info('Generando ADN estrategico...');

      const { data, error: fnError } = await supabase.functions.invoke('generate-client-dna', {
        body: { client_id: clientId, transcription, emotional_analysis, locations },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Error al procesar ADN');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido al procesar ADN');
      }

      await fetchDNA();
      setProcessing(false);
      toast.success('ADN del cliente generado exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar ADN';
      setError(message);
      setProcessing(false);
      toast.error(message);
      await fetchDNA();
    } finally {
      setUploadProgress(null);
    }
  }, [clientId, transcribeAudio, fetchDNA]);

  // Update DNA data manually (edit mode)
  const updateDNA = useCallback(async (updatedData: Partial<DNAData>) => {
    if (!clientId || !dna?.dna_data) return;

    try {
      const mergedData = { ...dna.dna_data, ...updatedData };
      const { error: updateError } = await supabase
        .from('client_dna')
        .update({ dna_data: mergedData as unknown as Record<string, unknown> })
        .eq('id', dna.id);

      if (updateError) throw updateError;

      setDna(prev => prev ? { ...prev, dna_data: mergedData } : null);
      toast.success('ADN actualizado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar';
      toast.error(message);
    }
  }, [clientId, dna]);

  // Delete active DNA for this client (returns to wizard)
  const deleteDNA = useCallback(async () => {
    if (!clientId || !dna?.id) return;

    try {
      const { error: delError } = await supabase
        .from('client_dna')
        .delete()
        .eq('id', dna.id);

      if (delError) throw delError;

      setDna(null);
      toast.success('ADN eliminado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(message);
    }
  }, [clientId, dna]);

  return {
    dna,
    loading,
    processing,
    error,
    uploadProgress,
    processDNA,
    updateDNA,
    deleteDNA,
    refetch: fetchDNA,
  };
}
