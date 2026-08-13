import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Etapa "creadores" del pipeline autónomo: el sistema propone hasta 3
 * creadores para un cliente, con el porqué de cada propuesta en castellano
 * (ya viene escrito desde el backend, en `motivos`). Un humano del equipo
 * confirma quién graba — nunca el cliente.
 *
 * Este hook lee esa propuesta (el último evento `generated` de la etapa
 * `creadores` en `client_pipeline_stage_events`), junto con la ficha
 * creativa de cada candidato, y expone las dos acciones que puede tomar el
 * equipo: confirmar por primera vez (`select_creators`) o cambiar de
 * creador cuando ya hay guiones escritos (`readapt_scripts`).
 */

export type CreatorCreativeProfile = Database["public"]["Tables"]["creator_creative_profile"]["Row"];

export interface CreatorShortlistCandidate {
  user_id: string;
  nombre: string;
  /** Orden de mejor a peor tal como lo devuelve el backend; no se muestra como número crudo. */
  score: number;
  /** Ya vienen escritos en castellano desde el backend: se muestran tal cual. */
  motivos: string[];
  /** null si la ficha creativa de este creador todavía no se completó. */
  ficha: CreatorCreativeProfile | null;
}

interface ShortlistItemCrudo {
  user_id?: unknown;
  nombre?: unknown;
  score?: unknown;
  motivos?: unknown;
}

function parseShortlist(payload: unknown): Array<{ user_id: string; nombre: string; score: number; motivos: string[] }> {
  const raw = (payload as { shortlist?: unknown } | null)?.shortlist;
  if (!Array.isArray(raw)) return [];

  return (raw as ShortlistItemCrudo[])
    .filter((item): item is ShortlistItemCrudo & { user_id: string } => typeof item?.user_id === "string")
    .map((item) => ({
      user_id: item.user_id,
      nombre: typeof item.nombre === "string" ? item.nombre : "Creador sin nombre",
      score: typeof item.score === "number" ? item.score : 0,
      motivos: Array.isArray(item.motivos) ? item.motivos.filter((m): m is string => typeof m === "string") : [],
    }));
}

const GENERIC_ERROR = "No pudimos completar la acción. Inténtalo de nuevo en un momento.";

/** Errores del orquestador traducidos a algo que el equipo entienda. */
const ERROR_MESSAGES: Record<string, string> = {
  stage_desincronizado: "Esta pantalla está desactualizada. La acabamos de refrescar: revísalo de nuevo.",
  etapa_ya_aprobada: "Esto ya estaba confirmado. Actualizamos la pantalla.",
  run_not_found: "No encontramos este proceso. Actualizamos la pantalla.",
};

/**
 * `functions.invoke` no lanza en 4xx/5xx: deja `data === null` y un
 * FunctionsHttpError cuyo cuerpo hay que abrir a mano.
 */
async function leerErrorOrquestador(fnError: unknown): Promise<string> {
  const context = (fnError as { context?: { json?: () => Promise<unknown> } })?.context;
  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: string };
      if (body?.error) return ERROR_MESSAGES[body.error] ?? GENERIC_ERROR;
    } catch {
      /* el cuerpo no era JSON: seguimos al mensaje genérico */
    }
  }
  return GENERIC_ERROR;
}

export interface ReadaptResult {
  ok: boolean;
  readaptados: number;
  nuevos: number;
  fallos: number;
}

