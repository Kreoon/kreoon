// Hook para gestionar integraciones de calendario externo (Google Calendar, Outlook, etc.)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarIntegration, CalendarProvider, CalendarBlockedEvent } from '../types';

export function useCalendarIntegrations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: ['calendar-integrations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as CalendarIntegration[];
    },
    enabled: !!user?.id,
  });

  // Conectar calendario - inicia flujo OAuth
  const connectCalendar = useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      // Determinar qué edge function usar según el proveedor
      const authFunctionMap: Record<CalendarProvider, string> = {
        google: 'calendar-google-auth',
        outlook: 'calendar-outlook-auth', // TODO: Implementar
        apple: 'calendar-apple-auth', // TODO: Implementar
      };

      const functionName = authFunctionMap[provider];

      if (provider !== 'google') {
        throw new Error(`Proveedor ${provider} no soportado todavía`);
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { provider },
      });

      if (error) throw error;

      // Redirigir a la URL de OAuth
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de autorización');
      }

      return data;
    },
  });

  // Desconectar calendario
  const disconnectCalendar = useMutation({
    mutationFn: async (id: string) => {
      // Primero eliminar eventos bloqueados asociados
      await supabase
        .from('calendar_blocked_events')
        .delete()
        .eq('integration_id', id);

      // Eliminar mapeos de eventos
      await supabase
        .from('calendar_event_mappings')
        .delete()
        .eq('integration_id', id);

      // Eliminar la integración
      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integrations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['calendar-blocked-events', user?.id] });
    },
  });

  // Actualizar configuración de integración
  const updateIntegration = useMutation({
    mutationFn: async ({
      id,
      sync_enabled,
      check_conflicts,
      create_events,
    }: {
      id: string;
      sync_enabled?: boolean;
      check_conflicts?: boolean;
      create_events?: boolean;
    }) => {
      const updates: Record<string, boolean | string> = {};
      if (sync_enabled !== undefined) updates.sync_enabled = sync_enabled;
      if (check_conflicts !== undefined) updates.check_conflicts = check_conflicts;
      if (create_events !== undefined) updates.create_events = create_events;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('calendar_integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CalendarIntegration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integrations', user?.id] });
    },
  });

  // Sincronizar calendario - obtiene eventos de Google y los guarda como blocked_events
  const syncCalendar = useMutation({
    mutationFn: async (integrationId: string) => {
      // Obtener el provider de la integración para saber qué función llamar
      const integration = integrationsQuery.data?.find(i => i.id === integrationId);

      if (!integration) {
        throw new Error('Integración no encontrada');
      }

      const syncFunctionMap: Record<CalendarProvider, string> = {
        google: 'calendar-google-sync',
        outlook: 'calendar-outlook-sync', // TODO: Implementar
        apple: 'calendar-apple-sync', // TODO: Implementar
      };

      const functionName = syncFunctionMap[integration.provider];

      if (integration.provider !== 'google') {
        throw new Error(`Proveedor ${integration.provider} no soportado todavía`);
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { integrationId },
      });

      if (error) throw error;
      return data as {
        success: boolean;
        message: string;
        events_synced: number;
        calendar_name: string;
        last_sync_at: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integrations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['calendar-blocked-events', user?.id] });
    },
  });

  // Reconectar calendario (cuando el token ha expirado)
  const reconnectCalendar = useMutation({
    mutationFn: async (id: string) => {
      const integration = integrationsQuery.data?.find(i => i.id === id);
      if (!integration) {
        throw new Error('Integración no encontrada');
      }

      // Eliminar la integración actual
      await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', id);

      // Iniciar nuevo flujo OAuth
      return connectCalendar.mutateAsync(integration.provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-integrations', user?.id] });
    },
  });

  // Verificar si una integración tiene errores
  const hasIntegrationError = (integration: CalendarIntegration): boolean => {
    return !!(integration.sync_errors && Object.keys(integration.sync_errors).length > 0);
  };

  // Verificar si una integración necesita reconexión
  const needsReconnection = (integration: CalendarIntegration): boolean => {
    if (!integration.sync_errors) return false;
    const errors = integration.sync_errors as Record<string, unknown>;
    return errors.error === 'invalid_refresh_token';
  };

  return {
    integrations: integrationsQuery.data || [],
    isLoading: integrationsQuery.isLoading,
    error: integrationsQuery.error,
    connectCalendar: connectCalendar.mutateAsync,
    disconnectCalendar: disconnectCalendar.mutateAsync,
    updateIntegration: updateIntegration.mutateAsync,
    syncCalendar: syncCalendar.mutateAsync,
    reconnectCalendar: reconnectCalendar.mutateAsync,
    isConnecting: connectCalendar.isPending,
    isDisconnecting: disconnectCalendar.isPending,
    isSyncing: syncCalendar.isPending,
    isReconnecting: reconnectCalendar.isPending,
    // Helpers
    hasIntegrationError,
    needsReconnection,
    refetch: integrationsQuery.refetch,
  };
}

// Hook para obtener eventos bloqueados de calendarios externos
export function useCalendarBlockedEvents(userId?: string) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: ['calendar-blocked-events', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      // Obtener integraciones del usuario
      const { data: integrations, error: intError } = await supabase
        .from('calendar_integrations')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('sync_enabled', true);

      if (intError) throw intError;
      if (!integrations || integrations.length === 0) return [];

      const integrationIds = integrations.map(i => i.id);

      // Obtener eventos bloqueados
      const { data, error } = await supabase
        .from('calendar_blocked_events')
        .select('*')
        .in('integration_id', integrationIds)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as CalendarBlockedEvent[];
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para verificar conflictos con calendario externo
export function useCheckCalendarConflicts() {
  return useMutation({
    mutationFn: async ({
      userId,
      startTime,
      endTime,
    }: {
      userId: string;
      startTime: string;
      endTime: string;
    }) => {
      // Verificar conflictos localmente usando los blocked_events
      const { data: integrations, error: intError } = await supabase
        .from('calendar_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('sync_enabled', true)
        .eq('check_conflicts', true);

      if (intError) throw intError;
      if (!integrations || integrations.length === 0) {
        return { hasConflict: false, conflictingEvents: [] };
      }

      const integrationIds = integrations.map(i => i.id);

      // Buscar eventos que se solapan con el rango dado
      const { data: conflicts, error } = await supabase
        .from('calendar_blocked_events')
        .select('*')
        .in('integration_id', integrationIds)
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (error) throw error;

      const conflictingEvents = (conflicts || []).map(event => ({
        title: event.title || '(Sin título)',
        start: event.start_time,
        end: event.end_time,
      }));

      return {
        hasConflict: conflictingEvents.length > 0,
        conflictingEvents,
      };
    },
  });
}

// Hook para obtener el estado de conexión de un proveedor específico
export function useCalendarProviderStatus(provider: CalendarProvider) {
  const { integrations, isLoading } = useCalendarIntegrations();

  const integration = integrations.find(i => i.provider === provider);

  return {
    isConnected: !!integration,
    integration,
    isLoading,
    hasError: integration ? !!(integration.sync_errors && Object.keys(integration.sync_errors).length > 0) : false,
    lastSyncAt: integration?.last_sync_at || null,
  };
}
