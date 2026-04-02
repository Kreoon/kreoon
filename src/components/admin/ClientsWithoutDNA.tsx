import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronRight, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ClientWithoutDNA {
  id: string;
  name: string;
  contact_email: string | null;
  created_at: string;
}

interface ClientsWithoutDNAProps {
  onSelectClient?: (clientId: string) => void;
}

export function ClientsWithoutDNA({ onSelectClient }: ClientsWithoutDNAProps) {
  const [clients, setClients] = useState<ClientWithoutDNA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientsWithoutDNA();
  }, []);

  const fetchClientsWithoutDNA = async () => {
    try {
      // Get clients that don't have any DNA records
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          contact_email,
          created_at,
          client_dna!left(id)
        `)
        .is('client_dna.id', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setClients((data as unknown as ClientWithoutDNA[]) || []);
    } catch (err) {
      console.error('Error fetching clients without DNA:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || clients.length === 0) return null;

  return (
    <div className="rounded-sm border border-orange-500/20 bg-orange-500/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-orange-500/20 flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-orange-500/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Clientes sin ADN</h3>
          <p className="text-sm text-orange-400">{clients.length} clientes pendientes</p>
        </div>
      </div>

      {/* Client List */}
      <div className="divide-y divide-white/5">
        {clients.slice(0, 5).map((client) => (
          <button
            key={client.id}
            onClick={() => onSelectClient?.(client.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-white">{client.name}</p>
                {client.contact_email && (
                  <p className="text-sm text-gray-400">{client.contact_email}</p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        ))}
      </div>

      {/* Footer */}
      {clients.length > 5 && (
        <div className="p-3 text-center text-sm text-orange-400 border-t border-orange-500/10">
          +{clients.length - 5} más sin ADN
        </div>
      )}
    </div>
  );
}
