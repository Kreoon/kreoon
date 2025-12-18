import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Search, Plus, Building2, Video, Calendar } from "lucide-react";

interface Client {
  id: string;
  name: string;
  logo: string;
  industry: string;
  activeProjects: number;
  totalVideos: number;
  lastActivity: string;
}

const clients: Client[] = [
  { 
    id: "1", 
    name: "BeautyBrand Co", 
    logo: "https://images.unsplash.com/photo-1560472355-536de3962603?w=100&h=100&fit=crop",
    industry: "Cosmética",
    activeProjects: 3,
    totalVideos: 12,
    lastActivity: "Hace 2 horas"
  },
  { 
    id: "2", 
    name: "TechStore", 
    logo: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&h=100&fit=crop",
    industry: "Tecnología",
    activeProjects: 2,
    totalVideos: 8,
    lastActivity: "Hace 1 día"
  },
  { 
    id: "3", 
    name: "FitLife Gym", 
    logo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop",
    industry: "Fitness",
    activeProjects: 1,
    totalVideos: 15,
    lastActivity: "Hace 3 días"
  },
  { 
    id: "4", 
    name: "GadgetWorld", 
    logo: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=100&h=100&fit=crop",
    industry: "Electrónica",
    activeProjects: 2,
    totalVideos: 6,
    lastActivity: "Hace 5 horas"
  },
];

const Clients = () => {
  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">Gestiona las marcas y clientes de la agencia</p>
            </div>
            
            <Button variant="glow" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>
        </header>

        <div className="p-6">
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar clientes..."
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div 
                key={client.id}
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src={client.logo} 
                    alt={client.name}
                    className="h-14 w-14 rounded-lg object-cover ring-1 ring-border"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.industry}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-card-foreground">{client.activeProjects}</p>
                      <p className="text-xs text-muted-foreground">Proyectos activos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-card-foreground">{client.totalVideos}</p>
                      <p className="text-xs text-muted-foreground">Videos totales</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Última actividad: {client.lastActivity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Clients;
