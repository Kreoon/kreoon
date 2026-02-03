import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignContext {
  content: {
    id: string;
    title: string;
    status: string;
    sales_angle?: string;
    sphere_phase?: string;
    deadline?: string;
  };
  product?: {
    id: string;
    name: string;
    description?: string;
    primary_avatar?: {
      name?: string;
      nombre?: string;
      situation?: string;
      situacion?: string;
      primary_pain?: string;
      age?: string;
      gender?: string;
    };
    sales_angles?: unknown[];
    pains?: unknown[];
    desires?: unknown[];
  };
  client?: {
    id: string;
    name: string;
  };
  campaign?: {
    id: string;
    name: string;
    dates: { start?: string; end?: string };
  };
}

export function useCampaignContext(contentId?: string) {
  return useQuery({
    queryKey: ["campaign-context", contentId],
    queryFn: async () => {
      if (!contentId) return null;

      const { data, error } = await supabase.rpc("get_campaign_context", {
        p_content_id: contentId,
      });

      if (error) throw error;
      return data as CampaignContext;
    },
    enabled: !!contentId,
  });
}

/** Extrae variables para prompts a partir del contexto de campaña */
export function getPromptVariablesFromContext(
  context: CampaignContext | null
): Record<string, string | string[] | undefined> {
  if (!context) return {};

  const primaryAvatar = context.product?.primary_avatar;
  const avatarName =
    primaryAvatar?.name || primaryAvatar?.nombre || "";
  const avatarSituacion =
    primaryAvatar?.situation || primaryAvatar?.situacion || "";

  const pains = context.product?.pains;
  const painsArray = Array.isArray(pains)
    ? pains.map((p) => (typeof p === "string" ? p : String(p)))
    : [];

  const desires = context.product?.desires;
  const desiresArray = Array.isArray(desires)
    ? desires.map((d) => (typeof d === "string" ? d : String(d)))
    : [];

  const salesAngles = context.product?.sales_angles;
  const angulosArray = Array.isArray(salesAngles)
    ? salesAngles.map((a: unknown) => {
        if (typeof a === "string") return a;
        if (a && typeof a === "object" && "name" in a) return String((a as { name: unknown }).name);
        return String(a);
      })
    : [];

  return {
    producto_nombre: context.product?.name || "",
    producto_descripcion: context.product?.description || "",
    producto_avatar: avatarName,
    avatar_situacion: avatarSituacion,
    avatar_dolor: primaryAvatar?.primary_pain || "",
    angulo_venta: context.content.sales_angle || "",
    fase_esfera: context.content.sphere_phase || "",
    cliente_nombre: context.client?.name || "",
    dolores: painsArray,
    deseos: desiresArray,
    angulos_disponibles: angulosArray,
  };
}
