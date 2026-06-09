import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Lock,
  GraduationCap,
  Users,
  Calendar,
  Trophy,
  MessagesSquare,
  ChevronRight,
  Sparkles,
  Pin,
  Award,
  Video,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { safeUrl } from '@/lib/safeUrl';
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
import type { AcademySpaceEventFull } from '@/types/academy-v3';

export default function AcademiaSpaceHomePage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
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

  const myEnrollmentInFirstCourse = useMyEnrollment(((space as any)?.courses ?? [])[0]?.id);

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

  const courses = ((space as any).courses ?? []).filter((c: any) => c.status === 'published');
  const featuredCourses = courses.slice(0, 4);

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      {/* Meta Pixel del space (si está habilitado) */}
      <MetaPixel
        pixelId={plugins?.meta_pixel_id ?? null}
        enabled={!!plugins?.meta_pixel_enabled}
      />

      {/* HERO */}
      <div
        className="relative h-56 md:h-72 overflow-hidden"
        style={{
          background: space.cover_image_url
            ? `url(${space.cover_image_url}) center/cover`
            : `linear-gradient(135deg, ${accent}50, #0a0a0f)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative">
        {/* Card de identidad */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 mb-4">
          {space.logo_url ? (
            <img
              src={space.logo_url}
              alt={space.name}
              className="h-20 w-20 md:h-28 md:w-28 rounded-2xl object-cover border-4 border-[#0a0a0f] shadow-xl flex-shrink-0"
            />
          ) : (
            <div
              className="h-20 w-20 md:h-28 md:w-28 rounded-2xl border-4 border-[#0a0a0f] shadow-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accent}30` }}
            >
              <GraduationCap className="h-10 w-10" style={{ color: accent }} />
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-2xl md:text-4xl font-bold mb-1 truncate">{space.name}</h1>
            <div className="flex items-center gap-3 text-sm text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {space.member_count} miembros
              </span>
              <OnlineIndicator spaceId={(space as any).id} />
              <VibeScore spaceId={(space as any).id} accentColor={accent} />
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-wider">
                {space.plan_slug === 'pro' ? 'Pro' : 'Hobby'}
              </span>
            </div>
            {space.description && (
              <p className="text-sm text-zinc-400 mt-2 max-w-2xl line-clamp-2">
                {space.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to={`/academia/${spaceSlug}/feed`}>
              <Button
                className="text-white"
                style={{ backgroundColor: accent }}
              >
                <MessagesSquare className="h-4 w-4 mr-2" /> Ir al feed
              </Button>
            </Link>
            <Link to={`/academia/${spaceSlug}/classroom`}>
              <Button variant="outline" className="border-white/10">
                <GraduationCap className="h-4 w-4 mr-2" /> Ver cursos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Nav del space */}
      <div className="mt-6">
        <SpaceNavbar spaceSlug={spaceSlug!} />
      </div>

      {/* GRID HOME */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* KIRO Mentor — diferenciador único KREOON */}
            {user && (
              <KiroMentorWidget spaceId={(space as any).id} spaceSlug={spaceSlug!} accentColor={accent} />
            )}

            {/* Mi progreso (si está inscrito) */}
            {user && myEnrollmentInFirstCourse.data && (
              <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-cyan-500/5 border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Continúa aprendiendo
                    </div>
                    <h3 className="font-bold text-lg mt-1">
                      {((space as any).courses ?? [])[0]?.title}
                    </h3>
                  </div>
                  <Link
                    to={`/academia/${spaceSlug}/${((space as any).courses ?? [])[0]?.slug}/learn`}
                  >
                    <Button size="sm" className="text-white" style={{ backgroundColor: accent }}>
                      <Video className="h-3.5 w-3.5 mr-1" /> Continuar
                    </Button>
                  </Link>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${myEnrollmentInFirstCourse.data.completion_pct}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {Math.round(myEnrollmentInFirstCourse.data.completion_pct)}% completado
                </div>
              </Card>
            )}

            {/* Posts fijados */}
            {pinnedPosts.length > 0 && (
              <section>
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                  <Pin className="h-3.5 w-3.5" /> Anclados
                </h2>
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <MessagesSquare className="h-3.5 w-3.5" /> Recientes en la comunidad
                </h2>
                <Link
                  to={`/academia/${spaceSlug}/feed`}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  Ver feed completo <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {recentPosts.length === 0 ? (
                <Card className="p-6 text-center text-sm text-zinc-500 bg-white/5 border-white/10">
                  Aún no hay posts. ¡Sé el primero!
                </Card>
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

            {/* Cursos destacados */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" /> Cursos
                </h2>
                <Link
                  to={`/academia/${spaceSlug}/classroom`}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {featuredCourses.length === 0 ? (
                <Card className="p-6 text-center text-sm text-zinc-500 bg-white/5 border-white/10">
                  Aún no hay cursos publicados.
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuredCourses.map((course: any) => (
                    <Link
                      to={`/academia/${spaceSlug}/${course.slug}`}
                      key={course.id}
                    >
                      <Card className="overflow-hidden bg-white/5 border-white/10 hover:border-purple-500/40 transition-colors h-full">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt=""
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-28 w-full"
                            style={{
                              background: `linear-gradient(135deg, ${accent}40, transparent)`,
                            }}
                          />
                        )}
                        <div className="p-3">
                          <h3 className="font-semibold text-zinc-100 text-sm line-clamp-2">
                            {course.title}
                          </h3>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">
                              {course.enrolled_count ?? 0} estudiantes
                            </span>
                            <span className="font-semibold" style={{ color: accent }}>
                              {course.is_free ? 'Gratis' : `US$${course.price_usd}`}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Próximos eventos */}
            <Card className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Próximos eventos
                </h2>
                <Link
                  to={`/academia/${spaceSlug}/calendar`}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Ver todo
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Sin eventos próximos</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingEvents.map((ev) => {
                    const dt = new Date(ev.starts_at);
                    const meet = safeUrl(ev.meeting_url ?? ev.google_meet_link);
                    return (
                      <li
                        key={ev.id}
                        className="flex items-start gap-2 p-2 rounded hover:bg-white/5"
                      >
                        <div
                          className="rounded p-1.5 text-center flex-shrink-0"
                          style={{
                            backgroundColor: `${accent}20`,
                            color: accent,
                            minWidth: 38,
                          }}
                        >
                          <div className="text-[9px] uppercase">
                            {format(dt, 'MMM', { locale: es })}
                          </div>
                          <div className="text-sm font-bold leading-none">{format(dt, 'd')}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{ev.title}</div>
                          <div className="text-[10px] text-zinc-500">
                            {format(dt, 'HH:mm')} · {ev.rsvp_count} invitados
                          </div>
                          {meet && (
                            <a
                              href={meet}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] hover:underline"
                              style={{ color: accent }}
                            >
                              Unirse
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Mi posición + Leaderboard mini */}
            <Card className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5" /> Leaderboard · semana
                </h2>
                <Link
                  to={`/academia/${spaceSlug}/leaderboard`}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Ver todo
                </Link>
              </div>

              {myGami && (
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{ backgroundColor: `${accent}10`, borderLeft: `2px solid ${accent}` }}
                >
                  <LevelBadge
                    level={myGami.level}
                    title={myGami.title}
                    xp={myGami.total_points}
                    showProgress
                    accentColor={accent}
                    size="md"
                  />
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <EnergyMeter energy={myGami.energy ?? 100} size="sm" />
                    <StreakFlame days={myGami.streak_days ?? 0} size="sm" />
                  </div>
                </div>
              )}

              {leaderboard.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Sin actividad esta semana</p>
              ) : (
                <ul className="space-y-1.5">
                  {leaderboard.slice(0, 5).map((row, i) => (
                    <li key={row.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="text-xs w-5 text-center font-bold"
                        style={{
                          color: i === 0 ? '#fbbf24' : i === 1 ? '#a3a3a3' : i === 2 ? '#cd7f32' : '#71717a',
                        }}
                      >
                        {i + 1}
                      </span>
                      <MiniAvatar profile={row.user} accentColor={accent} />
                      <span className="flex-1 truncate text-xs">
                        {row.user?.full_name ?? 'Usuario'}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: accent }}>
                        {row.current_week_points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Nuevos miembros */}
            <Card className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Miembros
                </h2>
                <Link
                  to={`/academia/${spaceSlug}/members`}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Ver todos
                </Link>
              </div>
              <div className="text-xs text-zinc-500 mb-2">
                {space.member_count} totales · {onlineCount} en línea ahora
              </div>
              <div className="flex flex-wrap gap-1.5">
                {newMembers.map((m: any) => (
                  <Link
                    key={m.id}
                    to={`/academia/${spaceSlug}/members`}
                    title={m.user?.full_name ?? 'Miembro'}
                  >
                    <MiniAvatar profile={m.user} accentColor={accent} size={32} />
                  </Link>
                ))}
              </div>
            </Card>

            {/* Misiones semanales — diferenciador */}
            {user && (
              <MissionsCard spaceId={(space as any).id} accentColor={accent} />
            )}

            {/* Mis insignias */}
            {user && (
              <Card className="p-4 bg-kreoon-bg-card border-white/10">
                <h2 className="text-sm uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-3">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" /> Mis insignias
                </h2>
                <BadgesShowcase spaceId={(space as any).id} accentColor={accent} compact />
              </Card>
            )}

            {/* Online ahora — sutil */}
            {onlineCount > 0 && (
              <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
                <OnlineIndicator spaceId={(space as any).id} />
                <div className="text-[10px] text-zinc-500 mt-1">
                  Conéctate con la comunidad ahora mismo
                </div>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Mini componentes ──

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
      <Card
        className={cn(
          'p-4 bg-white/5 border-white/10 hover:border-white/20 transition-colors cursor-pointer',
          post.is_pinned && 'border-l-2'
        )}
        style={post.is_pinned ? { borderLeftColor: accentColor } : undefined}
      >
        <div className="flex items-start gap-3 mb-2">
          <MiniAvatar profile={post.author} accentColor={accentColor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">
                {post.author?.full_name ?? 'Usuario'}
              </span>
              {post.category && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    color: post.category.color,
                    backgroundColor: `${post.category.color}15`,
                  }}
                >
                  {post.category.emoji} {post.category.name}
                </span>
              )}
              <span className="text-[10px] text-zinc-500">· {timeAgo}</span>
            </div>
          </div>
        </div>
        {post.title && <h3 className="font-bold mb-1 leading-snug">{post.title}</h3>}
        <div
          className="prose prose-invert prose-sm max-w-none text-sm text-zinc-300 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
          {post.like_count > 0 && <span>{post.like_count} reacciones</span>}
          {post.comment_count > 0 && <span>{post.comment_count} comentarios</span>}
        </div>
      </Card>
    </Link>
  );
}

function MiniAvatar({
  profile,
  accentColor,
  size = 28,
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
        className="rounded-full object-cover flex-shrink-0"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{
        height: size,
        width: size,
        backgroundColor: `${accentColor}40`,
        fontSize: size * 0.4,
      }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

// Suprimir warning de Sparkles import sin uso
void Sparkles;
