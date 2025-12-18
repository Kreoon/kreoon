import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, Grid, List } from "lucide-react";

const Content = () => {
  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestión de Contenido</h1>
              <p className="text-sm text-muted-foreground">Administra todos los videos y proyectos</p>
            </div>
            
            <Button variant="glow" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Video
            </Button>
          </div>
        </header>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar videos..."
                  className="h-10 w-80 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Grid className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Vista completa próximamente
              </h3>
              <p className="text-muted-foreground mb-4">
                Aquí podrás ver todos tus videos en formato de cuadrícula o lista, con filtros avanzados y acciones rápidas.
              </p>
              <Button variant="outline">Volver al Dashboard</Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Content;