export function useCreatorSelection(runId: string | null | undefined) {
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<CreatorShortlistCandidate[]>([]);
  /** Cuántos guiones se van a generar para este cliente. */
  const [scriptsTarget, setScriptsTarget] = useState<number>(5);
  /** Cuántos contenidos pagó, según su paquete activo. */
  const [videosDelPaquete, setVideosDelPaquete] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!runId) {
      setShortlist([]);
      setSelectedCreatorIds([]);
      setOrganizationId(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: runRow, error: runError } = await supabase
        .from("client_pipeline_runs")
        .select("organization_id, selected_creator_ids, scripts_target, client_id")
        .eq("id", runId)
        .maybeSingle();
      if (runError) throw runError;

      setOrganizationId(runRow?.organization_id ?? null);
      setSelectedCreatorIds(runRow?.selected_creator_ids ?? []);
      setScriptsTarget(runRow?.scripts_target ?? 5);

      // Lo que el cliente pagó, para poder contrastarlo con lo que se va a generar.
      if (runRow?.client_id) {
        const { data: paquete } = await supabase
          .from("client_packages")
          .select("content_quantity")
          .eq("client_id", runRow.client_id)
          .eq("is_active", true)
          .in("payment_status", ["paid", "partial"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setVideosDelPaquete(paquete?.content_quantity ?? null);
      } else {
        setVideosDelPaquete(null);
      }

      const { data: eventRow, error: eventError } = await supabase
        .from("client_pipeline_stage_events")
        .select("payload")
        .eq("run_id", runId)
        .eq("stage", "creadores")
        .eq("event", "generated")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (eventError) throw eventError;

      const candidatos = parseShortlist(eventRow?.payload);
      const userIds = candidatos.map((c) => c.user_id);

      let fichasPorUsuario = new Map<string, CreatorCreativeProfile>();
      if (userIds.length > 0) {
        const { data: fichaRows, error: fichaError } = await supabase
          .from("creator_creative_profile")
          .select("*")
          .in("user_id", userIds);
        if (fichaError) throw fichaError;
        fichasPorUsuario = new Map((fichaRows ?? []).map((f) => [f.user_id, f]));
      }

      setShortlist(
        candidatos.map((c) => ({
          ...c,
          ficha: fichasPorUsuario.get(c.user_id) ?? null,
        })),
      );
    } catch (err) {
      console.error("[useCreatorSelection] Error cargando la propuesta:", err);
      setError(err instanceof Error ? err.message : "No pudimos cargar la propuesta de creadores.");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** La lista de clientes (Clientes → Pipeline) lee de aquí: hay que invalidarla tras confirmar/cambiar. */
  const invalidarListaClientes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["client-pipeline-runs"] });
  }, [queryClient]);

  /** Primera confirmación de la etapa `creadores`: mueve el pipeline a la siguiente etapa. */
  const confirmar = useCallback(
    async (creatorIds: string[]) => {
      if (!runId) throw new Error("No hay un proceso activo para este cliente.");
      if (creatorIds.length === 0) throw new Error("Elige al menos un creador.");

      setActing(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("pipeline-orchestrator", {
          body: { action: "select_creators", run_id: runId, creator_ids: creatorIds },
        });
        if (fnError) throw new Error(await leerErrorOrquestador(fnError));

        setSelectedCreatorIds(creatorIds);
        invalidarListaClientes();
        await cargar();
        return data as { ok: boolean; creator_ids: string[] };
      } finally {
        setActing(false);
      }
    },
    [runId, invalidarListaClientes, cargar],
  );

  /** Cambio de creador cuando ya hay guiones: reescribe la voz sin perder lo ya aprobado por el cliente. */
  const readaptar = useCallback(
    async (creatorIds: string[]) => {
      if (!runId) throw new Error("No hay un proceso activo para este cliente.");
      if (creatorIds.length === 0) throw new Error("Elige al menos un creador.");

      setActing(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("pipeline-orchestrator", {
          body: { action: "readapt_scripts", run_id: runId, creator_ids: creatorIds },
        });
        if (fnError) throw new Error(await leerErrorOrquestador(fnError));

        setSelectedCreatorIds(creatorIds);
        invalidarListaClientes();
        await cargar();
        return data as ReadaptResult;
      } finally {
        setActing(false);
      }
    },
    [runId, invalidarListaClientes, cargar],
  );

  /** Ajusta cuántos guiones se generarán. Solo antes de la etapa de guiones. */
  const cambiarCantidadDeGuiones = useCallback(
    async (cantidad: number) => {
      if (!runId) throw new Error("No hay un proceso activo para este cliente.");
      if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 20) {
        throw new Error("La cantidad debe estar entre 1 y 20.");
      }

      setActing(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("pipeline-orchestrator", {
          body: { action: "set_scripts_target", run_id: runId, scripts_target: cantidad },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.detalle || data.error);

        setScriptsTarget(cantidad);
        queryClient.invalidateQueries({ queryKey: ["client-pipeline-runs"] });
        return data;
      } finally {
        setActing(false);
      }
    },
    [runId, queryClient],
  );

  return {
    organizationId,
    scriptsTarget,
    videosDelPaquete,
    cambiarCantidadDeGuiones,
    shortlist,
    selectedCreatorIds,
    loading,
    acting,
    error,
    confirmar,
    readaptar,
    refresh: cargar,
  };
}
