import { supabase } from "@/integrations/supabase/client";

// RPC nuevas (migración 20260930130000): aún no están en los tipos generados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args ?? {});

export interface PendingDocument {
  document_id: string;
  document_type: string;
  title: string;
  version: string;
  summary: string | null;
}

export interface CreatorOnboardingState {
  displayName: string | null;
  avatarUrl: string | null;
  contentTypes: string[];
  organizationName: string | null;
  organizationLogo: string | null;
}

/** Progreso guardado de la persona (reanudable). Solo lectura de sus propias filas. */
export async function fetchCreatorOnboardingState(userId: string, organizationId: string | null): Promise<CreatorOnboardingState> {
  const [{ data: cp }, org] = await Promise.all([
    supabase.from("creator_profiles").select("display_name, avatar_url, content_types").eq("user_id", userId).maybeSingle(),
    organizationId
      ? supabase.from("organizations").select("name, logo_url").eq("id", organizationId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    displayName: cp?.display_name ?? null,
    avatarUrl: cp?.avatar_url ?? null,
    contentTypes: (cp?.content_types as string[] | null) ?? [],
    organizationName: (org.data as { name?: string } | null)?.name ?? null,
    organizationLogo: (org.data as { logo_url?: string | null } | null)?.logo_url ?? null,
  };
}

/** Guarda un paso. No publica nada: visibilidad en el marketplace solo al publicar el portafolio. */
export async function saveCreatorOnboardingProgress(input: {
  displayName?: string;
  avatarUrl?: string;
  contentTypes?: string[];
}): Promise<void> {
  const { error } = await rpc("save_creator_onboarding_progress", {
    p_display_name: input.displayName ?? null,
    p_avatar_url: input.avatarUrl ?? null,
    p_content_types: input.contentTypes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPendingRegistrationDocuments(): Promise<PendingDocument[]> {
  const { data, error } = await rpc("get_my_pending_registration_documents");
  if (error) throw new Error(error.message);
  return (data ?? []) as PendingDocument[];
}

export async function acceptRegistrationDocuments(documentIds: string[]): Promise<void> {
  const { error } = await rpc("accept_registration_documents", { p_document_ids: documentIds });
  if (error) throw new Error(error.message);
}

export async function finishCreatorOnboarding(): Promise<void> {
  const { error } = await rpc("finish_creator_onboarding");
  if (error) throw new Error(error.message);
}
