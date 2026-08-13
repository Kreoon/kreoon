import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineStage, PipelineStageStatus } from "@/components/clients/ClientPipelineBadge";

export interface ClientPipelineRunSummary {
  id: string;
  client_id: string;
  stage: PipelineStage;
  stage_status: PipelineStageStatus;
  product_id: string | null;
  last_feedback: string | null;
  updated_at: string;
  /** {"adn": 1, "estrategia": 0, ...} — intentos por etapa */
  stage_attempts: Record<string, number> | null;
  /** Suma de todas las etapas. El cliente puede regenerar sin tope, así que
   *  este número es lo único que delata a quien insiste mucho: cada intento
   *  gasta tokens de IA de la organización. */
  intentos_totales: number;
  /** Creadores ya confirmados por el equipo en la etapa "creadores". Vacío
   *  si todavía no se ha elegido a nadie. */
  selected_creator_ids: string[];
  /** Cuántos videos contrató, cuántos lleva y cuántos le quedan. Sirve para
   *  saber si toca ofrecer la siguiente tanda o si el paquete ya se agotó. */
  cupo: { contratados: number; usados: number; restantes: number };
}

/**
 * Estado del pipeline de TODOS los clientes de la organización, para la vista
 * de equipo (columna "Pipeline" en Clientes).
 *
 * Se pide en una sola consulta y se devuelve indexado por client_id, para que
 * la lista de clientes no dispare una consulta por tarjeta.
 */
export function useClientPipelineRuns(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["client-pipeline-runs", organizationId],
    enabled: !!organizationId,
    // El pipeline avanza solo: refrescamos cada minuto para que el equipo vea
    // el cambio sin recargar, pero sin machacar la base.
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, ClientPipelineRunSummary>> => {
      const { data, error } = await supabase
        .from("client_pipeline_runs")
        .select(
          "id, client_id, stage, stage_status, product_id, last_feedback, updated_at, stage_attempts, selected_creator_ids",
        )
        .eq("organization_id", organizationId!);

      if (error) throw error;

      const filas = (data ?? []) as ClientPipelineRunSummary[];
      const clientIds = filas.map(f => f.client_id);

      // Cupo de todos los clientes en dos consultas, no una por tarjeta.
      const cupos: Record<string, { contratados: number; usados: number; restantes: number }> = {};
      if (clientIds.length > 0) {
        const [{ data: paquetes }, { data: contenidos }] = await Promise.all([
          supabase
            .from("client_packages")
            .select("client_id, content_quantity")
            .in("client_id", clientIds)
            .eq("is_active", true)
            .in("payment_status", ["paid", "partial"]),
          supabase
            .from("content")
            .select("client_id")
            .in("client_id", clientIds),
        ]);

        for (const id of clientIds) cupos[id] = { contratados: 0, usados: 0, restantes: 0 };
        for (const p of paquetes ?? []) {
          if (!p.client_id) continue;
          cupos[p.client_id].contratados += Number(p.content_quantity ?? 0);
        }
        for (const c of contenidos ?? []) {
          if (!c.client_id || !cupos[c.client_id]) continue;
          cupos[c.client_id].usados += 1;
        }
        for (const id of clientIds) {
          cupos[id].restantes = Math.max(cupos[id].contratados - cupos[id].usados, 0);
        }
      }

      const porCliente: Record<string, ClientPipelineRunSummary> = {};
      for (const fila of filas) {
        const intentos = fila.stage_attempts ?? {};
        porCliente[fila.client_id] = {
          ...fila,
          selected_creator_ids: fila.selected_creator_ids ?? [],
          cupo: cupos[fila.client_id] ?? { contratados: 0, usados: 0, restantes: 0 },
          intentos_totales: Object.values(intentos).reduce(
            (suma, n) => suma + (Number(n) || 0),
            0,
          ),
        };
      }
      return porCliente;
    },
  });
}
