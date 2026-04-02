import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, ArrowRight, Loader2, Crown, Shield, Eye } from 'lucide-react';

interface UserClient {
  client_id: string;
  role: string;
  client: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient: (clientId: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  viewer: 'Visor'
};

const ROLE_ICONS: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  viewer: Eye
};

export function ClientSelectorDialog({ open, onOpenChange, onSelectClient }: Props) {
  const { user } = useAuth();
  const [clients, setClients] = useState<UserClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchUserClients();
    }
  }, [open, user]);

  const fetchUserClients = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get client associations for current user
      const { data: associations } = await supabase
        .from('client_users')
        .select('client_id, role')
        .eq('user_id', user.id);

      if (associations && associations.length > 0) {
        const clientIds = associations.map(a => a.client_id);
        
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, logo_url')
          .in('id', clientIds);

        const userClients = associations.map(a => ({
          ...a,
          client: clientsData?.find(c => c.id === a.client_id) || {
            id: a.client_id,
            name: 'Empresa',
            logo_url: null
          }
        }));

        setClients(userClients);
      } else {
        // Fallback to legacy user_id relationship
        const { data: legacyClient } = await supabase
          .from('clients')
          .select('id, name, logo_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (legacyClient) {
          setClients([{
            client_id: legacyClient.id,
            role: 'owner',
            client: legacyClient
          }]);
        } else {
          setClients([]);
        }
      }
    } catch (error) {
      console.error('Error fetching user clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (clientId: string) => {
    onSelectClient(clientId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Empresa
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tienes empresas asignadas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contacta al administrador para que te asigne una empresa
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(item => {
                const RoleIcon = ROLE_ICONS[item.role] || Eye;
                return (
                  <Button
                    key={item.client_id}
                    variant="outline"
                    className="w-full h-auto p-4 justify-between"
                    onClick={() => handleSelect(item.client_id)}
                  >
                    <div className="flex items-center gap-3">
                      {item.client.logo_url ? (
                        <img
                          src={item.client.logo_url}
                          alt={item.client.name}
                          className="h-10 w-10 rounded-sm object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium">{item.client.name}</p>
                        <Badge variant="secondary" className="gap-1 mt-1">
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[item.role] || item.role}
                        </Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
