import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Clock, BarChart3, Award, Play, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { useAcademyCourseBySlug } from '@/hooks/academy/useAcademyCourse';
import { useEnrollInCourse, useMyEnrollment } from '@/hooks/academy/useAcademyEnrollment';
import { useAuth } from '@/hooks/useAuth';

export default function AcademiaCoursePage() {
  const { spaceSlug, courseSlug } = useParams<{ spaceSlug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading } = useAcademyCourseBySlug(spaceSlug, courseSlug);
  const { data: enrollment } = useMyEnrollment(course?.id);
  const enroll = useEnrollInCourse();
  const [enrolling, setEnrolling] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando curso...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>Este curso no existe o no está publicado.</p>
        <Link to={`/academia/${spaceSlug}`} className="text-purple-400 hover:text-purple-300">
          Volver a la academia
        </Link>
      </div>
    );
  }

  const accent = course.space?.accent_color || '#8B5CF6';
  const modules = course.modules ?? [];
  const lessonsCount = modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);

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
    } finally {
      setEnrolling(false);
    }
  }

  const isEnrolled = !!enrollment;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <SpaceNavbar spaceSlug={spaceSlug!} />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {course.cover_image_url && (
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="w-full aspect-video object-cover rounded-2xl"
              />
            )}

            <div>
              <Link
                to={`/academia/${spaceSlug}`}
                className="text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
              >
                ← {course.space?.name}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3">{course.title}</h1>
              {course.description && (
                <p className="text-zinc-400 leading-relaxed">{course.description}</p>
              )}
            </div>

            {course.instructor && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                {course.instructor.avatar_url ? (
                  <img src={course.instructor.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-lg font-semibold">
                      {(course.instructor.full_name ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Instructor</div>
                  <div className="font-semibold">{course.instructor.full_name ?? 'Instructor'}</div>
                </div>
              </div>
            )}

            {/* Currículum */}
            <div>
              <h2 className="text-xl font-bold mb-4">Currículum</h2>
              <div className="space-y-3">
                {modules
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((m, mi) => (
                    <Card key={m.id} className="overflow-hidden bg-white/5 border-white/10">
                      <div className="p-4 border-b border-white/5">
                        <h3 className="font-semibold">
                          Módulo {mi + 1}: {m.title}
                        </h3>
                        {m.description && <p className="text-sm text-zinc-400 mt-1">{m.description}</p>}
                      </div>
                      <ul className="divide-y divide-white/5">
                        {(m.lessons ?? [])
                          .slice()
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((l) => {
                            const canPreview = l.is_free_preview || isEnrolled;
                            return (
                              <li
                                key={l.id}
                                className="px-4 py-3 flex items-center gap-3 text-sm"
                              >
                                {canPreview ? (
                                  <Play className="h-4 w-4 text-zinc-500" />
                                ) : (
                                  <Lock className="h-4 w-4 text-zinc-600" />
                                )}
                                <span className={canPreview ? 'text-zinc-200' : 'text-zinc-500'}>
                                  {l.title}
                                </span>
                                {l.is_free_preview && (
                                  <span className="ml-auto text-[10px] uppercase tracking-wide text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                                    Vista previa
                                  </span>
                                )}
                              </li>
                            );
                          })}
                      </ul>
                    </Card>
                  ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-4 h-fit space-y-4">
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="text-3xl font-bold mb-1" style={{ color: accent }}>
                {course.is_free ? 'Gratis' : `US$${course.price_usd}`}
              </div>
              <div className="text-xs text-zinc-500 mb-5">
                {course.is_free ? 'Acceso completo' : 'Pago único · acceso de por vida'}
              </div>

              {isEnrolled ? (
                <Button
                  className="w-full text-white"
                  style={{ backgroundColor: accent }}
                  onClick={() => navigate(`/academia/${spaceSlug}/${courseSlug}/learn`)}
                >
                  Continuar curso
                </Button>
              ) : (
                <Button
                  className="w-full text-white"
                  style={{ backgroundColor: accent }}
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? 'Procesando...' : course.is_free ? 'Inscribirme gratis' : 'Comprar curso'}
                </Button>
              )}

              <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-zinc-500" />
                  Nivel: {labelDifficulty(course.difficulty)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  {course.total_duration_minutes > 0
                    ? `${Math.round(course.total_duration_minutes / 60)} horas`
                    : 'Duración variable'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-zinc-500" />
                  {lessonsCount} lecciones
                </li>
                {course.certificate_enabled && (
                  <li className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-zinc-500" />
                    Certificado al finalizar
                  </li>
                )}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function labelDifficulty(d: string) {
  return d === 'beginner' ? 'Principiante' : d === 'intermediate' ? 'Intermedio' : 'Avanzado';
}
