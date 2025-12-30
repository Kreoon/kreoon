import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

// Database enum types
export type StreamingProviderType = 'restream' | 'watchity' | 'custom_rtmp';
export type StreamingPlatformType = 'youtube' | 'facebook' | 'instagram' | 'twitch' | 'tiktok' | 'linkedin' | 'custom_rtmp';
export type StreamingEventType = 'informative' | 'shopping' | 'webinar' | 'interview';
export type StreamingEventStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';
export type StreamingSaleStatus = 'quoted' | 'sold' | 'executed' | 'paid' | 'cancelled';
export type StreamingOwnerType = 'platform' | 'organization';

// Types
export interface StreamingProvider {
  id: string;
  provider: StreamingProviderType;
  is_enabled: boolean;
  mode: string;
  api_key_encrypted?: string;
  client_id?: string;
  client_secret_encrypted?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface StreamingAccount {
  id: string;
  platform_type: StreamingPlatformType;
  account_name: string;
  account_external_id?: string;
  status: string;
  created_at: string;
  last_sync_at?: string;
  error_message?: string;
  metadata?: Json;
}

export interface StreamingEvent {
  id: string;
  title: string;
  description?: string;
  event_type: StreamingEventType;
  status: StreamingEventStatus;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  peak_viewers: number;
  total_views: number;
  is_shopping_enabled: boolean;
  stream_key?: string;
  rtmp_url?: string;
  client_id?: string;
  organization_id?: string;
  client?: { name: string };
  target_accounts?: string[];
  ai_title_suggestion?: string;
  ai_description_suggestion?: string;
}

export interface StreamingSale {
  id: string;
  sale_type: string;
  status: StreamingSaleStatus;
  amount: number;
  currency: string;
  description?: string;
  quoted_at: string;
  sold_at?: string;
  executed_at?: string;
  paid_at?: string;
  client_id?: string;
  event_id?: string;
  client?: { name: string };
  event?: { title: string };
}

export interface StreamingLog {
  id: string;
  log_type: string;
  message: string;
  severity: string;
  created_at: string;
  provider?: string;
  platform_type?: string;
  event_id?: string;
  account_id?: string;
  metadata?: Json;
}

export interface StreamingStats {
  totalAccounts: number;
  connectedAccounts: number;
  totalEvents: number;
  liveEvents: number;
  scheduledEvents: number;
  totalSales: number;
  totalRevenue: number;
  pendingRevenue: number;
}

interface UseLiveStreamingOptions {
  ownerType?: StreamingOwnerType;
  ownerId?: string;
}

export function useLiveStreaming(options: UseLiveStreamingOptions = {}) {
  const { ownerType = 'platform', ownerId } = options;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  
  // Data states
  const [providers, setProviders] = useState<StreamingProvider[]>([]);
  const [accounts, setAccounts] = useState<StreamingAccount[]>([]);
  const [events, setEvents] = useState<StreamingEvent[]>([]);
  const [sales, setSales] = useState<StreamingSale[]>([]);
  const [logs, setLogs] = useState<StreamingLog[]>([]);

  // Fetch feature flag
  useEffect(() => {
    const fetchFeatureFlag = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'live_streaming_enabled')
          .single();
        
        if (data) {
          setFeatureEnabled(data.value === 'true');
        }
      } catch (error) {
        console.error('Error fetching feature flag:', error);
      }
    };

    fetchFeatureFlag();
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build owner filter
      const ownerFilter = ownerType === 'organization' && ownerId
        ? { owner_type: 'organization', owner_id: ownerId }
        : { owner_type: 'platform' };

      // Fetch providers
      const { data: providersData } = await supabase
        .from('streaming_providers_config')
        .select('*')
        .match(ownerFilter)
        .order('provider');
      setProviders((providersData as StreamingProvider[]) || []);

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('streaming_accounts')
        .select('*')
        .match(ownerFilter)
        .order('created_at', { ascending: false });
      setAccounts((accountsData as StreamingAccount[]) || []);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('streaming_events')
        .select('*, client:clients(name)')
        .match(ownerFilter)
        .order('scheduled_at', { ascending: false })
        .limit(50);
      setEvents((eventsData as StreamingEvent[]) || []);

