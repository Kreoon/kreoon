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
  RefreshCw,
  Trophy,
  Store,
  Play,
  Bookmark,
  FileText,
  Megaphone,
  Wallet,
  UserCircle,
  Search,
  UserPlus,
  MessageSquare,
  ListChecks,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getRoleBadgeInfo } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useOrgMarketplace } from "@/hooks/useOrgMarketplace";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClientSelectorDialog } from "@/components/clients/ClientSelectorDialog";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const adminSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/dashboard", icon: LayoutDashboard },
      { name: "Projects", href: "/board", icon: Kanban },
      { name: "IA", href: "/scripts", icon: Sparkles },
      { name: "UP", href: "/ranking", icon: Trophy },
      { name: "Marketplace", href: "/marketplace", icon: Store },
    ]
  },
  {
    label: "GESTIÓN",
    items: [
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "Creadores", href: "/creators", icon: Users },
      { name: "Clientes", href: "/clients", icon: Building2 },
      { name: "Equipo", href: "/team", icon: UsersRound },
      { name: "Live", href: "/live", icon: Video },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings },
    ]
  }
];

const strategistSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/strategist-dashboard", icon: LayoutDashboard },
      { name: "IA", href: "/scripts", icon: Sparkles },
      { name: "Marketplace", href: "/marketplace", icon: Store },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings },
    ]
  }
];

const creatorSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/creator-dashboard", icon: LayoutDashboard },
      { name: "Projects", href: "/board", icon: Kanban },
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "IA", href: "/scripts", icon: Sparkles },
      { name: "Marketplace", href: "/marketplace", icon: Store },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings },
    ]
  }
];

const editorSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Board", href: "/editor-dashboard", icon: LayoutDashboard },
      { name: "Projects", href: "/board", icon: Kanban },
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "IA", href: "/scripts", icon: Sparkles },
      { name: "Marketplace", href: "/marketplace", icon: Store },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings },
    ]
  }
];

const clientSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Dashboard", href: "/client-dashboard", icon: Package },
      { name: "Portafolio", href: "/content", icon: FileText },
      { name: "Marketplace", href: "/marketplace", icon: Store },
    ]
  },
  {
    label: "CUENTA",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings },
    ]
  }
];

