import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Plus, Pencil,
  Eye, EyeOff, Archive, Users,
  BookOpen, BarChart2, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { CourseBigCard } from '@/components/academy/big-cards/CourseBigCard';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useUpdateCourse } from '@/hooks/academy/useAcademyCourse';
import { useMyEnrollments } from '@/hooks/academy/useAcademyEnrollment';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const KREOON_PURPLE = '#7c3aed';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-zinc-700/40 text-zinc-300 border border-zinc-700',
  published: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  archived: 'bg-red-500/15 text-red-300 border border-red-500/30',
};

function OwnerClassroomView({
  spaceSlug,
  space,
  courses,
}: {
  spaceSlug: string;
  space: any;
  courses: any[];
}) {
  const navigate = useNavigate();
  const updateCourse = useUpdateCourse();
  const [actionId, setActionId] = useState<string | null>(null);

  const published = courses.filter((c) => c.status === 'published');
  const drafts = courses.filter((c) => c.status === 'draft');
  const archived = courses.filter((c) => c.status === 'archived');
  const totalEnrolled = courses.reduce((s: number, c: any) => s + (c.enrolled_count ?? 0), 0);

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
    setActionId(course.id);
    await updateCourse.mutateAsync({ id: course.id, updates: { status: 'archived' } });
    setActionId(null);
  }

  const stats = [
    { emoji: '📚', label: 'Total', value: courses.length },
    { emoji: '✅', label: 'Publicados', value: published.length },
    { emoji: '📝', label: 'Borradores', value: drafts.length },
    { emoji: '👥', label: 'Alumnos', value: totalEnrolled },
  ];

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug} />

      {/* Owner bar */}
      <div
        className="border-b border-white/5 sticky top-[57px] z-10 backdrop-blur-md"
        style={{ backgroundColor: `${KREOON_PURPLE}12` }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-12 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            style={{ color: '#a855f7' }}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Modo propietario · Gestión de cursos
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1 text-zinc-300 rounded-xl"
              onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
            >
              <BookOpen className="h-3.5 w-3.5" /> Editor avanzado
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

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
            <span aria-hidden="true">🎬</span> Cursos
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gestiona los cursos de tu academia
          </p>
        </div>

        {/* Stats grandes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ emoji, label, value }) => (
            <BigCard key={label} className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl flex-shrink-0" aria-hidden="true">{emoji}</div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
                  <div className="text-2xl font-extrabold text-white tabular-nums leading-tight">{value}</div>
                </div>
              </div>
            </BigCard>
          ))}
        </div>

        {/* Course list */}
        {courses.length === 0 ? (
          <BigCard className="p-10 text-center border-dashed">
            <div className="text-6xl mb-3" aria-hidden="true">🎬</div>
            <h3 className="text-lg font-bold text-zinc-100 mb-1">Aún no tienes cursos</h3>
            <p className="text-sm text-zinc-400 mb-5">
              Crea tu primer curso para empezar a enseñar
            </p>
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
          </BigCard>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Todos ({courses.length})
            </h2>
            {courses.map((course: any) => (
              <BigCard key={course.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row items-stretch gap-0">
                  {/* Thumbnail 16:9 */}
                  <div
                    className="relative sm:w-48 aspect-video sm:aspect-auto flex-shrink-0 overflow-hidden"
                    style={
                      !course.cover_image_url
                        ? { background: `linear-gradient(135deg, ${KREOON_PURPLE}30, #0a0a0f)` }
                        : undefined
                    }
                  >
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden="true">
                        🎬
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-base text-white truncate">{course.title}</h3>
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0',
                            STATUS_COLOR[course.status] ?? STATUS_COLOR.draft
                          )}
                        >
                          {STATUS_LABEL[course.status] ?? course.status}
                        </span>
                      </div>
                      {course.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mb-2">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          👥 {course.enrolled_count ?? 0}
                        </span>
                        {course.total_duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            ⏱ {Math.round(course.total_duration_minutes / 60)}h
                          </span>
                        )}
                        {course.avg_rating > 0 && (
                          <span className="flex items-center gap-1">
                            ⭐ {course.avg_rating.toFixed(1)}
                          </span>
                        )}
                        <span
                          className="font-bold ml-auto sm:ml-0"
                          style={{ color: KREOON_PURPLE }}
                        >
                          {course.is_free ? '✨ Gratis' : `US$${course.price_usd}`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                        title="Editar"
                        onClick={() => navigate(`/academia/${spaceSlug}/${course.slug}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'h-9 w-9 rounded-xl hover:bg-white/5',
                          course.status === 'published'
                            ? 'text-emerald-300 hover:text-emerald-200'
                            : 'text-zinc-400 hover:text-zinc-100'
                        )}
                        title={course.status === 'published' ? 'Ocultar' : 'Publicar'}
                        disabled={actionId === course.id || course.status === 'archived'}
                        onClick={() => toggleStatus(course)}
                      >
                        {course.status === 'published' ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>

                      {course.status !== 'archived' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/5"
                          title="Archivar"
                          disabled={actionId === course.id}
                          onClick={() => archiveCourse(course)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}

                      <Link to={`/academia/${space.slug}/${course.slug}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                          title="Ver curso"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </BigCard>
            ))}
            {archived.length === 0 && null}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentClassroomView({
  spaceSlug,
  space,
  courses,
}: {
  spaceSlug: string;
  space: any;
  courses: any[];
}) {
  const { user } = useAuth();
  const { data: enrollments = [] } = useMyEnrollments();
  const publishedCourses = courses.filter((c: any) => c.status === 'published');

  // Match progress por curso
  const progressByCourse = new Map<string, number>();
  enrollments.forEach((e) => {
    if (e.course?.id) progressByCourse.set(e.course.id, e.completion_pct);
  });

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-white">
              <span aria-hidden="true">🎓</span> Cursos
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {publishedCourses.length} curso{publishedCourses.length !== 1 ? 's' : ''} disponible
              {publishedCourses.length !== 1 ? 's' : ''} en {space.name}
            </p>
          </div>
        </div>

        {publishedCourses.length === 0 ? (
          <BigCard className="p-10 text-center border-dashed">
            <div className="text-6xl mb-3" aria-hidden="true">📚</div>
            <h3 className="text-lg font-bold text-zinc-100 mb-1">
              Aún no hay cursos publicados
            </h3>
            <p className="text-sm text-zinc-400">
              Vuelve pronto, el equipo está preparando contenido
            </p>
          </BigCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedCourses.map((course: any) => (
              <CourseBigCard
                key={course.id}
                course={course}
                spaceSlug={spaceSlug}
                progress={user ? progressByCourse.get(course.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcademiaSpaceClassroomPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
          <KreoonSkeleton variant="text" width="40%" height={32} />
          <KreoonSkeleton variant="text" width="25%" height={14} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <KreoonSkeleton key={i} variant="card" height={280} />
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

  const courses = (space as any).courses ?? [];
  const isOwner = !!user && space.owner_id === user.id;

  if (isOwner) {
    return <OwnerClassroomView spaceSlug={spaceSlug!} space={space} courses={courses} />;
  }
  return <StudentClassroomView spaceSlug={spaceSlug!} space={space} courses={courses} />;
}
