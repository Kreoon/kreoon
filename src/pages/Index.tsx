import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ContentCard, ContentStatus } from "@/components/dashboard/ContentCard";
import { KanbanColumn } from "@/components/dashboard/KanbanColumn";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TopCreators } from "@/components/dashboard/TopCreators";
import { Video, Users, CheckCircle, Clock, Search, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentItem {
  id: string;
  title: string;
  client: string;
  creator?: string;
  editor?: string;
  dueDate: string;
  status: ContentStatus;
  priority: "alta" | "media" | "baja";
}

const contentItems: ContentItem[] = [
  { id: "1", title: "Video Producto Skincare", client: "BeautyBrand Co", creator: "María García", dueDate: "20 Dic", status: "pendiente", priority: "alta" },
  { id: "2", title: "Campaña Navidad 2024", client: "TechStore", creator: "Carlos López", dueDate: "22 Dic", status: "pendiente", priority: "media" },
  { id: "3", title: "Review Tech Gadgets", client: "GadgetWorld", creator: "Ana Martínez", editor: "Pedro Ruiz", dueDate: "18 Dic", status: "en_progreso", priority: "alta" },
  { id: "4", title: "Tutorial Maquillaje", client: "Cosmetics Plus", creator: "Laura Sánchez", editor: "Miguel Torres", dueDate: "19 Dic", status: "en_progreso", priority: "media" },
  { id: "5", title: "Unboxing Electrónicos", client: "ElectroShop", creator: "Diego Herrera", dueDate: "17 Dic", status: "revision", priority: "alta" },
  { id: "6", title: "Promoción Black Friday", client: "MegaStore", creator: "Sofía Ramírez", dueDate: "15 Dic", status: "completado", priority: "baja" },
  { id: "7", title: "Video Lifestyle Fitness", client: "FitLife Gym", creator: "Juan Méndez", dueDate: "14 Dic", status: "completado", priority: "media" },
];

const getItemsByStatus = (status: ContentStatus) => 
  contentItems.filter(item => item.status === status);

const Index = () => {
  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Bienvenido de vuelta, gestiona tu contenido</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar contenido..."
                  className="h-10 w-64 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
              
              <Button variant="glow" className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Proyecto
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard 
              title="Videos Activos" 
              value={12} 
              icon={<Video className="h-6 w-6" />}
              trend={8}
              trendLabel="vs. mes anterior"
            />
            <StatsCard 
              title="Creadores" 
              value={8} 
              icon={<Users className="h-6 w-6" />}
              trend={2}
              trendLabel="nuevos"
            />
            <StatsCard 
              title="Completados" 
              value={47} 
              icon={<CheckCircle className="h-6 w-6" />}
              trend={15}
              trendLabel="este mes"
            />
            <StatsCard 
              title="En Proceso" 
              value={5} 
              icon={<Clock className="h-6 w-6" />}
              trend={-3}
              trendLabel="vs. semana"
            />
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Kanban Board */}
            <div className="xl:col-span-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-card-foreground">Tablero de Contenido</h2>
                  <Button variant="outline" size="sm">
                    Ver todo
                  </Button>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-2">
                  <KanbanColumn 
                    title="Pendiente" 
                    count={getItemsByStatus("pendiente").length}
                    color="bg-muted-foreground"
                  >
                    {getItemsByStatus("pendiente").map(item => (
                      <ContentCard key={item.id} {...item} />
                    ))}
                  </KanbanColumn>

                  <KanbanColumn 
                    title="En Progreso" 
                    count={getItemsByStatus("en_progreso").length}
                    color="bg-info"
                  >
                    {getItemsByStatus("en_progreso").map(item => (
                      <ContentCard key={item.id} {...item} />
                    ))}
                  </KanbanColumn>

                  <KanbanColumn 
                    title="En Revisión" 
                    count={getItemsByStatus("revision").length}
                    color="bg-warning"
                  >
                    {getItemsByStatus("revision").map(item => (
                      <ContentCard key={item.id} {...item} />
                    ))}
                  </KanbanColumn>

                  <KanbanColumn 
                    title="Completado" 
                    count={getItemsByStatus("completado").length}
                    color="bg-success"
                  >
                    {getItemsByStatus("completado").map(item => (
                      <ContentCard key={item.id} {...item} />
                    ))}
                  </KanbanColumn>
                </div>
              </div>
            </div>

            {/* Sidebar Widgets */}
            <div className="space-y-6">
              <TopCreators />
              <RecentActivity />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
