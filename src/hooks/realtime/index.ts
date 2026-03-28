/**
 * Hooks de sincronización realtime para tableros Kanban
 *
 * Exporta:
 * - useRealtimeContent: Para Content Board
 * - useRealtimeMarketplaceProjects: Para Marketplace Kanban
 * - Utilidades de debounce para prevenir loops
 */

// Hooks principales
export { useRealtimeContent } from './useRealtimeContent';
export { useRealtimeMarketplaceProjects } from './useRealtimeMarketplaceProjects';

// Utilidades de debounce
export {
  markLocalUpdate,
  extendLocalUpdateWindow,
  shouldSkipRealtimeEvent,
  detectChangedFields,
  clearAllLocalUpdates,
  getDebounceState,
} from './useRealtimeDebounce';

// Tipos
export type {
  RealtimePayload,
  LocalUpdate,
  ContentRow,
  MarketplaceProjectRow,
  ProfileCache,
  RealtimeContentOptions,
  RealtimeMarketplaceOptions,
} from './types';
