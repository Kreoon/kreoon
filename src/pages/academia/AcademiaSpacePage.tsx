import { useParams, Link } from 'react-router-dom';
import { GraduationCap, Clock, Star, Users, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';

export default function AcademiaSpacePage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando academia...
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3">
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
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Hero */}
      <div
        className="relative h-64 md:h-80"
        style={{
          background: space.cover_image_url
            ? `url(${space.cover_image_url}) center/cover`
            : `linear-gradient(135deg, ${accent}50, #0a0a0f)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-20 relative">
        <div className="flex items-end gap-6 mb-8">
          {space.logo_url ? (
            <img
              src={space.logo_url}
              alt={space.name}
              className="h-24 w-24 md:h-32 md:w-32 rounded-2xl object-cover border-4 border-[#0a0a0f] shadow-xl"
            />
          ) : (
            <div
              className="h-24 w-24 md:h-32 md:w-32 rounded-2xl border-4 border-[#0a0a0f] shadow-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent}30` }}
            >
              <GraduationCap className="h-12 w-12" style={{ color: accent }} />
            </div>
          )}
          <div className="flex-1 pb-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{space.name}</h1>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {space.member_count} miembros
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-wider">
                {space.plan_slug === 'pro' ? 'Academia Pro' : 'Academia Hobby'}
              </span>
            </div>
          </div>
        </div>

        {space.description && (
          <p className="text-zinc-400 mb-10 max-w-3xl leading-relaxed">{space.description}</p>
        )}

        {/* Cursos */}
        <section>
          <h2 className="text-xl font-bold mb-4">Cursos disponibles</h2>
          {publishedCourses.length === 0 ? (
            <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-400">
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
        </section>
      </div>
    </div>
  );
}
