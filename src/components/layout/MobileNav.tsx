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
  Menu
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contenido", href: "/content", icon: Video },
  { name: "Creadores", href: "/creators", icon: Users },
  { name: "Guiones IA", href: "/scripts", icon: Sparkles },
  { name: "Clientes", href: "/clients", icon: Building2 },
  { name: "Equipo", href: "/team", icon: UsersRound },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
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

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
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

          {/* User & Actions */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            {profile && (
              <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
                {profile.email}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
