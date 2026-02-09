/**
 * KiroActionExecutor.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * Sistema de ejecución de acciones detectadas por KIRO.
 * Maneja navegación, comandos, y encadenamiento de acciones.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { SuggestedAction, KiroIntent, IntentDetectionResult } from './KiroIntentDetector';
import type { KiroState, KiroExpression } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado de ejecución de una acción
 */
export type ActionExecutionStatus =
  | 'idle'
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Resultado de la ejecución de una acción
 */
export interface ActionExecutionResult {
  /** ID de la acción ejecutada */
  actionId: string;
  /** Estado de la ejecución */
  status: ActionExecutionStatus;
  /** Mensaje de resultado */
  message: string;
  /** Datos de resultado (si aplica) */
  data?: unknown;
  /** Error (si falló) */
  error?: string;
  /** Tiempo de ejecución en ms */
  executionTime: number;
  /** Siguiente acción en la cadena (si hay) */
  nextAction?: SuggestedAction;
}

/**
 * Contexto de ejecución de acciones
 */
export interface ActionExecutionContext {
  /** Función para navegar */
  navigate: (path: string) => void;
  /** Función para mostrar toast */
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  /** Función para cambiar estado de KIRO */
  setKiroState?: (state: KiroState) => void;
  /** Función para cambiar expresión de KIRO */
  setKiroExpression?: (expression: KiroExpression) => void;
  /** Función para cambiar pestaña activa del widget */
  setActiveTab?: (tab: 'chat' | 'notifications' | 'actions' | 'game') => void;
  /** Función para agregar mensaje de KIRO al chat */
  addKiroMessage?: (message: string) => void;
  /** Función para disparar reacción */
  triggerReaction?: (type: string) => void;
  /** Usuario actual */
  userId?: string;
  /** Organización actual */
  organizationId?: string;
}

/**
 * Manejador de comando personalizado
 */
export type CommandHandler = (
  action: SuggestedAction,
  context: ActionExecutionContext
) => Promise<ActionExecutionResult>;

/**
 * Paso en una cadena de acciones
 */
export interface ActionChainStep {
  /** Acción a ejecutar */
  action: SuggestedAction;
  /** Condición para ejecutar (opcional) */
  condition?: (previousResult: ActionExecutionResult) => boolean;
  /** Delay antes de ejecutar (ms) */
  delayMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRO DE COMANDOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registro de manejadores de comandos personalizados.
 * Permite extender las acciones que KIRO puede ejecutar.
 */
const commandHandlers: Map<string, CommandHandler> = new Map();

/**
 * Registra un manejador de comando personalizado
 */
export function registerCommandHandler(command: string, handler: CommandHandler): void {
  commandHandlers.set(command, handler);
}

/**
 * Desregistra un manejador de comando
 */
export function unregisterCommandHandler(command: string): void {
  commandHandlers.delete(command);
}

// ═══════════════════════════════════════════════════════════════════════════
// MANEJADORES DE COMANDOS BUILT-IN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manejador para abrir el juego de KIRO
 */
const openGameHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setActiveTab?.('game');
  context.setKiroState?.('playing');
  context.addKiroMessage?.('¡Vamos a jugar! Captura los tokens para ganar puntos.');
  context.triggerReaction?.('bounce');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Mini-juego abierto',
    executionTime: performance.now() - startTime,
  };
};

/**
 * Manejador para chat con IA
 */
const aiChatHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setActiveTab?.('chat');
  context.setKiroState?.('listening');
  context.addKiroMessage?.('Cuéntame más y te ayudaré en lo que pueda.');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Chat abierto',
    executionTime: performance.now() - startTime,
  };
};

/**
 * Manejador para generar hooks con IA
 */
const generateHooksHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('thinking');
  context.addKiroMessage?.('Déjame pensar en algunos hooks creativos para ti...');

  // Simular procesamiento (en producción, llamaría a la edge function)
  await new Promise(resolve => setTimeout(resolve, 500));

  context.setKiroState?.('speaking');
  context.setKiroExpression?.('happy');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Abriendo generador de hooks',
    executionTime: performance.now() - startTime,
    nextAction: {
      id: 'nav-hooks-generator',
      label: 'Ir al generador',
      description: 'Abrir generador de hooks',
      icon: '💡',
      type: 'navigation',
      route: '/ai-tools/hooks',
    },
  };
};

/**
 * Manejador para tutorial de KIRO
 */
const kiroTutorialHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('speaking');
  context.setKiroExpression?.('happy');

  const tutorialMessages = [
    '¡Hola! Soy KIRO, tu asistente en Kreoon.',
    'Puedo ayudarte a crear briefs, buscar creadores, y mucho más.',
    'Solo escríbeme lo que necesitas y te guiaré.',
    '¡Ah! Y también tenemos un mini-juego si quieres un descanso. 🎮',
  ];

  // Agregar mensajes secuencialmente
  for (const msg of tutorialMessages) {
    context.addKiroMessage?.(msg);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Tutorial mostrado',
    executionTime: performance.now() - startTime,
  };
};

/**
 * Manejador para asignación rápida
 */
const quickAssignHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('working');
  context.addKiroMessage?.('¿A quién quieres asignar la tarea? Dime el nombre del creador.');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Esperando nombre de creador',
    executionTime: performance.now() - startTime,
  };
};

/**
 * Manejador para analytics con IA
 */
const aiAnalyticsHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('thinking');
  context.addKiroMessage?.('Analizando tus métricas... Dame un momento.');

  await new Promise(resolve => setTimeout(resolve, 800));

  context.setKiroState?.('speaking');
  context.addKiroMessage?.('Te recomiendo revisar el dashboard de Analytics para los detalles.');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Análisis iniciado',
    executionTime: performance.now() - startTime,
    nextAction: {
      id: 'nav-analytics',
      label: 'Ver Analytics',
      description: 'Dashboard de métricas',
      icon: '📈',
      type: 'navigation',
      route: '/analytics',
    },
  };
};

/**
 * Manejador para match de creadores con IA
 */
const aiCreatorMatchHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('thinking');
  context.addKiroMessage?.('Buscando el creador perfecto para ti...');

  await new Promise(resolve => setTimeout(resolve, 600));

  context.setKiroState?.('speaking');
  context.setKiroExpression?.('happy');
  context.triggerReaction?.('bounce');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Abriendo búsqueda inteligente',
    executionTime: performance.now() - startTime,
    nextAction: {
      id: 'nav-casting-ai',
      label: 'Casting IA',
      description: 'Búsqueda inteligente de creadores',
      icon: '🎭',
      type: 'navigation',
      route: '/creators?ai=true',
    },
  };
};

/**
 * Manejador para asistente de scripts
 */
const scriptAssistantHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('thinking');
  context.addKiroMessage?.('¡Vamos a crear un guión increíble! ¿Cuál es el tema o producto?');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Asistente de scripts activo',
    executionTime: performance.now() - startTime,
  };
};

/**
 * Manejador para wizard de programación
 */
const scheduleWizardHandler: CommandHandler = async (action, context) => {
  const startTime = performance.now();

  context.setKiroState?.('working');
  context.addKiroMessage?.('¿Qué contenido quieres programar? Dame los detalles.');

  return {
    actionId: action.id,
    status: 'completed',
    message: 'Wizard de programación activo',
    executionTime: performance.now() - startTime,
  };
};

// Registrar manejadores built-in
registerCommandHandler('open_game', openGameHandler);
registerCommandHandler('ai_chat', aiChatHandler);
registerCommandHandler('generate_hooks', generateHooksHandler);
registerCommandHandler('kiro_tutorial', kiroTutorialHandler);
registerCommandHandler('quick_assign', quickAssignHandler);
registerCommandHandler('ai_analytics', aiAnalyticsHandler);
registerCommandHandler('ai_creator_match', aiCreatorMatchHandler);
registerCommandHandler('script_assistant', scriptAssistantHandler);
registerCommandHandler('schedule_wizard', scheduleWizardHandler);

// ═══════════════════════════════════════════════════════════════════════════
// EJECUTOR DE ACCIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una acción sugerida por KIRO
 */
