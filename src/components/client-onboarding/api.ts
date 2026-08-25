import { SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import type { OnboardingFormData, SectionKey } from './schemas';

/**
 * Cliente de las edge functions públicas del onboarding.
 *
 * Se usa `fetch` directo (no `supabase.functions.invoke`) a propósito: las
 * funciones distinguen 404 / 409 / 410 / 422 / 429 y necesitamos el status code
 * limpio para mostrar la pantalla correcta. `functions.invoke` envuelve los
 * no-2xx en FunctionsHttpError y obliga a desenterrar el body del context.
 *
 * No se manda Authorization ni apikey: las tres funciones corren con
 * verify_jwt = false y el cliente que llena el formulario no tiene sesión
 * (hasta que reclama su cuenta en el paso 0).
 */

const GET_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/client-onboarding-get`;
const SUBMIT_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/client-onboarding-submit`;
const CLAIM_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/client-onboarding-claim`;

/** Motivos por los que el formulario no se puede abrir. */
export type LoadErrorCode =
  | 'invalid_token'
  | 'expired'
  | 'already_processed'
  | 'rate_limit_exceeded'
  | 'network';

export interface OnboardingBranding {
  clientName: string | null;
  orgName: string | null;
  orgLogoUrl: string | null;
}

/** Estado de la cuenta del cliente para este link (paso 0 del wizard). */
export interface OnboardingAccount {
  claimed: boolean;
  email: string | null;
  fullName: string | null;
}

/** Documento legal a aceptar en el paso 0 (términos, tratamiento de datos, etc). */
export interface LegalDocument {
  id: string;
  documentType: string;
  title: string;
  version: string;
  summary: string | null;
  contentHtml: string;
}

export interface LoadedOnboarding {
  branding: OnboardingBranding;
  status: string;
  formData: OnboardingFormData;
  expiresAt: string;
  account: OnboardingAccount;
  legalDocuments: LegalDocument[];
}

export type LoadResult =
  | { ok: true; data: LoadedOnboarding }
  | { ok: false; code: LoadErrorCode; message: string };

export type SaveResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * `kind` es el discriminante, no `code`: si se discrimina por un `code: string`
 * que además tiene una variante con literal, TypeScript no estrecha la unión
 * (el literal es asignable a string y ambas ramas quedan posibles).
 */
export type SubmitResult =
  | { ok: true }
  | { ok: false; kind: 'missing_fields'; missingFields: string[] }
  | { ok: false; kind: 'other'; code: string; message: string };

export interface ClaimAccountInput {
  email: string;
  password: string;
  fullName: string;
  acceptedDocumentIds: string[];
}

/** Igual razón que `SubmitResult`: `kind` es el discriminante, no `code`. */
export type ClaimResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; kind: 'invalid_fields'; message: string; fields: string[] }
  | { ok: false; kind: 'email_exists'; message: string }
  | { ok: false; kind: 'already_claimed'; message: string }
  | { ok: false; kind: 'missing_consents'; missingDocumentIds: string[] }
  | {
      ok: false;
      kind: 'rate_limit';
      message: string;
      retryAfterSeconds: number | null;
    }
  | { ok: false; kind: 'other'; code: string; message: string };

const MENSAJE_RED =
  'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';

async function postJson(
  url: string,
  body: unknown,
): Promise<{ status: number; payload: Record<string, unknown> } | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    let payload: Record<string, unknown> = {};
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      // Respuesta sin cuerpo JSON: se trata igual, el status manda.
    }

    return { status: response.status, payload };
  } catch {
    return null;
  }
}

/** Carga el formulario y su branding. Pre-llena lo ya guardado. */
export async function loadOnboarding(token: string): Promise<LoadResult> {
  const result = await postJson(GET_URL, { token });

  if (!result) return { ok: false, code: 'network', message: MENSAJE_RED };

  const { status, payload } = result;

  if (status === 200) {
    const client = (payload.client ?? {}) as { name?: string | null };
    const organization = (payload.organization ?? {}) as {
      name?: string | null;
      logo_url?: string | null;
    };
    const account = (payload.account ?? {}) as {
      claimed?: boolean;
      email?: string | null;
      full_name?: string | null;
    };
    const legalDocuments = Array.isArray(payload.legal_documents)
      ? (payload.legal_documents as Array<Record<string, unknown>>)
      : [];

    return {
      ok: true,
      data: {
        branding: {
          clientName: client.name ?? null,
          orgName: organization.name ?? null,
          orgLogoUrl: organization.logo_url ?? null,
        },
        status: String(payload.status ?? 'pending'),
        formData: (payload.form_data ?? {}) as OnboardingFormData,
        expiresAt: String(payload.expires_at ?? ''),
        account: {
          claimed: account.claimed === true,
          email: account.email ?? null,
          fullName: account.full_name ?? null,
        },
        legalDocuments: legalDocuments.map((doc) => ({
          id: String(doc.id ?? ''),
          documentType: String(doc.document_type ?? ''),
          title: String(doc.title ?? ''),
          version: String(doc.version ?? ''),
          summary: typeof doc.summary === 'string' ? doc.summary : null,
          contentHtml: String(doc.content_html ?? ''),
        })),
      },
    };
  }

  const code = (payload.error as LoadErrorCode) ?? 'invalid_token';
  const message =
    typeof payload.message === 'string'
      ? payload.message
      : 'Este enlace no está disponible.';

  return { ok: false, code, message };
}

/** Guarda (mergea) una sección. Se llama al avanzar de paso. */
export async function saveSection(
  token: string,
  section: SectionKey,
  data: unknown,
): Promise<SaveResult> {
  const result = await postJson(SUBMIT_URL, { token, section, data });

  if (!result) return { ok: false, code: 'network', message: MENSAJE_RED };

  if (result.status === 200) return { ok: true };

  return {
    ok: false,
    code: String(result.payload.error ?? 'error'),
    message:
      typeof result.payload.message === 'string'
        ? result.payload.message
        : 'No pudimos guardar. Intenta de nuevo.',
  };
}

/** Envío final: marca el formulario como enviado y avisa al equipo. */
export async function submitFinal(token: string): Promise<SubmitResult> {
  const result = await postJson(SUBMIT_URL, { token, final: true });

  if (!result) {
    return { ok: false, kind: 'other', code: 'network', message: MENSAJE_RED };
  }

  if (result.status === 200) return { ok: true };

  if (result.status === 422) {
    return {
      ok: false,
      kind: 'missing_fields',
      missingFields: Array.isArray(result.payload.missing_fields)
        ? (result.payload.missing_fields as string[])
        : [],
    };
  }

  return {
    ok: false,
    kind: 'other',
    code: String(result.payload.error ?? 'error'),
    message:
      typeof result.payload.message === 'string'
        ? result.payload.message
        : 'No pudimos enviar la información. Intenta de nuevo.',
  };
}

/** Paso 0: crea la cuenta del cliente y registra su aceptación de legales. */
export async function claimAccount(
  token: string,
  input: ClaimAccountInput,
): Promise<ClaimResult> {
  const result = await postJson(CLAIM_URL, {
    token,
    email: input.email,
    password: input.password,
    full_name: input.fullName,
    accepted_document_ids: input.acceptedDocumentIds,
  });

  if (!result) {
    return { ok: false, kind: 'other', code: 'network', message: MENSAJE_RED };
  }

  const { status, payload } = result;
  const message =
    typeof payload.message === 'string'
      ? payload.message
      : 'No pudimos crear tu acceso. Intenta de nuevo.';

  if (status === 200) {
    return {
      ok: true,
      userId: String(payload.user_id ?? ''),
      email: String(payload.email ?? input.email),
    };
  }

  if (status === 400 && payload.error === 'invalid_fields') {
    return {
      ok: false,
      kind: 'invalid_fields',
      message,
      fields: Array.isArray(payload.fields) ? (payload.fields as string[]) : [],
    };
  }

  if (status === 409 && payload.error === 'email_exists') {
    return { ok: false, kind: 'email_exists', message };
  }

  if (status === 409 && payload.error === 'already_claimed') {
    return { ok: false, kind: 'already_claimed', message };
  }

  if (status === 422 && payload.error === 'missing_consents') {
    return {
      ok: false,
      kind: 'missing_consents',
      missingDocumentIds: Array.isArray(payload.missing_document_ids)
        ? (payload.missing_document_ids as string[])
        : [],
    };
  }

  if (status === 429) {
    return {
      ok: false,
      kind: 'rate_limit',
      message,
      retryAfterSeconds:
        typeof payload.retry_after_seconds === 'number'
          ? payload.retry_after_seconds
          : null,
    };
  }

  return {
    ok: false,
    kind: 'other',
    code: String(payload.error ?? 'error'),
    message,
  };
}

/** Valida el formato del token antes de llamar a la red. */
export function isWellFormedToken(token: string | undefined): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}
