import { ReactNode, Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { TrialBanner } from "./TrialBanner";
import { IntegratedNotificationHeader } from "@/components/notifications/IntegratedNotificationHeader";
import { TourProvider } from "@/components/tour/TourProvider";
import { AmbassadorCelebration } from "@/components/AmbassadorCelebration";
import { KiroWidget } from "@/components/kiro/KiroWidget";
import { KiroHeaderButton } from "@/components/kiro/KiroHeaderButton";
import { AccountMenu } from "./AccountMenu";
import { MoreMenuSheet, type MoreMenuItem } from "./MoreMenuSheet";
import { AcademiaMoreMenuSheet } from "./AcademiaMoreMenuSheet";
import { MobileNotificationsBell } from "@/components/notifications/MobileNotificationsBell";
import { MOBILE_BOTTOM_NAV_CSS_VAR, MOBILE_BOTTOM_NAV_HEIGHT_PX } from "@/lib/layoutConstants";
import { useAuth } from "@/hooks/useAuth";
import { useOrgMarketplace } from "@/hooks/useOrgMarketplace";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { usePresence } from "@/hooks/usePresence";
import { useClientRealtimeNotifications } from "@/hooks/useClientRealtimeNotifications";
import { useClientPendingReviews } from "@/hooks/useClientPendingReviews";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Kanban, Settings, Scissors, Briefcase, Eye, Clapperboard, Compass, GraduationCap, BookOpen, Rss, CalendarDays, Store, Megaphone, Users, Building2, Dna, Package, Receipt, Heart, Wallet, Users2, DollarSign, Trash2, Blocks, LayoutList, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Setea/limpia la CSS var que lee KiroFloatingButton para no tapar la bottom nav.
// Fuente unica: MOBILE_BOTTOM_NAV_HEIGHT_PX (src/lib/layoutConstants.ts).
function useBottomNavCssVar(hasBottomNav: boolean) {
  useEffect(() => {
    document.documentElement.style.setProperty(
      MOBILE_BOTTOM_NAV_CSS_VAR,
      hasBottomNav ? `${MOBILE_BOTTOM_NAV_HEIGHT_PX}px` : "0px"
    );
    return () => {
      document.documentElement.style.setProperty(MOBILE_BOTTOM_NAV_CSS_VAR, "0px");
    };
  }, [hasBottomNav]);
}

// Page transition variants for smooth animations
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 }
  },
};

interface MainLayoutProps {
  children: ReactNode;
}

// Editor navigation items for mobile bottom bar - Kreoon Tech theme
// Kreoon IA/Config viven en "Mas" (MoreMenuSheet) para no perder acceso a nada.
const editorMobileNavigation = [
  { name: "Edición", href: "/editor-dashboard", icon: LayoutDashboard },
  { name: "Producciones", href: "/board", icon: Kanban },
  { name: "Market", href: "/marketplace", icon: Briefcase },
];

// Creator navigation items for mobile bottom bar
const creatorMobileNavigation = [
  { name: "Hub", href: "/creator-dashboard", icon: LayoutDashboard },
  { name: "Producciones", href: "/board", icon: Kanban },
  { name: "Market", href: "/marketplace", icon: Briefcase },
];

// Client/marca navigation items for mobile bottom bar.
// Simplificación 2026 (decisión 6): rediseñado, no rellenado. Al irse el Feed, en vez
// de dejar 2 slots o meter un ítem cualquiera, la nav pasa a lo que el cliente
// realmente hace: ver su avance, revisar sus videos y consultar su perfil.
// ESPEJO EXACTO de `clientSections` en Sidebar.tsx — mismos destinos, mismo
// orden y mismos nombres. En móvil el cliente debe encontrar lo mismo que en
// escritorio: cuando las dos listas se escriben aparte, se desincronizan (aquí
// sobrevivieron "Academia" y "Mi Plan" meses después de sacarlos del sidebar).
// Si cambias una, cambia la otra.
const brandMobileNavigation = [
  { name: "Inicio", href: "/client-dashboard", icon: LayoutDashboard },
  { name: "Mis videos", href: "/board?view=marketplace", icon: Kanban },
  { name: "Mi marca", href: "/client-dashboard?tab=dna", icon: Dna },
  { name: "Buscar talento", href: "/marketplace", icon: Store },
];

