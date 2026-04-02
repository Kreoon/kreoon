import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageCircle,
  TrendingUp,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  Heart,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useMarketplaceProposals } from '@/hooks/useMarketplaceProposals';
import { useMarketplaceFavorites } from '@/hooks/useMarketplaceFavorites';
import { useCreatorMatching } from '@/hooks/useCreatorMatching';
import { CreatorMatchingCard } from '@/components/marketplace/CreatorMatchingCard';
import { CompanyOnboarding } from '@/components/marketplace/CompanyOnboarding';
import type { CreatorMatch } from '@/types/ai-matching';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm mt-1",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>{trend.value}%</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="p-3 rounded-sm bg-secondary">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompanyDashboardPage() {
  const navigate = useNavigate();
  const { companyProfile, hasProfile, getProfileProgress } = useCompanyProfile();
  const { proposals, isLoading: proposalsLoading } = useMarketplaceProposals();
  const { favorites } = useMarketplaceFavorites();
  const conversations: any[] = [];
  const totalUnread = 0;
  const { searchCreators, isSearching } = useCreatorMatching();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [topMatches, setTopMatches] = useState<CreatorMatch[]>([]);
  const [hasLoadedMatches, setHasLoadedMatches] = useState(false);

  const profileProgress = getProfileProgress();

  // Load top matches on mount if profile exists
  const loadTopMatches = async () => {
    if (hasProfile && !hasLoadedMatches) {
      const results = await searchCreators({
        industry: companyProfile?.industry as any,
        limit: 5,
      });
      setTopMatches(results.matches);
      setHasLoadedMatches(true);
    }
  };

  // Auto-load matches
  if (hasProfile && !hasLoadedMatches && !isSearching) {
    loadTopMatches();
  }

  // Calculate stats
  const activeProposals = proposals.filter((p) =>
    ['pending', 'viewed', 'in_progress'].includes(p.status)
  ).length;
  const completedProposals = proposals.filter((p) => p.status === 'completed').length;
  const totalSpent = proposals
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.budget_amount || 0), 0);

  // Show onboarding if requested
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background p-6">
        <CompanyOnboarding
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  // Show prompt to create profile
  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6">
            <LayoutDashboard className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Bienvenido al Marketplace
          </h1>
          <p className="text-muted-foreground mb-6">
            Configura tu perfil de empresa para empezar a encontrar creadores
            y gestionar colaboraciones
          </p>
          <Button
            onClick={() => setShowOnboarding(true)}
            className="gap-2 bg-gradient-to-r from-primary to-purple-600"
          >
            <Sparkles className="h-4 w-4" />
            Configurar perfil de empresa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {companyProfile?.company_logo_url ? (
                  <AvatarImage src={companyProfile.company_logo_url} />
                ) : (
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {companyProfile?.company_name?.[0] || 'C'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {companyProfile?.company_name || 'Mi Empresa'}
                </h1>
                <p className="text-muted-foreground">
                  Dashboard del Marketplace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Profile completion */}
              {profileProgress < 100 && (
                <div className="hidden md:flex items-center gap-3 p-3 rounded-sm bg-background">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Perfil {profileProgress}% completo
                    </p>
                    <Progress value={profileProgress} className="h-1.5 mt-1 w-32" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOnboarding(true)}
                  >
                    Completar
                  </Button>
                </div>
              )}

              <Button
                onClick={() => navigate('/marketplace/explore')}
                className="gap-2 bg-gradient-to-r from-primary to-purple-600"
              >
                <Sparkles className="h-4 w-4" />
                Buscar creadores
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Propuestas activas"
            value={activeProposals}
            icon={FileText}
            description="En curso o pendientes"
          />
          <StatCard
            title="Proyectos completados"
            value={completedProposals}
            icon={CheckCircle}
            trend={completedProposals > 0 ? { value: 12, isPositive: true } : undefined}
          />
          <StatCard
            title="Total invertido"
            value={`$${totalSpent.toLocaleString()}`}
            icon={DollarSign}
          />
          <StatCard
            title="Mensajes no leídos"
            value={totalUnread}
            icon={MessageCircle}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent proposals */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Propuestas recientes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/marketplace/proposals')}
                >
                  Ver todas
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {proposalsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : proposals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No tienes propuestas aún
                    </p>
                    <Button
                      variant="link"
                      onClick={() => navigate('/marketplace/explore')}
                      className="mt-2"
                    >
                      Explorar creadores
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposals.slice(0, 5).map((proposal) => (
                      <motion.div
                        key={proposal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-3 rounded-sm hover:bg-background/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/marketplace/proposals/${proposal.id}`)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={proposal.creator?.avatar_url || undefined} />
                          <AvatarFallback>
                            {proposal.creator?.full_name?.[0] || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {proposal.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {proposal.creator?.full_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              proposal.status === 'completed' ? 'default' :
                              proposal.status === 'in_progress' ? 'secondary' :
                              proposal.status === 'pending' ? 'outline' : 'destructive'
                            }
                          >
                            {proposal.status === 'pending' && 'Pendiente'}
                            {proposal.status === 'in_progress' && 'En curso'}
                            {proposal.status === 'completed' && 'Completado'}
                            {proposal.status === 'cancelled' && 'Cancelado'}
                          </Badge>
                          {proposal.budget_amount && (
                            <p className="text-sm font-medium text-foreground mt-1">
                              ${proposal.budget_amount}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top matches */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Creadores recomendados
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/marketplace/explore')}
                >
                  Ver más
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Buscando los mejores matches...
                    </p>
                  </div>
                ) : topMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Completa tu perfil para ver recomendaciones
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {topMatches.slice(0, 3).map((match) => (
                      <CreatorMatchingCard
                        key={match.creator_id}
                        match={match}
                        variant="compact"
                        onClick={() => navigate(`/profile/${match.creator.username || match.creator.id}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick actions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground text-base">
                  Acciones rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/marketplace/explore')}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Buscar creadores
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/marketplace/favorites')}
                >
                  <Heart className="h-4 w-4 text-primary" />
                  Favoritos
                  <Badge variant="secondary" className="ml-auto">
                    {favorites.length}
                  </Badge>
                </Button>
              </CardContent>
            </Card>

            {/* Activity */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tu actividad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Perfiles vistos
                    </span>
                    <span className="font-medium text-foreground">
                      {Math.floor(Math.random() * 50) + 10}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Mensajes enviados
                    </span>
                    <span className="font-medium text-foreground">
                      {conversations.length * 3}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Tasa de respuesta
                    </span>
                    <span className="font-medium text-green-500">
                      94%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
