import { useState } from "react";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  Sparkles,
  Building2, 
  Settings,
  UsersRound,
  LogOut,
  Menu,
  Scissors,
  Star,
  Package,
  Kanban
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tablero", href: "/board", icon: Kanban },
  { name: "Contenido", href: "/content", icon: Video },
  { name: "Creadores", href: "/creators", icon: Users },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles },
  { name: "Clientes", href: "/clients", icon: Building2 },
  { name: "Equipo", href: "/team", icon: UsersRound },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const creatorNavigation = [
  { name: "Mi Panel", href: "/creator-dashboard", icon: LayoutDashboard },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const editorNavigation = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard },
  { name: "Tablero", href: "/board", icon: Kanban },
  { name: "Contenido", href: "/portfolio", icon: Video },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const clientNavigation = [
  { name: "Mi Panel", href: "/client-dashboard", icon: Package },
  { name: "Portafolio", href: "/portfolio", icon: Video },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, isAdmin, isCreator, isEditor, isClient, roles } = useAuth();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/auth');
  };

  // Determinar navegación según rol
  const getNavigation = () => {
    if (isAdmin) return adminNavigation;
    if (isCreator) return creatorNavigation;
    if (isEditor) return editorNavigation;
    if (isClient) return clientNavigation;
    return [{ name: "Configuración", href: "/settings", icon: Settings }];
  };

  const navigation = getNavigation();

  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", color: "bg-primary" };
    if (isCreator) return { label: "Creador", color: "bg-purple-500" };
    if (isEditor) return { label: "Editor", color: "bg-blue-500" };
    if (isClient) return { label: "Cliente", color: "bg-green-500" };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">U</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-sidebar-foreground">UGC Colombia</h1>
                <p className="text-xs text-sidebar-foreground/60">Content Agency</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          {profile && (
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {profile.email}
                  </p>
                </div>
              </div>
              {roleBadge && (
                <Badge className={cn("mt-2", roleBadge.color, "text-white")}>
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary-foreground")} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive justify-start py-3"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
