// ============================================================================
// KREOON Rate Limiter - Control de tasa de requests para Edge Functions
// ============================================================================
//
// Uso basico:
//
//   import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMIT_PRESETS } from '../_shared/rate-limiter.ts';
//
//   const ip = getClientIp(req);
//   const rl  = await checkRateLimit(supabaseService, ip, RATE_LIMIT_PRESETS.ai);
//   if (!rl.allowed) return rateLimitResponse(req, rl, RATE_LIMIT_PRESETS.ai.limit);
//
// IMPORTANTE: pasar el cliente con SERVICE ROLE, no anon key.
// ============================================================================

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Numero maximo de requests permitidos en la ventana. */
  limit: number;
  /** Duracion de la ventana de tiempo en milisegundos. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Si la request esta permitida. */
  allowed: boolean;
  /** Requests restantes en la ventana actual. */
  remaining: number;
  /** Momento en que se reinicia el contador. */
  resetAt: Date;
  /** Segundos hasta el reset. Util para Retry-After. */
  retryAfterSeconds: number;
}

// ----------------------------------------------------------------------------
// Presets predefinidos por tipo de Edge Function
// ----------------------------------------------------------------------------

/**
 * Configuraciones listas para usar segun el tipo de operacion.
 *
 * - ai:      Funciones costosas (content-ai, board-ai, multi-ai, etc.)
 * - upload:  Funciones de subida a Bunny CDN
 * - webhook: Webhooks externos (Bunny, n8n, Restream) — limite alto
 * - default: Funciones genericas
 */
export const RATE_LIMIT_PRESETS: Record<string, RateLimitConfig> = {
  ai:      { limit: 20,  windowMs: 60_000 },
  upload:  { limit: 10,  windowMs: 60_000 },
  webhook: { limit: 100, windowMs: 60_000 },
  default: { limit: 60,  windowMs: 60_000 },
};

// ----------------------------------------------------------------------------
// Helper: extraer IP real del request
// ----------------------------------------------------------------------------

/**
 * Extrae la IP del cliente desde los headers del request.
 *
 * Las Edge Functions de Supabase corren detras de Cloudflare, por lo que
 * la IP real no esta disponible directamente. Se leen en orden de prioridad:
 *   1. cf-connecting-ip  (Cloudflare — mas confiable)
 *   2. x-forwarded-for   (primer valor, puede ser lista separada por comas)
 *   3. "unknown"         (fallback — nunca bloquea por defecto)
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    return first.trim();
  }

  return 'unknown';
}

// ----------------------------------------------------------------------------
// Core: verificacion atomica via RPC
// ----------------------------------------------------------------------------

/**
 * Verifica si la clave (IP o user_id) supero el limite configurado.
 *
 * La logica de conteo es atomica en la base de datos via la funcion
 * `check_rate_limit` (ver migration 20260401000002_rate_limit_table.sql).
 *
 * @param supabase  Cliente Supabase con SERVICE ROLE.
 * @param key       Identificador del caller: IP o user_id.
 * @param config    Limite y ventana de tiempo.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now      = Date.now();
  const resetAt  = new Date(now + config.windowMs);

  // Ventana de tiempo: inicio = ahora - windowMs
  const windowStart = new Date(now - config.windowMs).toISOString();

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key:          key,
    p_limit:        config.limit,
    p_window_start: windowStart,
  });

  if (error) {
    // Si la RPC falla (ej. tabla no existe, permiso denegado), optamos por
    // permitir la request para no interrumpir el servicio. Logear para debug.
    console.error('[rate-limiter] RPC check_rate_limit failed:', {
      key,
      error: error.message,
      code:  error.code,
    });
    return {
      allowed:           true,
      remaining:         config.limit,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  // La RPC devuelve la primera fila de la tabla de retorno
  const row: { allowed: boolean; current_count: number } | null =
    Array.isArray(data) ? data[0] : data;

  if (!row) {
    console.error('[rate-limiter] RPC check_rate_limit returned empty result', { key });
    return {
      allowed:           true,
      remaining:         config.limit,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  const remaining         = Math.max(0, config.limit - row.current_count);
  const retryAfterSeconds = row.allowed
    ? 0
    : Math.ceil(config.windowMs / 1000);

  return {
    allowed: row.allowed,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

// ----------------------------------------------------------------------------
// Headers de respuesta
// ----------------------------------------------------------------------------

/**
 * Construye los headers estandar de rate limiting (RFC 6585 / IETF draft).
 *
 * Headers incluidos:
 *   X-RateLimit-Limit     — Limite total configurado para la ventana
 *   X-RateLimit-Remaining — Requests restantes en la ventana actual
 *   X-RateLimit-Reset     — Timestamp ISO 8601 del proximo reset
 *   Retry-After           — Segundos hasta retry (solo cuando blocked)
 *
 * @param result  Resultado de checkRateLimit.
 * @param limit   Limite total (del RateLimitConfig.limit).
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  limit: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset':     result.resetAt.toISOString(),
  };

  if (!result.allowed && result.retryAfterSeconds > 0) {
    headers['Retry-After'] = result.retryAfterSeconds.toString();
  }

  return headers;
}

// ----------------------------------------------------------------------------
// Respuesta 429 lista para retornar
// ----------------------------------------------------------------------------

/**
 * Genera una Response HTTP 429 (Too Many Requests) lista para retornar
 * desde una Edge Function. Incluye headers X-RateLimit-* y cuerpo JSON.
 *
 * Compatible con el formato de error de error-response.ts del proyecto.
 *
 * @param req     Request original (para headers CORS).
 * @param result  Resultado de checkRateLimit donde allowed === false.
 * @param limit   Limite total del preset usado.
 */
export function rateLimitResponse(
  req: Request,
  result: RateLimitResult,
  limit: number,
): Response {
  const origin = req.headers.get('Origin') || '';

  // SECURITY: Restrict CORS to known domains only
  const ALLOWED_ORIGINS = ['https://www.kreoon.com', 'https://kreoon.com', 'http://localhost:8080', 'http://localhost:5173'];
  const safeOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  const rlHeaders = rateLimitHeaders(result, limit);

  const body = JSON.stringify({
    error:               'rate_limit_exceeded',
    code:                'ERR_429',
    message:             `Demasiadas solicitudes. Intenta de nuevo en ${result.retryAfterSeconds} segundos.`,
    retry_after_seconds: result.retryAfterSeconds,
    reset_at:            result.resetAt.toISOString(),
    context: {
      timestamp: new Date().toISOString(),
    },
  });

  return new Response(body, {
    status: 429,
    headers: {
      ...corsHeaders,
      ...rlHeaders,
      'Content-Type': 'application/json',
    },
  });
}
