import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface StrategistClient {
  id: string;
  client_id: string;
  is_primary: boolean;
  client: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export function useStrategistClients() {
  const { user, profile, isStrategist } = useAuth();
  const [clients, setClients] = useState<StrategistClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isStrategist && profile?.current_organization_id) {
      fetchAssignedClients();
    } else {
      setClients([]);
      setLoading(false);
    }
  }, [user, isStrategist, profile?.current_organization_id]);

  const fetchAssignedClients = async () => {
    if (!user || !profile?.current_organization_id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('client_strategists')
      .select(`
        id,
        client_id,
        is_primary,
        client:clients(id, name, logo_url)
      `)
      .eq('strategist_id', user.id)
      .eq('organization_id', profile.current_organization_id);

    if (!error && data) {
      const clientsList = data as unknown as StrategistClient[];
      setClients(clientsList);
      
      // Auto-select primary client or first one
      const primary = clientsList.find(c => c.is_primary);
      if (primary) {
        setSelectedClientId(primary.client_id);
      } else if (clientsList.length > 0) {
        setSelectedClientId(clientsList[0].client_id);
      }
    }
    setLoading(false);
  };

  const selectedClient = clients.find(c => c.client_id === selectedClientId)?.client;

  return {
    clients,
    selectedClientId,
    setSelectedClientId,
    selectedClient,
    loading,
    refetch: fetchAssignedClients,
  };
}