// El resto de `clientSections` que no cabe en los 4 huecos de la barra.
// "Mi Plan" NO va suelto: vive dentro de Configuración, por decisión propia.
const clientMoreItems: MoreMenuItem[] = [
  { name: "Facturas", href: "/client-dashboard?tab=facturas", icon: Receipt },
  { name: "Productos", href: "/client-dashboard?tab=products", icon: Package },
  { name: "Portafolio", href: "/client-dashboard?tab=portfolio", icon: FileText },
  { name: "Favoritos", href: "/marketplace/favoritos", icon: Heart },
  { name: "Configuración", href: "/settings", icon: Settings },
];

// Admin navigation items for mobile bottom bar (Fase 3.6 — antes admin no tenia bottom nav)
const adminMobileNavigation = [
  { name: "Hub", href: "/dashboard", icon: LayoutDashboard },
  { name: "CRM", href: "/crm", icon: Building2 },
  { name: "Usuarios", href: "/talent", icon: Users },
];

// Items secundarios de "Mas" para admin — resto de adminSections del Sidebar que no entro
// en los 4 slots. Los 4 marcados platformRootOnly en Sidebar.tsx se filtran igual aca via
// isPlatformRoot (useOrgOwner) para no dar acceso de mas a admins de organizacion no-root.
const ADMIN_MORE_ITEMS_BASE: Array<MoreMenuItem & { platformRootOnly?: boolean }> = [
  { name: "Producciones", href: "/board", icon: Kanban },
  { name: "Portafolio", href: "/content", icon: FileText },
  { name: "Kreoon IA", href: "/scripts", icon: Sparkles },
  { name: "Academia", href: "/academia", icon: GraduationCap },
  { name: "Clientes", href: "/clientes", icon: Building2 },
  { name: "Finanzas", href: "/org-crm/finanzas", icon: Wallet },
  { name: "Comunidades", href: "/crm/comunidades", icon: Users2 },
  { name: "Revenue Plataforma", href: "/crm/finanzas", icon: DollarSign },
  { name: "Email Marketing", href: "/crm/email-marketing", icon: Megaphone },
  { name: "Papelera", href: "/admin/papelera", icon: Trash2, platformRootOnly: true },
  { name: "Módulos en Desarrollo", href: "/admin/dev-modules", icon: Blocks, platformRootOnly: true },
  { name: "Todas las Páginas (QA)", href: "/admin/qa-paginas", icon: LayoutList, platformRootOnly: true },
  { name: "Configuración", href: "/settings", icon: Settings },
];

// Nav de sesion de Academia (Fase 3.5 Bloque 4) — antes las paginas de Academia no llevaban
// MainLayout, sin bottom nav ni AccountMenu, "se veia como web". Solo se usa en rutas de
// sesion activa dentro de un space (ver isAcademiaSpaceSession en el componente); las
// paginas publicas (/academia, /academia/explorar, landing) NO llevan este nav.
function buildAcademiaMobileNavigation(spaceSlug: string) {
  return [
    { name: "Inicio", href: `/academia/${spaceSlug}`, icon: GraduationCap },
    { name: "Cursos", href: `/academia/${spaceSlug}/classroom`, icon: BookOpen },
    { name: "Feed", href: `/academia/${spaceSlug}/feed`, icon: Rss },
    { name: "Calendario", href: `/academia/${spaceSlug}/calendar`, icon: CalendarDays },
  ];
}

