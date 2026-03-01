// Hook para gestionar webhooks de booking

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { BookingWebhook, BookingWebhookInput, WebhookLog } from '../types';

export function useWebhooks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const webhooksQuery = useQuery({
    queryKey: ['booking-webhooks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('booking_webhooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BookingWebhook[];
    },
    enabled: !!user?.id,
  });

  const logsQuery = useQuery({
    queryKey: ['booking-webhook-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get webhook IDs for user
      const { data: webhooks } = await supabase
        .from('booking_webhooks')
        .select('id')
        .eq('user_id', user.id);

      if (!webhooks?.length) return [];

      const webhookIds = webhooks.map((w) => w.id);

      const { data, error } = await supabase
        .from('booking_webhook_logs')
        .select('*')
        .in('webhook_id', webhookIds)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WebhookLog[];
    },
    enabled: !!user?.id,
  });

  const addWebhook = useMutation({
    mutationFn: async (input: BookingWebhookInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('booking_webhooks')
        .insert({
          user_id: user.id,
          url: input.url,
          name: input.name,
          events: input.events || ['booking.created', 'booking.confirmed', 'booking.cancelled'],
          active: input.active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookingWebhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-webhooks', user?.id] });
    },
  });

  const updateWebhook = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<BookingWebhookInput>) => {
      const { data, error } = await supabase
        .from('booking_webhooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BookingWebhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-webhooks', user?.id] });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-webhooks', user?.id] });
    },
  });

  const testWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('booking-webhook-test', {
        body: { webhookId: id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh logs after test
      queryClient.invalidateQueries({ queryKey: ['booking-webhook-logs', user?.id] });
    },
  });

  return {
    webhooks: webhooksQuery.data || [],
    logs: logsQuery.data || [],
    isLoading: webhooksQuery.isLoading,
    isLoadingLogs: logsQuery.isLoading,
    error: webhooksQuery.error,
    addWebhook: addWebhook.mutateAsync,
    updateWebhook: updateWebhook.mutateAsync,
    deleteWebhook: deleteWebhook.mutateAsync,
    testWebhook: testWebhook.mutateAsync,
    isAdding: addWebhook.isPending,
    isUpdating: updateWebhook.isPending,
    isDeleting: deleteWebhook.isPending,
    isTesting: testWebhook.isPending,
  };
}
