import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Building2, Video, Calendar, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
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
}

const Clients = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');

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
        active_projects: countMap.get(c.id)?.active || 0
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

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar clientes..."
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
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Building2 className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">No hay clientes registrados</p>
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
                    </div>

                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
          )}
        </div>
      </div>

      <ClientDetailDialog
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
        onUpdate={fetchClients}
      />
    </>
  );
};

export default Clients;
