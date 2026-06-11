import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Clock, BarChart3, Award, Play, Lock, CheckCircle2, Pencil,
  Users, Settings, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { useAcademyCourseBySlug } from '@/hooks/academy/useAcademyCourse';
import { useEnrollInCourse, useMyEnrollment } from '@/hooks/academy/useAcademyEnrollment';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { cn } from '@/lib/utils';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaCoursePage() {
  const { spaceSlug, courseSlug } = useParams<{ spaceSlug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading } = useAcademyCourseBySlug(spaceSlug, courseSlug);
  const { data: enrollment } = useMyEnrollment(course?.id);
  const enroll = useEnrollInCourse();
  const [enrolling, setEnrolling] = useState(false);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <KreoonSkeleton variant="rectangular" width="100%" height={400} />
              <KreoonSkeleton variant="text" width="70%" height={40} />
              <KreoonSkeleton variant="text" width="90%" height={16} />
              <KreoonSkeleton variant="card" height={80} />
            </div>
            <div className="space-y-4">
              <KreoonSkeleton variant="card" height={320} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>Este curso no existe o no está publicado.</p>
        <Link to={`/academia/${spaceSlug}`} className="text-purple-400 hover:text-purple-300">
          Volver a la academia
        </Link>
      </div>
    );
  }

  const modules = (course.modules ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const lessonsCount = modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);
  const isEnrolled = !!enrollment;
  const isOwner =
    !!user && (course.instructor_id === user.id || course.space?.owner_id === user.id);

  async function handleEnroll() {
    if (!user) {
      navigate('/auth');
      return;
    }
    setEnrolling(true);
    try {
      const res = await enroll.mutateAsync({ courseId: course!.id });
      if (res.type === 'enrolled') {
        navigate(`/academia/${spaceSlug}/${courseSlug}/learn`);
      } else if (res.type === 'checkout' && res.url) {
        window.location.href = res.url;
      }
    } catch {
      toast.error('No se pudo procesar la inscripción. Intenta de nuevo.');
    } finally {
      setEnrolling(false);
    }
  }

  function toggleModule(id: string) {
    const next = new Set(openModules);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenModules(next);
  }

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />

      {/* Owner bar */}
      {isOwner && (
        <div
          className="border-b border-white/5 sticky top-[57px] z-10 backdrop-blur-md"
          style={{ backgroundColor: `${KREOON_PURPLE}12` }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-12 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#a855f7' }}>
              ✏️ Modo propietario · {course.title}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-zinc-300 rounded-xl"
                onClick={() => navigate(`/academia/${spaceSlug}/${courseSlug}/edit?tab=content`)}
              >
                <Settings className="h-3.5 w-3.5" /> Módulos
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 rounded-xl text-white font-bold shadow-lg"
                style={{
                  backgroundColor: KREOON_PURPLE,
                  boxShadow: `0 4px 12px -2px ${KREOON_PURPLE}80`,
                }}
                onClick={() => navigate(`/academia/${spaceSlug}/${courseSlug}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar curso
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero banner XL */}
      <div
        className="relative aspect-[21/9] md:aspect-[3/1] max-h-[420px] w-full overflow-hidden"
        style={
          !course.cover_image_url
            ? {
                background: `linear-gradient(135deg, ${KREOON_PURPLE}50 0%, ${KREOON_PURPLE}20 50%, #0a0a0f 100%)`,
              }
            : undefined
        }
      >
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-30" aria-hidden="true">
            🎬
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-kreoon-bg-primary via-kreoon-bg-primary/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-32 md:-mt-40 relative pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Link
                to={`/academia/${spaceSlug}`}
                className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white font-bold"
              >
                ← {course.space?.name}
              </Link>
              <h1 className="text-3xl md:text-5xl font-extrabold mt-3 mb-4 text-white leading-tight">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-base md:text-lg text-zinc-300 leading-relaxed max-w-3xl">
                  {course.description}
                </p>
              )}

              {/* Stats inline */}
              <div className="flex items-center gap-4 mt-5 text-sm text-zinc-300 flex-wrap">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <CheckCircle2 className="h-4 w-4" style={{ color: KREOON_PURPLE }} />
                  {lessonsCount} lecciones
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <Clock className="h-4 w-4" style={{ color: KREOON_PURPLE }} />
                  {course.total_duration_minutes > 0
                    ? `${Math.round(course.total_duration_minutes / 60)}h`
                    : 'Variable'}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <BarChart3 className="h-4 w-4" style={{ color: KREOON_PURPLE }} />
                  {labelDifficulty(course.difficulty)}
                </span>
                {(course.enrolled_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <Users className="h-4 w-4" style={{ color: KREOON_PURPLE }} />
                    {course.enrolled_count} alumnos
                  </span>
                )}
                {course.certificate_enabled && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    <Award className="h-4 w-4" />
                    Certificado
                  </span>
                )}
              </div>
            </div>

            {/* Instructor */}
            {course.instructor && (
              <BigCard className="p-5">
                <div className="flex items-center gap-4">
                  {course.instructor.avatar_url ? (
                    <img
                      src={course.instructor.avatar_url}
                      alt={`Avatar de ${course.instructor.full_name ?? 'instructor'}`}
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-lg text-2xl font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${KREOON_PURPLE}80, ${KREOON_PURPLE}40)`,
                      }}
                    >
                      {(course.instructor.full_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      🎓 Instructor
                    </div>
                    <div className="font-extrabold text-lg text-white">
                      {course.instructor.full_name ?? 'Instructor'}
                    </div>
                  </div>
                </div>
              </BigCard>
            )}

            {/* Currículum */}
            <div>
              <h2 className="text-2xl font-extrabold mb-4 flex items-center gap-2 text-white">
                <span aria-hidden="true">📚</span> Currículum
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  {modules.length} módulo{modules.length !== 1 ? 's' : ''} · {lessonsCount} lecciones
                </span>
              </h2>
              <div className="space-y-3">
                {modules.map((m, mi) => {
                  const lessons = (m.lessons ?? [])
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order);
                  const isOpen = openModules.has(m.id);
                  return (
                    <BigCard key={m.id} className="overflow-hidden">
                      <button
                        onClick={() => toggleModule(m.id)}
                        className="w-full p-5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                      >
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-extrabold flex-shrink-0"
                          style={{
                            backgroundColor: `${KREOON_PURPLE}25`,
                            color: '#c084fc',
                          }}
                        >
                          {mi + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-base md:text-lg text-white">
                            {m.title}
                          </h3>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            {lessons.length} lección{lessons.length !== 1 ? 'es' : ''}
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-5 w-5 text-zinc-400 transition-transform flex-shrink-0',
                            isOpen && 'rotate-180'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5">
                          {m.description && (
                            <p
                              className="px-5 py-3 text-sm text-zinc-400 leading-relaxed bg-white/[0.02]"
                              dangerouslySetInnerHTML={{ __html: sanitizeHTML(m.description) }}
                            />
                          )}
                          <ul className="divide-y divide-white/5">
                            {lessons.map((l, li) => {
                              const canPreview = l.is_free_preview || isEnrolled || isOwner;
                              return (
                                <li
                                  key={l.id}
                                  className={cn(
                                    'px-5 py-3 flex items-center gap-3',
                                    canPreview && 'hover:bg-white/[0.03] cursor-pointer'
                                  )}
                                  onClick={() => {
                                    if (canPreview) {
                                      navigate(
                                        `/academia/${spaceSlug}/${courseSlug}/learn?lesson=${l.id}`
                                      );
                                    }
                                  }}
                                >
                                  <span
                                    className="text-xs font-bold text-zinc-500 tabular-nums w-6 text-right"
                                    aria-hidden="true"
                                  >
                                    {li + 1}
                                  </span>
                                  {canPreview ? (
                                    <Play
                                      className="h-4 w-4"
                                      style={{ color: KREOON_PURPLE }}
                                    />
                                  ) : (
                                    <Lock className="h-4 w-4 text-zinc-600" />
                                  )}
                                  <span
                                    className={cn(
                                      'flex-1 text-sm',
                                      canPreview ? 'text-zinc-200' : 'text-zinc-500'
                                    )}
                                  >
                                    {l.title}
                                  </span>
                                  {l.duration_minutes && (
                                    <span className="text-[11px] text-zinc-500 tabular-nums">
                                      {l.duration_minutes}min
                                    </span>
                                  )}
                                  {l.is_free_preview && !isEnrolled && (
                                    <span className="text-[10px] uppercase font-bold tracking-wide text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                      Vista previa
                                    </span>
                                  )}
                                  {isOwner && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/academia/${spaceSlug}/${courseSlug}/edit?lesson=${l.id}`
                                        );
                                      }}
                                      className="text-zinc-500 hover:text-zinc-200 p-1"
                                      title="Editar lección"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </BigCard>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar precio + CTA */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <BigCard accentColor={KREOON_PURPLE} glow className="p-6">
              <div className="text-4xl md:text-5xl font-extrabold mb-1 text-white">
                {course.is_free ? '✨ Gratis' : `US$${course.price_usd}`}
              </div>
              <div className="text-xs text-zinc-400 mb-5">
                {course.is_free ? 'Acceso completo · sin pago' : 'Pago único · acceso de por vida'}
              </div>

              {isEnrolled ? (
                <Button
                  className="w-full h-12 text-white rounded-2xl font-extrabold text-base shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                    boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
                  }}
                  onClick={() =>
                    navigate(`/academia/${spaceSlug}/${courseSlug}/learn`)
                  }
                >
                  <Play className="h-4 w-4 mr-2 fill-white" /> Continuar curso
                </Button>
              ) : (
                <Button
                  className="w-full h-12 text-white rounded-2xl font-extrabold text-base shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                    boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
                  }}
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling
                    ? 'Procesando...'
                    : course.is_free
                      ? '🚀 Inscribirme gratis'
                      : '💳 Comprar curso'}
                </Button>
              )}

              <ul className="mt-6 space-y-3 text-sm text-zinc-200">
                {[
                  { emoji: '📚', text: `${lessonsCount} lecciones premium` },
                  {
                    emoji: '⏱',
                    text:
                      course.total_duration_minutes > 0
                        ? `${Math.round(course.total_duration_minutes / 60)} horas de contenido`
                        : 'Duración variable',
                  },
                  { emoji: '📊', text: `Nivel ${labelDifficulty(course.difficulty)}` },
                  course.certificate_enabled
                    ? { emoji: '🏆', text: 'Certificado al finalizar' }
                    : null,
                  { emoji: '♾️', text: 'Acceso de por vida' },
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <li key={(item as any).text} className="flex items-center gap-2.5">
                      <span className="text-base" aria-hidden="true">
                        {(item as any).emoji}
                      </span>
                      <span>{(item as any).text}</span>
                    </li>
                  ))}
              </ul>
            </BigCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

function labelDifficulty(d: string) {
  return d === 'beginner'
    ? 'Principiante'
    : d === 'intermediate'
      ? 'Intermedio'
      : d === 'advanced'
        ? 'Avanzado'
        : 'Mixto';
}
