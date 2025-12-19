import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Building2, Video, Calendar, Trash2, Users, Mail, Phone, MapPin, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
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
}

interface ClientUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  linked_client: Client | null;
}

const Clients = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
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

  const fetchClients = async () => {
    setLoading(true);
    try {
      // Fetch company clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      // Fetch users with client role
      const { data: clientRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      const clientUserIds = clientRoles?.map(r => r.user_id) || [];

      let clientUsersList: ClientUser[] = [];
      
      if (clientUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientUserIds)
          .order('full_name');

        if (profilesData) {
          // Map profiles to client users
          clientUsersList = profilesData.map(p => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            avatar_url: p.avatar_url,
            phone: p.phone,
            city: p.city,
            created_at: p.created_at || '',
            linked_client: clientsData?.find(c => c.user_id === p.id) ? {
              id: clientsData.find(c => c.user_id === p.id)!.id,
              name: clientsData.find(c => c.user_id === p.id)!.name,
              logo_url: clientsData.find(c => c.user_id === p.id)!.logo_url,
              contact_email: clientsData.find(c => c.user_id === p.id)!.contact_email,
              contact_phone: clientsData.find(c => c.user_id === p.id)!.contact_phone,
              notes: clientsData.find(c => c.user_id === p.id)!.notes,
              created_at: clientsData.find(c => c.user_id === p.id)!.created_at || '',
              content_count: 0,
              active_projects: 0,
              user_id: p.id
            } : null
          }));
        }
      }

      setClientUsers(clientUsersList);

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
        user_id: c.user_id
      }));

      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

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
          notes: newClientData.notes || null
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

  const handleLinkClientToUser = async (userId: string, clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ user_id: userId })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Vinculado",
        description: "Cliente vinculado al usuario exitosamente"
      });

      fetchClients();
      setSelectedClientUser(null);
    } catch (error) {
      console.error('Error linking client:', error);
      toast({
        title: "Error",
        description: "No se pudo vincular el cliente",
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
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6 gap-2">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground">Clientes</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Gestiona las marcas y clientes</p>
            </div>
            
            {isAdmin && (
              <Button 
                variant="glow" 
                size="sm" 
                className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0"
                onClick={() => setNewClientOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6">
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
                    onClick={() => setNewClientOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera empresa
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredClients.map((client) => (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {client.logo_url ? (
                        <img 
                          src={client.logo_url} 
                          alt={client.name}
                          className="h-14 w-14 rounded-lg object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-border">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground truncate">{client.name}</h3>
                        {client.contact_email && (
                          <p className="text-xs text-muted-foreground truncate">{client.contact_email}</p>
                        )}
                        {client.user_id && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <UserCircle className="h-3 w-3 mr-1" />
                            Vinculado
                          </Badge>
                        )}
                      </div>

                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
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
                                onClick={() => handleDelete(client.id, client.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold text-card-foreground">{client.active_projects}</p>
                          <p className="text-xs text-muted-foreground">Proyectos activos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold text-card-foreground">{client.content_count}</p>
                          <p className="text-xs text-muted-foreground">Videos totales</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-border text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Desde: {formatDate(client.created_at)}</span>
                    </div>
                  </div>
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
                        {user.linked_client ? (
                          <Badge className="mt-1 text-xs bg-green-500/20 text-green-600 border-green-500/30">
                            <Building2 className="h-3 w-3 mr-1" />
                            {user.linked_client.name}
                          </Badge>
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

              {selectedClientUser.linked_client ? (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
                    <Building2 className="h-4 w-4" />
                    Empresa vinculada
                  </div>
                  <p className="text-sm">{selectedClientUser.linked_client.name}</p>
                </div>
              ) : (
                isAdmin && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Este usuario no tiene una empresa vinculada. Selecciona una empresa para vincular:
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {clients.filter(c => !c.user_id).map(client => (
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
                    {clients.filter(c => !c.user_id).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Todas las empresas ya están vinculadas
                      </p>
                    )}
                  </div>
                )
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
    </>
  );
};

export default Clients;
