import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Search, Plus, Wand2 } from "lucide-react";

const Scripts = () => {
  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Guiones con IA</h1>
              <p className="text-sm text-muted-foreground">Crea guiones potenciados con inteligencia artificial</p>
            </div>
            
            <Button variant="glow" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Nuevo Guión IA
            </Button>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* AI Script Generator Card */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <Wand2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Generador de Guiones IA
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crea guiones profesionales basados en investigación de mercado, tendencias y mejores prácticas de UGC.
                  </p>
                  <Button variant="default" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Empezar a Crear
                  </Button>
                </div>
              </div>
            </div>

            {/* Market Research Card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                  <Search className="h-6 w-6 text-info" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    Investigación de Mercado
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analiza tendencias, competencia y audiencia para crear contenido más efectivo.
                  </p>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Investigación
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scripts */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Guiones Recientes</h3>
            
            <div className="space-y-3">
              {[
                { title: "Guión Video Skincare Routine", client: "BeautyBrand Co", date: "Hace 2 días" },
                { title: "Script Unboxing Tech", client: "GadgetWorld", date: "Hace 5 días" },
                { title: "Guión Tutorial Maquillaje", client: "Cosmetics Plus", date: "Hace 1 semana" },
              ].map((script, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{script.title}</p>
                      <p className="text-sm text-muted-foreground">{script.client}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{script.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Scripts;
