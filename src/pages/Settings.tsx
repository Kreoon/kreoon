import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Bell, Shield, Palette, Globe, ChevronLeft, Lock, Users, Share2, Crown, CreditCard, Trash2, HelpCircle, Coins, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileEditor } from "@/components/settings/ProfileEditor";
import { PermissionsEditor } from "@/components/settings/PermissionsEditor";
import { UserManagement } from "@/components/settings/UserManagement";
import { ReferralManagement } from "@/components/settings/ReferralManagement";
import { SubscriptionManagement } from "@/components/settings/SubscriptionManagement";
import { UserPlansManagement } from "@/components/settings/UserPlansManagement";
import { RootAdminPanel } from "@/components/settings/RootAdminPanel";
import { CurrencyManagement } from "@/components/settings/CurrencyManagement";
import { AuditLogPanel } from "@/components/settings/AuditLogPanel";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { Sparkles, Play } from "lucide-react";

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

// Tour section component
function TourSection({ onStartTour }: { onStartTour: () => void }) {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tour Guiado</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            ¿Quieres volver a ver el tour de introducción? Te mostraremos las funcionalidades principales de la plataforma según tu rol.
          </p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button onClick={onStartTour} size="lg" className="gap-2">
          <Play className="h-5 w-5" />
          Iniciar Tour Guiado
        </Button>
      </div>
      
      <div className="mt-8 p-4 rounded-lg bg-muted/50 border max-w-md mx-auto">
        <h3 className="font-medium text-sm text-foreground mb-2">El tour incluye:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Navegación por las secciones principales</li>
          <li>• Funcionalidades específicas de tu rol</li>
          <li>• Tips para aprovechar la plataforma</li>
        </ul>
      </div>
    </div>
  );
}

type SettingsSection = 'main' | 'perfil' | 'notificaciones' | 'seguridad' | 'apariencia' | 'integraciones' | 'permisos' | 'usuarios' | 'referidos' | 'planes' | 'gestion-usuarios' | 'root-admin' | 'tour' | 'monedas' | 'historial';

const settingsSections = [
  { 
    id: 'perfil' as const,
    icon: User, 
    title: "Perfil", 
    description: "Gestiona tu información personal y preferencias de cuenta",
    adminOnly: false,
    rootOnly: false
  },
  { 
    id: 'referidos' as const,
    icon: Share2, 
    title: "Referidos", 
    description: "Refiere usuarios y gana comisiones",
    adminOnly: false,
    rootOnly: false
  },
  { 
    id: 'permisos' as const,
    icon: Lock, 
    title: "Permisos", 
    description: "Gestiona los permisos de acceso para cada rol",
    adminOnly: true,
    rootOnly: false
  },
  { 
    id: 'planes' as const,
    icon: Crown, 
    title: "Planes y Comisiones", 
    description: "Gestiona comisiones de referidos",
    adminOnly: true,
    rootOnly: false
  },
  { 
    id: 'monedas' as const,
    icon: Coins, 
    title: "Monedas", 
    description: "Gestiona tasas de cambio y transferencias USD/COP",
    adminOnly: true,
    rootOnly: false
  },
  { 
    id: 'historial' as const,
    icon: History, 
    title: "Historial de Actividad", 
    description: "Ver registro de todas las acciones en la plataforma",
    adminOnly: true,
    rootOnly: false
  },
  { 
    id: 'gestion-usuarios' as const,
    icon: CreditCard, 
    title: "Gestión de Usuarios y Planes", 
    description: "Asigna planes y cobra a usuarios",
    adminOnly: false,
    rootOnly: true
  },
  { 
    id: 'notificaciones' as const,
    icon: Bell, 
    title: "Notificaciones", 
    description: "Configura cómo y cuándo recibir alertas",
    adminOnly: false,
    rootOnly: false
  },
  { 
    id: 'seguridad' as const,
    icon: Shield, 
    title: "Seguridad", 
    description: "Contraseña, autenticación y accesos",
    adminOnly: false,
    rootOnly: false
  },
  { 
    id: 'apariencia' as const,
    icon: Palette, 
    title: "Apariencia", 
    description: "Tema, colores y personalización visual",
    adminOnly: false,
    rootOnly: false
  },
  { 
    id: 'integraciones' as const,
    icon: Globe, 
    title: "Integraciones", 
    description: "Conecta con otras plataformas y servicios",
    adminOnly: true,
    rootOnly: false
  },
  { 
    id: 'tour' as const,
    icon: HelpCircle, 
    title: "Tour Guiado", 
    description: "Vuelve a ver el tour de introducción a la plataforma",
    adminOnly: false,
    rootOnly: false
  },
];

const Settings = () => {
  const { isAdmin, profile } = useAuth();
  const { resetTour } = useTour();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');

  const isRoot = profile?.email === ROOT_EMAIL;

  // Build sections dynamically - add user management only for root
  const allSections = [
    ...settingsSections,
    ...(isRoot ? [
      {
        id: 'usuarios' as const,
        icon: Users,
        title: "Usuarios",
        description: "Gestiona usuarios, contraseñas y accesos",
        adminOnly: false,
        rootOnly: true
      },
      {
        id: 'root-admin' as const,
        icon: Trash2,
        title: "Eliminar Entidades",
        description: "Elimina cualquier cosa de la plataforma",
        adminOnly: false,
        rootOnly: true
      }
    ] : [])
  ];

  // Filter sections based on user role
  const visibleSections = allSections.filter(s => {
    if (s.rootOnly && !isRoot) return false;
    if (s.adminOnly && !isAdmin) return false;
    return true;
  });

  const renderContent = () => {
    switch (activeSection) {
      case 'perfil':
        return <ProfileEditor />;
      case 'permisos':
        return <PermissionsEditor />;
      case 'referidos':
        return <ReferralManagement />;
      case 'planes':
        return <SubscriptionManagement />;
      case 'monedas':
        return <CurrencyManagement />;
      case 'historial':
        return <AuditLogPanel />;
      case 'gestion-usuarios':
        return <UserPlansManagement />;
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
      case 'usuarios':
        return <UserManagement />;
      case 'root-admin':
        return <RootAdminPanel />;
      case 'tour':
        return <TourSection onStartTour={() => { resetTour(); setActiveSection('main'); }} />;
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
            <div className={cn(activeSection === 'gestion-usuarios' ? 'max-w-6xl' : 'max-w-3xl')}>
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
