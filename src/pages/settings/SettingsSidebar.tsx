import { memo, useMemo } from 'react';
import { 
  User, Bell, Shield, HelpCircle, Building2, Crown, Star, Sparkles, History,
  Landmark, Users, Share2, Lock, CreditCard, Coins, Settings2, ShieldCheck,
  Palette, Globe, Receipt, Trash2, Bot, UserCog, ChevronRight, LockKeyhole
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsPermissions, SettingsSectionKey } from '@/hooks/useSettingsPermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionItem {
  key: SettingsSectionKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface SectionGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: SectionItem[];
}

// All section definitions with better grouping
const ALL_SECTIONS: SectionGroup[] = [
  {
    id: 'user',
    title: 'Mi Cuenta',
    description: 'Configuración personal',
    icon: User,
    sections: [
      { key: 'profile', icon: User, title: 'Perfil', description: 'Información personal' },
      { key: 'notifications', icon: Bell, title: 'Notificaciones', description: 'Alertas y avisos' },
      { key: 'security', icon: Shield, title: 'Seguridad', description: 'Contraseña y 2FA' },
      { key: 'tour', icon: HelpCircle, title: 'Tour Guiado', description: 'Introducción' },
    ],
  },
  {
    id: 'organization',
    title: 'Organización',
    description: 'Ajustes de tu empresa',
    icon: Building2,
    sections: [
      { key: 'organization', icon: Building2, title: 'Datos', description: 'Info de organización' },
      { key: 'organization_plans', icon: Crown, title: 'Plan', description: 'Suscripción activa' },
      { key: 'chat_notifications', icon: Bell, title: 'Chat', description: 'RBAC y asistente' },
      { key: 'ambassadors', icon: Star, title: 'Embajadores', description: 'Red de referidos' },
      { key: 'portfolio_ai', icon: Sparkles, title: 'Portfolio IA', description: 'Red social IA' },
      { key: 'organization_ai', icon: Bot, title: 'Modelos IA', description: 'Proveedores' },
      { key: 'organization_permissions', icon: UserCog, title: 'Permisos', description: 'Por rol' },
      { key: 'audit_log', icon: History, title: 'Historial', description: 'Actividad' },
    ],
  },
  {
    id: 'platform',
    title: 'Plataforma',
    description: 'Administración global',
    icon: Settings2,
    sections: [
      { key: 'organization_registrations', icon: Landmark, title: 'Organizaciones', description: 'Gestionar' },
      { key: 'platform_users', icon: Users, title: 'Usuarios', description: 'Todos' },
      { key: 'referrals', icon: Share2, title: 'Referidos', description: 'Sistema' },
      { key: 'global_permissions', icon: Lock, title: 'Permisos', description: 'Globales' },
      { key: 'subscription_management', icon: Crown, title: 'Planes', description: 'Gestionar' },
      { key: 'user_plans', icon: CreditCard, title: 'Facturación', description: 'Usuarios' },
      { key: 'currency', icon: Coins, title: 'Monedas', description: 'Tasas' },
      { key: 'app_settings', icon: Settings2, title: 'Ajustes', description: 'Globales' },
      { key: 'platform_security', icon: ShieldCheck, title: 'Seguridad', description: 'Plataforma' },
      { key: 'appearance', icon: Palette, title: 'Apariencia', description: 'Tema' },
      { key: 'integrations', icon: Globe, title: 'Integraciones', description: 'Externas' },
      { key: 'billing_control', icon: Receipt, title: 'Cobros', description: 'Activar' },
      { key: 'root_admin', icon: Trash2, title: 'Eliminar', description: 'Datos' },
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
      if (group.id === 'platform' && !permissions.isPlatformRoot) {
        return false;
      }
      if (group.id === 'organization' && !permissions.isOrgOwner && !permissions.isOrgAdmin && !permissions.isPlatformRoot) {
        return false;
      }
      return true;
    });
  }, [permissions]);

  // Cards variant for mobile
  if (variant === 'cards') {
    return (
      <div className="space-y-6">
        {visibleGroups.map((group, groupIndex) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <group.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{group.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {group.sections.map((section, idx) => {
                  const canAccess = section.permission.canAccess;
                  
                  return (
                    <button 
                      key={section.key}
                      onClick={() => canAccess && onSectionChange(section.key)}
                      disabled={!canAccess}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                        canAccess 
                          ? "hover:bg-muted/50 active:bg-muted" 
                          : "opacity-50 cursor-not-allowed bg-muted/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md",
                          canAccess ? "bg-muted" : "bg-muted/50"
                        )}>
                          {canAccess ? (
                            <section.icon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <LockKeyhole className="h-4 w-4 text-muted-foreground/50" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium block">{section.title}</span>
                          <span className="text-xs text-muted-foreground">{section.description}</span>
                        </div>
                      </div>
                      {canAccess ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Bloqueado
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Nav variant for desktop sidebar
  return (
    <TooltipProvider>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <nav className="space-y-6 pr-2">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.id}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <group.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {group.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {group.description}
                  </p>
                </div>
              </div>
              
              {/* Section items */}
              <div className="space-y-0.5 bg-muted/30 rounded-lg p-1">
                {group.sections.map((section, idx) => {
                  const canAccess = section.permission.canAccess;
                  const isActive = activeSection === section.key;
                  
                  const button = (
                    <button
                      key={section.key}
                      onClick={() => canAccess && onSectionChange(section.key)}
                      disabled={!canAccess}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all text-sm",
                        isActive && canAccess
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : canAccess
                            ? 'text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm'
                            : 'text-muted-foreground/40 cursor-not-allowed'
                      )}
                    >
                      {canAccess ? (
                        <section.icon className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      ) : (
                        <LockKeyhole className="h-4 w-4 shrink-0" />
                      )}
                      <span className="font-medium truncate">{section.title}</span>
                    </button>
                  );

                  if (!canAccess && section.permission.reason) {
                    return (
                      <Tooltip key={section.key}>
                        <TooltipTrigger asChild>
                          {button}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <p className="text-xs">{section.permission.reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return button;
                })}
              </div>
              
              {/* Separator between groups */}
              {groupIndex < visibleGroups.length - 1 && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </TooltipProvider>
  );
});

SettingsSidebar.displayName = 'SettingsSidebar';
