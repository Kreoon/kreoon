// Marketplace Service - Contratación directa usuario ↔ creador/editor
import { supabase } from '@/integrations/supabase/client';
import type {
  MarketplaceContract,
  MarketplaceContractDeliverable,
  MarketplaceContractMessage,
  MarketplaceContractStatus,
  CreateContractInput,
  SubmitDeliveryInput,
  RequestRevisionInput,
  DeliverableFile,
  MARKETPLACE_PLATFORM_FEE_PERCENTAGE,
} from '../types';

export const marketplaceService = {
  // ========================================
  // CONTRATOS
  // ========================================

  /**
   * Crear contrato de trabajo directo
   */
  async createContract(
    clientUserId: string,
    input: CreateContractInput
  ): Promise<MarketplaceContract | null> {
    const {
      providerUserId,
      providerType,
      title,
      description,
      deliverables,
      totalAmount,
      currency = 'USD',
      deadline,
      maxRevisions = 2,
    } = input;

    // Calcular fee de Kreoon (10%)
    const platformFeePercentage = 10.00;
    const platformFeeAmount = Math.round(totalAmount * (platformFeePercentage / 100) * 100) / 100;
    const providerAmount = Math.round((totalAmount - platformFeeAmount) * 100) / 100;

    // Crear contrato
    const { data: contract, error } = await supabase
      .from('marketplace_contracts')
      .insert({
        client_user_id: clientUserId,
        provider_user_id: providerUserId,
        provider_type: providerType,
        title,
        description,
        deliverables,
        total_amount: totalAmount,
        currency,
        platform_fee_percentage: platformFeePercentage,
        platform_fee_amount: platformFeeAmount,
        provider_amount: providerAmount,
        deadline,
        max_revisions: maxRevisions,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      throw error;
    }

    // Crear entregables
    if (deliverables?.length > 0) {
      const { error: delError } = await supabase
        .from('marketplace_contract_deliverables')
        .insert(
          deliverables.map(d => ({
            contract_id: contract.id,
            title: d.title,
            description: d.description,
          }))
        );

      if (delError) {
        console.error('Error creating deliverables:', delError);
      }
    }

    return contract;
  },

  /**
   * Obtener contrato por ID
   */
  async getContract(contractId: string): Promise<MarketplaceContract | null> {
    const { data, error } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) {
      console.error('Error fetching contract:', error);
      return null;
    }

    return data;
  },

  /**
   * Obtener contratos del usuario (como cliente o proveedor)
   */
  async getUserContracts(
    userId: string,
    filters?: {
      role?: 'client' | 'provider' | 'all';
      status?: MarketplaceContractStatus | MarketplaceContractStatus[];
      limit?: number;
    }
  ): Promise<MarketplaceContract[]> {
    const role = filters?.role || 'all';

    let query = supabase
      .from('marketplace_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrar por rol
    if (role === 'client') {
      query = query.eq('client_user_id', userId);
    } else if (role === 'provider') {
      query = query.eq('provider_user_id', userId);
    } else {
      query = query.or(`client_user_id.eq.${userId},provider_user_id.eq.${userId}`);
    }

    // Filtrar por status
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user contracts:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Iniciar proceso de pago (cambiar a pending_payment)
   */
  async initiatePayment(contractId: string, clientUserId: string): Promise<{ success: boolean; error?: string }> {
    // Verificar que es el cliente correcto
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('client_user_id', clientUserId)
      .eq('status', 'draft')
      .single();

    if (!contract) {
      return { success: false, error: 'Contrato no encontrado o ya iniciado' };
    }

    // Actualizar estado
    const { error } = await supabase
      .from('marketplace_contracts')
      .update({ status: 'pending_payment' })
      .eq('id', contractId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Marcar contrato como pagado y activo
   */
  async activateContract(
    contractId: string,
    escrowId?: string
  ): Promise<MarketplaceContract | null> {
    const { data, error } = await supabase
      .from('marketplace_contracts')
      .update({
        status: 'active',
        paid_at: new Date().toISOString(),
        escrow_id: escrowId,
      })
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error('Error activating contract:', error);
      throw error;
    }

    return data;
  },

  // ========================================
  // ENTREGABLES
  // ========================================

  /**
   * Obtener entregables del contrato
   */
  async getDeliverables(contractId: string): Promise<MarketplaceContractDeliverable[]> {
    const { data, error } = await supabase
      .from('marketplace_contract_deliverables')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching deliverables:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Proveedor entrega trabajo
   */
  async submitDelivery(
    providerUserId: string,
    input: SubmitDeliveryInput
  ): Promise<{ success: boolean; allDelivered: boolean; error?: string }> {
    const { contractId, deliverableId, files, message } = input;

    // Verificar que es el proveedor correcto
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('provider_user_id', providerUserId)
      .in('status', ['active', 'revision'])
      .single();

    if (!contract) {
      return { success: false, allDelivered: false, error: 'Contrato no encontrado o no tienes permiso' };
    }

    // Actualizar entregable
    const { error: delError } = await supabase
      .from('marketplace_contract_deliverables')
      .update({
        files,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    if (delError) {
      return { success: false, allDelivered: false, error: delError.message };
    }

    // Agregar mensaje si hay
    if (message) {
      await supabase
        .from('marketplace_contract_messages')
        .insert({
          contract_id: contractId,
          sender_id: providerUserId,
          message,
          attachments: files,
        });
    }

    // Verificar si todos los entregables están entregados
    const { data: deliverables } = await supabase
      .from('marketplace_contract_deliverables')
      .select('status')
      .eq('contract_id', contractId);

    const allDelivered = deliverables?.every(d => d.status === 'delivered' || d.status === 'approved') || false;

    if (allDelivered) {
      await supabase
        .from('marketplace_contracts')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', contractId);
    }

    return { success: true, allDelivered };
  },

  /**
   * Cliente aprueba entregable
   */
  async approveDeliverable(
    clientUserId: string,
    contractId: string,
    deliverableId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verificar que es el cliente correcto
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('client_user_id', clientUserId)
      .single();

    if (!contract) {
      return { success: false, error: 'Contrato no encontrado' };
    }

    // Aprobar entregable
    const { error } = await supabase
      .from('marketplace_contract_deliverables')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Cliente solicita revisión
   */
  async requestRevision(
    clientUserId: string,
    input: RequestRevisionInput
  ): Promise<{ success: boolean; revisionsRemaining: number; error?: string }> {
    const { contractId, deliverableId, feedback } = input;

    // Verificar contrato y revisiones restantes
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('client_user_id', clientUserId)
      .single();

    if (!contract) {
      return { success: false, revisionsRemaining: 0, error: 'Contrato no encontrado' };
    }

    if (contract.revisions_used >= contract.max_revisions) {
      return { success: false, revisionsRemaining: 0, error: 'Has alcanzado el máximo de revisiones permitidas' };
    }

    // Rechazar entregable
    await supabase
      .from('marketplace_contract_deliverables')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        feedback,
      })
      .eq('id', deliverableId);

    // Actualizar contrato
    await supabase
      .from('marketplace_contracts')
      .update({
        status: 'revision',
        revisions_used: contract.revisions_used + 1,
      })
      .eq('id', contractId);

    return {
      success: true,
      revisionsRemaining: contract.max_revisions - contract.revisions_used - 1,
    };
  },

  // ========================================
  // FINALIZACIÓN
  // ========================================

  /**
   * Cliente aprueba todo y libera pago
   */
  async completeContract(
    clientUserId: string,
    contractId: string,
    rating?: number,
    review?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verificar contrato
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('client_user_id', clientUserId)
      .in('status', ['delivered', 'revision'])
      .single();

    if (!contract) {
      return { success: false, error: 'Contrato no encontrado' };
    }

    // Actualizar contrato
    const { error } = await supabase
      .from('marketplace_contracts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        client_rating: rating,
        client_review: review,
      })
      .eq('id', contractId);

    if (error) {
      return { success: false, error: error.message };
    }

    // TODO: Liberar escrow si existe
    // TODO: Acreditar al proveedor
    // TODO: Acreditar fee a Kreoon

    return { success: true };
  },

  /**
   * Cancelar contrato (solo si es draft o pending_payment)
   */
  async cancelContract(
    userId: string,
    contractId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Solo el cliente puede cancelar, y solo si no está activo
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('client_user_id', userId)
      .in('status', ['draft', 'pending_payment'])
      .single();

    if (!contract) {
      return { success: false, error: 'Contrato no encontrado o no se puede cancelar' };
    }

    const { error } = await supabase
      .from('marketplace_contracts')
      .update({ status: 'cancelled' })
      .eq('id', contractId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Abrir disputa
   */
  async openDispute(
    userId: string,
    contractId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verificar que el usuario es parte del contrato
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .or(`client_user_id.eq.${userId},provider_user_id.eq.${userId}`)
      .single();

    if (!contract) {
      return { success: false, error: 'Contrato no encontrado' };
    }

    // Actualizar a disputado
    const { error } = await supabase
      .from('marketplace_contracts')
      .update({ status: 'disputed' })
      .eq('id', contractId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Agregar mensaje de disputa
    await supabase
      .from('marketplace_contract_messages')
      .insert({
        contract_id: contractId,
        sender_id: userId,
        message: `[DISPUTA ABIERTA] ${reason}`,
      });

    // TODO: Notificar a soporte de Kreoon

    return { success: true };
  },

  // ========================================
  // MENSAJES
  // ========================================

  /**
   * Obtener mensajes del contrato
   */
  async getMessages(contractId: string): Promise<MarketplaceContractMessage[]> {
    const { data, error } = await supabase
      .from('marketplace_contract_messages')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Enviar mensaje
   */
  async sendMessage(
    senderId: string,
    contractId: string,
    message: string,
    attachments?: DeliverableFile[]
  ): Promise<MarketplaceContractMessage | null> {
    const { data, error } = await supabase
      .from('marketplace_contract_messages')
      .insert({
        contract_id: contractId,
        sender_id: senderId,
        message,
        attachments: attachments || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return data;
  },

  // ========================================
  // CALIFICACIONES
  // ========================================

  /**
   * Proveedor califica al cliente
   */
  async rateClient(
    providerUserId: string,
    contractId: string,
    rating: number,
    review?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verificar que es el proveedor y el contrato está completado
    const { data: contract } = await supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('provider_user_id', providerUserId)
      .eq('status', 'completed')
      .single();

    if (!contract) {
      return { success: false, error: 'Contrato no encontrado o no completado' };
    }

    const { error } = await supabase
      .from('marketplace_contracts')
      .update({
        provider_rating: rating,
        provider_review: review,
      })
      .eq('id', contractId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },
};
