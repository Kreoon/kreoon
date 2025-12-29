import { useAuth } from "@/hooks/useAuth";
import { AppRole } from "@/types/database";
import { getRoleLabel, ROLE_SOLID_COLORS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Shield, Users, Edit3, Building2, Star, Lightbulb, User, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  creator: Users,
  editor: Edit3,
  client: Building2,
  ambassador: Star,
  strategist: Lightbulb,
};

// Dashboard routes for each role
const ROLE_DASHBOARDS: Record<AppRole, string> = {
  admin: '/dashboard',
  ambassador: '/dashboard',
  strategist: '/strategist-dashboard',
  creator: '/creator-dashboard',
  editor: '/editor-dashboard',
  client: '/client-dashboard',
};

// Classify roles into personal vs company context
const PERSONAL_ROLES: AppRole[] = ['admin', 'ambassador', 'strategist', 'creator', 'editor'];
const COMPANY_ROLES: AppRole[] = ['client'];

// Role descriptions for better UX
const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Gestión completa de la plataforma',
  ambassador: 'Red de referidos y comisiones',
  strategist: 'Estrategia y planificación de contenido',
  creator: 'Creación de contenido y grabación',
  editor: 'Edición y postproducción',
  client: 'Vista de empresa y aprobaciones',
};

interface RoleSwitcherProps {
  collapsed?: boolean;
}

export function RoleSwitcher({ collapsed = false }: RoleSwitcherProps) {
  const { roles, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();

  // Only show if user has multiple roles
  if (roles.length <= 1) {
    return null;
  }

  const handleRoleChange = (role: AppRole) => {
    setActiveRole(role);
    // Navigate to the appropriate dashboard for the selected role
    const dashboard = ROLE_DASHBOARDS[role] || '/';
    navigate(dashboard);
  };

  const ActiveIcon = activeRole ? ROLE_ICONS[activeRole] : Shield;
  const isClientActive = activeRole === 'client';

  // Separate roles by context
  const personalRoles = roles.filter(r => PERSONAL_ROLES.includes(r));
  const companyRoles = roles.filter(r => COMPANY_ROLES.includes(r));

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full px-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isClientActive && "border-l-2 border-primary"
            )}
            title="Cambiar Rol"
          >
            <ActiveIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {personalRoles.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                Perfil Personal
              </DropdownMenuLabel>
              {personalRoles.map((role) => {
                const Icon = ROLE_ICONS[role];
                const isActive = role === activeRole;
                return (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      isActive && "bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{getRoleLabel(role)}</span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
          
          {companyRoles.length > 0 && (
            <>
              {personalRoles.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                Contexto Empresa
              </DropdownMenuLabel>
              {companyRoles.map((role) => {
                const Icon = ROLE_ICONS[role];
                const isActive = role === activeRole;
                return (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      isActive && "bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{getRoleLabel(role)}</span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-between text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isClientActive && "border-l-2 border-primary bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2">
            {isClientActive ? (
              <Briefcase className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4" />
            )}
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium">
                {activeRole ? getRoleLabel(activeRole) : 'Seleccionar Rol'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isClientActive ? 'Contexto Empresa' : 'Perfil Personal'}
              </span>
            </div>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {/* Personal roles section */}
        {personalRoles.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Perfil Personal</span>
            </DropdownMenuLabel>
            {personalRoles.map((role) => {
              const Icon = ROLE_ICONS[role];
              const isActive = role === activeRole;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer py-2",
                    isActive && "bg-accent"
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    ROLE_SOLID_COLORS[role]
                  )}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{getRoleLabel(role)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
        
        {/* Company roles section */}
        {companyRoles.length > 0 && (
          <>
            {personalRoles.length > 0 && <DropdownMenuSeparator className="my-2" />}
            <DropdownMenuLabel className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Contexto Empresa</span>
            </DropdownMenuLabel>
            {companyRoles.map((role) => {
              const Icon = ROLE_ICONS[role];
              const isActive = role === activeRole;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer py-2",
                    isActive && "bg-primary/10 border-l-2 border-primary"
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    ROLE_SOLID_COLORS[role]
                  )}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{getRoleLabel(role)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