// Minimal loader shown only in the content area while a lazy page chunk loads
function ContentAreaLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// Animated page wrapper component
function PageWrapper({ children, locationKey }: { children: ReactNode; locationKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={locationKey}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isClient, isAdmin, activeRole, profile, user } = useAuth();
  const { marketplaceEnabled, clientMarketplaceEnabled } = useOrgMarketplace();
  const { isPlatformRoot } = useOrgOwner();
  const location = useLocation();
  const navigate = useNavigate();
  const { spaceSlug: routeSpaceSlug } = useParams<{ spaceSlug?: string }>();

  // Track user presence
  usePresence();

  // Client realtime notifications (for new videos, comments)
  useClientRealtimeNotifications();

  // Client pending reviews count (for global banner)
  const pendingReviews = useClientPendingReviews();

  // Detect marketplace routes for dark styling
  const isMarketplaceRoute = location.pathname.startsWith('/marketplace');
  const isMarketplaceRouteOrFeed = isMarketplaceRoute;


  // (boton "esconder menus"). Solo aplica en /feed — el estado global no afecta otras rutas.

  // Sesion activa dentro de un space de Academia (home/classroom/feed/dm/calendario/miembros) —
  // NO incluye publicas (/academia, /academia/explorar) ni gestion/admin/editor de curso/reproductor
  // de leccion (esas quedan full-screen a proposito, como el resto de la app con video inmersivo).
  // Solo las 6 rutas que efectivamente envuelven <MainLayout> en App.tsx llegan a este chequeo.
  const ACADEMIA_EXCLUDED_SUFFIXES = ['/gestionar', '/admin', '/edit', '/learn'];
  const isAcademiaSpaceSession =
    location.pathname.startsWith('/academia/') &&
    !!routeSpaceSlug &&
    !ACADEMIA_EXCLUDED_SUFFIXES.some((suffix) => location.pathname.endsWith(suffix));
  const academiaSpaceSlug = isAcademiaSpaceSession ? routeSpaceSlug! : null;

  // Fase 3.6: bottom nav movil ahora tambien para client y admin (antes solo creator/editor/Academia).
  // Unica llamada incondicional (las Rules of Hooks prohiben llamar hooks dentro de los `if` de abajo,
  // que hacen return temprano). isClient/isAdmin ya vienen de getPermissionGroup() via useAuth.
  const hasMobileBottomNav =
    (((activeRole === 'content_creator' || activeRole === 'editor') && !isAdmin) ||
      isAcademiaSpaceSession ||
      isClient ||
      isAdmin) &&
    true;

  // Items de "Mas" para admin, filtrados por isPlatformRoot (paridad con Sidebar.tsx platformRootOnly)
  const adminMoreItems: MoreMenuItem[] = ADMIN_MORE_ITEMS_BASE.filter(
    (item) => !item.platformRootOnly || isPlatformRoot
  );
  useBottomNavCssVar(hasMobileBottomNav);

  // Academia: sesion activa dentro de un space -> chrome propio (antes no llevaba MainLayout
  // en absoluto, sin header/AccountMenu/bottom nav, "se veia como web"). Toma prioridad sobre
  // los branches por rol de abajo — cualquier rol navegando Academia ve este nav, no el suyo.
  if (isAcademiaSpaceSession && academiaSpaceSlug) {
    const academiaNav = buildAcademiaMobileNavigation(academiaSpaceSlug);
    return (
      <div className="min-h-screen bg-background">
        {/* Academia Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-violet-600 flex-shrink-0">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold truncate">Academia</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <KiroHeaderButton />
            <AccountMenu
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
          </div>
        </header>

        {/* Academia Mobile Bottom Navigation */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around py-2">
            {academiaNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors min-h-[44px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
            <AcademiaMoreMenuSheet spaceSlug={academiaSpaceSlug} />
          </div>
        </nav>

        {/* Main Content */}
        <main
          id="main-content"
          className="pb-[calc(var(--kreoon-bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:pb-0"
        >
          <Suspense fallback={<ContentAreaLoader />}>
            <PageWrapper locationKey={location.pathname}>
              {children}
            </PageWrapper>
          </Suspense>
        </main>

        <KiroWidget hideFloatingButton />
      </div>
    );
  }

  // For content creators, show creator-specific layout with bottom nav on mobile
  if ((activeRole === 'creator' || activeRole === 'content_creator') && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {/* Creator Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>

        {/* Creator Mobile Header + Bottom Nav — ocultos en modo pantalla completa del feed */}
        {(
        <>
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-pink-500 flex-shrink-0">
              <Clapperboard className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold truncate">Panel Creador</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <MobileNotificationsBell />
            <KiroHeaderButton />
            <AccountMenu
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
          </div>
        </header>

        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around py-2">
            {creatorMobileNavigation.filter(item => item.href !== '/marketplace' || marketplaceEnabled).map((item) => {
              const isActive = item.href.startsWith('/marketplace')
                ? location.pathname.startsWith(item.href)
                : location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors min-h-[44px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
            <MoreMenuSheet dashboardHref="/creator-dashboard" />
          </div>
        </nav>
        </>
        )}

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "pb-[calc(var(--kreoon-bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:pb-0 transition-all duration-300",
            sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]",
            "md:pt-14"
          )}
        >
          <div className={cn("min-h-screen", isMarketplaceRouteOrFeed ? "bg-background" : "px-3 py-4 md:p-6")}>
            <Suspense fallback={<ContentAreaLoader />}>
              <PageWrapper locationKey={location.pathname}>
                {children}
              </PageWrapper>
            </Suspense>
          </div>
        </main>

        {/* KIRO AI Assistant */}
        <KiroWidget hideFloatingButton />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }

  // For editors, show editor-specific layout with bottom nav on mobile
  // IMPORTANT: Use activeRole instead of isEditor to respect the user's selected role
  // isEditor was true for ALL talent users, causing creators to see "Panel Editor"
  if (activeRole === 'editor' && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {/* Editor Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>
        
        {/* Editor Mobile Header + Bottom Nav — ocultos en modo pantalla completa del feed */}
        {(
        <>
        <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-500 flex-shrink-0">
              <Scissors className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold truncate">Panel Editor</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <MobileNotificationsBell />
            <KiroHeaderButton />
            <AccountMenu
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
          </div>
        </header>

        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around py-2">
            {editorMobileNavigation.filter(item => item.href !== '/marketplace' || marketplaceEnabled).map((item) => {
              const isActive = item.href.startsWith('/marketplace')
                ? location.pathname.startsWith(item.href)
                : location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors min-h-[44px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
            <MoreMenuSheet dashboardHref="/editor-dashboard" />
          </div>
        </nav>
        </>
        )}

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "pb-[calc(var(--kreoon-bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:pb-0 transition-all duration-300",
            sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]",
            "md:pt-14"
          )}
        >
          <div className={cn("min-h-screen", isMarketplaceRouteOrFeed ? "bg-background" : "px-3 py-4 md:p-6")}>
            <Suspense fallback={<ContentAreaLoader />}>
              <PageWrapper locationKey={location.pathname}>
                {children}
              </PageWrapper>
            </Suspense>
          </div>
        </main>

        {/* KIRO AI Assistant */}
        <KiroWidget hideFloatingButton />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }

  // For clients, reuse the main Sidebar so navigation + role switcher stay consistent
  if (isClient) {
    const hasBanner = pendingReviews.total > 0;
    const bannerHeight = 44; // h-11 = 44px

    return (
      <div className="min-h-screen bg-background">
        {/* Client Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>

        {/* Global Review Alert Banner - Fixed at top on desktop, sticky on mobile */}
        {hasBanner && (
          <div className={cn(
            "fixed top-0 right-0 z-[60] h-11",
            "bg-gradient-to-r from-purple-600 via-purple-500 to-white dark:from-purple-600 dark:via-purple-800 dark:to-zinc-950",
            sidebarCollapsed ? "left-0 md:left-[104px]" : "left-0 md:left-[288px]"
          )}>
            <div className="h-full px-4 flex items-center">
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-white/30 dark:bg-white/20">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <p className="font-medium text-sm text-white drop-shadow-sm">
                    {pendingReviews.scriptCount > 0 && (
                      <span>{pendingReviews.scriptCount} guión{pendingReviews.scriptCount > 1 ? 'es' : ''}</span>
                    )}
                    {pendingReviews.scriptCount > 0 && pendingReviews.videoCount > 0 && (
                      <span className="mx-1">y</span>
                    )}
                    {pendingReviews.videoCount > 0 && (
                      <span>{pendingReviews.videoCount} video{pendingReviews.videoCount > 1 ? 's' : ''}</span>
                    )}
                    <span className="hidden sm:inline text-white/80 ml-1">
                      por revisar
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/client-dashboard?tab=review')}
                  className="shrink-0 rounded-sm bg-white text-purple-600 hover:bg-purple-50 font-semibold shadow-md h-8"
                >
                  Revisar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Client Mobile Header + Bottom Nav — ocultos en modo pantalla completa del feed (Fase 3.6) */}
        {(
        <>
        <header
          className="sticky z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden"
          style={{ top: hasBanner ? bannerHeight : 0 }}
        >
          <MobileNav />
          <div className="flex-1 flex justify-center min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-sm overflow-hidden flex-shrink-0">
                <img src="/favicon.png" alt="KREOON" className="h-7 w-7 object-cover" loading="lazy" />
              </div>
              <span className="text-sm font-bold truncate">Portal Cliente</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <MobileNotificationsBell />
            <KiroHeaderButton />
            <AccountMenu
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            {clientMarketplaceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/marketplace')}
                className="h-8 w-8 rounded-full"
              >
                <Briefcase className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around py-2">
            {brandMobileNavigation.filter(item => !item.href.startsWith('/marketplace') || clientMarketplaceEnabled).map((item) => {
              // Talento usa exact-match (/marketplace) para no activarse en subrutas.
              const isActive = item.href === '/marketplace'
                ? location.pathname === '/marketplace'
                : location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors min-h-[44px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
            <MoreMenuSheet items={clientMoreItems} />
          </div>
        </nav>
        </>
        )}

        {/* Desktop Integrated Notification Header */}
        <div className="hidden md:block">
          <IntegratedNotificationHeader
            sidebarCollapsed={sidebarCollapsed}
            topOffset={hasBanner ? bannerHeight : 0}
          />
        </div>

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "pb-[calc(var(--kreoon-bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:pb-0 transition-all duration-300",
            sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]"
          )}
          style={{ paddingTop: hasBanner ? bannerHeight + 56 : 56 }} // 56px = h-14 del header
        >
          <div className={cn("min-h-screen", isMarketplaceRouteOrFeed ? "bg-background" : "px-3 py-4 md:p-6")}>
            <Suspense fallback={<ContentAreaLoader />}>
              <PageWrapper locationKey={location.pathname}>
                {children}
              </PageWrapper>
            </Suspense>
          </div>
        </main>

        {/* KIRO AI Assistant */}
        <KiroWidget hideFloatingButton />

        {/* Ambassador Celebration */}
        <AmbassadorCelebration />
      </div>
    );
  }

  // Default admin/other layout - El Estudio theme
  return (
    <div className="min-h-screen bg-background relative">
      {/* Tech ambient background effects - hidden on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 hidden md:block">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/[0.02] rounded-full blur-[180px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[150px]" />
      </div>
      
      {/* Trial Banner - Shows when billing is enabled and trial is expiring/expired */}
      <TrialBanner 
        organizationId={profile?.current_organization_id || null} 
        onUpgrade={() => navigate('/planes')}
      />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      </div>
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
        <MobileNav />
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm overflow-hidden flex-shrink-0">
              <img src="/favicon.png" alt="KREOON" className="h-7 w-7 object-cover" loading="lazy" />
            </div>
            <span className="text-sm font-bold truncate">KREOON</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <MobileNotificationsBell />
          <KiroHeaderButton />
          <AccountMenu
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-8 w-8 rounded-full"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Admin Mobile Bottom Nav (Fase 3.6) — solo isAdmin; digital_strategist/creative_strategist/
          community_manager caen en este branch pero no son admin, no ganan bottom nav aca (sin cambio
          respecto al comportamiento previo para ellos) */}
      {isAdmin && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around py-2">
            {adminMobileNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors min-h-[44px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.name}</span>
                </NavLink>
              );
            })}
            <MoreMenuSheet items={adminMoreItems} />
          </div>
        </nav>
      )}

      {/* Desktop Integrated Notification Header */}
      <div className="hidden md:block">
        <IntegratedNotificationHeader
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Main Content */}
      <main
        id="main-content"
        className={cn(
          "pb-[calc(var(--kreoon-bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:pb-0 transition-all duration-300",
          sidebarCollapsed ? "md:ml-[104px]" : "md:ml-[288px]",
          "md:pt-14"
        )}
      >
        <div className={cn("min-h-screen", isMarketplaceRouteOrFeed ? "bg-background" : "px-3 py-4 md:p-6")}>
          <Suspense fallback={<ContentAreaLoader />}>
            <PageWrapper locationKey={location.pathname}>
              {children}
            </PageWrapper>
          </Suspense>
        </div>
      </main>

      {/* KIRO AI Assistant */}
      <KiroWidget hideFloatingButton />

      {/* Tour Provider */}
      <TourProvider />

      {/* Ambassador Celebration */}
      <AmbassadorCelebration />
    </div>
  );
}
