// Payout Service - Manejo de retiros a diferentes proveedores
import { supabase } from '@/integrations/supabase/client';
import type {
  CurrencyCode,
  PaymentProvider,
  PaymentProviderDisplay,
  toPaymentProviderDisplay,
} from '../types';

export interface PayoutRecipient {
  name: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankCode?: string;
  accountType?: 'savings' | 'checking';
  documentType?: string;
  documentId?: string;
  paypalEmail?: string;
  payoneerEmail?: string;
  wiseEmail?: string;
}

export interface PayoutRequest {
  withdrawalId: string;
  amount: number;
  currency: CurrencyCode;
  providerId: string;
  recipient: PayoutRecipient;
}

export interface PayoutResult {
  success: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  externalReference?: string;
  error?: string;
  estimatedArrival?: string;
}

export const payoutService = {
  /**
   * Obtener todos los proveedores de pago activos
   */
  async getAllProviders(): Promise<PaymentProvider[]> {
    const { data, error } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching providers:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Obtener proveedores disponibles para un país y moneda
   */
  async getAvailableProviders(
    country: string,
    currency: CurrencyCode,
    type: 'deposit' | 'withdrawal' = 'withdrawal'
  ): Promise<PaymentProviderDisplay[]> {
    const { data, error } = await supabase
      .rpc('get_available_providers', {
        p_country: country,
        p_currency: currency,
        p_type: type,
      });

    if (error) {
      console.error('Error fetching available providers:', error);
      return [];
    }

    // Convertir a display format
    return (data || []).map((provider: PaymentProvider) => ({
      ...provider,
      formattedFee: this.formatProviderFee(provider),
      totalFee: (amount: number) => this.calculateFee(amount, provider),
      formattedTotalFee: (amount: number) => {
        const fee = this.calculateFee(amount, provider);
        return fee > 0 ? `$${fee.toFixed(2)}` : 'Gratis';
      },
    }));
  },

  /**
   * Obtener un proveedor por ID
   */
  async getProvider(providerId: string): Promise<PaymentProvider | null> {
    const { data, error } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching provider:', error);
      return null;
    }

    return data;
  },

  /**
   * Calcular fee de un proveedor
   */
  calculateFee(amount: number, provider: PaymentProvider): number {
    return Math.round((provider.fixed_fee + (amount * provider.percentage_fee)) * 100) / 100;
  },

  /**
   * Formatear fee para mostrar
   */
  formatProviderFee(provider: PaymentProvider): string {
    const parts: string[] = [];

    if (provider.fixed_fee > 0) {
      parts.push(`$${provider.fixed_fee}`);
    }

    if (provider.percentage_fee > 0) {
      parts.push(`${(provider.percentage_fee * 100).toFixed(1)}%`);
    }

    if (parts.length === 0) {
      return 'Gratis';
    }

    return parts.join(' + ');
  },

  /**
   * Procesar payout (llamar Edge Function)
   * En producción, esto debe llamar a una Edge Function segura
   * que tenga las credenciales de los proveedores
   */
  async processPayout(request: PayoutRequest): Promise<PayoutResult> {
    try {
      // Llamar Edge Function para procesar el payout
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: request,
      });

      if (error) {
        return {
          success: false,
          status: 'failed',
          error: error.message,
        };
      }

      return data as PayoutResult;
    } catch (error) {
      console.error('Error processing payout:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Verificar estado de un payout
   */
  async checkPayoutStatus(
    providerId: string,
    externalReference: string
  ): Promise<PayoutResult> {
    try {
      const { data, error } = await supabase.functions.invoke('check-payout-status', {
        body: { providerId, externalReference },
      });

      if (error) {
        return {
          success: false,
          status: 'pending',
          error: error.message,
        };
      }

      return data as PayoutResult;
    } catch (error) {
      return {
        success: false,
        status: 'pending',
        error: 'No se pudo verificar el estado',
      };
    }
  },

  /**
   * Obtener campos requeridos por proveedor
   */
  getRequiredFields(providerId: string): string[] {
    const fieldsByProvider: Record<string, string[]> = {
      // Globales
      payoneer: ['payoneerEmail'],
      wise: ['wiseEmail', 'name'],
      paypal: ['paypalEmail'],

      // Colombia
      bancolombia: ['bankAccount', 'accountType', 'documentType', 'documentId', 'name'],
      nequi: ['phone'],
      daviplata: ['phone', 'documentId'],

      // México
      spei: ['bankAccount', 'bankCode', 'name'],
      oxxo: ['phone', 'name'],

      // Perú
      bcp: ['bankAccount', 'documentId', 'name'],
      interbank: ['bankAccount', 'documentId', 'name'],
      yape: ['phone'],

      // Chile
      banco_chile: ['bankAccount', 'documentId', 'name'],

      // Crypto
      usdt_trc20: ['walletAddress'],
    };

    return fieldsByProvider[providerId] || ['name', 'email'];
  },

  /**
   * Validar datos del destinatario según proveedor
   */
  validateRecipient(providerId: string, recipient: PayoutRecipient): string[] {
    const errors: string[] = [];
    const requiredFields = this.getRequiredFields(providerId);

    for (const field of requiredFields) {
      if (!recipient[field as keyof PayoutRecipient]) {
        errors.push(`El campo ${field} es requerido`);
      }
    }

    // Validaciones específicas
    if (requiredFields.includes('phone') && recipient.phone) {
      if (!/^\d{10}$/.test(recipient.phone.replace(/\D/g, ''))) {
        errors.push('El número de teléfono debe tener 10 dígitos');
      }
    }

    if (requiredFields.includes('email') && recipient.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
        errors.push('El email no es válido');
      }
    }

    return errors;
  },

  /**
   * Obtener tiempo estimado de procesamiento
   */
  getEstimatedProcessingTime(providerId: string): string {
    const times: Record<string, string> = {
      nequi: '1-24 horas',
      daviplata: '1-24 horas',
      yape: '1-24 horas',
      spei: '1-24 horas',
      paypal: '1-3 días hábiles',
      payoneer: '1-2 días hábiles',
      wise: '1-3 días hábiles',
      bancolombia: '1-2 días hábiles',
      bcp: '1-2 días hábiles',
      banco_chile: '1-2 días hábiles',
      usdt_trc20: '10-30 minutos',
    };

    return times[providerId] || '1-5 días hábiles';
  },
};
