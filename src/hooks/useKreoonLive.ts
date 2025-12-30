import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Cast para tablas nuevas no generadas aún
const supabaseAny = supabase as any;

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
  reserved_hours: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
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
  price_paid: number;
  currency: string;
  wallet_id: string;
  purchased_at: string;
  notes: string | null;
}

export interface LiveHourAssignment {
  id: string;
  organization_id: string;
  client_id: string;
  hours_assigned: number;
  hours_remaining: number;
  package_id: string | null;
  wallet_id: string;
  expires_at: string | null;
  assigned_by: string | null;
  assigned_at: string;
  notes: string | null;
  client?: { name: string };
}

export interface LiveFeatureFlag {
  id: string;
  flag_type: 'platform' | 'organization' | 'client';
  flag_id: string;
  is_enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
  disabled_at: string | null;
  created_at: string;
}

export interface LiveEventCreator {
  id: string;
  event_id: string;
  creator_id: string;
  role: 'host' | 'co_host' | 'support' | 'guest';
  assigned_by: string;
  assigned_at: string;
  confirmed_at: string | null;
  notes: string | null;
  creator?: { full_name: string; avatar_url: string };
}

export interface LiveUsageLog {
  id: string;
  event_id: string;
  wallet_id: string;
  hours_consumed: number;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  logged_at: string;
  logged_by: string | null;
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
      // Fetch wallets
      const { data: walletsData } = await supabaseAny
        .from('live_hour_wallets')
        .select('*');
      setWallets((walletsData as LiveHourWallet[]) || []);

      // Fetch packages (organization's packages)
      if (organizationId) {
        const { data: packagesData } = await supabaseAny
          .from('organization_live_packages')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        setPackages((packagesData as LivePackage[]) || []);
      }

      // Fetch purchases
      let purchasesQuery = supabaseAny.from('live_hour_purchases').select('*');
      if (!isAdmin && organizationId) {
        purchasesQuery = purchasesQuery.eq('buyer_id', organizationId);
      }
      const { data: purchasesData } = await purchasesQuery.order('purchased_at', { ascending: false });
      setPurchases((purchasesData as LiveHourPurchase[]) || []);

      // Fetch assignments (org's assignments to clients)
      if (organizationId) {
        const { data: assignmentsData } = await supabaseAny
          .from('live_hour_assignments')
          .select('*')
          .eq('organization_id', organizationId)
          .order('assigned_at', { ascending: false });
        setAssignments((assignmentsData as LiveHourAssignment[]) || []);
      }

      // Fetch feature flags
      const { data: flagsData } = await supabaseAny
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
              const { data: walletData } = await supabaseAny
                .from('live_hour_wallets')
                .select('*')
                .eq('owner_type', 'client')
                .eq('owner_id', client.id)
                .maybeSingle();

              // Get feature flag
              const { data: flagData } = await supabaseAny
                .from('live_feature_flags')
                .select('is_enabled')
                .eq('flag_type', 'client')
                .eq('flag_id', client.id)
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

      // Fetch event creators with profile info
      const { data: creatorsData } = await supabaseAny
        .from('live_event_creators')
        .select('*, creator:profiles(full_name, avatar_url)');
      setEventCreators((creatorsData as LiveEventCreator[]) || []);

