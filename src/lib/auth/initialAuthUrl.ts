/**
 * Captura la URL de llegada ANTES de que supabase-js la procese.
 *
 * El cliente de Supabase (detectSessionInUrl) lee el token de recuperación o el error del enlace
 * (#error=access_denied&error_code=otp_expired) y limpia el fragmento al iniciar. Las pantallas que
 * deben reaccionar a ese enlace (p. ej. /reset-password) leen esta copia.
 *
 * Debe importarse PRIMERO en src/main.tsx.
 */
const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
const search = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '';

const hashParams = new URLSearchParams(hash);
const queryParams = new URLSearchParams(search);

const pick = (key: string): string | null => hashParams.get(key) ?? queryParams.get(key);

export const initialAuthUrl = {
  /** 'recovery' | 'signup' | 'magiclink' | 'invite' | null */
  type: pick('type'),
  /** Código de error de Supabase Auth (p. ej. 'otp_expired') */
  errorCode: pick('error_code'),
  error: pick('error'),
  errorDescription: pick('error_description'),
  /** Hubo token en el enlace (flujo implícito o PKCE) */
  hasToken: Boolean(hashParams.get('access_token') || queryParams.get('code') || queryParams.get('token_hash')),
};
