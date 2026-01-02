import { Building2, ChevronDown } from "lucide-react";
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
import { useStrategistClientContext } from "@/contexts/StrategistClientContext";
import { Skeleton } from "@/components/ui/skeleton";

export function StrategistClientSelector() {
  const { clients, selectedClientId, setSelectedClientId, selectedClient, loading } = useStrategistClientContext();

  if (loading) {
    return (
      <div className="px-3 py-2">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
          <Building2 className="h-4 w-4" />
          <span>Sin clientes asignados</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between gap-2 h-auto py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedClient?.logo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {selectedClient?.name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">
                {selectedClient?.name || "Seleccionar cliente"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Mis Clientes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {clients.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => setSelectedClientId(item.client_id)}
              className={selectedClientId === item.client_id ? "bg-accent" : ""}
            >
              <Avatar className="h-5 w-5 mr-2">
                <AvatarImage src={item.client?.logo_url || undefined} />
                <AvatarFallback className="text-xs">
                  {item.client?.name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{item.client?.name}</span>
              {item.is_primary && (
                <span className="ml-auto text-xs text-primary">Principal</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
