import { useState, useEffect } from "react";
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
  Package,
  Kanban,
  RefreshCw
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getRoleBadgeInfo } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { supabase } from "@/integrations/supabase/client";

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

const strategistNavigation = [
  { name: "Dashboard", href: "/strategist-dashboard", icon: LayoutDashboard },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const creatorNavigation = [
  { name: "Mi Panel", href: "/creator-dashboard", icon: LayoutDashboard },
  { name: "Tablero", href: "/board", icon: Kanban },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const editorNavigation = [
  { name: "Dashboard", href: "/editor-dashboard", icon: LayoutDashboard },
  { name: "Tablero", href: "/board", icon: Kanban },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const clientNavigation = [
  { name: "Mi Panel", href: "/client-dashboard", icon: Package },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, isAdmin, isCreator, isEditor, isClient, isStrategist, roles } = useAuth();
  const { currentOrgName } = useOrgOwner();

  // Fetch current client name for client users
  useEffect(() => {
    if (isClient && user) {
      const fetchCurrentClient = async () => {
        const savedClientId = localStorage.getItem('selectedClientId');
        
        if (savedClientId) {
          const { data } = await supabase
            .from('clients')
            .select('name')
            .eq('id', savedClientId)
            .maybeSingle();
          
          if (data) {
            setCurrentClientName(data.name);
            return;
          }
        }

        // Get first client from user's associations
        const { data: associations } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .limit(1);

        if (associations && associations.length > 0) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', associations[0].client_id)
            .maybeSingle();

          if (client) {
            setCurrentClientName(client.name);
          }
        }
      };

      fetchCurrentClient();
    }
  }, [isClient, user]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/auth');
  };

  // Determinar navegación según rol (prioridad: admin > strategist > editor > creator > client)
  const getNavigation = () => {
    if (isAdmin) return adminNavigation;
    if (isStrategist) return strategistNavigation;
    if (isEditor) return editorNavigation;
    if (isCreator) return creatorNavigation;
    if (isClient) return clientNavigation;
    return [{ name: "Configuración", href: "/settings", icon: Settings }];
  };

  const navigation = getNavigation();
  const roleBadge = getRoleBadgeInfo(roles);

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
                <span className="text-lg font-bold text-primary-foreground">C</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground">Creartor Studio</h1>
                {currentOrgName ? (
                  <p className="text-xs text-primary/80 truncate font-medium">{currentOrgName}</p>
                ) : (
                  <p className="text-xs text-sidebar-foreground/60">Content Agency</p>
                )}
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

          {/* Client Company Switcher & Sign Out */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            {isClient && (
              <div className="space-y-1">
                {currentClientName && (
                  <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    {currentClientName}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setShowClientSelector(true);
                  }}
                  className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground justify-start py-3"
                >
                  <RefreshCw className="h-5 w-5 mr-3" />
                  Cambiar Empresa
                </Button>
              </div>
            )}
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

      {/* Client Selector Dialog */}
      <ClientSelectorDialog
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        onSelectClient={(clientId) => {
          localStorage.setItem('selectedClientId', clientId);
          window.dispatchEvent(new CustomEvent('client-selected', { detail: { clientId } }));
          setShowClientSelector(false);
          navigate('/client-dashboard', { replace: true });
        }}
      />
    </Sheet>
  );
}
