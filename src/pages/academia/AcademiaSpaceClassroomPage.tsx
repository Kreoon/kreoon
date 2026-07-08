import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Plus, Pencil,
  Eye, EyeOff, Archive, Lock, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { CourseBigCard } from '@/components/academy/big-cards/CourseBigCard';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useUpdateCourse } from '@/hooks/academy/useAcademyCourse';
import { useMyEnrollments } from '@/hooks/academy/useAcademyEnrollment';
import { useUnlockStatusBatch, type BatchTarget } from '@/hooks/academy/useAcademyUnlock';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaSpaceClassroomPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);
  const { data: enrollments = [] } = useMyEnrollments();
  const updateCourse = useUpdateCourse();
  const [actionId, setActionId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);

  // Progress por curso
  const progressByCourse = new Map<string, number>();
  enrollments.forEach((e) => {
    if (e.course?.id) progressByCourse.set(e.course.id, e.completion_pct);
  });

  // Estado de desbloqueo a nivel curso (candado en la grilla)
  const courseTargets = useMemo<BatchTarget[]>(
    () => ((space as any)?.courses ?? []).map((c: any) => ({ target_type: 'course' as const, target_id: c.id })),
    [space]
  );
  const { data: courseUnlockMap = {} } = useUnlockStatusBatch(courseTargets);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
          <KreoonSkeleton variant="text" width="40%" height={36} />
          <KreoonSkeleton variant="text" width="25%" height={14} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <KreoonSkeleton key={i} variant="card" height={320} />
            ))}
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

  const isOwner = !!user && space.owner_id === user.id;
  const allCourses = (space as any).courses ?? [];
  const published = allCourses.filter((c: any) => c.status === 'published');
  const drafts = allCourses.filter((c: any) => c.status === 'draft');
  const archived = allCourses.filter((c: any) => c.status === 'archived');
  const totalEnrolled = allCourses.reduce((s: number, c: any) => s + (c.enrolled_count ?? 0), 0);

  // Owner ve drafts también si tiene el toggle activo. Student NUNCA ve drafts.
  const visibleCourses = isOwner && showDrafts ? allCourses : published;

  async function toggleStatus(course: any) {
    const next =
      course.status === 'published' ? 'draft'
      : course.status === 'draft' ? 'published'
      : course.status;
    setActionId(course.id);
    await updateCourse.mutateAsync({ id: course.id, updates: { status: next } });
    setActionId(null);
  }

  async function archiveCourse(course: any) {
    if (!confirm(`¿Archivar "${course.title}"?`)) return;
    setActionId(course.id);
    await updateCourse.mutateAsync({ id: course.id, updates: { status: 'archived' } });
    setActionId(null);
  }

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />

      {/* Owner action bar */}
      {isOwner && (
        <div
          className="border-b border-white/5 sticky top-[57px] z-10 backdrop-blur-md"
          style={{ backgroundColor: `${KREOON_PURPLE}12` }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-12 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              style={{ color: '#a855f7' }}>
              <GraduationCap className="h-3.5 w-3.5" />
              Modo propietario
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowDrafts((v) => !v)}
                className={cn(
                  'h-8 px-3 text-xs rounded-xl font-semibold transition-all flex items-center gap-1.5',
                  showDrafts
                    ? 'bg-white/10 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                )}
              >
                {showDrafts ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {showDrafts ? 'Viendo borradores' : 'Solo publicados'}
              </button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-zinc-300 rounded-xl"
                onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
              >
                <Settings className="h-3.5 w-3.5" /> Editor avanzado
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 rounded-xl text-white font-bold shadow-lg"
                style={{
                  backgroundColor: KREOON_PURPLE,
                  boxShadow: `0 4px 12px -2px ${KREOON_PURPLE}80`,
                }}
                onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
              >
                <Plus className="h-3.5 w-3.5" /> Crear curso
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
              <span aria-hidden="true">🎬</span> Cursos
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {isOwner
                ? `${published.length} publicados · ${drafts.length} borradores · ${totalEnrolled} alumnos en total`
                : `${published.length} curso${published.length !== 1 ? 's' : ''} disponible${published.length !== 1 ? 's' : ''} en ${space.name}`}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {visibleCourses.length === 0 ? (
          <BigCard className="p-12 text-center border-dashed">
            <div className="text-7xl mb-4" aria-hidden="true">🎬</div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">
              {isOwner ? 'Aún no tienes cursos' : 'Aún no hay cursos publicados'}
            </h3>
            <p className="text-sm text-zinc-400 mb-5 max-w-md mx-auto">
              {isOwner
                ? 'Crea tu primer curso para empezar a enseñar y monetizar tu conocimiento'
                : 'Vuelve pronto, el equipo está preparando contenido nuevo'}
            </p>
            {isOwner && (
              <Button
                className="text-white rounded-2xl font-bold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                  boxShadow: `0 6px 20px -4px ${KREOON_PURPLE}80`,
                }}
                onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
              >
                <Plus className="h-4 w-4 mr-2" /> Crear primer curso
              </Button>
            )}
          </BigCard>
        ) : (
          /* Grid de cursos — mismas tarjetas grandes para owner y student */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleCourses.map((course: any) => {
              const courseEval = courseUnlockMap[course.id];
              const courseLocked = !isOwner && !!courseEval && !courseEval.unlocked && !courseEval.bypass;
              return (
              <div key={course.id} className="relative group">
                <CourseBigCard
                  course={course}
                  spaceSlug={spaceSlug!}
                  progress={user ? progressByCourse.get(course.id) : undefined}
                />

                {/* Candado de desbloqueo condicional (no-owner) */}
                {courseLocked && (
                  <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shadow-lg backdrop-blur-sm bg-zinc-900/80 text-amber-200 border-amber-500/40">
                    <Lock className="h-3 w-3" /> Bloqueado
                  </span>
                )}

                {/* Badge de estado (solo owner ve drafts/archived) */}
                {isOwner && course.status !== 'published' && (
                  <span
                    className={cn(
                      'absolute top-3 left-3 z-10 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shadow-lg backdrop-blur-sm',
                      course.status === 'draft' && 'bg-amber-500/30 text-amber-200 border-amber-500/50',
                      course.status === 'archived' && 'bg-red-500/30 text-red-200 border-red-500/50'
                    )}
                  >
                    {course.status === 'draft' ? '📝 Borrador' : '📦 Archivado'}
                  </span>
                )}

                {/* Acciones admin flotantes (solo owner) */}
                {isOwner && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/academia/${spaceSlug}/${course.slug}/edit`);
                      }}
                      title="Editar curso"
                      className="h-8 w-8 rounded-xl bg-black/70 backdrop-blur-md hover:bg-black/90 flex items-center justify-center text-white shadow-lg border border-white/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStatus(course);
                      }}
                      disabled={actionId === course.id || course.status === 'archived'}
                      title={course.status === 'published' ? 'Ocultar' : 'Publicar'}
                      className={cn(
                        'h-8 w-8 rounded-xl bg-black/70 backdrop-blur-md hover:bg-black/90 flex items-center justify-center shadow-lg border border-white/10',
                        course.status === 'published' ? 'text-emerald-300' : 'text-zinc-300'
                      )}
                    >
                      {course.status === 'published' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    {course.status !== 'archived' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          archiveCourse(course);
                        }}
                        disabled={actionId === course.id}
                        title="Archivar"
                        className="h-8 w-8 rounded-xl bg-black/70 backdrop-blur-md hover:bg-rose-500/30 flex items-center justify-center text-zinc-300 hover:text-rose-300 shadow-lg border border-white/10"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Estadísticas de owner abajo (sutiles) */}
        {isOwner && allCourses.length > 0 && (
          <BigCard className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { emoji: '📚', label: 'Total', value: allCourses.length },
                { emoji: '✅', label: 'Publicados', value: published.length },
                { emoji: '📝', label: 'Borradores', value: drafts.length },
                { emoji: '📦', label: 'Archivados', value: archived.length },
              ].map(({ emoji, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0" aria-hidden="true">{emoji}</div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
                    <div className="text-xl font-extrabold text-white tabular-nums leading-tight">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </BigCard>
        )}
      </div>
    </div>
  );
}
