import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// =============================================
// TYPES
// =============================================

export interface LiveHourWallet {
  id: string;
  owner_type: 'platform' | 'organization' | 'client';
  owner_id: string;
  total_hours: number;
  used_hours: number;
  available_hours: number;
  expires_at: string | null;
  created_at: string;
  notes: string | null;
}

export interface LivePackage {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  hours_included: number;
  price: number;
  currency: string;
  validity_days: number;
  is_active: boolean;
  features: unknown[];
  created_at: string;
}

export interface LiveHourPurchase {
  id: string;
  buyer_type: 'organization' | 'client';
  buyer_id: string;
  seller_type: 'platform' | 'organization';
  seller_id: string | null;
  package_id: string | null;
  hours_purchased: number;
  amount_paid: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  payment_method: string | null;
  payment_reference: string | null;
  invoice_number: string | null;
  expires_at: string | null;
  created_at: string;
  notes: string | null;
}

export interface LiveHourAssignment {
  id: string;
  organization_id: string;
  client_id: string;
  hours_assigned: number;
  package_id: string | null;
  expires_at: string | null;
  assigned_by: string | null;
  assigned_at: string;
  notes: string | null;
  client?: { name: string };
}

export interface LiveFeatureFlag {
  id: string;
  scope: 'platform' | 'organization' | 'client';
  scope_id: string | null;
  feature_key: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
}

export interface LiveEventCreator {
  id: string;
  event_id: string;
  creator_id: string;
  role: 'host' | 'cohost' | 'support' | 'guest';
  status: 'pending' | 'confirmed' | 'declined' | 'completed';
  assigned_at: string;
  confirmed_at: string | null;
  notes: string | null;
  creator?: { full_name: string; avatar_url: string };
}

export interface LiveUsageLog {
  id: string;
  wallet_id: string;
  event_id: string | null;
  action: 'credit' | 'debit' | 'adjustment' | 'refund' | 'expire';
  hours_amount: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
}

export interface ClientWithWallet {
  id: string;
  name: string;
  logo_url: string | null;
  organization_id: string;
  wallet?: LiveHourWallet;
  live_enabled: boolean;
  total_events: number;
}

export interface KreoonLiveStats {
  platformHours: { total: number; used: number; available: number };
  organizationHours: { total: number; used: number; available: number };
  activeClients: number;
  totalClients: number;
  upcomingEvents: number;
  liveNow: number;
  totalRevenue: number;
}

// =============================================
// HOOK OPTIONS
// =============================================

interface UseKreoonLiveOptions {
  ownerType?: 'platform' | 'organization' | 'client';
  ownerId?: string;
}

// =============================================
// MAIN HOOK
// =============================================

