import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Filter, User, Building2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
}

interface CollaborationsFilterProps {
  selectedCreatorId?: string | null;
  selectedClientId?: string | null;
  onCreatorChange: (creatorId: string | null) => void;
  onClientChange: (clientId: string | null) => void;
  className?: string;
}

export const CollaborationsFilter = memo(function CollaborationsFilter({
  selectedCreatorId,
  selectedClientId,
  onCreatorChange,
  onClientChange,
  className,
}: CollaborationsFilterProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch creators and clients that have collaborative content
  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      try {
        // Get unique creator IDs from collaborative content
        const { data: contentData } = await supabase
          .from('content')
          .select('creator_id, client_id')
          .eq('shared_on_kreoon', true)
          .not('creator_id', 'is', null);

        if (!contentData) {
          setLoading(false);
          return;
        }

        const creatorIds = [...new Set(contentData.map(c => c.creator_id).filter(Boolean))] as string[];
        const clientIds = [...new Set(contentData.map(c => c.client_id).filter(Boolean))] as string[];

        // Fetch creator profiles
        if (creatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', creatorIds);

          setCreators(profilesData || []);
        }

        // Fetch clients
        if (clientIds.length > 0) {
          const { data: clientsData } = await supabase
            .from('clients')
            .select('id, name, logo_url')
            .in('id', clientIds);

          setClients(clientsData || []);
        }
      } catch (error) {
        console.error('Error fetching filters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const selectedCreator = creators.find(c => c.id === selectedCreatorId);
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const hasActiveFilter = selectedCreatorId || selectedClientId;

  const clearFilters = () => {
    onCreatorChange(null);
    onClientChange(null);
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Creator Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={selectedCreatorId ? "secondary" : "outline"}
            size="sm"
            className="gap-2 h-8"
          >
            {selectedCreator ? (
              <>
                <Avatar className="h-4 w-4">
                  <AvatarImage src={selectedCreator.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {selectedCreator.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate">{selectedCreator.full_name}</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5" />
                Creador
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filtrar por creador</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {selectedCreatorId && (
            <>
              <DropdownMenuItem onClick={() => onCreatorChange(null)}>
                <X className="h-4 w-4 mr-2" />
                Todos los creadores
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {loading ? (
            <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
          ) : creators.length === 0 ? (
            <DropdownMenuItem disabled>No hay creadores</DropdownMenuItem>
          ) : (
            creators.map(creator => (
              <DropdownMenuItem
                key={creator.id}
                onClick={() => onCreatorChange(creator.id)}
                className={cn(selectedCreatorId === creator.id && "bg-accent")}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={creator.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {creator.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{creator.full_name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Client Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={selectedClientId ? "secondary" : "outline"}
            size="sm"
            className="gap-2 h-8"
          >
            {selectedClient ? (
              <>
                <Avatar className="h-4 w-4">
                  <AvatarImage src={selectedClient.logo_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {selectedClient.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate">{selectedClient.name}</span>
              </>
            ) : (
              <>
                <Building2 className="h-3.5 w-3.5" />
                Cliente
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filtrar por cliente</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {selectedClientId && (
            <>
              <DropdownMenuItem onClick={() => onClientChange(null)}>
                <X className="h-4 w-4 mr-2" />
                Todos los clientes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {loading ? (
            <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
          ) : clients.length === 0 ? (
            <DropdownMenuItem disabled>No hay clientes</DropdownMenuItem>
          ) : (
            clients.map(client => (
              <DropdownMenuItem
                key={client.id}
                onClick={() => onClientChange(client.id)}
                className={cn(selectedClientId === client.id && "bg-accent")}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={client.logo_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {client.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{client.name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters button */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpiar
        </Button>
      )}

      {/* Active filter badges */}
      {hasActiveFilter && (
        <div className="flex items-center gap-1 ml-2">
          {selectedCreator && (
            <Badge variant="secondary" className="text-xs gap-1">
              <User className="h-3 w-3" />
              {selectedCreator.full_name}
              <button
                onClick={() => onCreatorChange(null)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedClient && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Building2 className="h-3 w-3" />
              {selectedClient.name}
              <button
                onClick={() => onClientChange(null)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
});
