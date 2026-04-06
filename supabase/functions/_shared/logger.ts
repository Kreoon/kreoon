// ============================================================================
// KREOON Structured Logger - Edge Functions
// Outputs JSON for easy parsing in Supabase Logs dashboard
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function_name: string;
  message: string;
  user_id?: string;
  organization_id?: string;
  request_id: string;
  duration_ms: number;
  metadata?: Record<string, unknown>;
  error?: {
    message: string;
    error_id: string;
    code?: string;
  };
}

class Logger {
  private functionName: string;
  private requestId: string;
  private startTime: number;
  private userId?: string;
  private orgId?: string;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.requestId = crypto.randomUUID().slice(0, 8);
    this.startTime = Date.now();
  }

  /** Adjunta user_id y organization_id a todos los logs subsiguientes */
  setContext(userId?: string, orgId?: string) {
    this.userId = userId;
    this.orgId = orgId;
  }

  private emit(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): string | undefined {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function_name: this.functionName,
      message,
      request_id: this.requestId,
      duration_ms: Date.now() - this.startTime,
    };

    if (this.userId) entry.user_id = this.userId;
    if (this.orgId) entry.organization_id = this.orgId;
    if (metadata) entry.metadata = metadata;

    let errorId: string | undefined;
    if (error) {
      errorId = crypto.randomUUID().slice(0, 8);
      entry.error = {
        message: error.message,
        error_id: errorId,
        // Algunos errores de Supabase/HTTP exponen un code
        code: (error as unknown as Record<string, string>).code,
      };
    }

    // Usar el nivel de console apropiado para que Supabase Logs filtre bien
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }

    return errorId;
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.emit('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.emit('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.emit('warn', message, metadata);
  }

  /**
   * Registra un error y devuelve un error_id para incluir en la respuesta al cliente.
   * El cliente solo recibe el error_id — nunca el stack trace.
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): string {
    return this.emit('error', message, metadata, error) ?? 'unknown';
  }
}

export function createLogger(functionName: string): Logger {
  return new Logger(functionName);
}

export type { Logger, LogEntry };
