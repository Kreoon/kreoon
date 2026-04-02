import { memo, useMemo } from 'react';
import {
  User, Bell, Shield, HelpCircle, Building2, History,
  Landmark, Users, Share2, CreditCard, Settings2, ShieldCheck,
  Bot, UserCog, ChevronRight, LockKeyhole, BarChart3, Brain, Store, Paintbrush,
  MessageSquareCode, Palette, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsPermissions, SettingsSectionKey } from '@/hooks/useSettingsPermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

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

// Consolidated section definitions (reduced from 25 to ~15)
const ALL_SECTIONS: SectionGroup[] = [
  {
    id: 'user',
    title: 'Mi Cuenta',
    description: 'Configuración personal',
    icon: User,
    sections: [
      { key: 'profile', icon: User, title: 'Mi Perfil', description: 'Datos y perfil público' },
      { key: 'client_company', icon: Building2, title: 'Mi Empresa', description: 'Datos de tu empresa' },
      { key: 'notifications', icon: Bell, title: 'Notificaciones', description: 'Alertas y preferencias' },
      { key: 'security', icon: Shield, title: 'Seguridad', description: 'Contraseña y 2FA' },
      { key: 'tour', icon: HelpCircle, title: 'Tour Guiado', description: 'Introducción' },
      { key: 'referrals', icon: Share2, title: 'Referidos', description: 'Invitar y ganar' },
    ],
  },
  {
    id: 'organization',
    title: 'Organización',
    description: 'Ajustes de tu empresa',
    icon: Building2,
    sections: [
      { key: 'organization', icon: Building2, title: 'Organización', description: 'Datos, registro y marca' },
      { key: 'ai_settings', icon: Bot, title: 'IA & Modelos', description: 'Proveedores y asistente' },
      { key: 'permissions', icon: UserCog, title: 'Permisos', description: 'Por rol' },
      { key: 'audit_log', icon: History, title: 'Historial', description: 'Actividad' },
      { key: 'org_marketplace', icon: Store, title: 'Marketplace & Portafolio', description: 'Control y portafolio público' },
      { key: 'org_agency_profile', icon: Building2, title: 'Perfil de Agencia', description: 'Perfil público marketplace' },
      { key: 'white_label', icon: Paintbrush, title: 'Marca Blanca', description: 'Dominio y branding' },
      { key: 'org_referrals', icon: Share2, title: 'Referidos Org', description: 'Links y comisiones' },
    ],
  },
  {
    id: 'platform',
    title: 'Plataforma',
    description: 'Administración global',
    icon: Settings2,
    sections: [
      { key: 'organization_registrations', icon: Landmark, title: 'Organizaciones', description: 'Gestionar' },
      { key: 'billing', icon: CreditCard, title: 'Facturación', description: 'Planes y cobros' },
      { key: 'platform_config', icon: Settings2, title: 'Configuración', description: 'Ajustes globales' },
      { key: 'platform_admin', icon: ShieldCheck, title: 'Administración', description: 'Seguridad y datos' },
      { key: 'tracking', icon: BarChart3, title: 'Tracking', description: 'Analytics y píxeles' },
      { key: 'ai_tokenization', icon: Brain, title: 'Tokens IA', description: 'Costos por perfil' },
      { key: 'prompts', icon: MessageSquareCode, title: 'Prompts AI', description: 'Editar prompts' },
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
  const navigate = useNavigate();
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
            <CardHeader className="pb-3 bg-zinc-50 dark:bg-[#1a1a24]">
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
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {group.sections.map((section, idx) => {
                  const canAccess = section.permission.canAccess;
                  
                  return (
                    <button 
                      key={section.key}
                      onClick={() => canAccess && onSectionChange(section.key)}
                      disabled={!canAccess}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150",
                        canAccess
                          ? "hover:bg-zinc-100 dark:hover:bg-[#1a1a24] active:bg-zinc-200 dark:active:bg-zinc-800"
                          : "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
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
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
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
              <div className="space-y-0.5 bg-zinc-50 dark:bg-[#1a1a24] rounded-lg p-1">
                {group.sections.map((section, idx) => {
                  const canAccess = section.permission.canAccess;
                  const isActive = activeSection === section.key;
                  
                  const button = (
                    <button
                      key={section.key}
                      onClick={() => canAccess && onSectionChange(section.key)}
                      disabled={!canAccess}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-150 text-sm",
                        isActive && canAccess
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : canAccess
                            ? 'text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#14141f] hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-sm'
                            : 'text-zinc-400/40 dark:text-zinc-500/40 cursor-not-allowed'
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
