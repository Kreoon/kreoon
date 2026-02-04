import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  PaymentMethodType,
  PaymentDetails,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  getPaymentSummary,
} from '../types';

export interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: PaymentMethodType;
  label: string;
  details: PaymentDetails;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodDisplay extends PaymentMethod {
  typeLabel: string;
  typeIcon: string;
  summary: string;
}

export function toPaymentMethodDisplay(method: PaymentMethod): PaymentMethodDisplay {
  return {
    ...method,
    typeLabel: PAYMENT_METHOD_LABELS[method.method_type],
    typeIcon: PAYMENT_METHOD_ICONS[method.method_type],
    summary: getPaymentSummary(method.method_type, method.details),
  };
}

export function usePaymentMethods() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: methods,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async (): Promise<PaymentMethodDisplay[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(m => toPaymentMethodDisplay(m as PaymentMethod));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const refreshMethods = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payment-methods', user?.id] });
  }, [queryClient, user?.id]);

  // Obtener método por defecto
  const defaultMethod = methods?.find(m => m.is_default) || methods?.[0] || null;

  return {
    methods: methods || [],
    defaultMethod,
    isLoading,
    error,
    refetch,
    refreshMethods,
  };
}

// Mutations para métodos de pago
export function usePaymentMethodMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Crear nuevo método de pago
  const createMethodMutation = useMutation({
    mutationFn: async (input: {
      method_type: PaymentMethodType;
      label: string;
      details: PaymentDetails;
      is_default?: boolean;
    }): Promise<PaymentMethod> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Si es el primer método o se marca como default, desmarcar otros
      if (input.is_default) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          method_type: input.method_type,
          label: input.label,
          details: input.details,
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago guardado');
    },
    onError: (error: Error) => {
      console.error('Error creating payment method:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Actualizar método de pago
  const updateMethodMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      label?: string;
      details?: PaymentDetails;
      is_default?: boolean;
    }): Promise<PaymentMethod> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Si se marca como default, desmarcar otros primero
      if (input.is_default) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', input.id);
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .update({
          ...(input.label && { label: input.label }),
          ...(input.details && { details: input.details }),
          ...(input.is_default !== undefined && { is_default: input.is_default }),
        })
        .eq('id', input.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago actualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating payment method:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Eliminar método de pago
  const deleteMethodMutation = useMutation({
    mutationFn: async (methodId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago eliminado');
    },
    onError: (error: Error) => {
      console.error('Error deleting payment method:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Establecer como default
  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Desmarcar todos primero
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Marcar el seleccionado
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago predeterminado actualizado');
    },
    onError: (error: Error) => {
      console.error('Error setting default:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  return {
    createMethod: createMethodMutation.mutate,
    createMethodAsync: createMethodMutation.mutateAsync,
    isCreating: createMethodMutation.isPending,

    updateMethod: updateMethodMutation.mutate,
    isUpdating: updateMethodMutation.isPending,

    deleteMethod: deleteMethodMutation.mutate,
    isDeleting: deleteMethodMutation.isPending,

    setDefault: setDefaultMutation.mutate,
    isSettingDefault: setDefaultMutation.isPending,
  };
}
