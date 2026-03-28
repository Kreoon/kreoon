// src/lib/logger.ts
// Logger centralizado para Kreoon - elimina console.log en producción

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const isDev = import.meta.env.DEV;
const isDebugEnabled = isDev || (typeof localStorage !== 'undefined' && localStorage.getItem('kreoon_debug') === 'true');

const formatMessage = (level: LogLevel, message: string, context?: Record<string, unknown>): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (isDebugEnabled) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info: (message: string, context?: Record<string, unknown>) => {
    if (isDev) {
      console.info(formatMessage('info', message, context));
    }
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', message, context));
  },

  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => {
    const errorContext = error instanceof Error
      ? { ...context, errorMessage: error.message, stack: error.stack }
      : { ...context, error };
    console.error(formatMessage('error', message, errorContext));

    // En producción, podrías enviar a un servicio de monitoreo
    // if (!isDev) sendToMonitoring({ message, error, context });
  },

  // Para hooks y componentes con mucho logging
  group: (name: string) => {
    if (isDev) console.group(name);
    return {
      log: (message: string, context?: Record<string, unknown>) => {
        if (isDev) console.log(formatMessage('info', message, context));
      },
      end: () => {
        if (isDev) console.groupEnd();
      }
    };
  }
};

// Helper para habilitar debug en producción via console
if (typeof window !== 'undefined') {
  (window as any).enableKreoonDebug = () => {
    localStorage.setItem('kreoon_debug', 'true');
    console.log('Debug mode enabled. Refresh the page.');
  };
  (window as any).disableKreoonDebug = () => {
    localStorage.removeItem('kreoon_debug');
    console.log('Debug mode disabled. Refresh the page.');
  };
}

export default logger;
