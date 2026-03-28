import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Briefcase, TrendingUp, DollarSign, Clock,
  Bell, CheckCircle2, AlertCircle, Megaphone,
  BarChart3, Calendar, Wallet, Eye, Send,
  ChevronRight, Sparkles, Play, Users, Kanban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Stats Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'purple'
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color?: 'purple' | 'green' | 'amber' | 'blue';
}) {
  const colors = {
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    green: 'from-green-500/20 to-emerald-500/20 text-green-400',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-cyan-500/20 text-blue-400',
  };

  return (
    <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/60">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className={cn("w-3 h-3", trend >= 0 ? "text-green-400" : "text-red-400 rotate-180")} />
                <span className={cn("text-xs", trend >= 0 ? "text-green-400" : "text-red-400")}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </span>
                {trendLabel && <span className="text-xs text-white/40">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-sm bg-gradient-to-br flex items-center justify-center", colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Campaign Card Component
function CampaignCard({ campaign, type }: { campaign: any; type: 'public' | 'applied' | 'active' }) {
  const statusColors = {
    open: 'bg-green-500/20 text-green-400 border-green-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const statusLabels: Record<string, string> = {
    open: 'Abierta',
    pending: 'Pendiente',
    approved: 'Aprobada',
    in_progress: 'En Progreso',
    completed: 'Completada',
  };

  return (
    <div className="p-4 rounded-sm bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn("text-xs", statusColors[campaign.status] || statusColors.open)}>
              {statusLabels[campaign.status] || campaign.status}
            </Badge>
            {campaign.budget && (
              <span className="text-xs text-green-400 font-medium">
                ${campaign.budget.toLocaleString()}
              </span>
            )}
          </div>
          <h4 className="font-medium text-white truncate">{campaign.title}</h4>
          <p className="text-sm text-white/50 truncate">{campaign.brand_name || 'Marca'}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/marketplace/campaigns/${campaign.id}`}>
            <Eye className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      {campaign.deadline && (
        <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
          <Clock className="w-3 h-3" />
          <span>Fecha límite: {new Date(campaign.deadline).toLocaleDateString('es')}</span>
        </div>
      )}
    </div>
  );
}

// Project Card Component
function ProjectCard({ project }: { project: any }) {
  const progressPercentage = project.total_deliverables > 0
    ? (project.completed_deliverables / project.total_deliverables) * 100
    : 0;

  return (
    <div className="p-4 rounded-sm bg-white/[0.02] border border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-white">{project.title}</h4>
          <p className="text-sm text-white/50">{project.client_name}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {project.status}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">Progreso</span>
          <span className="text-white/70">{project.completed_deliverables}/{project.total_deliverables}</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>
      {project.amount && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-xs text-white/50">Valor</span>
          <span className="text-sm font-medium text-green-400">${project.amount.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

export default function FreelancerDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ['creator-profile', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch subscription
  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('unified_wallets')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch campaign applications
  const { data: applications } = useQuery({
    queryKey: ['campaign-applications', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('campaign_applications')
        .select(`
          *,
          campaign:marketplace_campaigns(id, title, budget, deadline, status)
        `)
        .eq('creator_id', creatorProfile?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!creatorProfile?.id,
  });

  // Fetch active projects
  const { data: projects } = useQuery({
    queryKey: ['marketplace-projects', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('marketplace_projects')
        .select('*')
        .eq('creator_id', creatorProfile?.id)
        .in('status', ['in_progress', 'pending_delivery', 'revision'])
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!creatorProfile?.id,
  });

  // Fetch public campaigns
  const { data: publicCampaigns } = useQuery({
    queryKey: ['public-campaigns'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('marketplace_campaigns')
        .select('*')
        .eq('status', 'open')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch social hub stats - real data for this user
  const { data: socialStats } = useQuery({
    queryKey: ['social-stats', user?.id],
    queryFn: async () => {
      // Get posts count for this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Count posts this month for this user only
      const { data: postsThisMonth, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('id', { count: 'exact' })
        .eq('user_id', user!.id)
        .eq('status', 'published')
        .gte('published_at', startOfMonth)
        .lte('published_at', endOfMonth);

      // Count scheduled posts for this user
      const { data: scheduledPosts, error: scheduledError } = await supabase
        .from('scheduled_posts')
        .select('id', { count: 'exact' })
        .eq('user_id', user!.id)
        .eq('status', 'scheduled');

      // Get user's social accounts and their metrics
      const { data: userAccounts } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      let totalReach = 0;
      let totalEngagement = 0;
      let totalFollowers = 0;

      if (userAccounts && userAccounts.length > 0) {
        // Get latest snapshot for each account
        const accountIds = userAccounts.map(a => a.id);
        const { data: snapshots } = await supabase
          .from('social_metrics_snapshots')
          .select('reach, total_likes, total_comments, total_shares, followers_count')
          .in('account_id', accountIds)
          .order('snapshot_date', { ascending: false })
          .limit(accountIds.length);

        if (snapshots) {
          snapshots.forEach(s => {
            totalReach += Number(s.reach || 0);
            totalEngagement += Number(s.total_likes || 0) + Number(s.total_comments || 0) + Number(s.total_shares || 0);
            totalFollowers += Number(s.followers_count || 0);
          });
        }
      }

      // Engagement rate calculation
      const engagementRate = totalFollowers > 0 ? ((totalEngagement / totalFollowers) * 100).toFixed(1) : 0;

      return {
        posts_this_month: postsThisMonth?.length || 0,
        total_reach: totalReach,
        engagement_rate: Number(engagementRate),
        scheduled: scheduledPosts?.length || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const pendingPayment = wallet?.pending_balance || 0;
    const totalEarned = wallet?.total_earned || 0;
    const availableBalance = wallet?.available_balance || 0;
    const activeProjects = projects?.length || 0;
    const pendingApplications = applications?.filter((a: any) => a.status === 'pending').length || 0;

    return {
      pendingPayment,
      totalEarned,
      availableBalance,
      activeProjects,
      pendingApplications,
    };
  }, [wallet, projects, applications]);

  const userName = profile?.full_name?.split(' ')[0] || 'Creador';
  const isPro = subscription?.tier === 'creator_pro';
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Hola, {userName}
            </h1>
            <p className="text-white/60 mt-1">
              Aqui esta el resumen de tu actividad
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro && trialEndsAt && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Pro Trial - {formatDistanceToNow(trialEndsAt, { addSuffix: true, locale: es })}
              </Badge>
            )}
            <Button asChild>
              <Link to="/marketplace/campaigns">
                <Megaphone className="w-4 h-4 mr-2" />
                Ver Campanas
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Balance Disponible"
            value={`$${stats.availableBalance.toLocaleString()}`}
            icon={Wallet}
            color="green"
          />
          <StatCard
            title="Por Cobrar"
            value={`$${stats.pendingPayment.toLocaleString()}`}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Proyectos Activos"
            value={stats.activeProjects}
            icon={Briefcase}
            color="purple"
          />
          <StatCard
            title="Aplicaciones Pendientes"
            value={stats.pendingApplications}
            icon={Send}
            color="blue"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="campaigns">Campanas</TabsTrigger>
            <TabsTrigger value="projects">Proyectos</TabsTrigger>
            <TabsTrigger value="social">Social Hub</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Public Campaigns */}
              <Card className="bg-white/[0.02] border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="w-4 h-4 text-purple-400" />
                        Nuevas Campanas
                      </CardTitle>
                      <CardDescription>Oportunidades disponibles para ti</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/marketplace/campaigns">
                        Ver todas <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publicCampaigns?.length > 0 ? (
                    publicCampaigns.slice(0, 3).map((campaign: any) => (
                      <CampaignCard key={campaign.id} campaign={campaign} type="public" />
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No hay campanas disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* My Applications */}
              <Card className="bg-white/[0.02] border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-400" />
                        Mis Aplicaciones
                      </CardTitle>
                      <CardDescription>Estado de tus postulaciones</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/marketplace/creator-campaigns">
                        Ver todas <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {applications?.length > 0 ? (
                    applications.slice(0, 3).map((app: any) => (
                      <CampaignCard
                        key={app.id}
                        campaign={{ ...app.campaign, status: app.status }}
                        type="applied"
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No has aplicado a campanas aun</p>
                      <Button variant="link" className="mt-2" asChild>
                        <Link to="/marketplace/campaigns">Explorar campanas</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Active Projects */}
            {projects && projects.length > 0 && (
              <Card className="bg-white/[0.02] border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                        Proyectos en Curso
                      </CardTitle>
                      <CardDescription>Trabajos que requieren tu atencion</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/board?view=marketplace">
                        Ver tablero <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project: any) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Hub Summary */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-400" />
                      Social Hub
                    </CardTitle>
                    <CardDescription>Rendimiento de tus publicaciones</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/social-hub">
                      Ir a Social Hub <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded-sm bg-white/5">
                    <p className="text-xs text-white/50">Posts este mes</p>
                    <p className="text-xl font-bold text-white">{socialStats?.posts_this_month || 0}</p>
                    {!isPro && (
                      <p className="text-xs text-amber-400">de 50 gratis</p>
                    )}
                  </div>
                  <div className="p-3 rounded-sm bg-white/5">
                    <p className="text-xs text-white/50">Alcance total</p>
                    <p className="text-xl font-bold text-white">{(socialStats?.total_reach || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-sm bg-white/5">
                    <p className="text-xs text-white/50">Engagement</p>
                    <p className="text-xl font-bold text-white">{socialStats?.engagement_rate || 0}%</p>
                  </div>
                  <div className="p-3 rounded-sm bg-white/5">
                    <p className="text-xs text-white/50">Programados</p>
                    <p className="text-xl font-bold text-white">{socialStats?.scheduled || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/[0.02] border-white/10">
                <CardHeader>
                  <CardTitle>Campanas Publicas</CardTitle>
                  <CardDescription>Oportunidades abiertas para aplicar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publicCampaigns?.map((campaign: any) => (
                    <CampaignCard key={campaign.id} campaign={campaign} type="public" />
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white/[0.02] border-white/10">
                <CardHeader>
                  <CardTitle>Mis Aplicaciones</CardTitle>
                  <CardDescription>Estado de tus postulaciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {applications?.map((app: any) => (
                    <CampaignCard
                      key={app.id}
                      campaign={{ ...app.campaign, status: app.status }}
                      type="applied"
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mis Proyectos</CardTitle>
                    <CardDescription>Trabajos activos y completados</CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/board?view=marketplace">
                      <Kanban className="w-4 h-4 mr-2" />
                      Ver Tablero
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {projects && projects.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project: any) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tienes proyectos activos</p>
                    <p className="text-sm mt-1">Aplica a campanas para comenzar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Social Hub</CardTitle>
                    <CardDescription>Gestiona tus redes sociales desde un solo lugar</CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/social-hub">
                      Ir a Social Hub
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Posts este mes"
                    value={socialStats?.posts_this_month || 0}
                    icon={Send}
                    color="purple"
                  />
                  <StatCard
                    title="Alcance total"
                    value={(socialStats?.total_reach || 0).toLocaleString()}
                    icon={Users}
                    color="blue"
                  />
                  <StatCard
                    title="Engagement"
                    value={`${socialStats?.engagement_rate || 0}%`}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatCard
                    title="Programados"
                    value={socialStats?.scheduled || 0}
                    icon={Calendar}
                    color="amber"
                  />
                </div>

                {!isPro && (
                  <div className="p-4 rounded-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Plan Gratuito: 50 posts/mes</p>
                        <p className="text-sm text-white/60">Has usado {socialStats?.posts_this_month || 0} de 50</p>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to="/planes">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Upgrade a Pro
                        </Link>
                      </Button>
                    </div>
                    <Progress value={((socialStats?.posts_this_month || 0) / 50) * 100} className="mt-3 h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
