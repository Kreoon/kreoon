/**
 * Supabase Services
 *
 * Capa de servicios que centraliza todas las operaciones de base de datos.
 * Los componentes NO deben llamar a Supabase directamente - deben usar estos servicios.
 *
 * Beneficios:
 * - Punto único de mantenimiento
 * - Tipado fuerte
 * - Facilita testing (mock del servicio completo)
 * - Elimina duplicación de queries
 */

export { aiAssistantService } from './aiAssistantService';
export type {
  AIConfig,
  KnowledgeBase,
  ConversationFlow,
  PositiveExample,
  NegativeRule,
  PromptConfig,
  AILog,
  AIFeedback,
  AIAssistantData,
} from './aiAssistantService';
