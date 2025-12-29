import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Bell, Shield, Palette, Globe, ChevronLeft, Lock, Users, Share2, Crown, CreditCard, Trash2, HelpCircle, Coins, History, Settings2, ShieldCheck, Cog, Building2, UserCog, Landmark, Star, Receipt } from "lucide-react";
import { PageHeader } from '@/components/layout/PageHeader';
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
import { AppSettingsManagement } from "@/components/settings/AppSettingsManagement";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PlatformSecurityPanel } from "@/components/settings/PlatformSecurityPanel";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { OrganizationManagement } from "@/components/settings/OrganizationManagement";
import { OrganizationRegistrations } from "@/components/settings/OrganizationRegistrations";
import { PlatformUsersManagement } from "@/components/settings/PlatformUsersManagement";
import { AmbassadorDashboard } from "@/components/ambassador";
import { ChatNotificationsSettings } from "@/components/settings/ChatNotificationsSettings";
import { PortfolioAISettings } from "@/components/settings/PortfolioAISettings";
import { BillingControlPanel } from "@/components/settings/BillingControlPanel";

import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { useOrgOwner } from "@/hooks/useOrgOwner";
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

type SettingsSection = 'main' | 'perfil' | 'notificaciones' | 'seguridad' | 'seguridad-plataforma' | 'apariencia' | 'integraciones' | 'permisos' | 'usuarios-plataforma' | 'referidos' | 'planes' | 'gestion-usuarios' | 'root-admin' | 'tour' | 'monedas' | 'historial' | 'app-settings' | 'mi-organizacion' | 'gestion-orgs' | 'embajadores' | 'chat-notificaciones' | 'portfolio-ai' | 'facturacion';

