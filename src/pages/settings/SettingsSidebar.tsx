import { memo, useMemo } from 'react';
import { 
  User, Bell, Shield, HelpCircle, Building2, Crown, Star, Sparkles, History,
  Landmark, Users, Share2, Lock, CreditCard, Coins, Settings2, ShieldCheck,
  Palette, Globe, Receipt, Trash2, Bot, UserCog, ChevronLeft, LockKeyhole
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsPermissions, SettingsSectionKey } from '@/hooks/useSettingsPermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface SectionItem {
  key: SettingsSectionKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface SectionGroup {
  id: string;
  title: string;
  sections: SectionItem[];
}

// All section definitions
const ALL_SECTIONS: SectionGroup[] = [
  {
    id: 'user',
    title: 'Mi Cuenta',
    sections: [
      { key: 'profile', icon: User, title: 'Perfil', description: 'Gestiona tu información personal' },
      { key: 'notifications', icon: Bell, title: 'Notificaciones', description: 'Configura alertas y notificaciones' },
      { key: 'security', icon: Shield, title: 'Seguridad', description: 'Contraseña y 2FA' },
      { key: 'tour', icon: HelpCircle, title: 'Tour Guiado', description: 'Vuelve a ver el tour' },
    ],
  },
  {
    id: 'organization',
    title: 'Organización',
    sections: [
      { key: 'organization', icon: Building2, title: 'Mi Organización', description: 'Datos de la organización' },
      { key: 'organization_plans', icon: Crown, title: 'Plan y Suscripción', description: 'Gestiona tu plan' },
      { key: 'chat_notifications', icon: Bell, title: 'Chat & Notificaciones', description: 'RBAC de chat y asistente IA' },
      { key: 'ambassadors', icon: Star, title: 'Embajadores', description: 'Sistema de embajadores' },
      { key: 'portfolio_ai', icon: Sparkles, title: 'IA de Portfolio', description: 'IA para red social' },
      { key: 'organization_ai', icon: Bot, title: 'IA & Modelos', description: 'Proveedores y módulos IA' },
      { key: 'organization_permissions', icon: UserCog, title: 'Permisos de Org', description: 'Permisos por rol' },
      { key: 'audit_log', icon: History, title: 'Historial', description: 'Registro de actividad' },
    ],
  },
  {
    id: 'platform',
    title: 'Plataforma',
    sections: [
      { key: 'organization_registrations', icon: Landmark, title: 'Organizaciones', description: 'Gestiona organizaciones' },
      { key: 'platform_users', icon: Users, title: 'Usuarios', description: 'Todos los usuarios' },
      { key: 'referrals', icon: Share2, title: 'Referidos', description: 'Sistema de referidos' },
      { key: 'global_permissions', icon: Lock, title: 'Permisos Globales', description: 'Permisos por rol' },
      { key: 'subscription_management', icon: Crown, title: 'Planes', description: 'Planes y comisiones' },
      { key: 'user_plans', icon: CreditCard, title: 'Facturación', description: 'Planes de usuarios' },
      { key: 'currency', icon: Coins, title: 'Monedas', description: 'Tasas de cambio' },
      { key: 'app_settings', icon: Settings2, title: 'Configuración', description: 'Ajustes globales' },
      { key: 'platform_security', icon: ShieldCheck, title: 'Seguridad', description: 'Seguridad de plataforma' },
      { key: 'appearance', icon: Palette, title: 'Apariencia', description: 'Tema y colores' },
      { key: 'integrations', icon: Globe, title: 'Integraciones', description: 'Servicios externos' },
      { key: 'billing_control', icon: Receipt, title: 'Control Facturación', description: 'Activa/desactiva cobros' },
      { key: 'root_admin', icon: Trash2, title: 'Eliminar Entidades', description: 'Borrado de datos' },
    ],
  },
];

interface SettingsSidebarProps {
  activeSection: SettingsSectionKey | null;
  onSectionChange: (section: SettingsSectionKey) => void;
  permissions: SettingsPermissions;
  variant?: 'nav' | 'cards';
}

export const SettingsSidebar = memo(({ 
  activeSection, 
  onSectionChange, 
  permissions,
  variant = 'nav' 
}: SettingsSidebarProps) => {
  // Filter groups based on permissions
  const visibleGroups = useMemo(() => {
    return ALL_SECTIONS.map(group => ({
      ...group,
      sections: group.sections.map(section => ({
        ...section,
        permission: permissions.getPermission(section.key),
      })),
    })).filter(group => {
      // Show group if at least one section is accessible OR if user can see locked items
      if (group.id === 'platform' && !permissions.isPlatformRoot) {
        return false; // Hide entire platform group for non-root
      }
      if (group.id === 'organization' && !permissions.isOrgOwner && !permissions.isOrgAdmin && !permissions.isPlatformRoot) {
        return false; // Hide org group for non-admins
      }
      return true;
    });
  }, [permissions]);

  if (variant === 'cards') {
    return (
      <div className="space-y-6">
        {visibleGroups.map(group => (
          <div key={group.id}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.sections.map(section => {
                const canAccess = section.permission.canAccess;
                
                return (
                  <button 
                    key={section.key}
                    onClick={() => canAccess && onSectionChange(section.key)}
                    disabled={!canAccess}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border bg-card text-left transition-all group",
                      canAccess 
                        ? "hover:border-primary/20 cursor-pointer" 
                        : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                        canAccess 
                          ? "bg-muted group-hover:bg-primary/10" 
                          : "bg-muted/50"
                      )}>
                        {canAccess ? (
                          <section.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        ) : (
                          <LockKeyhole className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-card-foreground">{section.title}</h3>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    {canAccess ? (
                      <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Bloqueado
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <nav className="space-y-6">
        {visibleGroups.map(group => (
          <div key={group.id}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.sections.map(section => {
                const canAccess = section.permission.canAccess;
                const isActive = activeSection === section.key;
                
                const button = (
                  <button
                    key={section.key}
                    onClick={() => canAccess && onSectionChange(section.key)}
                    disabled={!canAccess}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      isActive && canAccess
                        ? 'bg-primary/10 text-primary'
                        : canAccess
                          ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          : 'text-muted-foreground/50 cursor-not-allowed'
                    )}
                  >
                    {canAccess ? (
                      <section.icon className="h-5 w-5" />
                    ) : (
                      <LockKeyhole className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                );

                if (!canAccess && section.permission.reason) {
                  return (
                    <Tooltip key={section.key}>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{section.permission.reason}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </div>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
});

SettingsSidebar.displayName = 'SettingsSidebar';
