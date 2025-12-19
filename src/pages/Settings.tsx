import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Bell, Shield, Palette, Globe, ChevronLeft, Lock } from "lucide-react";
import { ProfileEditor } from "@/components/settings/ProfileEditor";
import { PermissionsEditor } from "@/components/settings/PermissionsEditor";
import { useAuth } from "@/hooks/useAuth";

type SettingsSection = 'main' | 'perfil' | 'notificaciones' | 'seguridad' | 'apariencia' | 'integraciones' | 'permisos';

const settingsSections = [
  { 
    id: 'perfil' as const,
    icon: User, 
    title: "Perfil", 
    description: "Gestiona tu información personal y preferencias de cuenta",
    adminOnly: false
  },
  { 
    id: 'permisos' as const,
    icon: Lock, 
    title: "Permisos", 
    description: "Gestiona los permisos de acceso para cada rol",
    adminOnly: true
  },
  { 
    id: 'notificaciones' as const,
    icon: Bell, 
    title: "Notificaciones", 
    description: "Configura cómo y cuándo recibir alertas",
    adminOnly: false
  },
  { 
    id: 'seguridad' as const,
    icon: Shield, 
    title: "Seguridad", 
    description: "Contraseña, autenticación y accesos",
    adminOnly: false
  },
  { 
    id: 'apariencia' as const,
    icon: Palette, 
    title: "Apariencia", 
    description: "Tema, colores y personalización visual",
    adminOnly: false
  },
  { 
    id: 'integraciones' as const,
    icon: Globe, 
    title: "Integraciones", 
    description: "Conecta con otras plataformas y servicios",
    adminOnly: true
  },
];

const Settings = () => {
  const { isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');

  // Filter sections based on user role
  const visibleSections = settingsSections.filter(s => !s.adminOnly || isAdmin);

  const renderContent = () => {
    switch (activeSection) {
      case 'perfil':
        return <ProfileEditor />;
      case 'permisos':
        return <PermissionsEditor />;
      case 'notificaciones':
        return (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Configuración de notificaciones próximamente</p>
          </div>
        );
      case 'seguridad':
        return (
          <div className="p-6 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Configuración de seguridad próximamente</p>
          </div>
        );
      case 'apariencia':
        return (
          <div className="p-6 text-center text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Configuración de apariencia próximamente</p>
          </div>
        );
      case 'integraciones':
        return (
          <div className="p-6 text-center text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Integraciones próximamente</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {activeSection !== 'main' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveSection('main')}
                className="md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg md:text-xl font-bold text-foreground">
                {activeSection === 'main' ? 'Configuración' : visibleSections.find(s => s.id === activeSection)?.title}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                {activeSection === 'main' 
                  ? 'Personaliza tu experiencia en la plataforma'
                  : visibleSections.find(s => s.id === activeSection)?.description
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar for desktop */}
        <aside className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-1">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <section.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {activeSection === 'main' ? (
            // Mobile menu cards
            <div className="md:hidden space-y-3">
              {visibleSections.map((section) => (
                <button 
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <section.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground">{section.title}</h3>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
                </button>
              ))}
            </div>
          ) : (
            // Render active section content
            <div className="max-w-3xl">
              {/* Desktop: Show back button at top */}
              <div className="hidden md:block mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveSection('main')}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver
                </Button>
              </div>
              {renderContent()}
            </div>
          )}

          {/* Desktop: Show profile by default */}
          {activeSection === 'main' && (
            <div className="hidden md:block max-w-3xl">
              <ProfileEditor />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;
