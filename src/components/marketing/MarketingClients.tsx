import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Building2, DollarSign, Target, Users, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MarketingClient, SERVICE_TYPES, PLATFORMS } from "./types";
import { AddMarketingClientDialog } from "./AddMarketingClientDialog";
import { EditMarketingClientDialog } from "./EditMarketingClientDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketingClientsProps {
  organizationId: string | null | undefined;
}

export function MarketingClients({ organizationId }: MarketingClientsProps) {
  const [clients, setClients] = useState<MarketingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<MarketingClient | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchClients();
    }
  }, [organizationId]);

  const fetchClients = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('marketing_clients')
        .select(`
          *,
          client:clients(id, name, logo_url, contact_email),
          strategist:profiles!marketing_clients_strategist_id_fkey(id, full_name, avatar_url)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setClients((data || []).map(item => ({
        ...item,
        platforms: item.platforms || [],
        objectives: item.objectives || [],
      })) as unknown as MarketingClient[]);
    } catch (error) {
      console.error('Error fetching marketing clients:', error);
      toast.error('Error al cargar clientes de marketing');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketing_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Cliente eliminado');
      fetchClients();
    } catch (error) {
      console.error('Error deleting marketing client:', error);
      toast.error('Error al eliminar cliente');
    }
  };

  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(s => s.value === type)?.label || type;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-32 mt-2" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Clientes de Marketing</h2>
          <p className="text-sm text-muted-foreground">
            {clients.filter(c => c.is_active).length} clientes activos
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Cliente
        </Button>
      </div>

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Sin clientes de marketing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Agrega clientes para gestionar su estrategia y campañas
            </p>
            <Button onClick={() => setShowAddDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={client.client?.logo_url || undefined} />
                      <AvatarFallback>
                        {client.client?.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {client.client?.name || 'Cliente'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {getServiceTypeLabel(client.service_type)}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingClient(client)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Badge variant={client.is_active ? "default" : "secondary"} className="w-fit mt-2">
                  {client.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Budget */}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatCurrency(client.monthly_budget, client.budget_currency)}
                  </span>
                  <span className="text-muted-foreground">/ mes</span>
                </div>

                {/* Platforms */}
                {client.platforms && client.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.platforms.map((platform) => {
                      const p = PLATFORMS.find(pl => pl.value === platform);
                      return (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {p?.label || platform}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Strategist */}
                {client.strategist && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{client.strategist.full_name}</span>
                  </div>
                )}

                {/* Objectives */}
                {client.objectives && client.objectives.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{client.objectives.length} objetivos</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddMarketingClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        organizationId={organizationId}
        onSuccess={fetchClients}
      />

      {/* Edit Dialog */}
      <EditMarketingClientDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        client={editingClient}
        organizationId={organizationId}
        onSuccess={fetchClients}
      />
    </div>
  );
}