export function useKreoonLive(options: UseKreoonLiveOptions = {}) {
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const organizationId = options.ownerId || profile?.current_organization_id;
  // Use any for now since profile type may vary
  const userRole = (profile as any)?.role;
  const isAdmin = userRole === 'admin';
  const isOrgOwner = (profile as any)?.is_org_owner;

  // State
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<LiveHourWallet[]>([]);
  const [packages, setPackages] = useState<LivePackage[]>([]);
  const [purchases, setPurchases] = useState<LiveHourPurchase[]>([]);
  const [assignments, setAssignments] = useState<LiveHourAssignment[]>([]);
  const [featureFlags, setFeatureFlags] = useState<LiveFeatureFlag[]>([]);
  const [eventCreators, setEventCreators] = useState<LiveEventCreator[]>([]);
  const [usageLogs, setUsageLogs] = useState<LiveUsageLog[]>([]);
  const [clientsWithWallets, setClientsWithWallets] = useState<ClientWithWallet[]>([]);

  // =============================================
  // FETCH DATA
  // =============================================

  const fetchData = useCallback(async () => {
    if (!organizationId && !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Use any casts for new tables not yet in generated types
      const supabaseAny = supabase as any;
      
      // Fetch wallets
      const walletsQuery = supabaseAny.from('live_hour_wallets').select('*');
      const { data: walletsData } = await walletsQuery;
      setWallets((walletsData as LiveHourWallet[]) || []);

      // Fetch packages (organization's packages)
      if (organizationId) {
        const { data: packagesData } = await supabase
          .from('organization_live_packages')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        setPackages((packagesData as LivePackage[]) || []);
      }

      // Fetch purchases
      const purchasesQuery = supabase.from('live_hour_purchases').select('*');
      if (!isAdmin && organizationId) {
        purchasesQuery.eq('buyer_id', organizationId);
      }
      const { data: purchasesData } = await purchasesQuery.order('created_at', { ascending: false });
      setPurchases((purchasesData as LiveHourPurchase[]) || []);

      // Fetch assignments (org's assignments to clients)
      if (organizationId) {
        const { data: assignmentsData } = await supabase
          .from('live_hour_assignments')
          .select('*, client:clients(name)')
          .eq('organization_id', organizationId)
          .order('assigned_at', { ascending: false });
        setAssignments((assignmentsData as LiveHourAssignment[]) || []);
      }

      // Fetch feature flags
      const { data: flagsData } = await supabase
        .from('live_feature_flags')
        .select('*');
      setFeatureFlags((flagsData as LiveFeatureFlag[]) || []);

      // Fetch clients with their wallets
      if (organizationId) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, logo_url, organization_id')
          .eq('organization_id', organizationId);

        if (clientsData) {
          const clientsWithInfo = await Promise.all(
            clientsData.map(async (client) => {
              // Get wallet
              const { data: walletData } = await supabase
                .from('live_hour_wallets')
                .select('*')
                .eq('owner_type', 'client')
                .eq('owner_id', client.id)
                .maybeSingle();

              // Get feature flag
              const { data: flagData } = await supabase
                .from('live_feature_flags')
                .select('is_enabled')
                .eq('scope', 'client')
                .eq('scope_id', client.id)
                .eq('feature_key', 'live_streaming_enabled')
                .maybeSingle();

              // Get event count
              const { count: eventCount } = await supabase
                .from('streaming_events')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', client.id);

              return {
                ...client,
                wallet: walletData as LiveHourWallet | undefined,
                live_enabled: flagData?.is_enabled || false,
                total_events: eventCount || 0,
              };
            })
          );
          setClientsWithWallets(clientsWithInfo);
        }
      }

      // Fetch usage logs
      const { data: logsData } = await supabase
        .from('live_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setUsageLogs((logsData as LiveUsageLog[]) || []);

    } catch (error) {
      console.error('Error fetching KREOON Live data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de Live Streaming',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, isAdmin, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =============================================
  // COMPUTED VALUES
  // =============================================

  const stats = useMemo<KreoonLiveStats>(() => {
    const platformWallet = wallets.find(w => w.owner_type === 'platform');
    const orgWallet = wallets.find(w => w.owner_type === 'organization' && w.owner_id === organizationId);
    
    const activeClients = clientsWithWallets.filter(c => c.live_enabled && (c.wallet?.available_hours || 0) > 0).length;
    
    const totalRevenue = purchases
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + p.amount_paid, 0);

    return {
      platformHours: {
        total: platformWallet?.total_hours || 0,
        used: platformWallet?.used_hours || 0,
        available: platformWallet?.available_hours || 0,
      },
      organizationHours: {
        total: orgWallet?.total_hours || 0,
        used: orgWallet?.used_hours || 0,
        available: orgWallet?.available_hours || 0,
      },
      activeClients,
      totalClients: clientsWithWallets.length,
      upcomingEvents: 0, // TODO: Calculate from streaming_events
      liveNow: 0, // TODO: Calculate from streaming_events with status='live'
      totalRevenue,
    };
  }, [wallets, clientsWithWallets, purchases, organizationId]);

  const isPlatformEnabled = useMemo(() => {
    return featureFlags.find(f => f.scope === 'platform' && f.feature_key === 'live_streaming_enabled')?.is_enabled || false;
  }, [featureFlags]);

  const isOrgEnabled = useMemo(() => {
    return featureFlags.find(
      f => f.scope === 'organization' && f.scope_id === organizationId && f.feature_key === 'live_streaming_enabled'
    )?.is_enabled || false;
  }, [featureFlags, organizationId]);

  // =============================================
  // FEATURE FLAG MANAGEMENT
  // =============================================

  const toggleFeatureFlag = useCallback(async (
    scope: 'platform' | 'organization' | 'client',
    scopeId: string | null,
    enabled: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('live_feature_flags')
        .upsert({
          scope,
          scope_id: scopeId,
          feature_key: 'live_streaming_enabled',
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id,
        }, { onConflict: 'scope,scope_id,feature_key' });

      if (error) throw error;

      await fetchData();
      toast({
        title: enabled ? 'Habilitado' : 'Deshabilitado',
        description: `Live Streaming ${enabled ? 'activado' : 'desactivado'} correctamente`,
      });
    } catch (error) {
      console.error('Error toggling feature flag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado',
        variant: 'destructive',
      });
    }
  }, [fetchData, toast, profile?.id]);

  // =============================================
  // PACKAGE MANAGEMENT
  // =============================================

  const savePackage = useCallback(async (pkg: Partial<LivePackage>) => {
    if (!organizationId) return;

    try {
      if (pkg.id) {
        const { error } = await supabase
          .from('organization_live_packages')
          .update({ ...pkg, updated_at: new Date().toISOString() })
          .eq('id', pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_live_packages')
          .insert({ ...pkg, organization_id: organizationId });
        if (error) throw error;
      }

      await fetchData();
      toast({ title: 'Éxito', description: 'Paquete guardado correctamente' });
    } catch (error) {
      console.error('Error saving package:', error);
      toast({ title: 'Error', description: 'No se pudo guardar el paquete', variant: 'destructive' });
    }
  }, [organizationId, fetchData, toast]);

  const deletePackage = useCallback(async (packageId: string) => {
    try {
      const { error } = await supabase
        .from('organization_live_packages')
        .delete()
        .eq('id', packageId);
      if (error) throw error;

      await fetchData();
      toast({ title: 'Eliminado', description: 'Paquete eliminado correctamente' });
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el paquete', variant: 'destructive' });
    }
  }, [fetchData, toast]);

  // =============================================
  // WALLET & HOURS MANAGEMENT
  // =============================================

  const assignHoursToClient = useCallback(async (
    clientId: string,
    hours: number,
    packageId?: string,
    expiresAt?: string
  ) => {
    if (!organizationId || !profile?.id) return;

    try {
      // Check if client has a wallet, create if not
      let { data: walletData } = await supabase
        .from('live_hour_wallets')
        .select('id, total_hours')
        .eq('owner_type', 'client')
        .eq('owner_id', clientId)
        .maybeSingle();

      if (!walletData) {
        const { data: newWallet, error: createError } = await supabase
          .from('live_hour_wallets')
          .insert({
            owner_type: 'client',
            owner_id: clientId,
            total_hours: hours,
            used_hours: 0,
            created_by: profile.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
      } else {
        // Update existing wallet
        const { error: updateError } = await supabase
          .from('live_hour_wallets')
          .update({
            total_hours: walletData.total_hours + hours,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walletData.id);

        if (updateError) throw updateError;
      }

      // Create assignment record
      const { error: assignError } = await supabase
        .from('live_hour_assignments')
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          hours_assigned: hours,
          package_id: packageId || null,
          expires_at: expiresAt || null,
          assigned_by: profile.id,
        });

      if (assignError) throw assignError;

      // Enable live for client
      await toggleFeatureFlag('client', clientId, true);

      await fetchData();
      toast({ title: 'Éxito', description: `${hours} horas asignadas al cliente` });
    } catch (error) {
      console.error('Error assigning hours:', error);
      toast({ title: 'Error', description: 'No se pudieron asignar las horas', variant: 'destructive' });
    }
  }, [organizationId, profile?.id, fetchData, toast, toggleFeatureFlag]);

  const addPlatformHoursToOrg = useCallback(async (
    targetOrgId: string,
    hours: number,
    amountPaid: number,
    currency: string = 'COP',
    paymentRef?: string
  ) => {
    if (!profile?.id) return;

    try {
      // Check if org has a wallet, create if not
      let { data: walletData } = await supabase
        .from('live_hour_wallets')
        .select('id, total_hours')
        .eq('owner_type', 'organization')
        .eq('owner_id', targetOrgId)
        .maybeSingle();

      if (!walletData) {
        const { data: newWallet, error: createError } = await supabase
          .from('live_hour_wallets')
          .insert({
            owner_type: 'organization',
            owner_id: targetOrgId,
            total_hours: hours,
            used_hours: 0,
            created_by: profile.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
      } else {
        const { error: updateError } = await supabase
          .from('live_hour_wallets')
          .update({
            total_hours: walletData.total_hours + hours,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walletData.id);

        if (updateError) throw updateError;
      }

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('live_hour_purchases')
        .insert({
          buyer_type: 'organization',
          buyer_id: targetOrgId,
          seller_type: 'platform',
          seller_id: null,
          hours_purchased: hours,
          amount_paid: amountPaid,
          currency,
          payment_status: 'paid',
          payment_reference: paymentRef,
          processed_by: profile.id,
        });

      if (purchaseError) throw purchaseError;

      // Enable live for organization
      await toggleFeatureFlag('organization', targetOrgId, true);

      await fetchData();
      toast({ title: 'Éxito', description: `${hours} horas agregadas a la organización` });
    } catch (error) {
      console.error('Error adding platform hours:', error);
      toast({ title: 'Error', description: 'No se pudieron agregar las horas', variant: 'destructive' });
    }
  }, [profile?.id, fetchData, toast, toggleFeatureFlag]);

  // =============================================
  // EVENT CREATORS MANAGEMENT
  // =============================================

  const assignCreatorToEvent = useCallback(async (
    eventId: string,
    creatorId: string,
    role: 'host' | 'cohost' | 'support' | 'guest' = 'host'
  ) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('live_event_creators')
        .insert({
          event_id: eventId,
          creator_id: creatorId,
          role,
          assigned_by: profile.id,
        });

      if (error) throw error;
      await fetchData();
      toast({ title: 'Éxito', description: 'Creador asignado al evento' });
    } catch (error) {
      console.error('Error assigning creator:', error);
      toast({ title: 'Error', description: 'No se pudo asignar el creador', variant: 'destructive' });
    }
  }, [profile?.id, fetchData, toast]);

  const updateCreatorStatus = useCallback(async (
    assignmentId: string,
    status: 'pending' | 'confirmed' | 'declined' | 'completed'
  ) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('live_event_creators')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchData();
      toast({ title: 'Éxito', description: 'Estado actualizado' });
    } catch (error) {
      console.error('Error updating creator status:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    }
  }, [fetchData, toast]);

  const removeCreatorFromEvent = useCallback(async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('live_event_creators')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchData();
      toast({ title: 'Eliminado', description: 'Creador removido del evento' });
    } catch (error) {
      console.error('Error removing creator:', error);
      toast({ title: 'Error', description: 'No se pudo remover el creador', variant: 'destructive' });
    }
  }, [fetchData, toast]);

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    loading,
    wallets,
    packages,
    purchases,
    assignments,
    featureFlags,
    eventCreators,
    usageLogs,
    clientsWithWallets,
    
    // Computed
    stats,
    isPlatformEnabled,
    isOrgEnabled,
    isAdmin,
    isOrgOwner,
    organizationId,

    // Actions
    fetchData,
    toggleFeatureFlag,
    savePackage,
    deletePackage,
    assignHoursToClient,
    addPlatformHoursToOrg,
    assignCreatorToEvent,
    updateCreatorStatus,
    removeCreatorFromEvent,
  };
}
