import { useState, useEffect } from "react";
import { Building2, Video, Calendar, Trash2, Users, Medal, UserCog, Lightbulb, Star, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VipBadge } from "@/components/ui/vip-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  content_count: number;
  active_projects: number;
  user_id: string | null;
  users_count: number;
  is_vip: boolean;
  username: string | null;
  is_internal_brand: boolean;
}

interface AssignedStrategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_primary: boolean;
}

interface ClientCardProps {
  client: Client;
  isAdmin: boolean;
  onSelect: (client: Client) => void;
  onDelete: (clientId: string, clientName: string) => void;
  onOpenUsers: (client: Client) => void;
  onOpenStrategists: (client: Client) => void;
  onOpenServices: (client: Client) => void;
}

export function ClientCard({
  client,
  isAdmin,
  onSelect,
  onDelete,
  onOpenUsers,
  onOpenStrategists,
  onOpenServices,
}: ClientCardProps) {
  const [strategists, setStrategists] = useState<AssignedStrategist[]>([]);

  useEffect(() => {
    fetchStrategists();
  }, [client.id]);

  const fetchStrategists = async () => {
    const { data, error } = await supabase
      .from('client_strategists')
      .select('strategist_id, is_primary')
      .eq('client_id', client.id);

if (!error && data?.length) {
      const strategistIds = [...new Set(data.map(d => d.strategist_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', strategistIds);
      const profileMap = new Map((profilesData ?? []).map(p => [p.id, p]));
      const list = data
        .map(d => ({
          id: d.strategist_id,
          full_name: profileMap.get(d.strategist_id)?.full_name || 'Sin nombre',
          avatar_url: profileMap.get(d.strategist_id)?.avatar_url || null,
          is_primary: d.is_primary || false,
        }))
        .filter(s => s.id)
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      setStrategists(list);
    } else {
      setStrategists([]);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  return (
    <div 
      onClick={() => onSelect(client)}
      className={cn(
        "group rounded-xl border p-4 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col h-full",
        client.is_internal_brand 
          ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:border-amber-500" 
          : "border-border bg-card hover:border-primary/20"
      )}
    >
      {/* Header: Logo + Name + Actions */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo */}
        {client.logo_url ? (
          <img 
            src={client.logo_url} 
            alt={client.name}
            className={cn(
              "h-12 w-12 rounded-lg object-cover ring-1 shrink-0",
              client.is_internal_brand ? "ring-amber-500/50" : "ring-border"
            )}
          />
        ) : (
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center ring-1 shrink-0",
            client.is_internal_brand 
              ? "bg-amber-500/20 ring-amber-500/50" 
              : "bg-primary/10 ring-border"
          )}>
            {client.is_internal_brand ? (
              <Medal className="h-5 w-5 text-amber-500" />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>
        )}

        {/* Name & Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-card-foreground truncate text-sm">{client.name}</h3>
            {client.is_vip && <VipBadge size="xs" variant="minimal" />}
            {client.is_internal_brand && (
              <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 px-1.5 py-0">
                Interna
              </Badge>
            )}
          </div>
          {client.contact_email && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{client.contact_email}</p>
          )}
        </div>

        {/* Delete Button */}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a {client.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará permanentemente este cliente. 
                  Asegúrate de que no tenga proyectos activos asociados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(client.id, client.name)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1">
            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm">{client.active_projects}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Proyectos</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1">
            <Video className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm">{client.content_count}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Videos</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm">{client.users_count}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Usuarios</p>
        </div>
      </div>

      {/* Strategists Section - visible to all */}
      <div 
        className="mb-3 p-2.5 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onOpenStrategists(client);
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Estrategas</span>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {strategists.length}
          </Badge>
        </div>
        
        {strategists.length > 0 ? (
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <div className="flex -space-x-2">
                {strategists.slice(0, 4).map((strategist) => (
                  <Tooltip key={strategist.id}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className={cn(
                          "h-7 w-7 border-2 border-card",
                          strategist.is_primary && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                        )}>
                          <AvatarImage src={strategist.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {strategist.full_name?.charAt(0) || "S"}
                          </AvatarFallback>
                        </Avatar>
                        {strategist.is_primary && (
                          <Star className="h-2.5 w-2.5 text-primary fill-primary absolute -top-0.5 -right-0.5" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {strategist.full_name}
                        {strategist.is_primary && " (Principal)"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            {strategists.length > 4 && (
              <span className="text-[10px] text-muted-foreground ml-1">+{strategists.length - 4}</span>
            )}
            <span className="flex-1" />
            <span className="text-[10px] text-primary">Editar</span>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Click para asignar estrategas</p>
        )}
      </div>

      {/* Action Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto">
        <Badge 
          variant="outline" 
          className="text-[10px] cursor-pointer hover:bg-primary/10 px-2 py-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onOpenUsers(client);
          }}
        >
          <Users className="h-3 w-3 mr-1" />
          Usuarios
        </Badge>
        <Badge 
          variant="outline" 
          className="text-[10px] cursor-pointer hover:bg-primary/10 border-primary/30 px-2 py-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onOpenServices(client);
          }}
        >
          <Lightbulb className="h-3 w-3 mr-1" />
          Servicios
        </Badge>
      </div>

      {/* Footer: Date */}
      <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-border text-[10px] text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>Desde {formatDate(client.created_at)}</span>
      </div>
    </div>
  );
}
