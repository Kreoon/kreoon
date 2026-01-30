import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Building2, Video, Calendar, Trash2, Users, Mail, Phone, MapPin, UserCircle, Crown, Shield, Eye, Castle, Medal, UserCog, Lightbulb } from "lucide-react";
import { UnassignedClientUsersAlert } from "@/components/clients/UnassignedClientUsersAlert";
import { PageHeader } from "@/components/layout/PageHeader";
import { VipBadge } from "@/components/ui/vip-badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useTrialGuard } from "@/hooks/useTrialGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
import { ClientUsersDialog } from "@/components/clients/ClientUsersDialog";
import { AssignStrategistsDialog } from "@/components/clients/AssignStrategistsDialog";
import { ClientCard } from "@/components/clients/ClientCard";
import { ClientServicesDialog } from "@/components/clients/ClientServicesDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ClientUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  linked_clients: Array<{ id: string; name: string; role: string }>;
}

interface UnassignedUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

const Clients = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { isPlatformRoot, currentOrgId, currentOrgName, loading: orgLoading } = useOrgOwner();
  const { guardAction, isReadOnly } = useTrialGuard();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [unassignedClientUsers, setUnassignedClientUsers] = useState<UnassignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientUser, setSelectedClientUser] = useState<ClientUser | null>(null);
  const [activeTab, setActiveTab] = useState("companies");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [clientUsersDialogOpen, setClientUsersDialogOpen] = useState(false);
  const [selectedClientForUsers, setSelectedClientForUsers] = useState<Client | null>(null);
  const [strategistsDialogOpen, setStrategistsDialogOpen] = useState(false);
  const [selectedClientForStrategists, setSelectedClientForStrategists] = useState<Client | null>(null);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [selectedClientForServices, setSelectedClientForServices] = useState<Client | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    // Clear previous org data immediately to avoid "bleed" while loading
    setClients([]);
    setClientUsers([]);
    setUnassignedClientUsers([]);

    try {
      // Fetch company clients - always scoped to selected organization (including for root)
      let clientsQuery = supabase
        .from('clients')
        .select('*')
        .order('name');

      if (currentOrgId) {
        clientsQuery = clientsQuery.eq('organization_id', currentOrgId);
      }

      const { data: clientsData } = await clientsQuery;

      const clientIds = (clientsData || []).map((c) => c.id);

      // Fetch client_users associations ONLY for clients in this organization
      const { data: clientUsersAssociations } = clientIds.length
        ? await supabase
            .from('client_users')
            .select('client_id, user_id, role')
            .in('client_id', clientIds)
        : { data: [] as Array<{ client_id: string; user_id: string; role: string | null }> };

      // Build client users list ONLY from the users linked to those org clients
      const clientUserIds = Array.from(
        new Set((clientUsersAssociations || []).map((a) => a.user_id))
      );

      let clientUsersList: ClientUser[] = [];

      if (clientUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientUserIds)
          .order('full_name');

        if (profilesData) {
          clientUsersList = profilesData.map((p) => {
            const userAssociations =
              clientUsersAssociations?.filter((a) => a.user_id === p.id) || [];

            const linkedClients = userAssociations
              .map((a) => {
                const client = clientsData?.find((c) => c.id === a.client_id);
                return client
                  ? { id: client.id, name: client.name, role: a.role || 'viewer' }
                  : null;
              })
              .filter(Boolean) as Array<{ id: string; name: string; role: string }>;

            return {
              id: p.id,
              full_name: p.full_name,
              email: p.email,
              avatar_url: p.avatar_url,
              phone: p.phone,
              city: p.city,
              created_at: p.created_at || '',
              linked_clients: linkedClients,
            };
          });
        }
      }

      setClientUsers(clientUsersList);

      // Fetch users with "client" role in organization who are NOT linked to any company
      if (currentOrgId) {
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', currentOrgId)
          .eq('role', 'client');

        if (orgMembers && orgMembers.length > 0) {
          const orgClientUserIds = orgMembers.map(m => m.user_id);
          
          // Filter out users who already have a client_users association
          const unassignedUserIds = orgClientUserIds.filter(
            uid => !clientUserIds.includes(uid)
          );

          if (unassignedUserIds.length > 0) {
            const { data: unassignedProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .in('id', unassignedUserIds)
              .order('full_name');

            setUnassignedClientUsers(unassignedProfiles || []);
          }
        }
      }

      if (!clientsData?.length) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Get content counts per client
      const { data: contentData } = await supabase
        .from('content')
        .select('client_id, status');

      const countMap = new Map<string, { total: number; active: number }>();
      contentData?.forEach(c => {
        if (c.client_id) {
          const current = countMap.get(c.client_id) || { total: 0, active: 0 };
          current.total++;
          if (!['approved', 'paid'].includes(c.status || '')) {
            current.active++;
          }
          countMap.set(c.client_id, current);
        }
      });

      // Count users per client
      const usersCountMap = new Map<string, number>();
      clientUsersAssociations?.forEach(a => {
        const count = usersCountMap.get(a.client_id) || 0;
        usersCountMap.set(a.client_id, count + 1);
      });

      const clientsList: Client[] = clientsData.map(c => ({
        id: c.id,
        name: c.name,
        logo_url: c.logo_url,
        contact_email: c.contact_email,
        contact_phone: c.contact_phone,
        notes: c.notes,
        created_at: c.created_at || '',
        content_count: countMap.get(c.id)?.total || 0,
        active_projects: countMap.get(c.id)?.active || 0,
        user_id: c.user_id,
        users_count: usersCountMap.get(c.id) || 0,
        is_vip: c.is_vip ?? false,
        username: c.username,
        is_internal_brand: c.is_internal_brand ?? false
      }));

      // Sort: internal brand first, then by name
      clientsList.sort((a, b) => {
        if (a.is_internal_brand && !b.is_internal_brand) return -1;
        if (!a.is_internal_brand && b.is_internal_brand) return 1;
        return a.name.localeCompare(b.name);
      });

      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgLoading) return;
    fetchClients();
  }, [isPlatformRoot, currentOrgId, orgLoading]);

  const handleDelete = async (clientId: string, clientName: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Cliente eliminado",
        description: `${clientName} ha sido eliminado`
      });

      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Puede que tenga proyectos asociados.",
        variant: "destructive"
      });
    }
  };

  const handleCreateClient = async () => {
    // Check trial status before creating
    if (isReadOnly) {
      guardAction(() => {});
      return;
    }
    
    if (!newClientData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del cliente es requerido",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          name: newClientData.name,
          contact_email: newClientData.contact_email || null,
          contact_phone: newClientData.contact_phone || null,
          notes: newClientData.notes || null,
          organization_id: currentOrgId,
        });

      if (error) throw error;

      toast({
        title: "Cliente creado",
        description: `${newClientData.name} ha sido creado exitosamente`
      });

      setNewClientOpen(false);
      setNewClientData({ name: "", contact_email: "", contact_phone: "", notes: "" });
      fetchClients();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkClientToUser = async (userId: string, clientId: string, role: string = 'owner') => {
    try {
      const { error } = await supabase
        .from('client_users')
        .insert({
          client_id: clientId,
          user_id: userId,
          role: role
        });

      if (error) throw error;

      toast({
        title: "Vinculado",
        description: "Cliente vinculado al usuario exitosamente"
      });

      fetchClients();
      setSelectedClientUser(null);
    } catch (error: any) {
      console.error('Error linking client:', error);
      if (error.code === '23505') {
        toast({
          title: "Ya vinculado",
          description: "Este usuario ya está vinculado a esta empresa",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo vincular el cliente",
          variant: "destructive"
        });
      }
    }
  };

  const handleUnlinkClientFromUser = async (userId: string, clientId: string) => {
    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('client_id', clientId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Desvinculado",
        description: "Usuario desvinculado de la empresa"
      });

      fetchClients();
      setSelectedClientUser(null);
    } catch (error) {
      console.error('Error unlinking client:', error);
      toast({
        title: "Error",
        description: "No se pudo desvincular el cliente",
        variant: "destructive"
      });
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClientUsers = clientUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    if (!date) return '';
    return format(new Date(date), "d 'de' MMM, yyyy", { locale: es });
  };

  return (
    <>
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          {/* Page Header */}
          <PageHeader
            icon={Castle}
            title="Clientes"
            subtitle="Gestiona empresas y sus representantes"
            action={
              isAdmin && (
                <Button 
                  variant="glow" 
                  size="sm" 
                  className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0 font-medieval"
                  onClick={() => guardAction(() => setNewClientOpen(true))}
                  disabled={isReadOnly}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nuevo Mecenas</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              )
            }
          />

          {isPlatformRoot && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Org actual: {currentOrgName || '—'}</Badge>
              {currentOrgId && <Badge variant="outline" className="font-mono text-xs">{currentOrgId}</Badge>}
            </div>
          )}

          {/* Alert for unassigned client users */}
          {isAdmin && unassignedClientUsers.length > 0 && (
            <UnassignedClientUsersAlert
              unassignedUsers={unassignedClientUsers}
              clients={clients}
              onRefresh={fetchClients}
            />
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="companies" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Empresas</span>
                <Badge variant="secondary" className="ml-1">{clients.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Usuarios Cliente</span>
                <Badge variant="secondary" className="ml-1">{clientUsers.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="mb-4 md:mb-6">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder={activeTab === "companies" ? "Buscar empresas..." : "Buscar usuarios..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 md:h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-40 md:h-48 rounded-xl" />
              ))}
            </div>
          ) : activeTab === "companies" ? (
            /* Companies Tab */
            filteredClients.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Building2 className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">No hay empresas registradas</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => guardAction(() => setNewClientOpen(true))}
                    disabled={isReadOnly}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera empresa
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    isAdmin={isAdmin || false}
                    onSelect={setSelectedClient}
                    onDelete={handleDelete}
                    onOpenUsers={(c) => {
                      setSelectedClientForUsers(c);
                      setClientUsersDialogOpen(true);
                    }}
                    onOpenStrategists={(c) => {
                      setSelectedClientForStrategists(c);
                      setStrategistsDialogOpen(true);
                    }}
                    onOpenServices={(c) => {
                      setSelectedClientForServices(c);
                      setServicesDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            /* Client Users Tab */
            filteredClientUsers.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">No hay usuarios cliente registrados</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Los usuarios que se registren y tengan el rol "cliente" aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredClientUsers.map((user) => (
                  <div 
                    key={user.id}
                    onClick={() => setSelectedClientUser(user)}
                    className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="h-14 w-14 ring-2 ring-border">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {user.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground truncate">{user.full_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {user.linked_clients.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.linked_clients.slice(0, 2).map(c => (
                              <Badge key={c.id} className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                                <Building2 className="h-3 w-3 mr-1" />
                                {c.name}
                              </Badge>
                            ))}
                            {user.linked_clients.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{user.linked_clients.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="mt-1 text-xs text-amber-600 border-amber-500/30">
                            Sin empresa vinculada
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.city && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{user.city}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-border text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Registrado: {formatDate(user.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Client Detail Dialog */}
      <ClientDetailDialog
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
        onUpdate={fetchClients}
      />

      {/* Client User Detail Dialog */}
      <Dialog open={!!selectedClientUser} onOpenChange={(open) => !open && setSelectedClientUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Usuario Cliente</DialogTitle>
          </DialogHeader>
          
          {selectedClientUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={selectedClientUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedClientUser.full_name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedClientUser.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedClientUser.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedClientUser.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClientUser.phone}</span>
                  </div>
                )}
                {selectedClientUser.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClientUser.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Registrado: {formatDate(selectedClientUser.created_at)}</span>
                </div>
              </div>

              {/* Empresas vinculadas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Empresas vinculadas</p>
                  <Badge variant="secondary">{selectedClientUser.linked_clients.length}</Badge>
                </div>
                
                {selectedClientUser.linked_clients.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClientUser.linked_clients.map(c => {
                      const RoleIcon = c.role === 'owner' ? Crown : c.role === 'admin' ? Shield : Eye;
                      return (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{c.name}</span>
                            <Badge variant="secondary" className="text-xs gap-1">
                              <RoleIcon className="h-3 w-3" />
                              {c.role === 'owner' ? 'Propietario' : c.role === 'admin' ? 'Admin' : 'Visor'}
                            </Badge>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleUnlinkClientFromUser(selectedClientUser.id, c.id)}
                            >
                              Desvincular
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Este usuario no tiene empresas vinculadas
                  </p>
                )}
              </div>

              {/* Agregar nueva empresa */}
              {isAdmin && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium">Vincular empresa</p>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {clients
                      .filter(c => !selectedClientUser.linked_clients.some(lc => lc.id === c.id))
                      .map(client => (
                        <Button
                          key={client.id}
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={() => handleLinkClientToUser(selectedClientUser.id, client.id)}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          {client.name}
                        </Button>
                      ))}
                  </div>
                  {clients.filter(c => !selectedClientUser.linked_clients.some(lc => lc.id === c.id)).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No hay más empresas disponibles
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la empresa *</Label>
              <Input
                id="name"
                placeholder="Ej: Empresa XYZ"
                value={newClientData.name}
                onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email de contacto</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@empresa.com"
                value={newClientData.contact_email}
                onChange={(e) => setNewClientData(prev => ({ ...prev, contact_email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto</Label>
              <Input
                id="phone"
                placeholder="+57 300 123 4567"
                value={newClientData.contact_phone}
                onChange={(e) => setNewClientData(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre el cliente..."
                value={newClientData.notes}
                onChange={(e) => setNewClientData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setNewClientOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateClient} disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear Empresa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Users Management Dialog */}
      {selectedClientForUsers && (
        <ClientUsersDialog
          clientId={selectedClientForUsers.id}
          clientName={selectedClientForUsers.name}
          organizationId={currentOrgId}
          open={clientUsersDialogOpen}
          onOpenChange={(open) => {
            setClientUsersDialogOpen(open);
            if (!open) setSelectedClientForUsers(null);
          }}
          onUpdate={fetchClients}
        />
      )}

      {/* Assign Strategists Dialog */}
      {selectedClientForStrategists && currentOrgId && (
        <AssignStrategistsDialog
          open={strategistsDialogOpen}
          onOpenChange={(open) => {
            setStrategistsDialogOpen(open);
            if (!open) setSelectedClientForStrategists(null);
          }}
          clientId={selectedClientForStrategists.id}
          clientName={selectedClientForStrategists.name}
          organizationId={currentOrgId}
          onSuccess={fetchClients}
        />
      )}

      {/* Client Services Dialog */}
      {selectedClientForServices && (
        <ClientServicesDialog
          open={servicesDialogOpen}
          onOpenChange={(open) => {
            setServicesDialogOpen(open);
            if (!open) setSelectedClientForServices(null);
          }}
          clientId={selectedClientForServices.id}
          clientName={selectedClientForServices.name}
          onSuccess={fetchClients}
        />
      )}
    </>
  );
};

export default Clients;
