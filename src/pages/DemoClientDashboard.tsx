import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Video,
  Users,
  Megaphone,
  CheckCircle2,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Search,
  Star,
  MapPin,
  Play,
  Filter,
  Sparkles,
  TrendingUp,
  DollarSign,
  ExternalLink,
  ChevronRight,
  BadgeCheck,
  Zap,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoTour } from '@/components/demo/DemoTour';
import {
  DEMO_BRAND,
  DEMO_CAMPAIGNS,
  DEMO_CREATORS,
  DEMO_VIDEOS,
  DEMO_STATS,
} from '@/lib/demo-data';
import { cn } from '@/lib/utils';

const COP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  draft: { label: 'Borrador', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  completed: { label: 'Completada', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  pending_review: { label: 'Pendiente revisión', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  approved: { label: 'Aprobado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  revision_requested: { label: 'Revisión solicitada', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const BADGE_CONFIG: Record<string, string> = {
  gold: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  silver: 'text-slate-300 bg-slate-500/15 border-slate-400/30',
  bronze: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  id,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  id?: string;
}) {
  return (
    <Card className="bg-kreoon-bg-card border-kreoon-border" id={id}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-kreoon-text-muted font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-kreoon-text-primary">{value}</p>
            {sub && <p className="text-xs text-kreoon-text-muted">{sub}</p>}
          </div>
          <div className={cn('rounded-xl p-2.5', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemoClientDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [creatorSearch, setCreatorSearch] = useState('');

  const filteredCreators = DEMO_CREATORS.filter(
    (c) =>
      !creatorSearch ||
      c.full_name.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      c.specialties.some((s) => s.toLowerCase().includes(creatorSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-kreoon-bg-primary">
      <DemoBanner />
      <DemoTour />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-kreoon-text-primary">{DEMO_BRAND.name}</h1>
              <BadgeCheck className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-sm text-kreoon-text-muted">{DEMO_BRAND.industry} · {DEMO_BRAND.city}</p>
          </div>
          <Button
            className="bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 gap-2 shrink-0"
            onClick={() => setActiveTab('campaigns')}
          >
            <Plus className="h-4 w-4" />
            Nueva campaña
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-kreoon-bg-card border border-kreoon-border">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="campaigns" id="demo-tour-campaigns">Campañas</TabsTrigger>
            <TabsTrigger value="videos" id="demo-tour-videos">Contenido</TabsTrigger>
            <TabsTrigger value="marketplace" id="demo-tour-marketplace">Marketplace</TabsTrigger>
          </TabsList>

          {/* ---- OVERVIEW ---- */}
          <TabsContent value="overview" className="space-y-6 mt-6" id="demo-tour-overview">
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Megaphone}
                label="Campañas activas"
                value={DEMO_STATS.campaigns_active}
                sub={`${DEMO_STATS.campaigns_draft} en borrador`}
                color="bg-violet-500/15 text-violet-400"
              />
              <StatCard
                icon={Video}
                label="Videos recibidos"
                value={DEMO_STATS.videos_total}
                sub={`${DEMO_STATS.videos_pending_review} por revisar`}
                color="bg-pink-500/15 text-pink-400"
              />
              <StatCard
                icon={Users}
                label="Creadores activos"
                value={DEMO_STATS.creators_hired}
                sub="6 verificados"
                color="bg-blue-500/15 text-blue-400"
              />
              <StatCard
                icon={TrendingUp}
                label="Tasa aprobación"
                value={`${DEMO_STATS.content_approval_rate}%`}
                sub="Sobre promedio"
                color="bg-emerald-500/15 text-emerald-400"
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Campañas activas */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-kreoon-text-secondary uppercase tracking-wider">
                    Campañas activas
                  </h2>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-purple-400" onClick={() => setActiveTab('campaigns')}>
                    Ver todas <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                {DEMO_CAMPAIGNS.filter((c) => c.status === 'active').map((camp) => (
                  <Card key={camp.id} className="bg-kreoon-bg-card border-kreoon-border hover:border-purple-500/40 transition-colors cursor-pointer" onClick={() => setActiveTab('campaigns')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-kreoon-text-primary text-sm truncate">{camp.title}</p>
                          <p className="text-xs text-kreoon-text-muted mt-0.5">{camp.content_type} · {camp.deliverables} entregables</p>
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', STATUS_CONFIG.active.color)}>
                          {STATUS_CONFIG.active.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-kreoon-text-primary">{camp.applications}</p>
                          <p className="text-[11px] text-kreoon-text-muted">Aplicaciones</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-400">{camp.pending_review}</p>
                          <p className="text-[11px] text-kreoon-text-muted">Por revisar</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-400">{camp.approved}</p>
                          <p className="text-[11px] text-kreoon-text-muted">Aprobados</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-kreoon-text-muted mb-1">
                          <span>Progreso</span>
                          <span>{Math.round((camp.completed / camp.deliverables) * 100)}%</span>
                        </div>
                        <Progress value={(camp.completed / camp.deliverables) * 100} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Videos pendientes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-kreoon-text-secondary uppercase tracking-wider">
                    Por revisar
                  </h2>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-purple-400" onClick={() => setActiveTab('videos')}>
                    Ver todo <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                {DEMO_VIDEOS.filter((v) => v.status === 'pending_review').map((video) => (
                  <Card key={video.id} className="bg-kreoon-bg-card border-kreoon-border hover:border-amber-500/40 transition-colors cursor-pointer" onClick={() => setActiveTab('videos')}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Play className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-kreoon-text-primary truncate">{video.title}</p>
                          <p className="text-xs text-kreoon-text-muted">{video.creator_name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[11px] w-full justify-center', STATUS_CONFIG.pending_review.color)}>
                        {STATUS_CONFIG.pending_review.label}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-gradient-to-br from-violet-900/20 to-pink-900/20 border border-violet-500/20">
                  <CardContent className="p-4 text-center space-y-2">
                    <Zap className="h-6 w-6 text-violet-400 mx-auto" />
                    <p className="text-xs text-kreoon-text-muted">Aprueba o pide revisión directamente aquí, sin salir de la plataforma.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ---- CAMPAIGNS ---- */}
          <TabsContent value="campaigns" className="space-y-5 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-kreoon-text-primary">Todas las campañas</h2>
              <Button className="bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 gap-2">
                <Plus className="h-4 w-4" />
                Nueva campaña
              </Button>
            </div>

            <div className="space-y-4">
              {DEMO_CAMPAIGNS.map((camp, i) => (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Card className="bg-kreoon-bg-card border-kreoon-border hover:border-purple-500/30 transition-all">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Icon placeholder */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <Target className="h-5 w-5 text-violet-400" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h3 className="font-semibold text-kreoon-text-primary">{camp.title}</h3>
                              <p className="text-xs text-kreoon-text-muted mt-0.5 line-clamp-1">{camp.description}</p>
                            </div>
                            <Badge variant="outline" className={cn('text-xs shrink-0', STATUS_CONFIG[camp.status]?.color)}>
                              {STATUS_CONFIG[camp.status]?.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {camp.tags.map((tag) => (
                              <span key={tag} className="text-[11px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-kreoon-text-muted">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                            <div>
                              <p className="text-[11px] text-kreoon-text-muted">Presupuesto</p>
                              <p className="text-sm font-semibold text-kreoon-text-primary">{COP(camp.budget)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-kreoon-text-muted">Tipo</p>
                              <p className="text-sm font-medium text-kreoon-text-primary">{camp.content_type}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-kreoon-text-muted">Aplicaciones</p>
                              <p className="text-sm font-semibold text-blue-400">{camp.applications}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-kreoon-text-muted">Aprobados</p>
                              <p className="text-sm font-semibold text-emerald-400">{camp.approved}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-kreoon-text-muted">Completados</p>
                              <p className="text-sm font-semibold text-purple-400">{camp.completed}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Call to action */}
            <Card className="bg-gradient-to-br from-violet-900/20 to-pink-900/20 border border-violet-500/20">
              <CardContent className="p-6 text-center space-y-3">
                <Sparkles className="h-8 w-8 text-violet-400 mx-auto" />
                <h3 className="font-semibold text-kreoon-text-primary">Crea tu primera campaña real</h3>
                <p className="text-sm text-kreoon-text-muted max-w-sm mx-auto">
                  Define el brief, el presupuesto y los entregables. Los creadores del marketplace aplican directamente.
                </p>
                <Button className="bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 gap-2">
                  <Plus className="h-4 w-4" />
                  Crear campaña
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- VIDEOS / CONTENIDO ---- */}
          <TabsContent value="videos" className="space-y-5 mt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-kreoon-text-primary">Contenido recibido</h2>
              <div className="flex items-center gap-2 text-xs text-kreoon-text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Por revisar ({DEMO_VIDEOS.filter(v => v.status === 'pending_review').length})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Aprobados ({DEMO_VIDEOS.filter(v => v.status === 'approved').length})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> En revisión ({DEMO_VIDEOS.filter(v => v.status === 'revision_requested').length})</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {DEMO_VIDEOS.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Card className="bg-kreoon-bg-card border-kreoon-border hover:border-purple-500/30 transition-all h-full">
                    {/* Thumbnail placeholder */}
                    <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-xl flex items-center justify-center border-b border-kreoon-border">
                      <div className="flex flex-col items-center gap-2 text-gray-600">
                        <Play className="h-10 w-10" />
                        <span className="text-xs">Vista previa disponible al aprobar</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'absolute top-3 right-3 text-[11px]',
                          STATUS_CONFIG[video.status]?.color
                        )}
                      >
                        {STATUS_CONFIG[video.status]?.label}
                      </Badge>
                      <span className="absolute bottom-3 right-3 text-[11px] bg-black/60 text-white px-2 py-0.5 rounded">
                        {video.duration_sec}s
                      </span>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-medium text-kreoon-text-primary text-sm">{video.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[10px] bg-purple-500/20 text-purple-300">
                              {video.creator_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-kreoon-text-muted">{video.creator_name}</span>
                          <span className="text-[11px] text-kreoon-text-muted">· {video.platform}</span>
                        </div>
                      </div>

                      {video.notes && (
                        <p className="text-[12px] text-kreoon-text-muted bg-white/5 rounded-lg p-2.5 border border-white/5 leading-relaxed">
                          {video.notes}
                        </p>
                      )}

                      {video.status === 'pending_review' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Pedir revisión
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ---- MARKETPLACE ---- */}
          <TabsContent value="marketplace" className="space-y-5 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-kreoon-text-primary">Marketplace de Creadores</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kreoon-text-muted" />
                <Input
                  placeholder="Buscar por nombre o especialidad..."
                  value={creatorSearch}
                  onChange={(e) => setCreatorSearch(e.target.value)}
                  className="pl-9 bg-kreoon-bg-card border-kreoon-border text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreators.map((creator, i) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className="bg-kreoon-bg-card border-kreoon-border hover:border-purple-500/40 transition-all cursor-pointer group h-full">
                    <CardContent className="p-4 space-y-3">
                      {/* Creator header */}
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white font-semibold text-sm">
                            {creator.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-kreoon-text-primary text-sm">{creator.full_name}</p>
                            {creator.verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-purple-400">@{creator.username}</p>
                        </div>
                        {creator.badge && (
                          <Badge variant="outline" className={cn('text-[11px] capitalize shrink-0', BADGE_CONFIG[creator.badge])}>
                            {creator.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-kreoon-text-muted line-clamp-2 leading-relaxed">{creator.bio}</p>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1">
                        {creator.specialties.map((s) => (
                          <span key={s} className="text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-2 py-0.5">
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-t border-kreoon-border">
                        <div className="text-center">
                          <p className="text-sm font-bold text-kreoon-text-primary">
                            {creator.followers >= 1000 ? `${(creator.followers / 1000).toFixed(0)}K` : creator.followers}
                          </p>
                          <p className="text-[11px] text-kreoon-text-muted">Seguidores</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-400">{creator.engagement_rate}%</p>
                          <p className="text-[11px] text-kreoon-text-muted">Engagement</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-kreoon-text-primary">{creator.campaigns_completed}</p>
                          <p className="text-[11px] text-kreoon-text-muted">Campañas</p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-kreoon-text-primary">{creator.rating}</span>
                          <span className="text-xs text-kreoon-text-muted">({creator.reviews})</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-kreoon-text-muted">Desde</p>
                          <p className="text-sm font-semibold text-kreoon-text-primary">{COP(creator.rate_per_video)}</p>
                        </div>
                      </div>

                      <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver perfil e invitar
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredCreators.length === 0 && (
              <div className="text-center py-12 text-kreoon-text-muted">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No se encontraron creadores con ese filtro</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
