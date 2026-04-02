import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ChevronDown, UserCircle, Pause, PlayCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  strategy_service_enabled: boolean;
  traffic_service_enabled: boolean;
}

interface MarketingClientSwitcherProps {
  organizationId: string | null | undefined;
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void;
}

export function MarketingClientSwitcher({
  organizationId,
  selectedClientId,
  onClientChange,
}: MarketingClientSwitcherProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchClients();
    } else {
      setClients([]);
      setLoading(false);
    }
  }, [organizationId]);

  const fetchClients = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // Fetch clients with strategy or traffic services enabled
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, logo_url, strategy_service_enabled, traffic_service_enabled')
        .eq('organization_id', organizationId)
        .or('strategy_service_enabled.eq.true,traffic_service_enabled.eq.true')
        .order('name');

      if (error) throw error;
      setClients(data || []);

      // Auto-select first client if none selected
      if (!selectedClientId && data && data.length > 0) {
        onClientChange(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (loading) {
    return <Skeleton className="h-12 w-64" />;
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-sm px-4 py-3 border border-dashed">
        <Building2 className="h-4 w-4" />
        <span>Sin clientes con servicios activos</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-auto py-2 px-4 gap-3 min-w-[280px] justify-between bg-card hover:bg-accent border-primary/20"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarImage src={selectedClient?.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {selectedClient?.name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Cliente activo</p>
              <p className="font-medium truncate max-w-[160px]">
                {selectedClient?.name || "Seleccionar cliente"}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-primary" />
          Clientes de Marketing
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[300px]">
          {clients.map((client) => (
            <DropdownMenuItem
              key={client.id}
              onClick={() => onClientChange(client.id)}
              className={`cursor-pointer py-3 ${
                selectedClientId === client.id ? "bg-primary/10" : ""
              }`}
            >
              <Avatar className="h-9 w-9 mr-3">
                <AvatarImage src={client.logo_url || undefined} />
                <AvatarFallback className="text-sm font-semibold">
                  {client.name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{client.name}</p>
                <div className="flex gap-1 mt-1">
                  {client.strategy_service_enabled && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Estrategia
                    </Badge>
                  )}
                  {client.traffic_service_enabled && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Tráfico
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}