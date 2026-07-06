/**
 * Hook para sincronización realtime del Content Board
 *
 * Suscribe a cambios en la tabla `content` filtrado por organization_id
 * Maneja INSERT, UPDATE, DELETE con actualizaciones granulares
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Content } from '@/types/database';
import type { RealtimePayload, ContentRow, ProfileCache } from './types';
import { shouldSkipRealtimeEvent, detectChangedFields } from './useRealtimeDebounce';

interface UseRealtimeContentOptions {
  organizationId: string | null;
  enabled?: boolean;
  /** Callback cuando hay cambios - recibe función para aplicar merge al state */
  onContentChange: (
    updater: (currentContent: Content[]) => Content[]
  ) => void;
  /** Cache de profiles para enriquecer datos */
  profileCache?: ProfileCache;
  /**
   * Filtros de la query que este hook alimenta (los mismos que useContentWithFilters).
   * Sin esto, cualquier fila de la org que cambie se agrega al state aunque el
   * componente este mostrando solo el contenido de un cliente/creador/editor.
   */
  clientId?: string;
  creatorId?: string;
  editorId?: string;
}

/**
 * Hook que suscribe a cambios realtime de content para una organización
 */
export function useRealtimeContent({
  organizationId,
  enabled = true,
  onContentChange,
  profileCache,
  clientId,
  creatorId,
  editorId,
}: UseRealtimeContentOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Filtros vigentes en un ref para que el handler (memoizado por otras deps)
  // siempre lea el valor actual sin tener que recrearse en cada cambio de filtro.
  const filtersRef = useRef({ clientId, creatorId, editorId });
  filtersRef.current = { clientId, creatorId, editorId };

  const matchesFilters = useCallback((row: ContentRow): boolean => {
    const { clientId: fc, creatorId: fcr, editorId: fe } = filtersRef.current;
    if (fc && row.client_id !== fc) return false;
    if (fcr && row.creator_id !== fcr) return false;
    if (fe && row.editor_id !== fe) return false;
    return true;
  }, []);

  // Enriquecer content row con datos de cache
  const enrichContent = useCallback(
    (row: ContentRow): Content => {
      const client = row.client_id && profileCache?.clients.get(row.client_id);
      const creator = row.creator_id && profileCache?.creators.get(row.creator_id);
      const editor = row.editor_id && profileCache?.editors.get(row.editor_id);

      return {
        ...row,
        client: client || null,
        creator: creator || null,
        editor: editor || null,
      } as Content;
    },
    [profileCache]
  );

  // Handler para eventos realtime
  const handleRealtimeChange = useCallback(
    (payload: RealtimePayload<ContentRow>) => {
      if (!enabledRef.current) return;

      const { eventType, new: newRecord, old: oldRecord } = payload;
      const contentId = newRecord?.id || oldRecord?.id;

      // Detectar campos cambiados
      const changedFields = detectChangedFields(oldRecord, newRecord);

      // Verificar si debemos ignorar (actualización local reciente)
      if (shouldSkipRealtimeEvent(contentId, changedFields)) {
        console.log('[Realtime] Skipping local update for content:', contentId);
        return;
      }

      console.log('[Realtime] Content change:', eventType, contentId);

      // Aplicar cambio al state usando updater function
      onContentChange((currentContent) => {
        switch (eventType) {
          case 'INSERT': {
            // No agregar filas que no matcheen los filtros de esta vista
            // (antes cualquier INSERT de la org se sumaba al state aunque
            // el componente estuviera filtrado por cliente/creador/editor).
            if (!matchesFilters(newRecord)) {
              return currentContent;
            }
            // Verificar que no existe ya (por si acaso)
            if (currentContent.some(c => c.id === newRecord.id)) {
              return currentContent;
            }
            // Agregar al inicio (más reciente)
            const enriched = enrichContent(newRecord);
            return [enriched, ...currentContent];
          }

          case 'UPDATE': {
            return currentContent.map(item => {
              if (item.id !== newRecord.id) return item;
              // Merge: mantener datos enriquecidos existentes, actualizar campos raw
              return {
                ...item,
                ...newRecord,
                // Mantener referencias existentes si no cambiaron los IDs
                client: newRecord.client_id === item.client_id
                  ? item.client
                  : (profileCache?.clients.get(newRecord.client_id || '') || null),
                creator: newRecord.creator_id === item.creator_id
                  ? item.creator
                  : (profileCache?.creators.get(newRecord.creator_id || '') || null),
                editor: newRecord.editor_id === item.editor_id
                  ? item.editor
                  : (profileCache?.editors.get(newRecord.editor_id || '') || null),
              };
            });
          }

          case 'DELETE': {
            return currentContent.filter(item => item.id !== oldRecord.id);
          }

          default:
            return currentContent;
        }
      });
    },
    [onContentChange, enrichContent, profileCache, matchesFilters]
  );

  // Id unico por instancia del hook — evita que dos componentes con los
  // mismos filtros (ej. dos tabs de la misma vista) colisionen en el mismo
  // nombre de canal.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2, 10));

  // Setup y cleanup de canal
  useEffect(() => {
    if (!organizationId || !enabled) {
      // Limpiar canal si existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Limpiar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Nombre de canal unico por org + filtros + instancia — antes era
    // `content-realtime-${organizationId}` a secas, asi que dos hooks
    // (ej. useContent y useContentWithFilters) montados para la misma org
    // colisionaban en el mismo canal: el cleanup de uno mataba la
    // suscripcion del otro.
    const filterSig = `c${clientId ?? '_'}-cr${creatorId ?? '_'}-e${editorId ?? '_'}`;
    const channelName = `content-realtime-${organizationId}-${filterSig}-${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => handleRealtimeChange(payload as RealtimePayload<ContentRow>)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Content subscription active for org:', organizationId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Content subscription error');
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up content subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, enabled, handleRealtimeChange, clientId, creatorId, editorId]);

  // Retornar función para forzar reconexión si es necesario
  const reconnect = useCallback(() => {
    if (!organizationId || !enabled) return;

    // Remover y recrear
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // El useEffect se encargará de recrear
  }, [organizationId, enabled]);

  return { reconnect };
}
