import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Clock, Star, Lock, Plus, Pencil,
  Eye, EyeOff, Archive, MoreVertical, Users, TrendingUp,
  BookOpen, BarChart2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useUpdateCourse } from '@/hooks/academy/useAcademyCourse';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  published: 'bg-emerald-500/20 text-emerald-400',
  archived: 'bg-red-500/20 text-red-400',
};

function OwnerClassroomView({
  spaceSlug,
  space,
  courses,
  accent,
}: {
  spaceSlug: string;
  space: any;
  courses: any[];
  accent: string;
}) {
  const navigate = useNavigate();
  const updateCourse = useUpdateCourse();
  const [actionId, setActionId] = useState<string | null>(null);

  const published = courses.filter((c) => c.status === 'published');
  const drafts = courses.filter((c) => c.status === 'draft');
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

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug} />

      {/* Owner bar */}
      <div
        className="border-b border-white/10 sticky top-[49px] z-10 backdrop-blur-sm"
        style={{ backgroundColor: `${accent}12` }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: accent }}>
            <GraduationCap className="h-3.5 w-3.5" />
            Modo propietario — Gestión de cursos
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs gap-1 text-zinc-300"
              variant="ghost"
              onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
            >
              <BookOpen className="h-3.5 w-3.5" /> Editor avanzado
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              style={{ backgroundColor: accent }}
              onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
            >
              <Plus className="h-3.5 w-3.5" /> Crear curso
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total cursos', value: courses.length, icon: BookOpen },
            { label: 'Publicados', value: published.length, icon: Eye },
            { label: 'Borradores', value: drafts.length, icon: Pencil },
            { label: 'Alumnos totales', value: totalEnrolled, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-3 bg-white/5 border-white/10">
              <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Icon className="h-3 w-3" /> {label}
              </div>
              <div className="text-2xl font-bold mt-1">{value}</div>
            </Card>
          ))}
        </div>

        {/* Course list */}
        {courses.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 border-white/10 border-dashed text-zinc-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
            <p className="mb-4">Aún no tienes cursos. ¡Crea el primero!</p>
            <Button
              style={{ backgroundColor: accent }}
              className="text-white"
              onClick={() => navigate(`/academia/${spaceSlug}/gestionar`)}
            >
              <Plus className="h-4 w-4 mr-2" /> Crear primer curso
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Todos los cursos ({courses.length})
            </h2>
            {courses.map((course: any) => (
              <Card
                key={course.id}
                className="bg-white/5 border-white/10 hover:border-white/20 transition-colors overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${accent}40, transparent)` }}
                      >
                        <BookOpen className="h-6 w-6 text-white/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-zinc-100 truncate">{course.title}</h3>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0',
                          STATUS_COLOR[course.status] ?? STATUS_COLOR.draft
                        )}
                      >
                        {STATUS_LABEL[course.status] ?? course.status}
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-500">
                      {course.enrolled_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {course.enrolled_count} alumnos
                        </span>
                      )}
                      {course.total_duration_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {Math.round(course.total_duration_minutes / 60)}h
                        </span>
                      )}
                      {course.avg_rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {course.avg_rating.toFixed(1)}
                        </span>
                      )}
                      <span className="font-medium" style={{ color: accent }}>
                        {course.is_free ? 'Gratis' : `US$${course.price_usd}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-zinc-400 hover:text-zinc-100"
                      onClick={() => navigate(`/academia/${spaceSlug}/${course.slug}/edit`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-8 text-xs',
                        course.status === 'published'
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-zinc-400 hover:text-zinc-100'
                      )}
                      disabled={actionId === course.id || course.status === 'archived'}
                      onClick={() => toggleStatus(course)}
                    >
                      {course.status === 'published' ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {course.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-zinc-600 hover:text-red-400"
                        disabled={actionId === course.id}
                        onClick={() => archiveCourse(course)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Link to={`/academia/${space.slug}/${course.slug}`}>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-400 hover:text-zinc-100">
                        <BarChart2 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
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
  accent,
}: {
  spaceSlug: string;
  space: any;
  courses: any[];
  accent: string;
}) {
  const publishedCourses = courses.filter((c: any) => c.status === 'published');

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" style={{ color: accent }} /> Classroom
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {publishedCourses.length} curso{publishedCourses.length !== 1 ? 's' : ''} en {space.name}
            </p>
          </div>
        </div>

        {publishedCourses.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 border-white/10 text-zinc-400">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
            Esta academia aún no tiene cursos publicados.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedCourses.map((course: any) => (
              <Link to={`/academia/${space.slug}/${course.slug}`} key={course.id}>
                <Card className="overflow-hidden bg-white/5 border-white/10 hover:border-purple-500/40 transition-colors h-full">
                  {course.cover_image_url ? (
                    <img src={course.cover_image_url} alt={course.title} className="h-40 w-full object-cover" />
                  ) : (
                    <div
                      className="h-40 w-full"
                      style={{ background: `linear-gradient(135deg, ${accent}40, transparent)` }}
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-zinc-100 mb-1 line-clamp-2">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{course.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {course.total_duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {Math.round(course.total_duration_minutes / 60)}h
                          </span>
                        )}
                        {course.avg_rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{' '}
                            {course.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: accent }}>
                        {course.is_free ? 'Gratis' : `US$${course.price_usd}`}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
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
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
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

  const accent = space.accent_color || '#8B5CF6';
  const courses = (space as any).courses ?? [];
  const isOwner = !!user && space.owner_id === user.id;

  if (isOwner) {
    return (
      <OwnerClassroomView
        spaceSlug={spaceSlug!}
        space={space}
        courses={courses}
        accent={accent}
      />
    );
  }

  return (
    <StudentClassroomView
      spaceSlug={spaceSlug!}
      space={space}
      courses={courses}
      accent={accent}
    />
  );
}
