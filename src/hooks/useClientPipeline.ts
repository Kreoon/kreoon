import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OnboardingFormData } from '@/components/client-onboarding/schemas';
import type { ResearchRun } from '@/types/research';

/**
 * Lee el pipeline autónomo de UN cliente (onboarding → ADN → mercado →
 * estrategia → creadores → guiones → producción) y expone las acciones que
 * el cliente puede ejecutar: llenar su formulario de inicio, arrancar el
 * proceso, aprobar una etapa o pedir un cambio.
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

/**
 * Igual que `readFunctionError`, pero para `submit_form`: ese error trae
 * además la lista de campos que faltan (mismo formato que
 * `client-onboarding-submit`), así que se lee aparte para no perder ese dato.
 */
async function readSubmitFormError(fnError: unknown): Promise<
  | { kind: 'missing_fields'; missingFields: string[] }
  | { kind: 'other'; code: string; message: string }
> {
  const context = (fnError as { context?: { json?: () => Promise<unknown> } })?.context;

  if (context?.json) {
    try {
      const body = (await context.json()) as {
        error?: string;
        missing_fields?: unknown;
      };
      if (body?.error === 'missing_required_fields') {
        return {
          kind: 'missing_fields',
          missingFields: Array.isArray(body.missing_fields) ? (body.missing_fields as string[]) : [],
        };
      }
      if (body?.error) {
        return { kind: 'other', code: body.error, message: ERROR_MESSAGES[body.error] ?? GENERIC_ERROR };
      }
    } catch {
      /* el cuerpo no era JSON: seguimos al mensaje genérico */
    }
  }

  return { kind: 'other', code: 'desconocido', message: GENERIC_ERROR };
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

export type PipelineStage =
  | 'onboarding'
  | 'adn'
  | 'mercado'
  | 'estrategia'
  | 'creadores'
  | 'guiones'
  | 'produccion';

export type PipelineStageStatus =
  | 'generating'
  | 'awaiting_client'
  /** El equipo eligió por el cliente (no contestó a tiempo, o pidió que lo
   *  hicieran ellos). El portal no le pide nada al cliente en este estado. */
  | 'awaiting_team'
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
  /** A quién eligió el cliente para grabar (etapa 'creadores'). Vacío hasta que elige. */
  selected_creator_ids: string[] | null;
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

/** Estado del formulario de onboarding que el cliente llena desde el portal. */
export type OnboardingFormStatus = 'pending' | 'in_progress' | 'submitted' | 'processed';

export interface ClientOnboardingForm {
  id: string;
  status: OnboardingFormStatus;
  form_data: OnboardingFormData;
}

export type SubmitOnboardingResult =
  | { ok: true; form: ClientOnboardingForm }
  | { ok: false; missingFields: string[] };

/** Estados de `content` que el cliente ve como "guion en revisión" o "guion listo". */
const SCRIPT_STATUSES = ['script_pending', 'script_approved'] as const;

/**
 * Los ids del lote de guiones vienen en `payload.content_ids` de los eventos
 * `generated` de la etapa. Si el evento aún no existe (o no trae ids), se
 * devuelve un set vacío y el hook cae a mostrar todos los del cliente.
 */
export interface CreatorShortlistCandidate {
  user_id: string;
  nombre: string;
  /** Ya vienen escritos en castellano desde el backend: se muestran tal cual. */
  motivos: string[];
}

/**
 * Los 3 candidatos que el sistema propone para grabar, con su porqué en
 * castellano — vienen en el último evento  de la etapa
 * 'creadores' (). El cliente no está obligado a elegir a
 * ninguno de estos: son una ayuda, no la única opción.
 */
function parseCreatorShortlist(events: PipelineStageEvent[]): CreatorShortlistCandidate[] {
  const evento = events.find((e) => e.stage === 'creadores' && e.event === 'generated');
  const raw = (evento?.payload as { shortlist?: unknown } | undefined)?.shortlist;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof item.user_id === 'string')
    .map((item) => ({
      user_id: item.user_id as string,
      nombre: typeof item.nombre === 'string' && item.nombre.trim() ? item.nombre : 'Creador sin nombre',
      motivos: Array.isArray(item.motivos) ? item.motivos.filter((m): m is string => typeof m === 'string') : [],
    }));
}

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
  const [onboardingForm, setOnboardingForm] = useState<ClientOnboardingForm | null>(null);
  const [researchRun, setResearchRun] = useState<ResearchRun | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evita pisar el estado si el cliente cambia mientras hay un fetch en vuelo
  const requestRef = useRef(0);
  // El id del run vive en un ref para que `callOrchestrator` sea estable y el
  // intervalo de polling no se reinicie en cada render.
  const runIdRef = useRef<string | null>(null);
  runIdRef.current = run?.id ?? null;
  // Mismo truco para el formulario: `crearFormulario` necesita leer el
  // form_data ya guardado sin quedar atado a que cambie en cada render.
  const onboardingFormRef = useRef<ClientOnboardingForm | null>(null);
  onboardingFormRef.current = onboardingForm;

  const fetchAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!clientId) {
      setRun(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    if (!options?.silent) setLoading(true);

    try {
      // organization_id del cliente: lo necesitan `iniciarProceso` y
      // `crearFormulario` para llamar a pipeline-orchestrator antes de que
      // exista un run. `clients` es de lectura pública (is_public), así que
      // esto no depende de ninguna política nueva.
      const { data: clientRow } = await supabase
        .from('clients')
        .select('organization_id')
        .eq('id', clientId)
        .maybeSingle();
      if (requestId !== requestRef.current) return;
      setOrganizationId((clientRow as { organization_id?: string } | null)?.organization_id ?? null);

      // Formulario de onboarding del cliente (para saber si ya lo llenó, a
      // medias, o nada). REQUIERE una política RLS que le permita al cliente
      // ver el suyo — hoy `client_onboarding_forms` solo tiene la política de
      // staff, así que esto devuelve null hasta que exista (en marcha, según
      // el team lead — 2026-08-13). No falla: simplemente no hay formulario
      // que leer.
      const { data: formRow } = await supabase
        .from('client_onboarding_forms' as any)
        .select('id, status, form_data')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (requestId !== requestRef.current) return;
      if (formRow) setOnboardingForm(formRow as unknown as ClientOnboardingForm);

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

      // Investigación real de mercado y competencia (research_runs). Puede no
      // existir todavía (la etapa 'mercado' no ha arrancado) o venir vacía:
      // las tarjetas "Tu mercado" y "Lo que funciona en tu nicho" se
      // comportan igual que hoy si esto es null. RLS: "Client can view own
      // research runs" (client_users → client_id).
      const { data: researchRow } = await supabase
        .from('research_runs' as any)
        .select('id, status, stage, cost_usd, result, created_at, finished_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (requestId !== requestRef.current) return;
      setResearchRun((researchRow as unknown as ResearchRun) ?? null);

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
  /** Los 3 que el sistema propone para grabar. El cliente puede ignorarlos. */
  const creatorShortlist = useMemo(() => parseCreatorShortlist(events), [events]);

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
   * Crea el formulario de onboarding del cliente desde el portal (sin token
   * público) — lo primero que dispara "Escribirlo" o "Contarlo hablando"
   * cuando el cliente todavía no tiene ningún formulario.
   *
   * Acción `create_form` YA DESPLEGADA (commit 6058d787): `{ action:
   * 'create_form', client_id, organization_id }` → `{ ok:true, form:{ id,
   * organization_id, client_id, token, status, expires_at }, reutilizado? }`.
   * OJO: NO devuelve `form_data` — se completa aquí con lo que ya hubiera en
   * memoria (o vacío, si es la primera vez). El contenido real se termina de
   * leer por la política RLS de lectura del cliente sobre
   * `client_onboarding_forms` (en marcha del lado backend); mientras tanto,
   * `guardarSeccionOnboarding` va llenando el estado local igual.
   */
  const crearFormulario = useCallback(async (): Promise<ClientOnboardingForm | undefined> => {
    if (!clientId) throw new Error('No pudimos identificar tu cuenta.');
    if (!organizationId) throw new Error('No pudimos identificar tu organización. Recarga la página.');
    setActing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: { action: 'create_form', client_id: clientId, organization_id: organizationId },
      });
      if (fnError) {
        const { message } = await readFunctionError(fnError);
        throw new Error(message);
      }
      const raw = data?.form as { id: string; status: OnboardingFormStatus } | undefined;
      if (!raw) return undefined;

      const previo = onboardingFormRef.current;
      const form: ClientOnboardingForm = {
        id: raw.id,
        status: raw.status,
        form_data: previo?.id === raw.id ? previo.form_data : {},
      };
      setOnboardingForm(form);
      return form;
    } finally {
      setActing(false);
    }
  }, [clientId, organizationId]);

  /**
   * Guarda (mergea) una sección del formulario de onboarding desde la sesión
   * del cliente — el equivalente sin token de `saveSection` (api pública de
   * client-onboarding).
   *
   * BLOQUEADO POR BACKEND (2026-08-13): en marcha, con este contrato exacto:
   * `{ action:'save_form_section', client_id, section, data }` →
   * `{ ok:true, form }`, con la misma lógica de merge que ya tiene
   * `client-onboarding-submit`.
   */
  const guardarSeccionOnboarding = useCallback(
    async (section: string, data: unknown): Promise<ClientOnboardingForm | undefined> => {
      if (!clientId) throw new Error('No pudimos identificar tu cuenta.');
      const { data: resp, error: fnError } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: { action: 'save_form_section', client_id: clientId, section, data },
      });
      if (fnError) {
        const { message } = await readFunctionError(fnError);
        throw new Error(message);
      }
      const form = resp?.form as ClientOnboardingForm | undefined;
      if (form) setOnboardingForm(form);
      return form;
    },
    [clientId],
  );

  /**
   * Envío final del formulario: valida obligatorios y lo marca como enviado.
   *
   * BLOQUEADO POR BACKEND (2026-08-13): en marcha, con este contrato exacto:
   * `{ action:'submit_form', client_id }` → `{ ok:true, form }`, o un error
   * `missing_required_fields` con `missing_fields: string[]` (mismo formato
   * que ya usa `client-onboarding-submit`).
   */
  const enviarOnboarding = useCallback(async (): Promise<SubmitOnboardingResult> => {
    if (!clientId) throw new Error('No pudimos identificar tu cuenta.');
    const { data: resp, error: fnError } = await supabase.functions.invoke('pipeline-orchestrator', {
      body: { action: 'submit_form', client_id: clientId },
    });
    if (fnError) {
      const result = await readSubmitFormError(fnError);
      if (result.kind === 'missing_fields') return { ok: false, missingFields: result.missingFields };
      throw new Error(result.message);
    }
    const form = resp?.form as ClientOnboardingForm | undefined;
    if (form) setOnboardingForm(form);
    await fetchAll({ silent: true });
    return { ok: true, form: form ?? (onboardingFormRef.current as ClientOnboardingForm) };
  }, [clientId, fetchAll]);

  /**
   * Arranca el proceso del cliente cuando su formulario ya está enviado pero
   * todavía no existe un run. A diferencia de `callOrchestrator`, esta acción
   * NO requiere un run_id: es precisamente la que lo crea.
   *
   * Acción `start` YA DESPLEGADA con autorización de cliente (commit
   * 6058d787): acepta `esUsuarioDelCliente` además de staff, verificado
   * contra `client_users` con el user_id del JWT. Requiere `organization_id`
   * en el body (ya se manda abajo).
   */
  const iniciarProceso = useCallback(async () => {
    if (!clientId) throw new Error('No pudimos identificar tu cuenta.');
    if (!organizationId) throw new Error('No pudimos identificar tu organización. Recarga la página.');
    setActing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('pipeline-orchestrator', {
        body: {
          action: 'start',
          client_id: clientId,
          organization_id: organizationId,
          onboarding_form_id: onboardingFormRef.current?.id ?? undefined,
        },
      });
      if (fnError) {
        const { message } = await readFunctionError(fnError);
        throw new Error(message);
      }
      if (data?.run) setRun(data.run as ClientPipelineRun);
      await fetchAll({ silent: true });
      return data;
    } finally {
      setActing(false);
    }
  }, [clientId, organizationId, fetchAll]);

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
        const nextRun = data?.run as ClientPipelineRun | undefined;
        const nextStatus = nextRun?.stage_status;
        const cambioDeEstado = !!nextStatus && nextStatus !== 'generating' && nextStatus !== 'changes_requested';
        // La investigación de mercado avanza en su propia tabla
        // (research_runs), fuera del pipeline-orchestrator: sin releer aquí
        // en cada latido, el texto de progreso ("viendo tu competencia"…) se
        // quedaría congelado en lo que había al entrar a la pantalla.
        const investigando = nextRun?.stage === 'mercado';
        if (cambioDeEstado || investigando) {
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

  /** Aprueba la etapa actual (ADN, mercado o estrategia). */
  /** El cliente elige quién graba sus videos. */
  const elegirCreador = useCallback(
    async (creatorIds: string[]) => {
      if (creatorIds.length === 0) throw new Error('Elige al menos un creador.');
      return callOrchestrator({ action: 'select_creators', creator_ids: creatorIds });
    },
    [callOrchestrator],
  );

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

  /**
   * Reintenta una etapa que se cayó (sin cuota de IA, un timeout…). Retoma
   * donde quedó, sin repetir lo ya hecho, y no gasta una de las 3
   * regeneraciones: el cliente no tiene por qué pagar los tropiezos del
   * sistema con sus intentos.
   */
  const reintentarEtapa = useCallback(
    (stage: PipelineStage) => act({ action: 'retry_stage', stage }),
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
    researchRun,
    scripts,
    onboardingForm,
    organizationId,
    loading,
    acting,
    error,
    creatorShortlist,
    elegirCreador,
    approve,
    requestChanges,
    reintentarEtapa,
    approveScript,
    requestScriptChanges,
    crearFormulario,
    guardarSeccionOnboarding,
    enviarOnboarding,
    iniciarProceso,
    refresh: fetchAll,
  };
}
