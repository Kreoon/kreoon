import { SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import type { OnboardingFormData, SectionKey } from './schemas';

/**
 * Cliente de las dos edge functions públicas del onboarding.
 *
 * Se usa `fetch` directo (no `supabase.functions.invoke`) a propósito: las
 * funciones distinguen 404 / 409 / 410 / 422 / 429 y necesitamos el status code
 * limpio para mostrar la pantalla correcta. `functions.invoke` envuelve los
 * no-2xx en FunctionsHttpError y obliga a desenterrar el body del context.
 *
 * No se manda Authorization ni apikey: ambas funciones corren con
 * verify_jwt = false y el cliente que llena el formulario no tiene sesión.
 */

const GET_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/client-onboarding-get`;
const SUBMIT_URL = `${SUPABASE_FUNCTIONS_URL}/functions/v1/client-onboarding-submit`;

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

export interface LoadedOnboarding {
  branding: OnboardingBranding;
  status: string;
  formData: OnboardingFormData;
  expiresAt: string;
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

/** Valida el formato del token antes de llamar a la red. */
export function isWellFormedToken(token: string | undefined): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}
