import { useMemo, useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { Content } from '@/types/database';
import {
  useClientPipeline,
  type ClientPipelineRun,
  type PipelineStage,
  type PipelineStageStatus,
} from '@/hooks/useClientPipeline';
import { useClientDocuments } from '@/hooks/useClientDocuments';
import { useCreatorCatalog } from '@/hooks/useCreatorCatalog';
import { StepCard, type StepState } from './StepCard';
import { ElegirCreadorDialog } from './ElegirCreadorDialog';
import { ReviewDialog } from './ReviewDialog';
import { RequestChangesDialog } from './RequestChangesDialog';
import { ScriptsList } from './ScriptsList';
import { ProductionSummary } from './ProductionSummary';
import { OnboardingSheet, type OnboardingSheetModo } from './OnboardingSheet';
import { DocumentosUploader } from './DocumentosUploader';
import { CompetitorsTable } from './CompetitorsTable';
import { WinningAdsList } from './WinningAdsList';
import { NicheInsightsContent } from './NicheInsightsContent';
import {
  dnaToSections,
  strategyToSections,
  researchWorkingText,
  researchProgressPercent,
} from './plainLanguage';

/**
 * La pantalla principal del portal del cliente: un checklist vertical de
 * siete pasos. El cliente solo tiene dos decisiones posibles en cada paso
 * que se lo pide — aprobar o pedir un cambio — y nunca ve una palabra de
 * jerga interna.
 */

const STAGE_ORDER: PipelineStage[] = [
  'onboarding',
  'adn',
  'mercado',
  'estrategia',
  // 'creadores' no tiene tarjeta propia todavía (la elige el equipo, no el
  // cliente) pero cuenta en el orden: sin esto, mientras el run está en
  // 'creadores' las tarjetas de guiones/producción quedarían mal marcadas
  // como "locked" en vez de reconocer que la estrategia ya se aprobó.
  'creadores',
  'guiones',
  'produccion',
];

/** Traduce el estado técnico de la etapa al estado visual de la tarjeta. */
function toStepState(status: PipelineStageStatus): StepState {
  switch (status) {
    case 'generating':
    case 'changes_requested':
      return 'working';
    case 'awaiting_client':
      return 'ready';
    // La etapa de creadores la resuelve el equipo, no el cliente. No hay
    // tarjeta que la muestre todavía, pero si el run cae aquí se lee como
    // "seguimos trabajando", nunca como error.
    case 'awaiting_team':
      return 'working';
    case 'approved':
      return 'done';
    case 'error':
    case 'paused_no_tokens':
      return 'attention';
    default:
      return 'locked';
  }
}

/**
 * Los dos estados "de atención" tienen causas distintas y merecen mensajes
 * distintos: `error` significa que un humano ya tomó el caso; el otro es una
 * pausa técnica del sistema, no un problema del cliente.
 */
function attentionText(status?: PipelineStageStatus): string {
  return status === 'paused_no_tokens'
    ? 'Estamos terminando esto. Te avisamos apenas esté.'
    : 'Un estratega de nuestro equipo va a revisarlo contigo.';
}

function attentionLabel(status?: PipelineStageStatus): string | undefined {
  return status === 'paused_no_tokens' ? 'En pausa' : undefined;
}

/**
 * Mismo umbral que UMBRAL_CADENA_MUERTA_MS en pipeline-orchestrator: pasado
 * este tiempo sin que `updated_at` se mueva, la cadena que escribe los
 * guiones uno por uno ya no está viva (crash, redeploy a medio vuelo,
 * timeout de la plataforma) y no hay nadie que la vaya a retomar sola.
 * Acotado a guiones a propósito: es la única etapa cuyo `updated_at` se
 * refresca en cada paso normal (ver el comentario del backend); las demás
 * pueden estar calladas varios minutos mientras un proceso externo sigue
 * vivo, así que ahí este mismo umbral daría un falso "se colgó".
 */
const GUIONES_COLGADO_MS = 5 * 60 * 1000;

function guionesEstanColgados(run: ClientPipelineRun | null): boolean {
  if (!run || run.stage !== 'guiones' || run.stage_status !== 'generating') return false;
  return Date.now() - new Date(run.updated_at).getTime() >= GUIONES_COLGADO_MS;
}

/**
 * "Van a grabar: Ana (3 videos), Luis (3 videos)." Sin el reparto guardado
 * (runs viejos, o mientras el backend todavía no lo devuelve) cae a listar
 * solo los nombres, sin inventar cantidades.
 */
function resumenReparto(
  creatorIds: string[],
  allocation: Record<string, number> | null | undefined,
  nombreDe: (userId: string) => string,
): string {
  if (creatorIds.length === 0) return '';
  const partes = creatorIds.map((id) => {
    const cantidad = allocation?.[id];
    const nombre = nombreDe(id);
    return typeof cantidad === 'number'
      ? `${nombre} (${cantidad} ${cantidad === 1 ? 'video' : 'videos'})`
      : nombre;
  });
  return `Van a grabar: ${partes.join(', ')}.`;
}

interface ClientPipelineChecklistProps {
  clientId: string | null;
  clientName?: string;
  /** Contenido del cliente ya cargado por el dashboard (paso 7, solo lectura). */
  content: Content[];
  /** Navegación a las otras vistas del portal que se conservan. */
  onGoToTab?: (tab: string) => void;
}

export function ClientPipelineChecklist({
  clientId,
  clientName,
  content,
  onGoToTab,
}: ClientPipelineChecklistProps) {
  const { toast } = useToast();
  const {
    run,
    onboardingForm,
    dnaData,
    product,
    researchProgress,
    researchRun,
    scripts,
    organizationId,
    loading,
    acting,
    approve,
    requestChanges,
    reintentarEtapa,
    creatorShortlist,
    elegirCreador,
    generarGuiones,
    approveScript,
    requestScriptChanges,
    crearFormulario,
    guardarSeccionOnboarding,
    enviarOnboarding,
    iniciarProceso,
    refresh,
  } = useClientPipeline(clientId);

  const documentos = useClientDocuments(clientId, organizationId);

  // Nombres de creadores elegidos que no están entre los 3 recomendados: el
  // cliente puede elegir a cualquiera del catálogo completo, y el resumen
  // ("Van a grabar…") necesita poder nombrarlos a todos. Solo se pide el
  // catálogo cuando ya hay alguien elegido — antes de eso no hace falta.
  const catalogoElegidos = useCreatorCatalog(
    run?.selected_creator_ids?.length ? clientId : null,
  );

  const nombreDeCreador = (userId: string): string =>
    creatorShortlist.find((c) => c.user_id === userId)?.nombre ??
    catalogoElegidos.byId.get(userId)?.nombre ??
    'Creador';

  // Qué se está viendo / cambiando (null = nada abierto)
  const [eligiendoCreador, setEligiendoCreador] = useState(false);
  const [reviewing, setReviewing] = useState<'adn' | 'mercado' | 'estrategia' | null>(null);
  const [changing, setChanging] = useState<'adn' | 'mercado' | 'estrategia' | null>(null);
  // Panel lateral para llenar el formulario de inicio (null = cerrado)
  const [onboardingSheetModo, setOnboardingSheetModo] = useState<OnboardingSheetModo | null>(null);

  const dnaSections = useMemo(() => dnaToSections(dnaData), [dnaData]);
  const strategySections = useMemo(() => strategyToSections(product), [product]);

  const currentIndex = run ? STAGE_ORDER.indexOf(run.stage) : -1;

  const stateOf = (stage: PipelineStage): StepState => {
    if (!run) return 'locked';
    const index = STAGE_ORDER.indexOf(stage);
    if (index < currentIndex) return 'done';
    if (index > currentIndex) return 'locked';
    return toStepState(run.stage_status);
  };

  const adnState = stateOf('adn');
  const mercadoState = stateOf('mercado');
  // "Lo que funciona en tu nicho" es solo lectura: no tiene su propia
  // aprobación, así que en cuanto la investigación queda lista para que el
  // cliente la revise, sus datos ya están ahí para mostrarse (sin esperar a
  // que apruebe la tarjeta de mercado).
  const nicheState: StepState = mercadoState === 'ready' ? 'done' : mercadoState;
  const strategyState = stateOf('estrategia');
  // La etapa de creador la resuelve el CLIENTE desde aquí.
  const creadorState = stateOf('creadores');
  // 'done' cubre dos momentos distintos: el run puede seguir EN la etapa
  // 'creadores' (ya eligió y repartió, pero los guiones no arrancaron) o ya
  // haber avanzado a 'guiones'/más allá (los guiones ya se generaron). Se
  // distinguen mirando `run.stage`, sin inventar ningún campo nuevo.
  const creadorElegidoSinGenerar = creadorState === 'done' && run?.stage === 'creadores';
  const scriptsState = stateOf('guiones');
  const productionState = stateOf('produccion');

  // Escribir los guiones es un proceso largo (uno por uno) sin nada visible
  // que mostrar mientras tanto: si la cadena que los va generando se cae a
  // medio camino, el cliente solo ve la rueda girando para siempre, sin
  // saber que algo se rompió ni qué hacer. Pasado el umbral se le explica
  // en palabras simples y se le da la misma salida que a un paso caído.
  const guionesColgados = guionesEstanColgados(run);

  // El paso 1 se da por hecho en cuanto el pipeline arranca.
  const onboardingState: StepState = !run
    ? 'locked'
    : run.onboarding_completed_at || currentIndex > 0
      ? 'done'
      : 'working';

  // Estado del formulario de inicio, para decidir qué ofrecerle al cliente
  // mientras todavía no hay un proceso (`run`) arrancado.
  const formularioListo = onboardingForm?.status === 'submitted' || onboardingForm?.status === 'processed';

  // Abrir el panel CREA la fila del formulario, aunque el cliente no llegue a
  // escribir nada. Si nos fiáramos solo del status ('pending' recién creado),
  // bastaría con abrir y cerrar para que la pantalla dijera "ya empezaste" y
  // ofreciera únicamente "seguir escribiendo" — dejando fuera el camino de
  // hablar. Por eso lo que decide es si hay CONTENIDO, no si existe la fila.
  const tieneAlgoEscrito = Object.values(onboardingForm?.form_data ?? {}).some((seccion) => {
    if (!seccion || typeof seccion !== 'object') return !!seccion;
    return Object.values(seccion as Record<string, unknown>).some(
      (v) => v !== null && v !== undefined && v !== '',
    );
  });

  const formularioAMedias = !formularioListo && tieneAlgoEscrito;

  const abrirFormulario = async (modo: OnboardingSheetModo) => {
    // Si el cliente todavía no tiene ningún formulario, se crea antes de
    // abrir el panel (primer clic en "Escribirlo" o "Contarlo hablando").
    if (!onboardingForm) {
      try {
        await crearFormulario();
      } catch (err) {
        toast({
          title: 'No pudimos empezar tu formulario',
          description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
          variant: 'destructive',
        });
        return;
      }
    }
    setOnboardingSheetModo(modo);
  };

  const handleIniciarProceso = async () => {
    try {
      await iniciarProceso();
      toast({
        title: '¡Arrancamos!',
        description: 'Ya estamos trabajando en entender tu marca.',
      });
    } catch (err) {
      toast({
        title: 'No pudimos empezar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Volver a intentar un paso que se cayó. La causa suele ser pasajera —un
   * proveedor de IA sin cuota, un tiempo de espera agotado— y retoma donde se
   * quedó, así que no rehace lo que ya estaba hecho.
   */
  const handleReintentar = async (stage: PipelineStage) => {
    try {
      await reintentarEtapa(stage);
      toast({
        title: 'Lo estamos intentando de nuevo',
        description: 'Seguimos desde donde se quedó. Te avisamos al terminar.',
      });
    } catch (err) {
      toast({
        title: 'No pudimos reintentarlo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (stage: 'adn' | 'mercado' | 'estrategia') => {
    try {
      await approve(stage);
      setReviewing(null);
      toast({
        title: '¡Listo, aprobado!',
        description: 'Seguimos con el siguiente paso. Te avisamos cuando esté.',
      });
    } catch (err) {
      toast({
        title: 'No pudimos guardarlo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
    }
  };

  const handleRequestChanges = async (feedback: string) => {
    if (!changing) return;
    try {
      await requestChanges(changing, feedback);
      setChanging(null);
      setReviewing(null);
      toast({
        title: 'Recibimos tu cambio',
        description: 'Lo ajustamos y te lo mostramos de nuevo.',
      });
    } catch (err) {
      toast({
        title: 'No pudimos enviarlo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
    }
  };

  const handleScriptChanges = async (contentId: string, feedback: string) => {
    try {
      await requestScriptChanges(contentId, feedback);
      toast({ title: 'Recibimos tu cambio', description: 'Reescribimos ese guion y te avisamos.' });
    } catch (err) {
      toast({
        title: 'No pudimos enviarlo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handleScriptApprove = async (contentId: string) => {
    try {
      await approveScript(contentId);
      toast({ title: 'Guion aprobado', description: 'Ese video ya puede entrar a grabación.' });
    } catch (err) {
      toast({
        title: 'No pudimos guardarlo',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  /** Confirma o cambia quién graba y cómo se reparten los videos entre ellos. */
  const handleElegirCreador = async (creatorIds: string[], allocation: Record<string, number>) => {
    await elegirCreador(creatorIds, allocation);
    toast({
      title: '¡Listo, ya quedó el reparto!',
      description: 'Cuando estés conforme, dale a "Generar los guiones".',
    });
  };

  /** Arranca la escritura de los guiones una vez el reparto ya está cuadrado. */
  const handleGenerarGuiones = async () => {
    try {
      await generarGuiones();
      toast({
        title: 'Generando tus guiones',
        description: 'Ya estamos escribiendo tus videos. Te avisamos cuando estén listos.',
      });
    } catch (err) {
      toast({
        title: 'No pudimos generar los guiones',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando tu proceso…</p>
      </div>
    );
  }

  const pendingScripts = scripts.filter(s => s.status !== 'script_approved');
  const mercadoProgreso = mercadoState === 'working' ? researchProgressPercent(researchRun) : null;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold leading-tight">
          {clientName ? `Hola, ${clientName}` : 'Tu proceso'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Este es tu proceso paso a paso. Te avisamos cada vez que haya algo para ti.
        </p>
      </header>

      {!run && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          {formularioListo ? (
            <>
              <p className="font-medium">Ya podemos empezar</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ya tenemos todo lo que nos contaste. Dale clic y arrancamos.
              </p>
              <Button
                className="mt-3 w-full sm:w-auto"
                onClick={handleIniciarProceso}
                disabled={acting}
              >
                {acting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Empezar mi proceso
              </Button>
            </>
          ) : formularioAMedias ? (
            <>
              <p className="font-medium">Te falta poco</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ya empezaste a contarnos de tu marca. Termina cuando quieras.
              </p>
              {/* El segundo botón no es adorno: sin él, quien empezó
                  escribiendo queda atrapado en ese camino para siempre. */}
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => abrirFormulario('escribir')}
                >
                  Seguir donde lo dejaste
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => abrirFormulario('hablar')}
                >
                  Mejor contarlo hablando
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="font-medium">Cuéntanos de tu marca</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Así sabemos qué videos hacerte. Toma solo unos minutos.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button className="w-full sm:w-auto" onClick={() => abrirFormulario('escribir')}>
                  Escribirlo
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => abrirFormulario('hablar')}
                >
                  Contarlo hablando
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 1. Tu información ─────────────────────────────────────── */}
      <StepCard
        number={1}
        title="Tu información"
        description={
          onboardingState === 'done'
            ? 'Ya tenemos tus respuestas. Con eso arranca todo lo demás.'
            : 'Estamos guardando lo que nos contaste.'
        }
        state={onboardingState}
        stateLabel={onboardingState === 'done' ? 'Recibido' : undefined}
        primaryAction={<DocumentosUploader documentos={documentos} />}
      />

      {/* ── 2. Así entendimos tu marca ────────────────────────────── */}
      <StepCard
        number={2}
        title="Así entendimos tu marca"
        description={
          adnState === 'done'
            ? 'Lo aprobaste. Todo lo que hacemos parte de aquí.'
            : adnState === 'ready'
              ? 'Léelo y dinos si te representa.'
              : adnState === 'working'
                ? run?.stage_status === 'changes_requested'
                  ? 'Estamos haciendo los cambios que nos pediste.'
                  : 'Estamos leyendo tus respuestas para entender tu marca.'
                : adnState === 'attention'
                  ? attentionText(run?.stage_status)
                  : 'Empieza apenas tengamos tu información.'
        }
        state={adnState}
        onRetry={() => handleReintentar('adn')}
        retrying={acting}
        stateLabel={
          adnState === 'working' && run?.stage_status === 'changes_requested'
            ? 'Haciendo tus cambios'
            : adnState === 'attention'
              ? attentionLabel(run?.stage_status)
              : undefined
        }
        primaryAction={
          adnState === 'ready' ? (
            <Button className="w-full sm:w-auto" onClick={() => setReviewing('adn')}>
              Ver y aprobar
            </Button>
          ) : adnState === 'done' ? (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setReviewing('adn')}>
              Ver
            </Button>
          ) : undefined
        }
        secondaryAction={
          adnState === 'ready' ? (
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
              onClick={() => setChanging('adn')}
            >
              Pedir un cambio
            </Button>
          ) : undefined
        }
      />

      {/* ── 3. Tu mercado y competencia ───────────────────────────── */}
      <StepCard
        number={3}
        title="Tu mercado y competencia"
        description={
          mercadoState === 'done'
            ? 'Aprobado. Así vimos a tu competencia.'
            : mercadoState === 'ready'
              ? 'Mira a tu competencia y dinos si la ves igual.'
              : mercadoState === 'working'
                ? run?.stage_status === 'changes_requested'
                  ? 'Estamos revisando lo que nos pediste.'
                  : 'Estamos investigando tu mercado y tu competencia.'
                : mercadoState === 'attention'
                  ? attentionText(run?.stage_status)
                  : 'Empieza cuando apruebes cómo entendimos tu marca.'
        }
        state={mercadoState}
        onRetry={() => handleReintentar('mercado')}
        retrying={acting}
        stateLabel={
          mercadoState === 'working' && run?.stage_status === 'changes_requested'
            ? 'Haciendo tus cambios'
            : mercadoState === 'attention'
              ? attentionLabel(run?.stage_status)
              : undefined
        }
        primaryAction={
          mercadoState === 'ready' ? (
            <Button className="w-full sm:w-auto" onClick={() => setReviewing('mercado')}>
              Ver y aprobar
            </Button>
          ) : mercadoState === 'done' ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setReviewing('mercado')}
            >
              Ver
            </Button>
          ) : undefined
        }
        secondaryAction={
          mercadoState === 'ready' ? (
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
              onClick={() => setChanging('mercado')}
            >
              Pedir un cambio
            </Button>
          ) : undefined
        }
      >
        {/* Progreso real de la investigación (research_runs.stage.fase) */}
        {mercadoState === 'working' && mercadoProgreso !== null ? (
          <div className="mt-3">
            <Progress value={mercadoProgreso} className="h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">{researchWorkingText(researchRun)}</p>
          </div>
        ) : null}
      </StepCard>

      {/* ── 4. Lo que funciona en tu nicho (solo lectura) ─────────── */}
      <StepCard
        number={4}
        title="Lo que funciona en tu nicho"
        description={
          nicheState === 'done'
            ? 'Esto es lo que más está funcionando en tu nicho ahora mismo.'
            : nicheState === 'working'
              ? 'Estamos viendo qué está funcionando en tu nicho.'
              : nicheState === 'attention'
                ? attentionText(run?.stage_status)
                : 'Aparece junto con tu mercado y tu competencia.'
        }
        state={nicheState}
      >
        {nicheState !== 'locked' && (
          <div className="mt-3">
            <NicheInsightsContent adnViral={researchRun?.result?.adn_viral} />
          </div>
        )}
      </StepCard>

      {/* ── 5. Tu estrategia ──────────────────────────────────────── */}
      <StepCard
        number={5}
        title="Tu estrategia"
        description={
          strategyState === 'done'
            ? 'Aprobada. Ya sabemos qué contar y dónde.'
            : strategyState === 'ready'
              ? 'Mira el plan y dinos si vamos por buen camino.'
              : strategyState === 'working'
                ? run?.stage_status === 'changes_requested'
                  ? 'Estamos ajustando el plan con lo que nos dijiste.'
                  : 'Estamos investigando tu mercado y armando el plan.'
                : strategyState === 'attention'
                  ? attentionText(run?.stage_status)
                  : 'Empieza cuando apruebes tu mercado y tu competencia.'
        }
        state={strategyState}
        onRetry={() => handleReintentar('estrategia')}
        retrying={acting}
        stateLabel={
          strategyState === 'working' && run?.stage_status === 'changes_requested'
            ? 'Haciendo tus cambios'
            : strategyState === 'attention'
              ? attentionLabel(run?.stage_status)
              : undefined
        }
        primaryAction={
          strategyState === 'ready' ? (
            <Button className="w-full sm:w-auto" onClick={() => setReviewing('estrategia')}>
              Ver y aprobar
            </Button>
          ) : strategyState === 'done' ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setReviewing('estrategia')}
            >
              Ver
            </Button>
          ) : undefined
        }
        secondaryAction={
          strategyState === 'ready' ? (
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
              onClick={() => setChanging('estrategia')}
            >
              Pedir un cambio
            </Button>
          ) : undefined
        }
      >
        {/* Progreso REAL de la investigación (products.research_progress) */}
        {strategyState === 'working' && researchProgress?.total ? (
          <div className="mt-3">
            <Progress
              value={Math.min(100, Math.round((researchProgress.step / researchProgress.total) * 100))}
              className="h-1.5"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Paso {researchProgress.step} de {researchProgress.total}
              {researchProgress.label ? ` · ${researchProgress.label}` : ''}
            </p>
          </div>
        ) : null}
      </StepCard>

      {/* ── 6. Tu creador ─────────────────────────────────────────── */}
      <StepCard
        number={6}
        title="Tu creador"
        state={creadorState}
        description={
          creadorState === 'done'
            ? resumenReparto(run?.selected_creator_ids ?? [], run?.creator_allocation, nombreDeCreador) ||
              'Ya está elegido quién va a grabar.'
            : creadorState === 'ready'
              ? 'Elige quién va a grabar tus videos. Puedes ver su trabajo antes de decidir.'
              : 'Cuando aprobemos tu estrategia, eliges quién graba.'
        }
        primaryAction={
          creadorState === 'ready' ? (
            <Button className="w-full sm:w-auto" onClick={() => setEligiendoCreador(true)}>
              Elegir mi creador
            </Button>
          ) : creadorElegidoSinGenerar ? (
            <Button
              className="w-full sm:w-auto gap-2"
              onClick={handleGenerarGuiones}
              disabled={acting}
            >
              {acting && <Loader2 className="w-4 h-4 animate-spin" />}
              Generar los guiones
            </Button>
          ) : undefined
        }
        secondaryAction={
          creadorElegidoSinGenerar ? (
            <Button
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground"
              onClick={() => setEligiendoCreador(true)}
            >
              Cambiar
            </Button>
          ) : undefined
        }
      />

      {/* ── 7. Tus guiones ────────────────────────────────────────── */}
      <StepCard
        number={7}
        title="Tus guiones"
        description={
          scriptsState === 'done'
            ? 'Todos aprobados. Ya pasamos a grabar.'
            : scriptsState === 'ready'
              ? pendingScripts.length > 0
                ? 'Léelos y apruébalos uno por uno.'
                : 'Aún no hay nada que revisar. Te avisamos en cuanto esté listo.'
              : scriptsState === 'working'
                ? run?.stage_status === 'changes_requested'
                  ? 'Estamos reescribiendo lo que nos pediste.'
                  : 'Estamos escribiendo tus guiones.'
                : scriptsState === 'attention'
                  ? attentionText(run?.stage_status)
                  : 'Empiezan cuando apruebes tu estrategia y elijamos tu creador.'
        }
        state={scriptsState}
        onRetry={() => handleReintentar('guiones')}
        retrying={acting}
        stateLabel={
          scriptsState === 'working' && run?.stage_status === 'changes_requested'
            ? 'Haciendo tus cambios'
            : scriptsState === 'attention'
              ? attentionLabel(run?.stage_status)
              : undefined
        }
      >
        {(scriptsState === 'ready' || scriptsState === 'done') && (
          <ScriptsList
            scripts={scripts}
            acting={acting}
            onApprove={handleScriptApprove}
            onRequestChanges={handleScriptChanges}
          />
        )}

        {scriptsState === 'working' && guionesColgados && (
          <div className="mt-3 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Esto se está demorando más de lo normal. Puedes reintentar y seguimos desde donde
              quedó — no se repite lo que ya está hecho.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 gap-2"
              onClick={() => handleReintentar('guiones')}
              disabled={acting}
            >
              {acting && <Loader2 className="w-4 h-4 animate-spin" />}
              Reintentar
            </Button>
          </div>
        )}
      </StepCard>

      {/* ── 8. Tus videos (solo lectura) ──────────────────────────── */}
      <StepCard
        number={8}
        title="Tus videos"
        description={
          productionState === 'locked'
            ? 'Empezamos a grabar cuando apruebes tus guiones.'
            : content.length === 0
              ? 'Aún no hay videos en camino. Te avisamos en cuanto arranquen.'
              : 'Aquí ves cómo van tus videos. No tienes que hacer nada.'
        }
        state={productionState}
        stateLabel={productionState === 'locked' ? 'Aún no empieza' : 'En marcha'}
        isLast
        primaryAction={
          productionState !== 'locked' && content.length > 0 && onGoToTab ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onGoToTab('portfolio')}
            >
              Ver mis videos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : undefined
        }
      >
        {productionState !== 'locked' && <ProductionSummary content={content} />}
      </StepCard>

      {/* Accesos a lo demás del portal, sin robarle protagonismo al checklist */}
      {onGoToTab && (
        <div className="mt-2 flex flex-wrap gap-2 pl-12 sm:pl-[52px]">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onGoToTab('resumen')}>
            Mi resumen
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onGoToTab('facturas')}>
            Mis facturas
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onGoToTab('products')}>
            Mis productos
          </Button>
        </div>
      )}

      {/* ── Diálogos ──────────────────────────────────────────────── */}
      <ReviewDialog
        open={reviewing === 'adn'}
        onOpenChange={open => !open && setReviewing(null)}
        title="Así entendimos tu marca"
        subtitle={
          adnState === 'done'
            ? 'Esto es lo que aprobaste. Todo tu contenido parte de aquí.'
            : 'Léelo con calma. Si algo no te representa, pídenos el cambio.'
        }
        sections={dnaSections}
        showActions={adnState === 'ready'}
        submitting={acting}
        onApprove={() => handleApprove('adn')}
        onRequestChanges={() => setChanging('adn')}
      />

      <ReviewDialog
        open={reviewing === 'mercado'}
        onOpenChange={open => !open && setReviewing(null)}
        title="Tu mercado y tu competencia"
        subtitle={
          mercadoState === 'done'
            ? 'Esto es lo que aprobaste sobre tu competencia.'
            : 'Así vimos a tu competencia real. Dinos si la ves igual.'
        }
        showActions={mercadoState === 'ready'}
        submitting={acting}
        onApprove={() => handleApprove('mercado')}
        onRequestChanges={() => setChanging('mercado')}
      >
        <div className="space-y-6">
          <section>
            <h4 className="text-base font-semibold mb-2">Tu competencia</h4>
            <CompetitorsTable competidores={researchRun?.result?.adn_mercado?.competidores} />
          </section>
          <section>
            <h4 className="text-base font-semibold mb-2">Los anuncios que están funcionando</h4>
            <WinningAdsList ads={researchRun?.result?.ads} />
          </section>
        </div>
      </ReviewDialog>

      <ElegirCreadorDialog
        open={eligiendoCreador}
        onOpenChange={setEligiendoCreador}
        clientId={clientId}
        recomendados={creatorShortlist}
        totalGuiones={run?.scripts_target ?? 0}
        seleccionInicial={run?.selected_creator_ids ?? undefined}
        repartoInicial={run?.creator_allocation ?? undefined}
        onConfirmar={handleElegirCreador}
      />

      <ReviewDialog
        open={reviewing === 'estrategia'}
        onOpenChange={open => !open && setReviewing(null)}
        title="Tu estrategia"
        subtitle={
          strategyState === 'done'
            ? 'Este es el plan que aprobaste.'
            : 'Este es el plan que proponemos. Dinos si vamos bien.'
        }
        sections={strategySections}
        showActions={strategyState === 'ready'}
        submitting={acting}
        onApprove={() => handleApprove('estrategia')}
        onRequestChanges={() => setChanging('estrategia')}
      />

      <RequestChangesDialog
        open={!!changing}
        onOpenChange={open => !open && setChanging(null)}
        what={
          changing === 'adn'
            ? 'Así entendimos tu marca'
            : changing === 'mercado'
              ? 'Tu mercado y tu competencia'
              : 'Tu estrategia'
        }
        submitting={acting}
        onSubmit={handleRequestChanges}
      />

      {/* ── Formulario de inicio (panel lateral) ─────────────────────── */}
      <OnboardingSheet
        open={!!onboardingSheetModo}
        modo={onboardingSheetModo ?? 'escribir'}
        formData={onboardingForm?.form_data ?? {}}
        onOpenChange={(open) => !open && setOnboardingSheetModo(null)}
        onSaveSection={guardarSeccionOnboarding}
        onSubmit={enviarOnboarding}
        onCambiarModo={setOnboardingSheetModo}
        documentos={documentos}
        onCompleted={() => {
          setOnboardingSheetModo(null);
          refresh({ silent: true });
        }}
      />
    </div>
  );
}
