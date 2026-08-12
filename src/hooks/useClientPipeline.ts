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

/**
 * `functions.invoke` no lanza en 4xx/5xx: deja `data === null` y un
 * FunctionsHttpError cuyo cuerpo hay que abrir a mano. Sin esto, un 403 o un
 * 409 del orquestador llegaría como un "non-2xx status code" sin sentido para
 * el cliente.
 */
async function readFunctionError(fnError: unknown): Promise<{ code: string; message: string }> {
  const context = (fnError as { context?: { json?: () => Promise<unknown> } })?.context;

  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: string; stage_actual?: string };
      if (body?.error) {
        return { code: body.error, message: ERROR_MESSAGES[body.error] ?? GENERIC_ERROR };
      }
    } catch {
      /* el cuerpo no era JSON: seguimos al mensaje genérico */
    }
  }

  return { code: 'desconocido', message: GENERIC_ERROR };
}

const GENERIC_ERROR = 'No pudimos completar la acción. Inténtalo de nuevo en un momento.';

/** Errores del orquestador traducidos a algo que un cliente entienda. */
const ERROR_MESSAGES: Record<string, string> = {
  stage_desincronizado: 'Esta pantalla está desactualizada. La acabamos de actualizar: revísalo de nuevo.',
  etapa_ya_aprobada: 'Esto ya estaba aprobado. Actualizamos la pantalla.',
  content_not_found: 'Ese guion ya no está disponible. Actualizamos la pantalla.',
  run_not_found: 'No encontramos tu proceso. Actualizamos la pantalla.',
  'content_id no pertenece a este run': 'Ese guion no es de este proceso.',
};

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
const SCRIPT_STATUSES = ['script_pending', 'script_approved'] as const;

/**
 * Los ids del lote de guiones vienen en `payload.content_ids` de los eventos
 * `generated` de la etapa. Si el evento aún no existe (o no trae ids), se
 * devuelve un set vacío y el hook cae a mostrar todos los del cliente.
 */
function collectBatchContentIds(events: PipelineStageEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.stage !== 'guiones') continue;
    const payloadIds = (event.payload as { content_ids?: unknown })?.content_ids;
    if (Array.isArray(payloadIds)) {
      for (const id of payloadIds) if (typeof id === 'string') ids.add(id);
    }
  }
  return ids;
}

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
  // El id del run vive en un ref para que `callOrchestrator` sea estable y el
  // intervalo de polling no se reinicie en cada render.
  const runIdRef = useRef<string | null>(null);
  runIdRef.current = run?.id ?? null;

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
      let runEvents: PipelineStageEvent[] = [];
      if (currentRun?.id) {
        const { data: eventRows } = await supabase
          .from('client_pipeline_stage_events' as any)
          .select('*')
          .eq('run_id', currentRun.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (requestId !== requestRef.current) return;
        runEvents = (eventRows as unknown as PipelineStageEvent[]) ?? [];
      }
      setEvents(runEvents);

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

      // Guiones. Se muestran SOLO los del lote de este run: el cliente puede
      // tener guiones en `script_pending` de otro flujo, y el orquestador
      // rechaza (403) un content_id que no pertenezca al run.
      const { data: scriptRows } = await supabase
        .from('content')
        .select('id, title, script, status, notes, created_at')
        .eq('client_id', clientId)
        .in('status', SCRIPT_STATUSES)
        .order('created_at', { ascending: true });
      if (requestId !== requestRef.current) return;

      const batchIds = collectBatchContentIds(runEvents);
      const allScripts = (scriptRows as unknown as PipelineScript[]) ?? [];
      setScripts(batchIds.size ? allScripts.filter(s => batchIds.has(s.id)) : allScripts);
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

  // ── Acciones (todas pasan por la edge function) ─────────────────────
  /**
   * El orquestador devuelve `{ ok: true, run: <fila ya actualizada> }`, así que
   * pintamos ese run al instante y solo re-leemos lo pesado (ADN, producto,
   * guiones) en segundo plano.
   */
  const callOrchestrator = useCallback(async (
    body: Record<string, unknown>,
    options?: { silentRefresh?: boolean },
  ) => {
    const runId = runIdRef.current;
    if (!runId) throw new Error('Todavía no hay un proceso activo');

    const { data, error: fnError } = await supabase.functions.invoke('pipeline-orchestrator', {
      body: { run_id: runId, ...body },
    });

    if (fnError) {
      const { code, message } = await readFunctionError(fnError);
      // Los desajustes de estado se arreglan solos releyendo: la pantalla
      // estaba vieja (otra pestaña, doble clic, o el run ya avanzó).
      if (code === 'stage_desincronizado' || code === 'etapa_ya_aprobada' ||
          code === 'content_not_found' || code === 'run_not_found') {
        await fetchAll({ silent: true });
      }
      throw new Error(message);
    }

    if (data?.run) setRun(data.run as ClientPipelineRun);
    if (!options?.silentRefresh) await fetchAll({ silent: true });

    return data;
  }, [fetchAll]);

  /**
   * Polling: mientras algo se está generando hay que llamar `poll`, no leer la
   * tabla. El ADN y la estrategia son asíncronos (la estrategia tarda 5–15 min)
   * y sin que alguien llame `poll` el run se queda en `generating` para siempre
   * aunque el contenido ya esté listo. `poll` es idempotente.
   */
  const inFlight = run?.stage_status === 'generating' || run?.stage_status === 'changes_requested';

  useEffect(() => {
    if (!inFlight || !clientId) return;

    const tick = async () => {
      try {
        // silentRefresh: el `run` que devuelve poll basta; solo recargamos el
        // resto cuando la etapa ya cambió a algo que el cliente puede revisar.
        const data = await callOrchestrator({ action: 'poll' }, { silentRefresh: true });
        const nextStatus = (data?.run as ClientPipelineRun | undefined)?.stage_status;
        if (nextStatus && nextStatus !== 'generating' && nextStatus !== 'changes_requested') {
          await fetchAll({ silent: true });
        }
      } catch {
        // Si `poll` falla (red, 5xx), al menos releemos la tabla por RLS.
        await fetchAll({ silent: true });
      }
    };

    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [inFlight, clientId, callOrchestrator, fetchAll]);

  /** Envuelve una acción del cliente marcando el estado de "guardando". */
  const act = useCallback(async (body: Record<string, unknown>) => {
    setActing(true);
    try {
      return await callOrchestrator(body);
    } finally {
      setActing(false);
    }
  }, [callOrchestrator]);

  /** Aprueba la etapa actual (ADN o estrategia). */
  const approve = useCallback(
    (stage: PipelineStage) => act({ action: 'approve', stage }),
    [act],
  );

  /** Pide un cambio en la etapa, con el texto libre del cliente. */
  const requestChanges = useCallback(
    (stage: PipelineStage, feedback: string) =>
      act({ action: 'request_changes', stage, feedback }),
    [act],
  );

  /** Aprueba UN guion concreto (el orquestador cierra la etapa solo). */
  const approveScript = useCallback(
    (contentId: string) =>
      act({ action: 'approve', stage: 'guiones', content_id: contentId }),
    [act],
  );

  /** Pide cambios en UN guion concreto: se reescribe solo ese. */
  const requestScriptChanges = useCallback(
    (contentId: string, feedback: string) =>
      act({ action: 'request_changes', stage: 'guiones', content_id: contentId, feedback }),
    [act],
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
