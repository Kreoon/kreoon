import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TalentDNA, TalentDNAData } from '@/types/talent-dna';
import { TalentDNAWizard } from './TalentDNAWizard';
import { TalentDNADisplay } from './TalentDNADisplay';

type ViewMode = 'display' | 'wizard';

export function TalentDNAPage() {
  const { user } = useAuth();
  const [activeDNA, setActiveDNA] = useState<TalentDNA | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('display');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDNAData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch the latest DNA (most recent one)
      const { data: latest, error: fetchError } = await supabase
        .from('talent_dna')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setActiveDNA((latest as TalentDNA) || null);

      // If no DNA exists, go straight to wizard
      if (!latest) {
        setViewMode('wizard');
      } else {
        setViewMode('display');
      }
    } catch (err) {
      console.error('Error fetching DNA:', err);
      setError('Error al cargar el ADN de Talento');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDNAData();
  }, [fetchDNAData]);

  const handleDNAGenerated = () => {
    fetchDNAData();
    setViewMode('display');
  };

  const handleUpdateDNA = useCallback(async (updatedData: TalentDNAData) => {
    if (!activeDNA) return;
    try {
      const { error: updateError } = await supabase
        .from('talent_dna')
        .update({ dna_data: updatedData as unknown as Record<string, unknown> })
        .eq('id', activeDNA.id);

      if (updateError) throw updateError;

      setActiveDNA(prev => prev ? { ...prev, dna_data: updatedData } : null);
      toast.success('ADN actualizado correctamente');
    } catch (err) {
      console.error('Error updating DNA:', err);
      toast.error('Error al guardar los cambios');
      throw err;
    }
  }, [activeDNA]);

  const handleDeleteDNA = useCallback(async () => {
    if (!activeDNA) return;
    try {
      const { error: deleteError } = await supabase
        .from('talent_dna')
        .delete()
        .eq('id', activeDNA.id);

      if (deleteError) throw deleteError;

      setActiveDNA(null);
      setViewMode('wizard');
      toast.success('ADN eliminado');
    } catch (err) {
      console.error('Error deleting DNA:', err);
      toast.error('Error al eliminar el ADN');
    }
  }, [activeDNA]);

  const handleApplyToProfile = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !activeDNA?.dna_data) {
      toast.error('No hay ADN para aplicar');
      return false;
    }

    const data = activeDNA.dna_data;

    try {
      // Map DNA to creator_profiles fields
      const profileUpdate = {
        bio: data.creator_identity.tagline,
        bio_full: data.creator_identity.bio_full,
        experience_level: data.creator_identity.experience_level,
        unique_factor: data.creator_identity.unique_factor,
        primary_category: data.specialization.niches[0] || null,
        secondary_categories: data.specialization.niches.slice(1),
        content_types: data.specialization.content_formats,
        content_style: data.content_style.tone_descriptors,
        marketplace_roles: data.marketplace_roles.slice(0, 5),
        strong_platforms: data.platforms,
        languages: data.languages,
        specialization_tags: data.specialization.specialized_services,
        talent_dna_id: activeDNA.id,
      };

      // Check if creator_profile exists
      const { data: existingProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('creator_profiles')
          .update(profileUpdate)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('creator_profiles')
          .insert({
            user_id: user.id,
            ...profileUpdate,
          });

        if (insertError) throw insertError;
      }

      // Mark DNA as applied
      await supabase
        .from('talent_dna')
        .update({ applied_to_profile: true })
        .eq('id', activeDNA.id);

      setActiveDNA(prev => prev ? { ...prev, applied_to_profile: true } : null);
      toast.success('Perfil actualizado con tu ADN de Talento');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al aplicar el ADN';
      console.error('[TalentDNAPage] Apply error:', err);
      toast.error(message);
      return false;
    }
  }, [user?.id, activeDNA]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-gray-400">Cargando ADN de Talento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Wizard (when no DNA or regenerating) */}
      {viewMode === 'wizard' && (
        <TalentDNAWizard onComplete={handleDNAGenerated} />
      )}

      {/* Display (when DNA exists) */}
      {viewMode === 'display' && activeDNA && (
        <TalentDNADisplay
          dna={activeDNA}
          onDelete={handleDeleteDNA}
          onRegenerate={() => setViewMode('wizard')}
          onUpdate={handleUpdateDNA}
          onApplyToProfile={handleApplyToProfile}
        />
      )}
    </div>
  );
}
