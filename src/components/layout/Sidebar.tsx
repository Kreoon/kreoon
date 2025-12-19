import { 
  LayoutDashboard, 
  Video, 
  Users, 
  FileText, 
  Building2, 
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  LogOut,
  Kanban
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Contenido", href: "/content", icon: FileText, tourId: "sidebar-content" },
  { name: "Creadores", href: "/creators", icon: Users, tourId: "sidebar-creators" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Clientes", href: "/clients", icon: Building2, tourId: "sidebar-clients" },
  { name: "Equipo", href: "/team", icon: UsersRound, tourId: "sidebar-team" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

const editorNavigation = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard, tourId: "sidebar-dashboard" },
  { name: "Tablero", href: "/board", icon: Kanban, tourId: "sidebar-board" },
  { name: "Contenido", href: "/portfolio", icon: Video, tourId: "sidebar-content" },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles, tourId: "sidebar-scripts" },
  { name: "Configuración", href: "/settings", icon: Settings, tourId: "sidebar-settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, isAdmin, isEditor } = useAuth();

  // Determinar navegación según rol
  const navigation = isEditor && !isAdmin ? editorNavigation : adminNavigation;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">U</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-sidebar-foreground">UGC Colombia</h1>
                <p className="text-xs text-sidebar-foreground/60">Content Agency</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">U</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                data-tour={item.tourId}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary-foreground")} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User & Actions */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && profile && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
              {profile.email}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive",
              collapsed && "px-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar sesión</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "px-2"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
