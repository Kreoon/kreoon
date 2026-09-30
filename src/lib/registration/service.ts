import { supabase } from "@/integrations/supabase/client";
import type { Attribution } from "./attribution";
import { attributionToSearchParams } from "./attribution";
import { registrationContinuePath } from "./paths";
import { getRegistrationHostTarget } from "./host";
import { sanitizeReturnTo } from "./returnTo";

/**
 * Servicio ÚNICO de registro público de creadores.
 *
 * Toda decisión de autorización vive en el servidor (RPC get_registration_org /
 * complete_creator_signup). Este módulo nunca envía rol, organization_id ni flags de privilegio:
 * solo el slug (validado por el servidor), los documentos que el usuario aceptó y atribución
 * filtrada. Los user_metadata que se escriben al crear la cuenta son solo el nombre visible.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface RegistrationOrg {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
}

export type RegistrationOrgStatus = "open" | "closed" | "inactive" | "not_found";

export interface RegistrationOrgResult {
  status: RegistrationOrgStatus;
  organization?: RegistrationOrg;
}

export interface SignupDocument {
  document_id: string;
  document_type: string;
  title: string;
  version: string;
  summary: string | null;
}

export type CompleteSignupStatus = "joined" | "already_member" | "needs_confirmation";

export type RegistrationErrorCode =
  | "unauthorized"
  | "org_not_found"
  | "org_inactive"
  | "registration_closed"
  | "consents_required"
  | "weak_password"
  | "rate_limited"
  | "network"
  | "unknown";

export class RegistrationError extends Error {
  constructor(public code: RegistrationErrorCode, message?: string, public detail?: string) {
    super(message ?? code);
    this.name = "RegistrationError";
  }
}

// Las RPC nuevas no están en src/integrations/supabase/types.ts (se regenera al aplicar la migración).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args ?? {});

function mapRpcError(message: string): RegistrationError {
  const m = message.toLowerCase();
  if (m.includes("consents_required")) {
    return new RegistrationError("consents_required", message, message.split("consents_required:")[1]?.trim());
  }
  for (const code of ["unauthorized", "org_not_found", "org_inactive", "registration_closed"] as const) {
    if (m.includes(code)) return new RegistrationError(code, message);
  }
  if (m.includes("failed to fetch") || m.includes("network")) return new RegistrationError("network", message);
  return new RegistrationError("unknown", message);
}

// ─── Resolución de organización (servidor) ───────────────────────────────────

export async function getRegistrationOrg(slug: string): Promise<RegistrationOrgResult> {
  const { data, error } = await rpc("get_registration_org", { p_slug: slug });
  if (error) throw mapRpcError(error.message);
  return data as RegistrationOrgResult;
}

/**
 * Slug de la organización que gobierna el registro en ESTE host.
 *  - dominio raíz → organización predeterminada configurada (UGC Colombia)
 *  - dominio/subdominio de una organización → la que resuelve el servidor
 * Devuelve null si no hay contexto válido: el llamador muestra un estado claro, NUNCA un fallback.
 */
export async function resolveRegistrationSlugForHost(hostname: string): Promise<string | null> {
  const target = getRegistrationHostTarget(hostname);

  if (target.kind === "default") {
    const { data, error } = await rpc("get_default_registration_org");
    if (error) throw mapRpcError(error.message);
    return (data as { slug: string | null } | null)?.slug ?? null;
  }

  const { data, error } = await rpc("resolve_org_by_domain", { p_hostname: target.hostname });
  if (error) throw mapRpcError(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row?.org_slug ?? null;
}

export async function getCreatorSignupDocuments(): Promise<SignupDocument[]> {
  const { data, error } = await rpc("get_creator_signup_documents");
  if (error) throw mapRpcError(error.message);
  return (data ?? []) as SignupDocument[];
}

// ─── Persistencia de comodidad (NO es fuente de autorización) ────────────────
// Solo permite continuar automáticamente en el mismo navegador tras OAuth/correo.
// Sin ella (otro dispositivo) el servidor sigue siendo la autoridad y se pide confirmación.

const INTENT_KEY = "kreoon:creator-signup-intent";

interface StoredIntent {
  slug: string;
  documentIds: string[];
  attribution: Attribution;
  next: string | null;
  at: number;
}

const INTENT_TTL_MS = 60 * 60 * 1000;

export function rememberSignupIntent(i: Omit<StoredIntent, "at">): void {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...i, at: Date.now() } satisfies StoredIntent));
  } catch {
    /* almacenamiento no disponible: el flujo sigue, pedirá confirmación */
  }
}

