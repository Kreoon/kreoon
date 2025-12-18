import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Search, Plus, Star, Video, TrendingUp } from "lucide-react";

interface Creator {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
  videosCompleted: number;
  rating: number;
  status: "activo" | "ocupado" | "inactivo";
}

const creators: Creator[] = [
  { 
    id: "1", 
    name: "María García", 
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    role: "Creadora UGC",
    email: "maria@ugccolombia.com",
    videosCompleted: 24,
    rating: 4.9,
    status: "activo"
  },
  { 
    id: "2", 
    name: "Carlos López", 
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    role: "Editor Senior",
    email: "carlos@ugccolombia.com",
    videosCompleted: 18,
    rating: 4.8,
    status: "ocupado"
  },
  { 
    id: "3", 
    name: "Ana Martínez", 
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    role: "Creadora UGC",
    email: "ana@ugccolombia.com",
    videosCompleted: 15,
    rating: 4.7,
    status: "activo"
  },
  { 
    id: "4", 
    name: "Pedro Ruiz", 
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    role: "Editor",
    email: "pedro@ugccolombia.com",
    videosCompleted: 12,
    rating: 4.6,
    status: "activo"
  },
];

const statusConfig = {
  activo: { label: "Activo", className: "bg-success/10 text-success" },
  ocupado: { label: "Ocupado", className: "bg-warning/10 text-warning" },
  inactivo: { label: "Inactivo", className: "bg-muted text-muted-foreground" },
};

const Creators = () => {
  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Creadores & Editores</h1>
              <p className="text-sm text-muted-foreground">Gestiona tu equipo de contenido</p>
            </div>
            
            <Button variant="glow" className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar Creador
            </Button>
          </div>
        </header>

        <div className="p-6">
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar creadores..."
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creators.map((creator) => (
              <div 
                key={creator.id}
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <img 
                    src={creator.avatar} 
                    alt={creator.name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
                  />
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[creator.status].className}`}>
                    {statusConfig[creator.status].label}
                  </span>
                </div>

                <h3 className="font-semibold text-card-foreground mb-1">{creator.name}</h3>
                <p className="text-sm text-muted-foreground mb-1">{creator.role}</p>
                <p className="text-xs text-muted-foreground mb-4">{creator.email}</p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-card-foreground">{creator.videosCompleted}</span>
                    <span className="text-xs text-muted-foreground">videos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-medium text-card-foreground">{creator.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Creators;
