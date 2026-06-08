import { useParams, Link } from 'react-router-dom';
import { GraduationCap, Clock, Star, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

export default function AcademiaSpaceClassroomPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
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
  const publishedCourses = courses.filter((c: any) => c.status === 'published');

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />

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
                    <img src={course.cover_image_url} alt="" className="h-40 w-full object-cover" />
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
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {course.avg_rating.toFixed(1)}
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
