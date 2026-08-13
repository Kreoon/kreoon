import { memo } from "react";
import { Loader2, Clock, MessageSquareWarning, CheckCircle2, AlertTriangle, Coins, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estado del pipeline autónomo de un cliente, para la vista del equipo.
 *
 * Traduce el par (stage, stage_status) de `client_pipeline_runs` a una sola
 * frase que se entiende de un vistazo. La regla: el equipo tiene que saber
 * en dos palabras si algo le toca a él, al cliente, o a nadie.
 */

export type PipelineStage = "onboarding" | "adn" | "estrategia" | "guiones" | "produccion";
export type PipelineStageStatus =
  | "generating"
  | "awaiting_client"
  | "changes_requested"
  | "approved"
  | "error"
  | "paused_no_tokens";

interface ClientPipelineBadgeProps {
  stage: PipelineStage | null | undefined;
  stageStatus: PipelineStageStatus | null | undefined;
  className?: string;
  /** Muestra solo el icono, para listas muy densas */
  compact?: boolean;
  /**
   * Regeneraciones acumuladas en todas las etapas. Desde que el cliente puede
   * lanzar y regenerar por su cuenta, sin tope, este número es lo único que
   * delata a quien insiste mucho — y cada intento gasta tokens de IA de la
   * organización. Solo se pinta al pasar de UMBRAL_INTENTOS.
   */
  intentos?: number;
}

/** El orquestador escala a un humano al 4º intento sobre la misma etapa
 *  (LIMITE_REGENERACIONES en pipeline-orchestrator). Por encima de eso, sumando
 *  todas las etapas, el cliente ya ha ido y venido bastante: el equipo debería
 *  enterarse sin tener que consultar la base. */
const UMBRAL_INTENTOS = 4;

const STAGE_LABEL: Record<PipelineStage, string> = {
  onboarding: "Formulario",
  adn: "Marca",
  estrategia: "Estrategia",
  guiones: "Guiones",
  produccion: "Producción",
};

/** Cada estado dice QUIÉN tiene la pelota */
const STATUS_CONFIG: Record<
  PipelineStageStatus,
  { texto: string; icono: typeof Clock; clase: string }
> = {
  generating: {
    texto: "preparando",
    icono: Loader2,
    clase: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  awaiting_client: {
    texto: "espera al cliente",
    icono: Clock,
    clase: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  changes_requested: {
    texto: "pidió cambios",
    icono: MessageSquareWarning,
    clase: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  approved: {
    texto: "aprobado",
    icono: CheckCircle2,
    clase: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  error: {
    texto: "necesita ayuda",
    icono: AlertTriangle,
    clase: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  paused_no_tokens: {
    texto: "sin tokens",
    icono: Coins,
    clase: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

export const ClientPipelineBadge = memo(function ClientPipelineBadge({
  stage,
  stageStatus,
  className,
  compact = false,
  intentos = 0,
}: ClientPipelineBadgeProps) {
  // Sin run todavía: el cliente aún no ha enviado su formulario
  if (!stage || !stageStatus) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground",
          className,
        )}
        title="Este cliente todavía no ha completado su formulario"
      >
        Sin iniciar
      </span>
    );
  }

  const cfg = STATUS_CONFIG[stageStatus];
  const Icono = cfg.icono;
  const etiqueta = `${STAGE_LABEL[stage]} · ${cfg.texto}`;
  const insiste = intentos > UMBRAL_INTENTOS;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          cfg.clase,
        )}
        title={etiqueta}
      >
        <Icono className={cn("h-3 w-3 flex-shrink-0", stageStatus === "generating" && "animate-spin")} />
        {!compact && <span className="truncate">{etiqueta}</span>}
      </span>

      {insiste && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
          title={`Ha pedido cambios ${intentos} veces. Cada intento vuelve a generar con IA; quizá le cuesta explicar lo que quiere y agradezca una llamada.`}
        >
          <RefreshCw className="h-3 w-3 flex-shrink-0" />
          {intentos}
        </span>
      )}
    </span>
  );
});