      // Fetch sales
      const { data: salesData } = await supabase
        .from('streaming_sales')
        .select('*, client:clients(name), event:streaming_events(title)')
        .match(ownerFilter)
        .order('created_at', { ascending: false })
        .limit(50);
      setSales((salesData as StreamingSale[]) || []);

      // Fetch logs
      const { data: logsData } = await supabase
        .from('streaming_logs')
        .select('*')
        .match(ownerFilter)
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs((logsData as StreamingLog[]) || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle feature flag
  const toggleFeatureFlag = useCallback(async () => {
    try {
      const newValue = !featureEnabled;
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newValue.toString(), updated_at: new Date().toISOString() })
        .eq('key', 'live_streaming_enabled');

      if (error) throw error;

      setFeatureEnabled(newValue);
      toast({
        title: 'Actualizado',
        description: newValue 
          ? 'Live Streaming habilitado para organizaciones'
          : 'Live Streaming deshabilitado para organizaciones',
      });
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    }
  }, [featureEnabled, toast]);

  // CRUD Operations for Providers
  const saveProvider = useCallback(async (provider: Partial<StreamingProvider> & { provider: StreamingProviderType }) => {
    try {
      const payload = {
        provider: provider.provider,
        is_enabled: provider.is_enabled,
        mode: provider.mode,
        api_key_encrypted: provider.api_key_encrypted,
        client_id: provider.client_id,
        client_secret_encrypted: provider.client_secret_encrypted,
        webhook_url: provider.webhook_url,
        owner_type: ownerType,
        owner_id: ownerId || null,
        updated_at: new Date().toISOString(),
      };

      if (provider.id) {
        const { error } = await supabase
          .from('streaming_providers_config')
          .update(payload)
          .eq('id', provider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('streaming_providers_config')
          .insert(payload);
        if (error) throw error;
      }

      toast({ title: 'Proveedor guardado' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error saving provider:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el proveedor',
        variant: 'destructive',
      });
      return false;
    }
  }, [ownerType, ownerId, toast, fetchData]);

  // CRUD Operations for Accounts
  const saveAccount = useCallback(async (account: Partial<StreamingAccount> & { platform_type: StreamingPlatformType; account_name: string }) => {
    try {
      const payload = {
        platform_type: account.platform_type,
        account_name: account.account_name,
        account_external_id: account.account_external_id,
        owner_type: ownerType,
        owner_id: ownerId || null,
        updated_at: new Date().toISOString(),
      };

      if (account.id) {
        const { error } = await supabase
          .from('streaming_accounts')
          .update(payload)
          .eq('id', account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('streaming_accounts')
          .insert({ ...payload, status: 'connected' as const });
        if (error) throw error;
      }

      toast({ title: 'Canal guardado' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el canal',
        variant: 'destructive',
      });
      return false;
    }
  }, [ownerType, ownerId, toast, fetchData]);

  const deleteAccount = useCallback(async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('streaming_accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;

      toast({ title: 'Canal eliminado' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el canal',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchData]);

  // CRUD Operations for Events
  const saveEvent = useCallback(async (event: Partial<StreamingEvent> & { title: string; event_type?: StreamingEventType }) => {
    try {
      const payload = {
        title: event.title,
        description: event.description,
        event_type: event.event_type || ('informative' as StreamingEventType),
        scheduled_at: event.scheduled_at,
        is_shopping_enabled: event.is_shopping_enabled,
        client_id: event.client_id,
        target_accounts: event.target_accounts,
        owner_type: ownerType,
        owner_id: ownerId || null,
        updated_at: new Date().toISOString(),
      };

      if (event.id) {
        const { error } = await supabase
          .from('streaming_events')
          .update(payload)
          .eq('id', event.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('streaming_events')
          .insert({ ...payload, status: 'draft' as StreamingEventStatus });
        if (error) throw error;
      }

      toast({ title: 'Evento guardado' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el evento',
        variant: 'destructive',
      });
      return false;
    }
  }, [ownerType, ownerId, toast, fetchData]);

  const updateEventStatus = useCallback(async (eventId: string, status: StreamingEventStatus) => {
    try {
      const updates: { status: StreamingEventStatus; updated_at: string; started_at?: string; ended_at?: string } = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'live') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'ended') {
        updates.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('streaming_events')
        .update(updates)
        .eq('id', eventId);
      if (error) throw error;

      // Log the action
      await supabase.from('streaming_logs').insert({
        owner_type: ownerType,
        owner_id: ownerId || null,
        event_id: eventId,
        log_type: status === 'live' ? 'stream_started' : 'stream_ended',
        message: status === 'live' ? 'Transmisión iniciada' : 'Transmisión finalizada',
        severity: 'info',
      });

      toast({ title: status === 'live' ? 'Transmisión iniciada' : 'Transmisión finalizada' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el evento',
        variant: 'destructive',
      });
      return false;
    }
  }, [ownerType, ownerId, toast, fetchData]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('streaming_events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;

      toast({ title: 'Evento eliminado' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el evento',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchData]);

  // CRUD Operations for Sales
  const saveSale = useCallback(async (sale: Partial<StreamingSale> & { sale_type: string; amount: number }) => {
    try {
      const payload = {
        sale_type: sale.sale_type,
        amount: sale.amount,
        currency: sale.currency || 'USD',
        description: sale.description,
        client_id: sale.client_id,
        event_id: sale.event_id,
        owner_type: ownerType,
        owner_id: ownerId || null,
        updated_at: new Date().toISOString(),
      };

      if (sale.id) {
        const { error } = await supabase
          .from('streaming_sales')
          .update(payload)
          .eq('id', sale.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('streaming_sales')
          .insert({ ...payload, status: 'quoted' as StreamingSaleStatus, quoted_at: new Date().toISOString() });
        if (error) throw error;
      }

      toast({ title: 'Venta guardada' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error saving sale:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la venta',
        variant: 'destructive',
      });
      return false;
    }
  }, [ownerType, ownerId, toast, fetchData]);

  const updateSaleStatus = useCallback(async (saleId: string, status: StreamingSaleStatus) => {
    try {
      const updates: { status: StreamingSaleStatus; updated_at: string; sold_at?: string; executed_at?: string; paid_at?: string } = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'sold') {
        updates.sold_at = new Date().toISOString();
      } else if (status === 'executed') {
        updates.executed_at = new Date().toISOString();
      } else if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('streaming_sales')
        .update(updates)
        .eq('id', saleId);
      if (error) throw error;

      toast({ title: 'Estado actualizado' });
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error updating sale status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la venta',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchData]);

  // Stats
  const stats: StreamingStats = useMemo(() => ({
    totalAccounts: accounts.length,
    connectedAccounts: accounts.filter(a => a.status === 'connected').length,
    totalEvents: events.length,
    liveEvents: events.filter(e => e.status === 'live').length,
    scheduledEvents: events.filter(e => e.status === 'scheduled').length,
    totalSales: sales.length,
    totalRevenue: sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0),
    pendingRevenue: sales.filter(s => ['quoted', 'sold', 'executed'].includes(s.status)).reduce((sum, s) => sum + s.amount, 0),
  }), [accounts, events, sales]);

  return {
    // States
    loading,
    featureEnabled,
    providers,
    accounts,
    events,
    sales,
    logs,
    stats,
    
    // Actions
    fetchData,
    toggleFeatureFlag,
    saveProvider,
    saveAccount,
    deleteAccount,
    saveEvent,
    updateEventStatus,
    deleteEvent,
    saveSale,
    updateSaleStatus,
  };
}