function getMarketplaceSections(activeRole: string | null): NavSection[] {
  const items: NavItem[] = [
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Videos", href: "/marketplace/videos", icon: Play },
    { name: "Mi Perfil", href: "/marketplace/profile/setup", icon: UserCircle },
  ];

  if (activeRole === 'client' || activeRole === 'admin' || activeRole === 'strategist') {
    items.push({ name: "Mis Campanas", href: "/marketplace/my-campaigns", icon: Megaphone });
  } else if (activeRole !== 'editor') {
    items.push({ name: "Campanas", href: "/marketplace/campaigns", icon: Megaphone });
  }

  items.push({ name: "Wallet", href: "/wallet", icon: Wallet });

  const savedItems: NavItem[] = [
    { name: "Guardados", href: "/marketplace/guardados", icon: Bookmark },
    { name: "Listas de Talento", href: "/marketplace/talent-lists", icon: ListChecks },
    { name: "Invitaciones", href: "/marketplace/invitations", icon: UserPlus },
  ];

  if (activeRole === 'admin' || activeRole === 'strategist') {
    savedItems.push({ name: "Consultas", href: "/marketplace/inquiries", icon: MessageSquare });
  }

  return [
    { label: "KREOON MARKETPLACE", items },
    { label: "GESTIÓN TALENTO", items: savedItems },
  ];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [currentClientName, setCurrentClientName] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, isAdmin, isCreator, isEditor, isClient, isStrategist, roles } = useAuth();
  const { currentOrgName } = useOrgOwner();
  const { marketplaceEnabled } = useOrgMarketplace();

  // Fetch current client name and count for client users (with brand fallback)
  useEffect(() => {
    if (isClient && user) {
      const fetchCurrentClient = async () => {
        // Get all client associations to determine count
        const { data: associations } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id);

        const totalClients = associations?.length || 0;
        setClientCount(totalClients);

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

        // Get first client from associations
        if (associations && associations.length > 0) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', associations[0].client_id)
            .maybeSingle();

          if (client) {
            setCurrentClientName(client.name);
            return;
          }
        }

        // Fallback: check brand_members for independent brands
        if (totalClients === 0) {
          const { data: brandMembers } = await (supabase as any)
            .from('brand_members')
            .select('brand_id')
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (brandMembers && brandMembers.length > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('active_brand_id')
              .eq('id', user.id)
              .maybeSingle();

            const activeBrandId = (profileData as any)?.active_brand_id || brandMembers[0].brand_id;
            const { data: brand } = await (supabase as any)
              .from('brands')
              .select('name')
              .eq('id', activeBrandId)
              .maybeSingle();

            if (brand) {
              setCurrentClientName(brand.name);
              setClientCount(brandMembers.length);
            }
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

  // Get navigation sections based on role (with marketplace sections)
  const getSections = (): NavSection[] => {
    let baseSections: NavSection[];
    let roleStr: string | null;

    if (isAdmin) { baseSections = adminSections; roleStr = 'admin'; }
    else if (isStrategist) { baseSections = strategistSections; roleStr = 'strategist'; }
    else if (isEditor) { baseSections = editorSections; roleStr = 'editor'; }
    else if (isCreator) { baseSections = creatorSections; roleStr = 'creator'; }
    else if (isClient) { baseSections = clientSections; roleStr = 'client'; }
    else {
      baseSections = [];
      roleStr = null;
    }

    const mktSections = marketplaceEnabled ? getMarketplaceSections(roleStr) : [];

    // "Buscar Talento" section - always visible for recruitment
    const recruitSection: NavSection = {
      label: "RECLUTAMIENTO",
      items: [{ name: "Buscar Talento", href: "/marketplace", icon: Search }],
    };

    // Filter marketplace link from role sections when org has marketplace disabled
    const filteredBase = baseSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!marketplaceEnabled && item.href === '/marketplace') return false;
        return true;
      })
    })).filter(section => section.items.length > 0);

    const cuentaSection = filteredBase.find(s => s.label === 'CUENTA');
    const otherSections = filteredBase.filter(s => s.label !== 'CUENTA');

    return [
      ...otherSections,
      ...mktSections,
      ...(!marketplaceEnabled ? [recruitSection] : []),
      ...(cuentaSection ? [cuentaSection] : [{ label: "CUENTA", items: [{ name: "Configuración", href: "/settings", icon: Settings }] }]),
    ];
  };

  const sections = getSections();
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
                <img src="/favicon.png" alt="KREOON" className="h-9 w-9 object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground">KREOON</h1>
                {currentOrgName ? (
                  <p className="text-xs text-primary/80 truncate font-medium">{currentOrgName}</p>
                ) : (
                  <p className="text-xs text-sidebar-foreground/60">Content Platform</p>
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

          {/* Navigation with Sections */}
          <nav className="flex-1 overflow-y-auto p-3">
            {sections.map((section, sectionIndex) => (
              <div key={section.label} className={cn(sectionIndex > 0 && "mt-6")}>
                {/* Section Label */}
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
                
                {/* Section Items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const itemPath = item.href.split('?')[0];
                    const itemSearch = item.href.includes('?') ? item.href.slice(item.href.indexOf('?')) : '';
                    const isActive = item.href === '/marketplace'
                      ? location.pathname === '/marketplace'
                      : (itemPath.startsWith('/marketplace/') || item.href === '/wallet')
                      ? location.pathname.startsWith(itemPath)
                      : itemSearch
                      ? location.pathname === itemPath && location.search === itemSearch
                      : location.pathname === item.href;
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
                </div>
              </div>
            ))}
          </nav>

          {/* Client Company Switcher & Sign Out */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            {isClient && (
              <div className="space-y-1">
                {currentClientName && (
                  <div className="px-3 py-1 text-xs text-sidebar-foreground/60 truncate flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    {currentClientName}
                    {clientCount > 1 && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        +{clientCount - 1}
                      </span>
                    )}
                  </div>
                )}
                {clientCount > 1 && (
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
                )}
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
