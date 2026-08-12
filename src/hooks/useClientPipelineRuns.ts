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
        .select("id, client_id, stage, stage_status, product_id, last_feedback, updated_at")
        .eq("organization_id", organizationId!);

      if (error) throw error;

      const porCliente: Record<string, ClientPipelineRunSummary> = {};
      for (const fila of (data ?? []) as ClientPipelineRunSummary[]) {
        porCliente[fila.client_id] = fila;
      }
      return porCliente;
    },
  });
}
