import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Lock,
  GraduationCap,
  Users,
  Calendar,
  Trophy,
  MessagesSquare,
  ChevronRight,
  Pin,
  Settings,
  Plus,
  BarChart2,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useSpaceFeed } from '@/hooks/academy/useAcademyCommunity';
import { useSpaceCalendar } from '@/hooks/academy/useAcademyCalendar';
import { useSpaceLeaderboard, useMySpacePoints } from '@/hooks/academy/useSpaceLeaderboard';
import { useSpaceMembers, useSpacePresence } from '@/hooks/academy/useAcademyCommunityV3';
import { useMyEnrollment } from '@/hooks/academy/useAcademyEnrollment';
import { useAuth } from '@/hooks/useAuth';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { OnlineIndicator } from '@/components/academy/community/OnlineIndicator';
import { LevelBadge } from '@/components/academy/gamification/LevelBadge';
import { EnergyMeter } from '@/components/academy/gamification/EnergyMeter';
import { StreakFlame } from '@/components/academy/gamification/StreakFlame';
import { BadgesShowcase } from '@/components/academy/gamification/BadgesShowcase';
import { MissionsCard } from '@/components/academy/gamification/MissionsCard';
import { useMyGamificationState } from '@/hooks/academy/useAcademyGamification';
import { useSpacePlugins } from '@/hooks/academy/useSpacePlugins';
import { MetaPixel } from '@/components/academy/integrations/MetaPixel';
import { KiroMentorWidget } from '@/components/academy/creative/KiroMentorWidget';
import { VibeScore } from '@/components/academy/creative/VibeScore';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { CourseBigCard } from '@/components/academy/big-cards/CourseBigCard';
import { ContinueLearningBigCard } from '@/components/academy/big-cards/ContinueLearningBigCard';
import { EventBigCard } from '@/components/academy/big-cards/EventBigCard';
import type { AcademySpaceEventFull } from '@/types/academy-v3';

