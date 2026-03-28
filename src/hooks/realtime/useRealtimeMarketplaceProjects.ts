/**
 * Hook para sincronización realtime del Marketplace Kanban
 *
 * Suscribe a cambios en la tabla `marketplace_projects`
 * Filtra en cliente según el rol del usuario (brand/creator/editor)
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceProject } from '@/components/marketplace/types/marketplace';
import type { RealtimePayload, MarketplaceProjectRow } from './types';
import { shouldSkipRealtimeEvent, detectChangedFields } from './useRealtimeDebounce';

interface UseRealtimeMarketplaceProjectsOptions {
  userId: string | null;
  role: 'brand' | 'creator' | 'editor';
  brandId?: string;
  enabled?: boolean;
  /** Callback cuando hay cambios - recibe función para aplicar merge al state */
  onProjectChange: (
    updater: (currentProjects: MarketplaceProject[]) => MarketplaceProject[]
  ) => void;
}

/**
 * Verifica si un proyecto pertenece al usuario según su rol
 */
function projectBelongsToUser(
  project: MarketplaceProjectRow,
  userId: string,
  role: 'brand' | 'creator' | 'editor',
  brandId?: string
): boolean {
  switch (role) {
    case 'creator':
      return project.creator_id === userId;
    case 'editor':
      return project.editor_id === userId;
    case 'brand':
      // Si tiene brandId específico, filtrar por eso
      if (brandId) {
        return project.brand_id === brandId;
      }
      // Si no, mostrar todos (admin/strategist)
      return true;
    default:
      return false;
  }
}

/**
 * Hook que suscribe a cambios realtime de marketplace_projects
 */
export function useRealtimeMarketplaceProjects({
  userId,
  role,
  brandId,
  enabled = true,
  onProjectChange,
}: UseRealtimeMarketplaceProjectsOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Handler para eventos realtime
  const handleRealtimeChange = useCallback(
    (payload: RealtimePayload<MarketplaceProjectRow>) => {
      if (!enabledRef.current || !userId) return;

      const { eventType, new: newRecord, old: oldRecord } = payload;
      const projectId = newRecord?.id || oldRecord?.id;

      // Detectar campos cambiados
      const changedFields = detectChangedFields(oldRecord, newRecord);

      // Verificar si debemos ignorar (actualización local reciente)
      if (shouldSkipRealtimeEvent(projectId, changedFields)) {
        console.log('[Realtime] Skipping local update for project:', projectId);
        return;
      }

      // Filtrar por rol - solo procesar proyectos relevantes
      const recordToCheck = newRecord || oldRecord;
      if (!projectBelongsToUser(recordToCheck, userId, role, brandId)) {
        return;
      }

      console.log('[Realtime] Marketplace project change:', eventType, projectId);

      // Aplicar cambio al state usando updater function
      onProjectChange((currentProjects) => {
        switch (eventType) {
          case 'INSERT': {
            // Verificar que no existe ya
            if (currentProjects.some(p => p.id === newRecord.id)) {
              return currentProjects;
            }
            // Para INSERT necesitamos los datos completos enriquecidos
            // Por ahora solo agregamos la row básica, el refetch completará
            // Alternativa: agregar al inicio y marcar como "pendiente enriquecimiento"
            console.log('[Realtime] New project detected, may need refetch for full data');
            return currentProjects;
          }

          case 'UPDATE': {
            return currentProjects.map(project => {
              if (project.id !== newRecord.id) return project;
              // Merge: mantener datos enriquecidos, actualizar campos raw
              return {
                ...project,
                status: newRecord.status,
                total_price: Number(newRecord.total_price) || project.total_price,
                currency: newRecord.currency || project.currency,
                deadline: newRecord.deadline || project.deadline,
                updated_at: newRecord.updated_at,
                // Mantener otros campos enriquecidos
              };
            });
          }

          case 'DELETE': {
            return currentProjects.filter(p => p.id !== oldRecord.id);
          }

          default:
            return currentProjects;
        }
      });
    },
    [userId, role, brandId, onProjectChange]
  );

  // Setup y cleanup de canal
  useEffect(() => {
    if (!userId || !enabled) {
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

    // Crear canal - para marketplace no podemos filtrar por OR en servidor
    // Entonces suscribimos a todos y filtramos en cliente
    const channelName = `marketplace-projects-${userId}-${role}`;

    // Intentar filtro específico según rol para reducir payload
    let filter: string | undefined;
    if (role === 'creator') {
      filter = `creator_id=eq.${userId}`;
    } else if (role === 'editor') {
      filter = `editor_id=eq.${userId}`;
    } else if (role === 'brand' && brandId) {
      filter = `brand_id=eq.${brandId}`;
    }
    // Si es brand sin brandId (admin), no filtramos en servidor

    const subscriptionConfig: {
      event: '*';
      schema: 'public';
      table: 'marketplace_projects';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'marketplace_projects',
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, (payload) =>
        handleRealtimeChange(payload as RealtimePayload<MarketplaceProjectRow>)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Marketplace subscription active for:', role, userId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Marketplace subscription error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up marketplace subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, role, brandId, enabled, handleRealtimeChange]);

  const reconnect = useCallback(() => {
    if (!userId || !enabled) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [userId, enabled]);

  return { reconnect };
}
