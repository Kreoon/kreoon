import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { User, Bell, Shield, Palette, Globe } from "lucide-react";

const settingsSections = [
  { 
    icon: User, 
    title: "Perfil", 
    description: "Gestiona tu información personal y preferencias de cuenta" 
  },
  { 
    icon: Bell, 
    title: "Notificaciones", 
    description: "Configura cómo y cuándo recibir alertas" 
  },
  { 
    icon: Shield, 
    title: "Seguridad", 
    description: "Contraseña, autenticación y accesos" 
  },
  { 
    icon: Palette, 
    title: "Apariencia", 
    description: "Tema, colores y personalización visual" 
  },
  { 
    icon: Globe, 
    title: "Integraciones", 
    description: "Conecta con otras plataformas y servicios" 
  },
];

const Settings = () => {
  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Configuración</h1>
              <p className="text-sm text-muted-foreground">Personaliza tu experiencia en la plataforma</p>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-3xl">
          <div className="space-y-4">
            {settingsSections.map((section) => (
              <div 
                key={section.title}
                className="flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <section.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Configurar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