export default function AcademiaSpaceHomePage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  const spaceId = (space as any)?.id;
  const accent = space?.accent_color || '#8B5CF6';

  const { data: feedPages } = useSpaceFeed(spaceId, null);
  const { data: events = [] } = useSpaceCalendar(spaceId);
  const { data: plugins } = useSpacePlugins(spaceId);
  const { data: leaderboard = [] } = useSpaceLeaderboard(spaceId, 'week');
  const { data: myPoints } = useMySpacePoints(spaceId);
  const { data: myGami } = useMyGamificationState(spaceId);
  const { data: members = [] } = useSpaceMembers(spaceId);
  const { data: presence = [] } = useSpacePresence(spaceId);

  const pinnedPosts = useMemo(() => {
    const posts = feedPages?.pages.flat() ?? [];
    return posts.filter((p: any) => p.is_pinned).slice(0, 2);
  }, [feedPages]);

  const recentPosts = useMemo(() => {
    const posts = feedPages?.pages.flat() ?? [];
    return posts.filter((p: any) => !p.is_pinned).slice(0, 3);
  }, [feedPages]);

  const upcomingEvents = useMemo<AcademySpaceEventFull[]>(() => {
    const now = Date.now();
    return events.filter((e) => new Date(e.starts_at).getTime() >= now).slice(0, 3);
  }, [events]);

  const newMembers = useMemo(() => (members as any[]).slice(0, 8), [members]);
  const onlineCount = presence.length;

  const firstCourse = ((space as any)?.courses ?? [])[0];
  const myEnrollmentInFirstCourse = useMyEnrollment(firstCourse?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary">
        <KreoonSkeleton variant="rectangular" width="100%" height={240} />
        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative space-y-6">
          <div className="flex items-end gap-4">
            <KreoonSkeleton variant="circular" width={96} height={96} />
            <div className="space-y-2 flex-1">
              <KreoonSkeleton variant="text" width="60%" height={32} />
              <KreoonSkeleton variant="text" width="40%" height={16} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            <div className="lg:col-span-2 space-y-3">
              <KreoonSkeleton variant="card" height={120} />
              <KreoonSkeleton variant="card" height={160} />
              <KreoonSkeleton variant="card" height={160} />
            </div>
            <div className="space-y-3">
              <KreoonSkeleton variant="card" height={140} />
              <KreoonSkeleton variant="card" height={120} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>Esta academia no existe o no es pública.</p>
        <Link to="/academia" className="text-purple-400 hover:text-purple-300">
          Volver a Academia
        </Link>
      </div>
    );
  }

  const isOwner = !!user && (space as any).owner_id === user.id;
  const allCourses = (space as any).courses ?? [];
  const courses = allCourses.filter((c: any) => c.status === 'published');
  const featuredCourses = courses.slice(0, 4);

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <MetaPixel
        pixelId={plugins?.meta_pixel_id ?? null}
        enabled={!!plugins?.meta_pixel_enabled}
      />

      {/* HERO */}
      <div
        className="relative h-64 md:h-80 overflow-hidden"
        style={{
          background: space.cover_image_url
            ? `url(${space.cover_image_url}) center/cover`
            : `linear-gradient(135deg, ${accent}60, ${accent}20 50%, #0a0a0f)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 relative">
        {/* Identidad — agrandada */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 mb-6">
          {space.logo_url ? (
            <img
              src={space.logo_url}
              alt={space.name}
              className="h-24 w-24 md:h-32 md:w-32 rounded-3xl object-cover border-4 border-[#0a0a0f] shadow-2xl flex-shrink-0"
            />
          ) : (
            <div
              className="h-24 w-24 md:h-32 md:w-32 rounded-3xl border-4 border-[#0a0a0f] shadow-2xl flex items-center justify-center flex-shrink-0 text-5xl"
              style={{ backgroundColor: `${accent}40` }}
              aria-hidden="true"
            >
              🎓
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 truncate text-white">
              {space.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-zinc-300 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Users className="h-3.5 w-3.5" />
                {space.member_count} miembros
              </span>
              <OnlineIndicator spaceId={(space as any).id} />
              <VibeScore spaceId={(space as any).id} accentColor={accent} />
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: space.plan_slug === 'pro' ? `${accent}30` : 'rgba(255,255,255,0.05)',
                  color: space.plan_slug === 'pro' ? accent : '#a1a1aa',
                }}
              >
                {space.plan_slug === 'pro' ? '✨ Pro' : 'Hobby'}
              </span>
            </div>
            {space.description && (
              <p className="text-sm md:text-base text-zinc-300 mt-3 max-w-2xl line-clamp-2 leading-relaxed">
                {space.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to={`/academia/${spaceSlug}/feed`}>
              <Button
                className="text-white font-bold rounded-2xl px-5 py-5 shadow-lg motion-safe:hover:scale-105 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  boxShadow: `0 6px 20px -4px ${accent}80`,
                }}
              >
                <MessagesSquare className="h-4 w-4 mr-2" /> Ir al feed
              </Button>
            </Link>
            <Link to={`/academia/${spaceSlug}/classroom`}>
              <Button
                variant="outline"
                className="border-2 border-white/15 rounded-2xl px-5 py-5 hover:bg-white/5 font-bold"
              >
                <GraduationCap className="h-4 w-4 mr-2" /> Ver cursos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SpaceNavbar spaceSlug={spaceSlug!} />
      </div>

      {/* Owner quick-actions */}
      {isOwner && (
        <div
          className="border-b border-white/10 sticky top-[49px] z-10 backdrop-blur-sm"
          style={{ backgroundColor: `${accent}12` }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-11 flex items-center justify-between gap-3">
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: accent }}>
              <Eye className="h-3 w-3" /> Modo propietario
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm" variant="ghost"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1"
                onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
              >
                <Plus className="h-3 w-3" /> Crear curso
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1"
                onClick={() => navigate(`/academia/${spaceSlug}/admin?tab=settings`)}
              >
                <Settings className="h-3 w-3" /> Editar space
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1"
                onClick={() => navigate(`/academia/${spaceSlug}/admin`)}
              >
                <BarChart2 className="h-3 w-3" /> Panel admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* KIRO Mentor */}
            {user && (
              <KiroMentorWidget spaceId={(space as any).id} spaceSlug={spaceSlug!} accentColor={accent} />
            )}

            {/* Continúa aprendiendo — banner XL */}
            {user && myEnrollmentInFirstCourse.data && firstCourse && (
              <ContinueLearningBigCard
                spaceSlug={spaceSlug!}
                courseTitle={firstCourse.title}
                courseSlug={firstCourse.slug}
                coverImageUrl={firstCourse.cover_image_url}
                progress={myEnrollmentInFirstCourse.data.completion_pct}
                accentColor={accent}
              />
            )}

            {/* Cursos destacados */}
            <section>
              <SectionHeader
                emoji="🎬"
                title="Cursos"
                accentColor={accent}
                action={
                  <Link
                    to={`/academia/${spaceSlug}/classroom`}
                    className="text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                    style={{ color: accent }}
                  >
                    Ver todos <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              />
              {featuredCourses.length === 0 ? (
                <EmptyState emoji="🎬" message="Aún no hay cursos publicados." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredCourses.map((course: any) => (
                    <CourseBigCard
                      key={course.id}
                      course={course}
                      spaceSlug={spaceSlug!}
                      accentColor={accent}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Posts fijados */}
            {pinnedPosts.length > 0 && (
              <section>
                <SectionHeader emoji="📌" title="Anclados" accentColor={accent} />
                <div className="space-y-3">
                  {pinnedPosts.map((post: any) => (
                    <MiniPostCard
                      key={post.id}
                      post={post}
                      spaceSlug={spaceSlug!}
                      accentColor={accent}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Posts recientes */}
            <section>
              <SectionHeader
                emoji="💬"
                title="Recientes en la comunidad"
                accentColor={accent}
                action={
                  <Link
                    to={`/academia/${spaceSlug}/feed`}
                    className="text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                    style={{ color: accent }}
                  >
                    Ver feed <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              />
              {recentPosts.length === 0 ? (
                <EmptyState emoji="✍️" message="Aún no hay posts. ¡Sé el primero!" />
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post: any) => (
                    <MiniPostCard
                      key={post.id}
                      post={post}
                      spaceSlug={spaceSlug!}
                      accentColor={accent}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* Mi nivel — Tarjeta hero gamification */}
            {myGami && (
              <BigCard
                accentColor={accent}
                glow
                gradient="purple"
                className="p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl" aria-hidden="true">⚔️</div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                      Tu nivel
                    </div>
                    <div className="font-extrabold text-base text-white">{myGami.title}</div>
                  </div>
                </div>
                <LevelBadge
                  level={myGami.level}
                  title={myGami.title}
                  xp={myGami.total_points}
                  showProgress
                  accentColor={accent}
                  size="md"
                />
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                  <EnergyMeter energy={myGami.energy ?? 100} size="sm" />
                  <StreakFlame days={myGami.streak_days ?? 0} size="sm" />
                </div>
              </BigCard>
            )}

            {/* Próximos eventos */}
            <BigCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">📅</span>
                  <h2 className="font-extrabold text-base text-zinc-100">Próximos eventos</h2>
                </div>
                <Link
                  to={`/academia/${spaceSlug}/calendar`}
                  className="text-xs font-bold hover:underline"
                  style={{ color: accent }}
                >
                  Ver todo
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="flex items-center gap-3 py-3">
                  <div className="text-3xl opacity-60" aria-hidden="true">🌙</div>
                  <div className="text-sm text-zinc-400">Sin eventos próximos</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((ev) => (
                    <EventBigCard
                      key={ev.id}
                      event={ev as any}
                      accentColor={accent}
                      compact
                    />
                  ))}
                </div>
              )}
            </BigCard>

            {/* Leaderboard */}
            <BigCard accentColor={accent} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">🏆</span>
                  <h2 className="font-extrabold text-base text-zinc-100">Top semana</h2>
                </div>
                <Link
                  to={`/academia/${spaceSlug}/leaderboard`}
                  className="text-xs font-bold hover:underline"
                  style={{ color: accent }}
                >
                  Ver todo
                </Link>
              </div>

              {leaderboard.length === 0 ? (
                <div className="flex items-center gap-3 py-3">
                  <div className="text-3xl opacity-60" aria-hidden="true">😴</div>
                  <div className="text-sm text-zinc-400">Sin actividad esta semana</div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.slice(0, 5).map((row, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                    return (
                      <li
                        key={row.id}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl p-2.5 transition-all',
                          i < 3 ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                        )}
                      >
                        <span className="text-xl w-7 text-center" aria-hidden="true">
                          {medal ?? <span className="text-sm font-bold text-zinc-500">{i + 1}</span>}
                        </span>
                        <MiniAvatar profile={row.user} accentColor={accent} size={36} />
                        <span className="flex-1 truncate text-sm font-semibold text-zinc-200">
                          {row.user?.full_name ?? 'Usuario'}
                        </span>
                        <span
                          className="text-sm font-extrabold tabular-nums"
                          style={{ color: i < 3 ? accent : '#a1a1aa' }}
                        >
                          {row.current_week_points}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </BigCard>

            {/* Misiones */}
            {user && <MissionsCard spaceId={(space as any).id} accentColor={accent} />}

            {/* Mis insignias */}
            {user && (
              <BigCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl" aria-hidden="true">🏅</span>
                  <h2 className="font-extrabold text-base text-zinc-100">Mis insignias</h2>
                </div>
                <BadgesShowcase spaceId={(space as any).id} accentColor={accent} compact />
              </BigCard>
            )}

            {/* Miembros */}
            <BigCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">👥</span>
                  <h2 className="font-extrabold text-base text-zinc-100">Miembros</h2>
                </div>
                <Link
                  to={`/academia/${spaceSlug}/members`}
                  className="text-xs font-bold hover:underline"
                  style={{ color: accent }}
                >
                  Ver todos
                </Link>
              </div>
              <div className="text-xs text-zinc-400 mb-3">
                {space.member_count} totales · <span className="text-emerald-400 font-bold">{onlineCount} en línea</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {newMembers.map((m: any) => (
                  <Link
                    key={m.id}
                    to={`/academia/${spaceSlug}/members`}
                    title={m.user?.full_name ?? 'Miembro'}
                    className="motion-safe:hover:scale-110 transition-transform"
                  >
                    <MiniAvatar profile={m.user} accentColor={accent} size={40} />
                  </Link>
                ))}
              </div>
            </BigCard>
          </aside>
        </div>
      </div>
      {/* keep myPoints reference */}
      <span className="hidden" aria-hidden="true">{myPoints?.total_points ?? 0}</span>
      <Sparkles className="hidden" aria-hidden="true" />
    </div>
  );
}

// ─── helpers ───

function SectionHeader({
  emoji,
  title,
  accentColor,
  action,
}: {
  emoji: string;
  title: string;
  accentColor: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl" aria-hidden="true">{emoji}</span>
        <h2 className="font-extrabold text-lg text-zinc-100">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ emoji, message }: { emoji: string; message: string }) {
  return (
    <Card className="rounded-2xl p-8 text-center bg-white/[0.02] border-2 border-dashed border-white/10">
      <div className="text-5xl mb-2" aria-hidden="true">{emoji}</div>
      <div className="text-sm text-zinc-400">{message}</div>
    </Card>
  );
}

function MiniPostCard({
  post,
  spaceSlug,
  accentColor,
}: {
  post: any;
  spaceSlug: string;
  accentColor: string;
}) {
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  })();
  const html = sanitizeHTML(post.body_html ?? post.body.replace(/\n/g, '<br>'));
  return (
    <Link to={`/academia/${spaceSlug}/feed`}>
      <BigCard
        className={cn('p-4 cursor-pointer', post.is_pinned && 'border-l-4')}
        style={post.is_pinned ? { borderLeftColor: accentColor } : undefined}
      >
        <div className="flex items-start gap-3 mb-2">
          <MiniAvatar profile={post.author} accentColor={accentColor} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm truncate text-zinc-100">
                {post.author?.full_name ?? 'Usuario'}
              </span>
              {post.category && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    color: post.category.color,
                    backgroundColor: `${post.category.color}20`,
                  }}
                >
                  {post.category.emoji} {post.category.name}
                </span>
              )}
              <span className="text-[10px] text-zinc-500">· {timeAgo}</span>
            </div>
          </div>
          {post.is_pinned && <Pin className="h-3.5 w-3.5" style={{ color: accentColor }} />}
        </div>
        {post.title && <h3 className="font-bold mb-1 leading-snug text-zinc-100">{post.title}</h3>}
        <div
          className="prose prose-invert prose-sm max-w-none text-sm text-zinc-300 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {(post.like_count > 0 || post.comment_count > 0) && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            {post.like_count > 0 && (
              <span className="flex items-center gap-1 text-rose-300">
                ❤️ {post.like_count}
              </span>
            )}
            {post.comment_count > 0 && (
              <span className="flex items-center gap-1 text-zinc-400">
                💬 {post.comment_count}
              </span>
            )}
          </div>
        )}
      </BigCard>
    </Link>
  );
}

function MiniAvatar({
  profile,
  accentColor,
  size = 32,
}: {
  profile: any;
  accentColor: string;
  size?: number;
}) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="rounded-full object-cover flex-shrink-0 border-2 border-white/10"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 border-2 border-white/10"
      style={{
        height: size,
        width: size,
        background: `linear-gradient(135deg, ${accentColor}80, ${accentColor}40)`,
        fontSize: size * 0.4,
      }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

// suprimir warning Trophy/Calendar imports
void Trophy; void Calendar;
