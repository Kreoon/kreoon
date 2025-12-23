import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Search, Plus, Wand2, Scroll } from "lucide-react";
import { MedievalBanner } from "@/components/layout/MedievalBanner";
const Scripts = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for scripts
  const scripts = [
    { title: "Guión Video Skincare Routine", client: "BeautyBrand Co", date: "Hace 2 días" },
    { title: "Script Unboxing Tech", client: "GadgetWorld", date: "Hace 5 días" },
    { title: "Guión Tutorial Maquillaje", client: "Cosmetics Plus", date: "Hace 1 semana" },
  ];

  const filteredScripts = scripts.filter(script =>
    script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    script.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Medieval Banner */}
        <MedievalBanner
          icon={Scroll}
          title="Scriptorium Mágico"
          subtitle="Crea pergaminos con el poder de la magia arcana"
          action={
            <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm font-medieval">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Pergamino</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          }
        />
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar guiones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 md:h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* AI Script Generator Card */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary/20 flex-shrink-0">
                <Wand2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">
                  Generador de Guiones IA
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">
                  Crea guiones profesionales basados en investigación de mercado, tendencias y mejores prácticas de UGC.
                </p>
                <Button variant="default" size="sm" className="gap-2 text-xs md:text-sm">
                  <Sparkles className="h-4 w-4" />
                  Empezar a Crear
                </Button>
              </div>
            </div>
          </div>

          {/* Market Research Card */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-info/10 flex-shrink-0">
                <Search className="h-5 w-5 md:h-6 md:w-6 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-card-foreground mb-2">
                  Investigación de Mercado
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">
                  Analiza tendencias, competencia y audiencia para crear contenido más efectivo.
                </p>
                <Button variant="outline" size="sm" className="gap-2 text-xs md:text-sm">
                  <Plus className="h-4 w-4" />
                  Nueva Investigación
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Scripts */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-card-foreground mb-4">Guiones Recientes</h3>
          
          <div className="space-y-2 md:space-y-3">
            {filteredScripts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No se encontraron guiones</p>
            ) : (
              filteredScripts.map((script, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 md:p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                      <FileText className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm md:text-base font-medium text-card-foreground truncate">{script.title}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{script.client}</p>
                    </div>
                  </div>
                  <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0 ml-2">{script.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scripts;