export function readSignupIntent(slug: string): StoredIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredIntent;
    if (v.slug !== slug || Date.now() - v.at > INTENT_TTL_MS) return null;
    return v;
  } catch {
    return null;
  }
}

export function clearSignupIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* noop */
  }
}

// ─── Autenticación ───────────────────────────────────────────────────────────

/** URL absoluta a la que vuelven el enlace del correo y el OAuth. Siempre interna y canónica. */
export function buildContinueUrl(slug: string, attribution: Attribution, next: string | null): string {
  const sp = attributionToSearchParams(attribution);
  const safeNext = sanitizeReturnTo(next);
  if (safeNext) sp.set("next", safeNext);
  return `${window.location.origin}${registrationContinuePath(slug, sp)}`;
}

export type EmailSignUpResult =
  | { kind: "session" } // sesión inmediata (confirmación de correo desactivada)
  | { kind: "verify_email" }
  | { kind: "account_exists" };

export async function signUpWithEmail(input: {
  slug: string;
  name: string;
  email: string;
  password: string;
  attribution: Attribution;
  next: string | null;
}): Promise<EmailSignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: buildContinueUrl(input.slug, input.attribution, input.next),
      // Solo el nombre visible. Ningún rol, organización, comunidad o flag de privilegio.
      data: { full_name: input.name.trim() },
    },
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered")) return { kind: "account_exists" };
    if (m.includes("password")) throw new RegistrationError("weak_password", error.message);
    if (error.status === 429 || m.includes("rate limit")) throw new RegistrationError("rate_limited", error.message);
    throw new RegistrationError("unknown", error.message);
  }

  // Supabase, con confirmación activa, responde "éxito" con identities = [] si el correo ya existe
  // (evita enumeración). Se trata como cuenta existente: no se duplica ni se promete un correo nuevo.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { kind: "account_exists" };
  }

  return data.session ? { kind: "session" } : { kind: "verify_email" };
}

export async function signInWithGoogle(input: { slug: string; attribution: Attribution; next: string | null }): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: buildContinueUrl(input.slug, input.attribution, input.next) },
  });
  if (error) throw new RegistrationError("unknown", error.message);
}

export async function resendConfirmation(input: {
  slug: string;
  email: string;
  attribution: Attribution;
  next: string | null;
}): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: input.email.trim().toLowerCase(),
    options: { emailRedirectTo: buildContinueUrl(input.slug, input.attribution, input.next) },
  });
  if (error) {
    if (error.status === 429 || error.message.toLowerCase().includes("rate limit")) {
      throw new RegistrationError("rate_limited", error.message);
    }
    throw new RegistrationError("unknown", error.message);
  }
}

// ─── Alta en la organización (servidor) ──────────────────────────────────────

export interface CompleteSignupResult {
  status: CompleteSignupStatus;
  organization: Pick<RegistrationOrg, "id" | "slug" | "name" | "logo_url">;
}

export async function completeCreatorSignup(input: {
  slug: string;
  documentIds: string[];
  attribution: Attribution;
  explicit?: boolean;
}): Promise<CompleteSignupResult> {
  const { data, error } = await rpc("complete_creator_signup", {
    p_slug: input.slug,
    p_accepted_document_ids: input.documentIds,
    p_attribution: input.attribution,
    p_explicit: input.explicit ?? false,
  });
  if (error) throw mapRpcError(error.message);
  return data as CompleteSignupResult;
}