export async function executeAction(
  action: SuggestedAction,
  context: ActionExecutionContext
): Promise<ActionExecutionResult> {
  const startTime = performance.now();

  try {
    switch (action.type) {
      // ─────────────────────────────────────────────────────────────────────
      // Navegación
      // ─────────────────────────────────────────────────────────────────────
      case 'navigation':
        if (action.route) {
          context.setKiroState?.('working');
          context.navigate(action.route);
          context.addKiroMessage?.(`Te llevo a ${action.label}...`);

          return {
            actionId: action.id,
            status: 'completed',
            message: `Navegando a ${action.route}`,
            executionTime: performance.now() - startTime,
          };
        }
        throw new Error('No route specified for navigation action');

      // ─────────────────────────────────────────────────────────────────────
      // Comando
      // ─────────────────────────────────────────────────────────────────────
      case 'command':
        if (action.command) {
          const handler = commandHandlers.get(action.command);
          if (handler) {
            return await handler(action, context);
          }
          throw new Error(`Unknown command: ${action.command}`);
        }
        throw new Error('No command specified for command action');

      // ─────────────────────────────────────────────────────────────────────
      // Wizard
      // ─────────────────────────────────────────────────────────────────────
      case 'wizard':
        // Los wizards pueden ser rutas o comandos
        if (action.route) {
          context.setKiroState?.('working');
          context.navigate(action.route);
          context.addKiroMessage?.(`Abriendo ${action.label}...`);

          return {
            actionId: action.id,
            status: 'completed',
            message: `Wizard abierto: ${action.label}`,
            executionTime: performance.now() - startTime,
          };
        }
        if (action.command) {
          const handler = commandHandlers.get(action.command);
          if (handler) {
            return await handler(action, context);
          }
        }
        throw new Error('No route or command for wizard action');

      // ─────────────────────────────────────────────────────────────────────
      // Quick Action
      // ─────────────────────────────────────────────────────────────────────
      case 'quick':
        context.setKiroState?.('working');
        context.addKiroMessage?.(`Ejecutando: ${action.label}`);

        // Quick actions son acciones simples
        return {
          actionId: action.id,
          status: 'completed',
          message: `Acción ejecutada: ${action.label}`,
          executionTime: performance.now() - startTime,
        };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    context.setKiroState?.('idle');
    context.setKiroExpression?.('surprised');

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    context.showToast?.(errorMessage, 'error');
    context.addKiroMessage?.(`Ups, algo salió mal: ${errorMessage}`);

    return {
      actionId: action.id,
      status: 'failed',
      message: 'Error ejecutando acción',
      error: errorMessage,
      executionTime: performance.now() - startTime,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENCADENAMIENTO DE ACCIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una cadena de acciones secuencialmente
 */
export async function executeActionChain(
  steps: ActionChainStep[],
  context: ActionExecutionContext
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];
  let previousResult: ActionExecutionResult | null = null;

  for (const step of steps) {
    // Verificar condición si existe
    if (step.condition && previousResult) {
      if (!step.condition(previousResult)) {
        console.log(`[KiroActionExecutor] Skipping step due to condition: ${step.action.id}`);
        continue;
      }
    }

    // Aplicar delay si existe
    if (step.delayMs && step.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delayMs));
    }

    // Ejecutar acción
    const result = await executeAction(step.action, context);
    results.push(result);
    previousResult = result;

    // Detener cadena si falla
    if (result.status === 'failed') {
      console.error(`[KiroActionExecutor] Chain stopped due to failure: ${result.error}`);
      break;
    }

    // Si hay siguiente acción en el resultado, agregarla a la cadena
    if (result.nextAction) {
      const nextResult = await executeAction(result.nextAction, context);
      results.push(nextResult);
      previousResult = nextResult;
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DESDE INTENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta la acción principal basada en un resultado de detección de intención
 */
export async function executeFromIntent(
  intentResult: IntentDetectionResult,
  context: ActionExecutionContext
): Promise<ActionExecutionResult | null> {
  // No ejecutar si no hay acciones sugeridas
  if (intentResult.suggestedActions.length === 0) {
    return null;
  }

  // No ejecutar para intenciones de baja confianza
  if (intentResult.confidence < 0.6) {
    return null;
  }

  // No ejecutar automáticamente para saludos
  if (intentResult.intent === 'greeting') {
    return null;
  }

  // Ejecutar la acción principal
  const primaryAction = intentResult.suggestedActions[0];
  return await executeAction(primaryAction, context);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica si un comando está registrado
 */
export function isCommandRegistered(command: string): boolean {
  return commandHandlers.has(command);
}

/**
 * Obtiene la lista de comandos registrados
 */
export function getRegisteredCommands(): string[] {
  return Array.from(commandHandlers.keys());
}

/**
 * Crea una acción de navegación simple
 */
export function createNavigationAction(
  route: string,
  label: string,
  icon: string = '📍'
): SuggestedAction {
  return {
    id: `nav-${route.replace(/\//g, '-')}`,
    label,
    description: `Ir a ${label}`,
    icon,
    type: 'navigation',
    route,
  };
}

/**
 * Crea una acción de comando simple
 */
export function createCommandAction(
  command: string,
  label: string,
  icon: string = '⚡'
): SuggestedAction {
  return {
    id: `cmd-${command}`,
    label,
    description: label,
    icon,
    type: 'command',
    command,
  };
}
