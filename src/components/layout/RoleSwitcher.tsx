import { useAuth } from "@/hooks/useAuth";
import { AppRole } from "@/types/database";
import { getRoleLabel, ROLE_SOLID_COLORS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Shield, Users, Edit3, Building2, Star, Lightbulb } from "lucide-react";
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

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full px-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Cambiar Rol"
          >
            <ActiveIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {roles.map((role) => {
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
          className="w-full justify-between text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <ActiveIcon className="h-4 w-4" />
            <span className="text-xs">
              {activeRole ? getRoleLabel(activeRole) : 'Seleccionar Rol'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Cambiar vista de rol
        </div>
        {roles.map((role) => {
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
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md",
                ROLE_SOLID_COLORS[role]
              )}>
                <Icon className="h-3 w-3 text-white" />
              </div>
              <span className="flex-1">{getRoleLabel(role)}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