interface SettingsSectionItem {
  id: SettingsSection;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

// Base sections available to all users
const baseSections: SettingsSectionItem[] = [
  { 
    id: 'perfil',
    icon: User, 
    title: "Perfil", 
    description: "Gestiona tu información personal y preferencias de cuenta",
  },
  { 
    id: 'notificaciones',
    icon: Bell, 
    title: "Notificaciones", 
    description: "Configura cómo y cuándo recibir alertas",
  },
  { 
    id: 'seguridad',
    icon: Shield, 
    title: "Mi Seguridad", 
    description: "Contraseña, 2FA y seguridad de tu cuenta",
  },
  { 
    id: 'tour',
    icon: HelpCircle, 
    title: "Tour Guiado", 
    description: "Vuelve a ver el tour de introducción a la plataforma",
  },
];

// Sections for organization level (org owners and admins see these)
const orgLevelSections: SettingsSectionItem[] = [
  { 
    id: 'mi-organizacion',
    icon: Building2, 
    title: "Mi Organización", 
    description: "Datos y configuración de tu organización",
  },
  { 
    id: 'chat-notificaciones',
    icon: Bell, 
    title: "Chat & Notificaciones", 
    description: "Configura chat RBAC, notificaciones y asistente IA",
  },
  { 
    id: 'embajadores',
    icon: Star, 
    title: "Sistema de Embajadores", 
    description: "Gestiona embajadores, comisiones y referidos",
  },
  { 
    id: 'portfolio-ai',
    icon: Sparkles, 
    title: "IA de Portfolio", 
    description: "Configura IA para el módulo de red social",
  },
  { 
    id: 'historial',
    icon: History, 
    title: "Historial de Actividad", 
    description: "Ver registro de acciones en tu organización",
  },
];

// Sections ONLY for platform root admin - PLATFORM LEVEL
const platformRootSections: SettingsSectionItem[] = [
  { 
    id: 'gestion-orgs',
    icon: Landmark,
    title: "Gestión de Organizaciones",
    description: "Administra todas las organizaciones y asigna propietarios",
  },
  { 
    id: 'usuarios-plataforma',
    icon: Users,
    title: "Usuarios de Plataforma",
    description: "Gestiona usuarios, asigna a organizaciones y control total",
  },
  { 
    id: 'referidos',
    icon: Share2, 
    title: "Sistema de Referidos", 
    description: "Gestiona sistema de referidos de la plataforma",
  },
  {
    id: 'permisos',
    icon: Lock, 
    title: "Permisos Globales", 
    description: "Gestiona los permisos de acceso para cada rol",
  },
  { 
    id: 'planes',
    icon: Crown, 
    title: "Planes y Comisiones", 
    description: "Gestiona planes de suscripción y comisiones",
  },
  { 
    id: 'gestion-usuarios',
    icon: CreditCard, 
    title: "Facturación de Usuarios", 
    description: "Asigna planes y cobra a usuarios",
  },
  { 
    id: 'monedas',
    icon: Coins, 
    title: "Monedas y Cambios", 
    description: "Gestiona tasas de cambio y transferencias USD/COP",
  },
  { 
    id: 'app-settings',
    icon: Settings2, 
    title: "Configuración de App", 
    description: "WhatsApp de empresa y otras configuraciones globales",
  },
  { 
    id: 'seguridad-plataforma',
    icon: ShieldCheck, 
    title: "Seguridad Plataforma", 
    description: "Políticas de seguridad y gestión global de usuarios",
  },
  { 
    id: 'apariencia',
    icon: Palette, 
    title: "Apariencia", 
    description: "Tema, colores y personalización visual",
  },
  { 
    id: 'integraciones',
    icon: Globe, 
    title: "Integraciones", 
    description: "Conecta con otras plataformas y servicios",
  },
  { 
    id: 'facturacion',
    icon: Receipt, 
    title: "Control de Facturación", 
    description: "Activa/desactiva el sistema de cobros y trials",
  },
  {
    id: 'root-admin',
    icon: Trash2,
    title: "Eliminar Entidades",
    description: "Elimina cualquier cosa de la plataforma",
  }
];

const Settings = () => {
  const { isAdmin, isClient, profile } = useAuth();
  const { resetTour } = useTour();
  const { isOrgOwner, isPlatformRoot, loading: orgLoading } = useOrgOwner();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');

  // Build sections dynamically based on role
  const visibleSections = (() => {
    const sections = [...baseSections];
    
    if (isPlatformRoot) {
      // Platform root sees platform-level management + org sections for context
      sections.push(...orgLevelSections);
      sections.push(...platformRootSections);
    } else if (isOrgOwner || isAdmin) {
      // Org owners and admins see their org management
      sections.push(...orgLevelSections);
    }
    
    // Hide some sections from clients
    if (isClient) {
      return sections.filter(s => !['apariencia'].includes(s.id));
    }
    
    return sections;
  })();

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
      case 'mi-organizacion':
        return <OrganizationManagement />;
      case 'embajadores':
        return <AmbassadorDashboard />;
      case 'chat-notificaciones':
        return <ChatNotificationsSettings />;
      case 'portfolio-ai':
        return <PortfolioAISettings />;
      case 'gestion-orgs':
        return <OrganizationRegistrations />;
      case 'usuarios-plataforma':
        return <PlatformUsersManagement />;
      case 'app-settings':
        return <AppSettingsManagement />;
      case 'gestion-usuarios':
        return <UserPlansManagement />;
      case 'notificaciones':
        return <NotificationSettings />;
      case 'seguridad':
        return <SecuritySettings />;
      case 'seguridad-plataforma':
        return <PlatformSecurityPanel />;
      case 'apariencia':
        return <AppearanceSettings />;
      case 'integraciones':
        return <IntegrationsSettings />;
      case 'root-admin':
        return <RootAdminPanel />;
      case 'tour':
        return <TourSection onStartTour={() => { resetTour(); setActiveSection('main'); }} />;
      case 'facturacion':
        return <BillingControlPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={Cog}
          title="Configuración"
          subtitle="Configura tu cuenta y organización"
          action={activeSection !== 'main' ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveSection('main')}
              className="gap-2 font-medieval"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </Button>
          ) : undefined}
        />
      </div>
      
      <div className="flex">
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
