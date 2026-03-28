import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TechGrid, TechParticles, TechOrb } from '@/components/ui/tech-effects';
import { CreateBrandDialog } from '@/components/brands/CreateBrandDialog';
import { JoinBrandDialog } from '@/components/brands/JoinBrandDialog';
import {
  Building2,
  Plus,
  Briefcase,
  Megaphone,
  Users,
  Wallet,
  Settings,
  ExternalLink,
  Loader2,
  Rocket,
  Link2,
  Store,
  LayoutDashboard,
  FolderKanban,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Stats Card Component ────────────────────────────────────────────────
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'info';
  onClick?: () => void;
}) {
  const colorClasses = {
    primary: 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10',
    success: 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10',
    warning: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    info: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
  };

  const iconColors = {
    primary: 'text-purple-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300 cursor-pointer',
        colorClasses[color],
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-sm bg-current/10', iconColors[color])}>
            <Icon className={cn('h-5 w-5', iconColors[color])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State Component ───────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ── Main Dashboard Component ────────────────────────────────────────────
export function BrandMemberDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut } = useAuth();
  const {
    activeBrand,
    hasBrand,
    isLoading: brandLoading,
    canCreateBrand,
  } = useBrand();

  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [showJoinBrand, setShowJoinBrand] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('section') || 'overview');

  // Fetch projects for the brand
  const brandId = activeBrand?.id;
  const { projects, loading: projectsLoading } = useMarketplaceProjects({
    role: 'brand',
    brandId,
    isBrandMember: true,
  });

  // Fetch campaigns
  const { campaigns, loading: campaignsLoading } = useMarketplaceCampaigns({
    brandId,
  });

  // Loading state
  if (brandLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={15} />
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando portal...</span>
        </motion.div>
      </div>
    );
  }

  // No brand - show onboarding
  if (!hasBrand) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={20} />
        <TechOrb size="lg" position="top-right" />
        <TechOrb size="md" position="bottom-left" delay={1} />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <motion.div
            className="max-w-2xl w-full space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-sm bg-purple-500/20 border border-purple-500/30">
                  <Building2 className="h-12 w-12 text-purple-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold">Bienvenido a KREOON</h1>
              <p className="text-muted-foreground text-lg">
                Crea tu empresa para comenzar a contratar talento creativo
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <motion.button
                type="button"
                onClick={() => setShowCreateBrand(true)}
                className="text-left group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="h-full border-2 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="p-4 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                        <Rocket className="h-8 w-8 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Crear mi empresa</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Registra tu marca y comienza a buscar talento
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setShowJoinBrand(true)}
                className="text-left group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="h-full border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="p-4 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                        <Link2 className="h-8 w-8 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Unirme a una empresa</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Usa un codigo de invitacion para unirte
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.button>
            </div>

            {/* Explore Option */}
            <Card className="border border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span className="text-sm">Mientras tanto, explora el marketplace</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/marketplace')}
                    className="gap-2"
                  >
                    <Store className="h-4 w-4" />
                    Explorar
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User Info */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Cerrar sesion
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Dialogs */}
        <CreateBrandDialog open={showCreateBrand} onOpenChange={setShowCreateBrand} />
        <JoinBrandDialog open={showJoinBrand} onOpenChange={setShowJoinBrand} />
      </div>
    );
  }

  // Has brand - show dashboard
  const activeProjects = projects.filter(p => !['completed', 'cancelled'].includes(p.status));
  const completedProjects = projects.filter(p => p.status === 'completed');
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="min-h-screen relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <TechGrid className="absolute inset-0" />
        <TechParticles count={15} />
        <TechOrb size="lg" position="top-right" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {activeBrand.logo_url ? (
              <img
                src={activeBrand.logo_url}
                alt={activeBrand.name}
                className="h-10 w-10 rounded-sm object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-sm bg-purple-500/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-400" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold">{activeBrand.name}</h1>
              <p className="text-xs text-muted-foreground">Portal de Marca</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/wallet')}
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Wallet</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings?section=profile')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-4 md:p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Campanas</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Proyectos Activos"
                value={activeProjects.length}
                subtitle={`${completedProjects.length} completados`}
                icon={Briefcase}
                color="primary"
                onClick={() => setActiveTab('projects')}
              />
              <StatCard
                title="Campanas Activas"
                value={activeCampaigns.length}
                subtitle={`${campaigns.length} total`}
                icon={Megaphone}
                color="info"
                onClick={() => setActiveTab('campaigns')}
              />
              <StatCard
                title="Creadores"
                value={projects.length > 0 ? new Set(projects.map(p => p.creator_id)).size : 0}
                subtitle="Talento contratado"
                icon={Users}
                color="success"
              />
              <StatCard
                title="Inversion"
                value={`$${projects.reduce((sum, p) => sum + (p.total_price || 0), 0).toLocaleString()}`}
                subtitle="Total en proyectos"
                icon={TrendingUp}
                color="warning"
              />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones Rapidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/marketplace')}
                  >
                    <Store className="h-5 w-5 text-purple-400" />
                    <span className="text-sm">Buscar Talento</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/marketplace/my-campaigns')}
                  >
                    <Megaphone className="h-5 w-5 text-blue-400" />
                    <span className="text-sm">Crear Campana</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => navigate('/board?view=marketplace')}
                  >
                    <FolderKanban className="h-5 w-5 text-green-400" />
                    <span className="text-sm">Ver Proyectos</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Proyectos Recientes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('projects')}
                  className="gap-1"
                >
                  Ver todos
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    title="Sin proyectos aun"
                    description="Busca talento en el marketplace y crea tu primer proyecto"
                    action={{
                      label: 'Buscar Talento',
                      onClick: () => navigate('/marketplace'),
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map(project => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 rounded-sm border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={project.creator.avatar_url || undefined} />
                            <AvatarFallback className="bg-purple-500/20 text-purple-400">
                              {project.creator.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {project.brief?.product_name || project.package_name || 'Proyecto'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {project.creator.display_name}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            project.status === 'completed' && 'bg-green-500/20 text-green-400',
                            project.status === 'in_progress' && 'bg-amber-500/20 text-amber-400',
                            project.status === 'revision' && 'bg-blue-500/20 text-blue-400'
                          )}
                        >
                          {project.status === 'completed' ? 'Completado' :
                           project.status === 'in_progress' ? 'En Produccion' :
                           project.status === 'revision' ? 'En Revision' :
                           project.status === 'approved' ? 'Aprobado' :
                           project.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Mis Proyectos</h2>
                <p className="text-sm text-muted-foreground">
                  Gestiona tus proyectos con creadores
                </p>
              </div>
              <Button onClick={() => navigate('/board?view=marketplace')} className="gap-2">
                <FolderKanban className="h-4 w-4" />
                Ver Tablero
              </Button>
            </div>

            {projectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={Briefcase}
                    title="Sin proyectos"
                    description="Explora el marketplace para encontrar creadores y comenzar tus primeros proyectos"
                    action={{
                      label: 'Buscar Talento',
                      onClick: () => navigate('/marketplace'),
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                  <Card key={project.id} className="hover:border-purple-500/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={project.creator.avatar_url || undefined} />
                            <AvatarFallback className="bg-purple-500/20 text-purple-400">
                              {project.creator.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {project.brief?.product_name || project.package_name || 'Proyecto'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {project.creator.display_name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Estado</span>
                          <Badge variant="secondary" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Precio</span>
                          <span className="font-medium">
                            ${project.total_price.toLocaleString()} {project.currency}
                          </span>
                        </div>
                        {project.deadline && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Entrega</span>
                            <span className="text-xs">
                              {format(new Date(project.deadline), 'd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        )}
                      </div>

                      {project.deliverables_count > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Entregables</span>
                            <span>{project.deliverables_approved}/{project.deliverables_count}</span>
                          </div>
                          <Progress
                            value={(project.deliverables_approved / project.deliverables_count) * 100}
                            className="h-1.5"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Mis Campanas</h2>
                <p className="text-sm text-muted-foreground">
                  Crea campanas para recibir propuestas de creadores
                </p>
              </div>
              <Button onClick={() => navigate('/marketplace/my-campaigns')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Campana
              </Button>
            </div>

            {campaignsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={Megaphone}
                    title="Sin campanas"
                    description="Crea una campana para recibir propuestas de creadores interesados"
                    action={{
                      label: 'Crear Campana',
                      onClick: () => navigate('/marketplace/my-campaigns'),
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {campaigns.map(campaign => (
                  <Card key={campaign.id} className="hover:border-blue-500/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{campaign.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {campaign.description}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            campaign.status === 'active' && 'bg-green-500/20 text-green-400',
                            campaign.status === 'draft' && 'bg-gray-500/20 text-gray-400',
                            campaign.status === 'completed' && 'bg-blue-500/20 text-blue-400'
                          )}
                        >
                          {campaign.status === 'active' ? 'Activa' :
                           campaign.status === 'draft' ? 'Borrador' :
                           campaign.status === 'completed' ? 'Completada' :
                           campaign.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{campaign.applications_count || 0} postulaciones</span>
                        </div>
                        {campaign.budget && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>${campaign.budget.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Mi Empresa</h2>
              <p className="text-sm text-muted-foreground">
                Informacion y configuracion de tu marca
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {activeBrand.logo_url ? (
                    <img
                      src={activeBrand.logo_url}
                      alt={activeBrand.name}
                      className="h-24 w-24 rounded-sm object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-sm bg-purple-500/20 flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-purple-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold">{activeBrand.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {activeBrand.industry || 'Sin industria definida'}
                      </p>
                    </div>
                    {activeBrand.description && (
                      <p className="text-sm text-muted-foreground">
                        {activeBrand.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      {activeBrand.website && (
                        <a
                          href={activeBrand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-purple-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Sitio web
                        </a>
                      )}
                      {activeBrand.city && (
                        <span className="text-muted-foreground">
                          {activeBrand.city}, {activeBrand.country || 'CO'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plan Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Plan Gratuito</p>
                      <p className="text-sm text-muted-foreground">
                        Funciones basicas incluidas
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/planes')}
                    >
                      Mejorar Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuracion</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate('/settings?section=profile')}
                  >
                    <Settings className="h-4 w-4" />
                    Editar Perfil
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
