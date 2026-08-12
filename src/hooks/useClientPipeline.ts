import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lee el pipeline autónomo de UN cliente (onboarding → ADN → estrategia →
 * guiones → producción) y expone las dos únicas acciones que el cliente
 * puede ejecutar: aprobar una etapa o pedir un cambio.
 *
 * El cliente lee su propio run gracias a la política RLS
 * "Client can view own pipeline run" (client_users → client_id). Escribir
 * NO está permitido desde el navegador: toda mutación pasa por la edge
 * function `pipeline-orchestrator`.
 *
 * Polling: solo mientras algo está en vuelo (`generating` /
 * `changes_requested`). Cuando el run queda esperando al cliente o
 * aprobado, el intervalo se apaga.
 */

const POLL_MS = 10_000;

export type PipelineStage = 'onboarding' | 'adn' | 'estrategia' | 'guiones' | 'produccion';

export type PipelineStageStatus =
  | 'generating'
  | 'awaiting_client'
  | 'changes_requested'
  | 'approved'
  | 'error'
  | 'paused_no_tokens';

export interface ClientPipelineRun {
  id: string;
  organization_id: string;
  client_id: string;
  onboarding_form_id: string | null;
  product_id: string | null;
  stage: PipelineStage;
  stage_status: PipelineStageStatus;
  client_dna_id: string | null;
  product_dna_id: string | null;
  stage_attempts: Record<string, number>;
  error_log: unknown[];
  last_feedback: string | null;
  scripts_target: number;
  onboarding_completed_at: string | null;
  adn_started_at: string | null;
  adn_approved_at: string | null;
  estrategia_started_at: string | null;
  estrategia_approved_at: string | null;
  guiones_started_at: string | null;
  guiones_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStageEvent {
  id: string;
  run_id: string;
  stage: PipelineStage;
  event: 'generated' | 'approved' | 'changes_requested' | 'error' | 'escalated' | 'paused_no_tokens';
  feedback: string | null;
  payload: Record<string, unknown>;
  actor: 'system' | 'client' | 'staff';
  created_at: string;
}

/** Progreso real de la investigación de estrategia (products.research_progress) */
export interface ResearchProgress {
  step: number;
  total: number;
  label: string;
}

export interface PipelineScript {
  id: string;
  title: string | null;
  script: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

/** Estados de `content` que el cliente ve como "guion en revisión" o "guion listo". */
const SCRIPT_STATUSES = ['script_pending', 'script_approved'];

export function useClientPipeline(clientId: string | null) {
  const [run, setRun] = useState<ClientPipelineRun | null>(null);
  const [events, setEvents] = useState<PipelineStageEvent[]>([]);
  const [dnaData, setDnaData] = useState<unknown>(null);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [scripts, setScripts] = useState<PipelineScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evita pisar el estado si el cliente cambia mientras hay un fetch en vuelo
  const requestRef = useRef(0);

  const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!clientId) {
      setRun(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (!options?.silent) setLoading(true);

    try {
      const { data: runRow, error: runError } = await supabase
        .from('client_pipeline_runs' as any)
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (requestId !== requestRef.current) return;

      if (runError) {
        console.error('[useClientPipeline] Error leyendo el run:', runError);
        setError(runError.message);
      } else {
        setError(null);
      }

      const currentRun = (runRow as unknown as ClientPipelineRun) ?? null;
      setRun(currentRun);

      // Histórico (para saber si ya se pidió un cambio y mostrar el feedback)
      if (currentRun?.id) {
        const { data: eventRows } = await supabase
          .from('client_pipeline_stage_events' as any)
          .select('*')
          .eq('run_id', currentRun.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (requestId !== requestRef.current) return;
        setEvents((eventRows as unknown as PipelineStageEvent[]) ?? []);
      } else {
        setEvents([]);
      }

      // ADN de la marca: el que apunta el run, o el activo del cliente.
      const dnaBase = supabase
        .from('client_dna')
        .select('id, dna_data, status')
        .eq('client_id', clientId);

      const { data: dnaRow } = currentRun?.client_dna_id
        ? await dnaBase.eq('id', currentRun.client_dna_id).limit(1).maybeSingle()
        : await dnaBase.eq('is_active', true).order('version', { ascending: false }).limit(1).maybeSingle();
      if (requestId !== requestRef.current) return;
      setDnaData(dnaRow?.dna_data ?? null);

      // Estrategia: vive en la fila de `products` que creó el pipeline.
      if (currentRun?.product_id) {
        const { data: productRow } = await supabase
          .from('products')
          .select('*')
          .eq('id', currentRun.product_id)
          .maybeSingle();
        if (requestId !== requestRef.current) return;
        setProduct((productRow as unknown as Record<string, unknown>) ?? null);
      } else {
        setProduct(null);
      }

      // Guiones del cliente
      const { data: scriptRows } = await supabase
        .from('content')
        .select('id, title, script, status, notes, created_at')
        .eq('client_id', clientId)
        .in('status', SCRIPT_STATUSES)
        .order('created_at', { ascending: true });
      if (requestId !== requestRef.current) return;
      setScripts((scriptRows as unknown as PipelineScript[]) ?? []);
    } catch (err) {
      console.error('[useClientPipeline] Error:', err);
      if (requestId === requestRef.current) {
        setError(err instanceof Error ? err.message : 'Error cargando tu proceso');
      }
    } finally {
      if (requestId === requestRef.current && !options?.silent) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Polling suave: SOLO mientras hay algo generándose de verdad.
  const inFlight = run?.stage_status === 'generating' || run?.stage_status === 'changes_requested';

  useEffect(() => {
    if (!inFlight || !clientId) return;
    const interval = setInterval(() => { fetchAll({ silent: true }); }, POLL_MS);
    return () => clearInterval(interval);
  }, [inFlight, clientId, fetchAll]);

  // ── Acciones (todas pasan por la edge function) ─────────────────────
  const callOrchestrator = useCallback(async (body: Record<string, unknown>) => {
    if (!run?.id) throw new Error('Todavía no hay un proceso activo');

    setActing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: { run_id: run.id, ...body },
      });

      if (fnError) throw new Error(fnError.message || 'No se pudo completar la acción');
      if (data && data.success === false) throw new Error(data.error || 'No se pudo completar la acción');

      await fetchAll({ silent: true });
      return data;
    } finally {
      setActing(false);
    }
  }, [run?.id, fetchAll]);

  /** Aprueba la etapa actual (ADN o estrategia). */
  const approve = useCallback(
    (stage: PipelineStage) => callOrchestrator({ action: 'approve', stage }),
    [callOrchestrator],
  );

  /** Pide un cambio en la etapa, con el texto libre del cliente. */
  const requestChanges = useCallback(
    (stage: PipelineStage, feedback: string) =>
      callOrchestrator({ action: 'request_changes', stage, feedback }),
    [callOrchestrator],
  );

  /** Aprueba UN guion concreto. */
  const approveScript = useCallback(
    (contentId: string) =>
      callOrchestrator({ action: 'approve', stage: 'guiones', content_id: contentId }),
    [callOrchestrator],
  );

  /** Pide cambios en UN guion concreto. */
  const requestScriptChanges = useCallback(
    (contentId: string, feedback: string) =>
      callOrchestrator({ action: 'request_changes', stage: 'guiones', content_id: contentId, feedback }),
    [callOrchestrator],
  );

  const researchProgress = (product?.research_progress as ResearchProgress | null) ?? null;

  return {
    run,
    events,
    dnaData,
    product,
    researchProgress,
    scripts,
    loading,
    acting,
    error,
    approve,
    requestChanges,
    approveScript,
    requestScriptChanges,
    refresh: fetchAll,
  };
}