      // Fetch usage logs
      const { data: logsData } = await supabaseAny
        .from('live_usage_logs')
        .select('*')
        .order('logged_at', { ascending: false })
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
    
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.price_paid || 0), 0);

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
      upcomingEvents: 0, // Will be updated via streamingEvents
      liveNow: 0, // Will be updated via streamingEvents
      totalRevenue,
    };
  }, [wallets, clientsWithWallets, purchases, organizationId]);

  const isPlatformEnabled = useMemo(() => {
    return featureFlags.find(f => f.flag_type === 'platform')?.is_enabled || false;
  }, [featureFlags]);

  const isOrgEnabled = useMemo(() => {
    return featureFlags.find(
      f => f.flag_type === 'organization' && f.flag_id === organizationId
    )?.is_enabled || false;
  }, [featureFlags, organizationId]);

  // =============================================
  // FEATURE FLAG MANAGEMENT
  // =============================================

  const toggleFeatureFlag = useCallback(async (
    flagType: 'platform' | 'organization' | 'client',
    flagId: string,
    enabled: boolean
  ) => {
    try {
      const { error } = await supabaseAny
        .from('live_feature_flags')
        .upsert({
          flag_type: flagType,
          flag_id: flagId,
          is_enabled: enabled,
          enabled_by: enabled ? profile?.id : null,
          enabled_at: enabled ? new Date().toISOString() : null,
          disabled_at: !enabled ? new Date().toISOString() : null,
        }, { onConflict: 'flag_type,flag_id' });

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
        const { error } = await supabaseAny
          .from('organization_live_packages')
          .update({ ...pkg, updated_at: new Date().toISOString() })
          .eq('id', pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny
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
      const { error } = await supabaseAny
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
      let { data: walletData } = await supabaseAny
        .from('live_hour_wallets')
        .select('*')
        .eq('owner_type', 'client')
        .eq('owner_id', clientId)
        .maybeSingle();

      let walletId: string;

      if (!walletData) {
        const { data: newWallet, error: createError } = await supabaseAny
          .from('live_hour_wallets')
          .insert({
            owner_type: 'client',
            owner_id: clientId,
            total_hours: hours,
            available_hours: hours,
            used_hours: 0,
            reserved_hours: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        walletId = newWallet.id;
      } else {
        // Update existing wallet
        const { error: updateError } = await supabaseAny
          .from('live_hour_wallets')
          .update({
            total_hours: walletData.total_hours + hours,
            available_hours: walletData.available_hours + hours,
          })
          .eq('id', walletData.id);

        if (updateError) throw updateError;
        walletId = walletData.id;
      }

      // Create assignment record
      const { error: assignError } = await supabaseAny
        .from('live_hour_assignments')
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          hours_assigned: hours,
          hours_remaining: hours,
          package_id: packageId || null,
          wallet_id: walletId,
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
    pricePaid: number,
    currency: string = 'COP',
    notes?: string
  ) => {
    if (!profile?.id) return;

    try {
      // Check if org has a wallet, create if not
      let { data: walletData } = await supabaseAny
        .from('live_hour_wallets')
        .select('*')
        .eq('owner_type', 'organization')
        .eq('owner_id', targetOrgId)
        .maybeSingle();

      let walletId: string;

      if (!walletData) {
        const { data: newWallet, error: createError } = await supabaseAny
          .from('live_hour_wallets')
          .insert({
            owner_type: 'organization',
            owner_id: targetOrgId,
            total_hours: hours,
            available_hours: hours,
            used_hours: 0,
            reserved_hours: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        walletId = newWallet.id;
      } else {
        const { error: updateError } = await supabaseAny
          .from('live_hour_wallets')
          .update({
            total_hours: walletData.total_hours + hours,
            available_hours: walletData.available_hours + hours,
          })
          .eq('id', walletData.id);

        if (updateError) throw updateError;
        walletId = walletData.id;
      }

      // Create purchase record using correct column names
      const { error: purchaseError } = await supabaseAny
        .from('live_hour_purchases')
        .insert({
          organization_id: targetOrgId,
          hours_purchased: hours,
          price_paid: pricePaid,
          currency,
          purchased_by: profile.id,
          notes,
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
    role: 'host' | 'co_host' | 'support' | 'guest' = 'host'
  ) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabaseAny
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
    confirmed: boolean
  ) => {
    try {
      const { error } = await supabaseAny
        .from('live_event_creators')
        .update({
          confirmed_at: confirmed ? new Date().toISOString() : null,
        })
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
      const { error } = await supabaseAny
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
  // CAN CLIENT START LIVE CHECK
  // =============================================

  const canClientStartLive = useCallback(async (clientId: string): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const { data, error } = await supabaseAny.rpc('can_client_start_live', {
        p_client_id: clientId,
        p_organization_id: organizationId
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error checking if client can start live:', error);
      return false;
    }
  }, [organizationId]);

  // =============================================
  // CONSUME LIVE HOURS
  // =============================================

  const consumeLiveHours = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabaseAny.rpc('consume_live_hours', {
        p_event_id: eventId
      });

      if (error) throw error;
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error consuming live hours:', error);
      toast({ title: 'Error', description: 'Error al consumir horas de live', variant: 'destructive' });
      return false;
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
    canClientStartLive,
    consumeLiveHours,
  };
}
