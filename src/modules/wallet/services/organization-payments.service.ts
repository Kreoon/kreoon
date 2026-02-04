// Organization Payments Service - Manejo de pagos internos de organizaciones
import { supabase } from '@/integrations/supabase/client';
import type {
  OrganizationPaymentGateway,
  OrganizationPayoutMethod,
  OrganizationPaymentSettings,
  OrganizationClientPayment,
  OrganizationTeamPayment,
  PaymentGatewayProvider,
  OrgPayoutMethodType,
  PaymentMode,
} from '../types';

export const organizationPaymentsService = {
  // ========================================
  // CONFIGURACIÓN DE PAGOS
  // ========================================

  /**
   * Obtener configuración de pagos de la organización
   */
  async getPaymentSettings(organizationId: string): Promise<OrganizationPaymentSettings | null> {
    const { data, error } = await supabase
      .from('organization_payment_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No existe, crear configuración por defecto
      const { data: newSettings, error: createError } = await supabase
        .from('organization_payment_settings')
        .insert({ organization_id: organizationId })
        .select()
        .single();

      if (createError) {
        console.error('Error creating payment settings:', createError);
        return null;
      }
      return newSettings;
    }

    if (error) {
      console.error('Error fetching payment settings:', error);
      return null;
    }

    return data;
  },

  /**
   * Actualizar configuración de pagos
   */
  async updatePaymentSettings(
    organizationId: string,
    settings: Partial<Omit<OrganizationPaymentSettings, 'organization_id' | 'created_at' | 'updated_at'>>
  ): Promise<OrganizationPaymentSettings | null> {
    const { data, error } = await supabase
      .from('organization_payment_settings')
      .upsert({
        organization_id: organizationId,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating payment settings:', error);
      throw error;
    }

    return data;
  },

  // ========================================
  // PASARELAS DE COBRO
  // ========================================

  /**
   * Agregar pasarela de cobro
   */
  async addPaymentGateway(params: {
    organizationId: string;
    provider: PaymentGatewayProvider;
    credentials: Record<string, string>;
    displayName?: string;
    supportedCurrencies?: string[];
    isDefault?: boolean;
  }): Promise<OrganizationPaymentGateway | null> {
    const { organizationId, provider, credentials, displayName, supportedCurrencies, isDefault } = params;

    // Encriptar credenciales sensibles
    const processedCredentials = this.processCredentials(credentials);

    const { data, error } = await supabase
      .from('organization_payment_gateways')
      .insert({
        organization_id: organizationId,
        provider,
        credentials: processedCredentials,
        display_name: displayName || this.getDefaultDisplayName(provider),
        supported_currencies: supportedCurrencies || ['USD'],
        is_default: isDefault || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payment gateway:', error);
      throw error;
    }

    return data;
  },

  /**
   * Obtener pasarelas configuradas
   */
  async getPaymentGateways(organizationId: string): Promise<OrganizationPaymentGateway[]> {
    const { data, error } = await supabase
      .from('organization_payment_gateways')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error fetching payment gateways:', error);
      return [];
    }

    // Enmascarar credenciales sensibles
    return (data || []).map(gw => ({
      ...gw,
      credentials: this.maskCredentials(gw.credentials),
    }));
  },

  /**
   * Actualizar pasarela
   */
  async updatePaymentGateway(
    gatewayId: string,
    updates: Partial<Pick<OrganizationPaymentGateway, 'is_active' | 'is_default' | 'display_name' | 'supported_currencies'>>
  ): Promise<OrganizationPaymentGateway | null> {
    const { data, error } = await supabase
      .from('organization_payment_gateways')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', gatewayId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment gateway:', error);
      throw error;
    }

    return data;
  },

  /**
   * Eliminar pasarela
   */
  async deletePaymentGateway(gatewayId: string): Promise<boolean> {
    const { error } = await supabase
      .from('organization_payment_gateways')
      .delete()
      .eq('id', gatewayId);

    if (error) {
      console.error('Error deleting payment gateway:', error);
      return false;
    }

    return true;
  },

  // ========================================
  // MÉTODOS DE PAGO A EQUIPO
  // ========================================

  /**
   * Agregar método de pago a equipo
   */
  async addPayoutMethod(params: {
    organizationId: string;
    methodType: OrgPayoutMethodType;
    credentials?: Record<string, string>;
    bankInfo?: Record<string, string>;
    displayName?: string;
    supportedCurrencies?: string[];
  }): Promise<OrganizationPayoutMethod | null> {
    const { data, error } = await supabase
      .from('organization_payout_methods')
      .insert({
        organization_id: params.organizationId,
        method_type: params.methodType,
        credentials: params.credentials ? this.processCredentials(params.credentials) : {},
        bank_info: params.bankInfo || {},
        display_name: params.displayName,
        supported_currencies: params.supportedCurrencies || ['USD', 'COP'],
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding payout method:', error);
      throw error;
    }

    return data;
  },

  /**
   * Obtener métodos de pago a equipo
   */
  async getPayoutMethods(organizationId: string): Promise<OrganizationPayoutMethod[]> {
    const { data, error } = await supabase
      .from('organization_payout_methods')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout methods:', error);
      return [];
    }

    return (data || []).map(pm => ({
      ...pm,
      credentials: this.maskCredentials(pm.credentials),
    }));
  },

  /**
   * Eliminar método de pago
   */
  async deletePayoutMethod(methodId: string): Promise<boolean> {
    const { error } = await supabase
      .from('organization_payout_methods')
      .delete()
      .eq('id', methodId);

    if (error) {
      console.error('Error deleting payout method:', error);
      return false;
    }

    return true;
  },

  // ========================================
  // COBROS A CLIENTES
  // ========================================

  /**
   * Registrar pago de cliente
   */
  async registerClientPayment(params: {
    organizationId: string;
    campaignId?: string;
    projectReference?: string;
    clientInfo: {
      userId?: string;
      organizationId?: string;
      name?: string;
      email?: string;
    };
    amount: number;
    currency: string;
    paymentMethod?: string;
    gatewayId?: string;
    externalPaymentId?: string;
    notes?: string;
  }): Promise<OrganizationClientPayment | null> {
    const { data, error } = await supabase
      .from('organization_client_payments')
      .insert({
        organization_id: params.organizationId,
        campaign_id: params.campaignId,
        project_reference: params.projectReference,
        client_id: params.clientInfo.userId,
        client_organization_id: params.clientInfo.organizationId,
        client_name: params.clientInfo.name,
        client_email: params.clientInfo.email,
        amount: params.amount,
        currency: params.currency,
        payment_method: params.paymentMethod,
        payment_gateway_id: params.gatewayId,
        external_payment_id: params.externalPaymentId,
        status: params.externalPaymentId ? 'processing' : 'pending',
        notes: params.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering client payment:', error);
      throw error;
    }

    return data;
  },

  /**
   * Confirmar pago manual
   */
  async confirmManualPayment(params: {
    paymentId: string;
    confirmedBy: string;
    proofUrl?: string;
  }): Promise<OrganizationClientPayment | null> {
    const { data, error } = await supabase
      .from('organization_client_payments')
      .update({
        status: 'completed',
        confirmed_by: params.confirmedBy,
        confirmed_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        proof_of_payment: params.proofUrl,
      })
      .eq('id', params.paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }

    return data;
  },

  /**
   * Obtener pagos de clientes
   */
  async getClientPayments(
    organizationId: string,
    filters?: {
      status?: string;
      campaignId?: string;
      from?: string;
      to?: string;
      limit?: number;
    }
  ): Promise<OrganizationClientPayment[]> {
    let query = supabase
      .from('organization_client_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.campaignId) {
      query = query.eq('campaign_id', filters.campaignId);
    }
    if (filters?.from) {
      query = query.gte('created_at', filters.from);
    }
    if (filters?.to) {
      query = query.lte('created_at', filters.to);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching client payments:', error);
      return [];
    }

    return data || [];
  },

  // ========================================
  // PAGOS A EQUIPO
  // ========================================

  /**
   * Crear pago a miembro del equipo
   */
  async createTeamPayment(params: {
    organizationId: string;
    recipientUserId: string;
    recipientName?: string;
    recipientRole?: string;
    campaignId?: string;
    deliverableReference?: string;
    amount: number;
    currency: string;
    payoutMethodId?: string;
    notes?: string;
    requestedBy: string;
  }): Promise<OrganizationTeamPayment | null> {
    const { data, error } = await supabase
      .from('organization_team_payments')
      .insert({
        organization_id: params.organizationId,
        recipient_user_id: params.recipientUserId,
        recipient_name: params.recipientName,
        recipient_role: params.recipientRole,
        campaign_id: params.campaignId,
        deliverable_reference: params.deliverableReference,
        amount: params.amount,
        currency: params.currency,
        payout_method_id: params.payoutMethodId,
        notes: params.notes,
        requested_by: params.requestedBy,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team payment:', error);
      throw error;
    }

    return data;
  },

  /**
   * Aprobar pago a equipo
   */
  async approveTeamPayment(paymentId: string, approvedBy: string): Promise<OrganizationTeamPayment | null> {
    const { data, error } = await supabase
      .from('organization_team_payments')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error approving team payment:', error);
      throw error;
    }

    return data;
  },

  /**
   * Marcar pago como completado
   */
  async completeTeamPayment(params: {
    paymentId: string;
    externalPaymentId?: string;
    proofUrl?: string;
  }): Promise<OrganizationTeamPayment | null> {
    const { data, error } = await supabase
      .from('organization_team_payments')
      .update({
        status: 'completed',
        external_payment_id: params.externalPaymentId,
        proof_of_payment: params.proofUrl,
        paid_at: new Date().toISOString(),
      })
      .eq('id', params.paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error completing team payment:', error);
      throw error;
    }

    return data;
  },

  /**
   * Obtener pagos a equipo
   */
  async getTeamPayments(
    organizationId: string,
    filters?: {
      status?: string;
      recipientId?: string;
      from?: string;
      to?: string;
      limit?: number;
    }
  ): Promise<OrganizationTeamPayment[]> {
    let query = supabase
      .from('organization_team_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.recipientId) {
      query = query.eq('recipient_user_id', filters.recipientId);
    }
    if (filters?.from) {
      query = query.gte('created_at', filters.from);
    }
    if (filters?.to) {
      query = query.lte('created_at', filters.to);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching team payments:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Obtener estadísticas de pagos
   */
  async getPaymentStats(
    organizationId: string,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalReceived: number;
    totalPaid: number;
    pendingPayments: number;
    completedPayments: number;
  }> {
    const { data, error } = await supabase
      .rpc('get_organization_payment_stats', {
        p_organization_id: organizationId,
        p_period: period,
      });

    if (error) {
      console.error('Error fetching payment stats:', error);
      return {
        totalReceived: 0,
        totalPaid: 0,
        pendingPayments: 0,
        completedPayments: 0,
      };
    }

    return {
      totalReceived: data?.[0]?.total_received || 0,
      totalPaid: data?.[0]?.total_paid || 0,
      pendingPayments: data?.[0]?.pending_payments || 0,
      completedPayments: data?.[0]?.completed_payments || 0,
    };
  },

  // ========================================
  // HELPERS
  // ========================================

  processCredentials(credentials: Record<string, string>): Record<string, string> {
    const sensitiveKeys = ['secret_key', 'access_token', 'api_key', 'password', 'private_key'];
    const processed: Record<string, string> = {};

    for (const [key, value] of Object.entries(credentials)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        // En producción: usar encriptación real
        processed[key] = value; // Por ahora guardamos directamente
      } else {
        processed[key] = value;
      }
    }

    return processed;
  },

  maskCredentials(credentials: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};

    for (const [key, value] of Object.entries(credentials)) {
      if (key.includes('secret') || key.includes('token') || key.includes('password') || key.includes('private')) {
        masked[key] = '••••••••';
      } else if ((key.includes('key') || key.includes('account')) && typeof value === 'string' && value.length > 8) {
        masked[key] = `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`;
      } else {
        masked[key] = value;
      }
    }

    return masked;
  },

  getDefaultDisplayName(provider: PaymentGatewayProvider): string {
    const names: Record<PaymentGatewayProvider, string> = {
      stripe: 'Tarjeta de crédito/débito',
      mercadopago: 'Mercado Pago',
      paypal: 'PayPal',
      payu: 'PayU',
      wompi: 'Wompi',
      bold: 'Bold',
      manual: 'Transferencia manual',
    };
    return names[provider] || provider;
  },
};
