import { Building2, ChevronDown, Star, Shield } from "lucide-react";
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
import { useStrategistClientContext } from "@/contexts/StrategistClientContext";
import { Skeleton } from "@/components/ui/skeleton";

export function StrategistCompanySwitcher() {
  const { clients, selectedClientId, setSelectedClientId, selectedClient, loading } = useStrategistClientContext();

  if (loading) {
    return <Skeleton className="h-12 w-64" />;
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 border border-dashed">
        <Building2 className="h-4 w-4" />
        <span>Sin empresas asignadas</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-auto py-2 px-4 gap-3 min-w-[240px] justify-between bg-card hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarImage src={selectedClient?.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {selectedClient?.name?.charAt(0) || "E"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Empresa activa</p>
              <p className="font-medium truncate max-w-[150px]">
                {selectedClient?.name || "Seleccionar"}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Empresas que Gestiono
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clients.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => setSelectedClientId(item.client_id)}
            className={`cursor-pointer py-3 ${
              selectedClientId === item.client_id ? "bg-primary/10" : ""
            }`}
          >
            <Avatar className="h-8 w-8 mr-3">
              <AvatarImage src={item.client?.logo_url || undefined} />
              <AvatarFallback className="text-xs font-semibold">
                {item.client?.name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.client?.name}</p>
              <p className="text-xs text-muted-foreground">
                Rol: Estratega
              </p>
            </div>
            {item.is_primary && (
              <Badge variant="secondary" className="gap-1 ml-2">
                <Star className="h-3 w-3 fill-current" />
                Principal
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
