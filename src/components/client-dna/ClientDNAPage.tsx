import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientDNA, DNAData } from '@/types/client-dna';
import { ClientDNAWizard } from '@/components/client-dna/ClientDNAWizard';
import { ClientDNADisplay } from '@/components/client-dna/ClientDNADisplay';

type ViewMode = 'display' | 'wizard';

interface ClientDNAPageProps {
  clientId: string;
  /**
   * Solo el resultado, sin el asistente de generación.
   *
   * Es lo que ve el CLIENTE en su portal: su marca la construye el proceso a
   * partir del formulario inicial, así que aquí no tiene que grabar ni generar
   * nada — solo leer lo que salió. El EQUIPO sigue viendo la pantalla completa,
   * con generar, regenerar y borrar.
   */
  soloResultado?: boolean;
}

export function ClientDNAPage({ clientId, soloResultado = false }: ClientDNAPageProps) {
  const [activeDNA, setActiveDNA] = useState<ClientDNA | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('display');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDNAData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Resolve all client_ids sharing the same user (freelance + org same brand)
      const { data: relatedIds } = await supabase
        .rpc('get_related_client_ids', { p_client_id: clientId });
      const clientIds: string[] = Array.isArray(relatedIds) && relatedIds.length > 0
        ? relatedIds
        : [clientId];

      const { data: latest, error: fetchError } = await supabase
        .from('client_dna')
        .select('*')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setActiveDNA((latest as ClientDNA) || null);

      // If no DNA exists, go straight to wizard
      if (!latest) {
        setViewMode('wizard');
      }
    } catch (err) {
      console.error('Error fetching DNA:', err);
      setError('Error al cargar el ADN del cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      fetchDNAData();
    }
  }, [clientId, fetchDNAData]);

  const handleDNAGenerated = () => {
    fetchDNAData();
    setViewMode('display');
  };

  const handleUpdateDNA = useCallback(async (updatedData: DNAData) => {
    if (!activeDNA) return;
    try {
      const { error: updateError } = await supabase
        .from('client_dna')
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
        .from('client_dna')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-zinc-600 dark:text-zinc-400">Cargando ADN del cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Wizard (when no DNA or regenerating) — nunca en modo solo resultado */}
      {!soloResultado && viewMode === 'wizard' && (
        <ClientDNAWizard
          clientId={clientId}
          onComplete={handleDNAGenerated}
        />
      )}

      {/* Todavía no hay marca y el cliente no puede generarla: se explica de
          dónde va a salir, en vez de dejar la pantalla en blanco. */}
      {soloResultado && !activeDNA && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="font-medium">Aquí verás tu marca</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            La preparamos con lo que nos contaste al principio. En cuanto esté
            lista, aparece aquí y te avisamos.
          </p>
        </div>
      )}

      {/* Display (when DNA exists). Para el cliente, sin regenerar ni borrar:
          su marca la rehace el proceso pidiendo un cambio, no desde aquí. */}
      {activeDNA && (soloResultado || viewMode === 'display') && (
        <ClientDNADisplay
          dna={activeDNA}
          onDelete={soloResultado ? undefined : handleDeleteDNA}
          onRegenerate={soloResultado ? undefined : () => setViewMode('wizard')}
          onUpdate={soloResultado ? undefined : handleUpdateDNA}
        />
      )}
    </div>
  );
}
