// Hook para gestionar configuración de recordatorios por tipo de evento

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReminderSetting, ReminderSettingInput } from '../types';

export function useReminderSettings(eventTypeId: string | undefined) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['booking-reminder-settings', eventTypeId],
    queryFn: async () => {
      if (!eventTypeId) return [];

      const { data, error } = await supabase
        .from('booking_reminder_settings')
        .select('*')
        .eq('event_type_id', eventTypeId)
        .order('hours_before', { ascending: true });

      if (error) throw error;
      return data as ReminderSetting[];
    },
    enabled: !!eventTypeId,
  });

  const addReminder = useMutation({
    mutationFn: async (input: ReminderSettingInput) => {
      if (!eventTypeId) throw new Error('Event type ID required');

      const { data, error } = await supabase
        .from('booking_reminder_settings')
        .insert({
          event_type_id: eventTypeId,
          reminder_type: input.reminder_type,
          hours_before: input.hours_before,
          enabled: input.enabled ?? true,
          template_subject: input.template_subject,
          template_body: input.template_body,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReminderSetting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-reminder-settings', eventTypeId] });
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ReminderSettingInput>) => {
      const { data, error } = await supabase
        .from('booking_reminder_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ReminderSetting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-reminder-settings', eventTypeId] });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_reminder_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-reminder-settings', eventTypeId] });
    },
  });

  return {
    settings: settingsQuery.data || [],
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    addReminder: addReminder.mutateAsync,
    updateReminder: updateReminder.mutateAsync,
    deleteReminder: deleteReminder.mutateAsync,
    isAdding: addReminder.isPending,
    isUpdating: updateReminder.isPending,
    isDeleting: deleteReminder.isPending,
  };
}
