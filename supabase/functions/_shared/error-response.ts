// ============================================================================
// KREOON Error Response - Standardized error handling for Edge Functions
// ============================================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ErrorContext {
  action?: string;
  resourceId?: string;
  userId?: string;
  timestamp?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  context?: ErrorContext;
  retry_after_seconds?: number;
}

/**
 * Determines HTTP status code based on error message patterns
 */
export function getStatusFromError(error: unknown): number {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('not found')) return 404;
    if (message.includes('unauthorized') || message.includes('forbidden')) return 403;
    if (message.includes('rate limit')) return 429;
    if (message.includes('invalid') || message.includes('validation')) return 400;
    if (message.includes('payment') || message.includes('tokens')) return 402;
  }
  // Check for status property on error object
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return 500;
}

/**
 * Creates a standardized error Response with context
 */
export function errorResponse(
  error: unknown,
  context?: ErrorContext
): Response {
  const message = error instanceof Error ? error.message : 'Error desconocido';
  const status = getStatusFromError(error);

  const body: ErrorResponse = {
    error: message,
    code: `ERR_${status}`,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
    },
  };

  // Rate limit specific handling
  if (status === 429) {
    const retryAfter = error && typeof error === 'object' && 'retryAfterSeconds' in error
      ? (error.retryAfterSeconds as number)
      : 60;
    body.retry_after_seconds = retryAfter;
  }

  console.error(`[${context?.action || 'unknown'}] Error:`, message, context);

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a standardized success Response
 */
export function successResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Helper to create module inactive error response
 */
export function moduleInactiveResponse(moduleKey: string): Response {
  return new Response(
    JSON.stringify({
      error: "MODULE_INACTIVE",
      code: "ERR_403",
      message: `Asistente no habilitado para el módulo "${moduleKey}". Actívalo en Configuración → IA & Modelos.`,
      module_key: moduleKey
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Helper to create validation error response
 */
export function validationErrorResponse(message: string, field?: string): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code: "ERR_400",
      field,
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
