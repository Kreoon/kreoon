import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { Play, CheckCircle2, Lock, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AcademyVideoPlayer } from '@/components/academy/AcademyVideoPlayer';
import { QuizEngine } from '@/components/academy/QuizEngine';
import { CertificateProgressPanel } from '@/components/academy/CertificateProgressPanel';
import { useAcademyCourseBySlug, useMarkLessonProgress } from '@/hooks/academy/useAcademyCourse';
import { useMyEnrollment } from '@/hooks/academy/useAcademyEnrollment';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import type { AcademyLesson, LessonProgress } from '@/types/academy';

export default function AcademiaPlayerPage() {
  const { spaceSlug, courseSlug } = useParams<{ spaceSlug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading } = useAcademyCourseBySlug(spaceSlug, courseSlug);
  const { data: enrollment } = useMyEnrollment(course?.id);
  const markProgress = useMarkLessonProgress();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [midlessonQuizId, setMidlessonQuizId] = useState<string | null>(null);

  const flatLessons = useMemo<AcademyLesson[]>(() => {
    if (!course?.modules) return [];
    return course.modules
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((m) =>
        (m.lessons ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
      );
  }, [course]);

  // Auto-seleccionar primera lección al cargar
  useEffect(() => {
    if (!activeLessonId && flatLessons.length > 0) {
      const firstIncomplete = flatLessons.find((l) => {
        const p = getProgress(l);
        return p?.status !== 'completed';
      });
      setActiveLessonId((firstIncomplete ?? flatLessons[0]).id);
    }
  }, [flatLessons, activeLessonId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Cargando curso...
      </div>
    );
  }

  if (!user || !course || !enrollment) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>No tienes acceso a este curso.</p>
        <Button onClick={() => navigate(`/academia/${spaceSlug}/${courseSlug}`)}>
          Ver detalles del curso
        </Button>
      </div>
    );
  }

  const accent = course.space?.accent_color || '#8B5CF6';
  const activeLesson = flatLessons.find((l) => l.id === activeLessonId);
  const activeIndex = flatLessons.findIndex((l) => l.id === activeLessonId);

  function handleVideoProgress(pct: number, lastPos: number) {
    if (!activeLesson || !enrollment) return;
    markProgress.mutate({
      lessonId: activeLesson.id,
      enrollmentId: enrollment.id,
      status: 'in_progress',
      videoPct: pct,
      lastPosition: lastPos,
    });
  }

  function handleVideoComplete() {
    if (!activeLesson || !enrollment) return;
    markProgress.mutate({
      lessonId: activeLesson.id,
      enrollmentId: enrollment.id,
      status: 'completed',
      videoPct: 100,
    });
  }

  function goToNextLesson() {
    if (activeIndex < flatLessons.length - 1) {
      setActiveLessonId(flatLessons[activeIndex + 1].id);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex flex-col lg:flex-row">
      {/* Sidebar lecciones */}
      <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0c0c16] flex-shrink-0">
        <div className="p-4 border-b border-white/5">
          <button
            onClick={() => navigate(`/academia/${spaceSlug}`)}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 mb-3"
          >
            <ChevronLeft className="h-3 w-3" /> {course.space?.name}
          </button>
          <h2 className="font-bold text-zinc-100">{course.title}</h2>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${enrollment.completion_pct}%`, backgroundColor: accent }}
            />
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {Math.round(enrollment.completion_pct)}% completado
          </div>
        </div>

        <nav className="overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-160px)]">
          {(course.modules ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m) => (
              <div key={m.id} className="border-b border-white/5">
                <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {m.title}
                </div>
                <ul>
                  {(m.lessons ?? [])
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((l) => {
                      const isActive = l.id === activeLessonId;
                      const prog = getProgress(l);
                      const isComplete = prog?.status === 'completed';
                      return (
                        <li key={l.id}>
                          <button
                            onClick={() => setActiveLessonId(l.id)}
                            className={cn(
                              'w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors',
                              isActive
                                ? 'bg-purple-500/10 text-zinc-100'
                                : 'text-zinc-400 hover:bg-white/5'
                            )}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Play className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                            )}
                            <span className="line-clamp-2">{l.title}</span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
        </nav>
      </aside>

      {/* Main player */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeLesson ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                Lección {activeIndex + 1} de {flatLessons.length}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{activeLesson.title}</h1>
            </div>

            {/* Player según tipo */}
            {(activeLesson.type === 'video' || activeLesson.type === 'live') && (
              <AcademyVideoPlayer
                lesson={activeLesson}
                enrollmentId={enrollment.id}
                accentColor={accent}
                onProgress={handleVideoProgress}
                onComplete={handleVideoComplete}
                onMidlessonQuizTrigger={(quizId) => setMidlessonQuizId(quizId)}
              />
            )}

            {activeLesson.type === 'text' && activeLesson.content && (
              <div
                className="prose prose-invert max-w-none p-6 rounded-2xl bg-white/5 border border-white/10"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(activeLesson.content) }}
              />
            )}

            {activeLesson.type === 'quiz' && activeLesson.end_lesson_quiz_id && (
              <QuizEngine
                quizId={activeLesson.end_lesson_quiz_id}
                enrollmentId={enrollment.id}
                accentColor={accent}
                mode="inline"
                onComplete={(result) => {
                  if (result.passed) {
                    handleVideoComplete();
                  }
                }}
              />
            )}

            {/* Quiz end-lesson (después del video) */}
            {(activeLesson.type === 'video' || activeLesson.type === 'live') &&
              activeLesson.end_lesson_quiz_id && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6">
                  <h3 className="font-semibold mb-2">Evaluación de esta lección</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Pon a prueba lo que aprendiste antes de continuar.
                  </p>
                  <QuizEngine
                    quizId={activeLesson.end_lesson_quiz_id}
                    enrollmentId={enrollment.id}
                    accentColor={accent}
                    mode="inline"
                  />
                </div>
              )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <Button
                variant="outline"
                disabled={activeIndex === 0}
                onClick={() => setActiveLessonId(flatLessons[activeIndex - 1].id)}
              >
                Anterior
              </Button>
              <Button
                style={{ backgroundColor: accent }}
                className="text-white"
                disabled={activeIndex >= flatLessons.length - 1}
                onClick={goToNextLesson}
              >
                Siguiente lección
              </Button>
            </div>

            {/* Panel de certificado al final del curso */}
            {course.cert_requirements && (
              <CertificateProgressPanel
                courseId={course.id}
                requirements={course.cert_requirements}
                enrollment={enrollment}
                accentColor={accent}
                onIssued={(certCode) => navigate(`/cert/${certCode}`)}
              />
            )}
          </div>
        ) : (
          <div className="text-zinc-500 text-center py-12">Selecciona una lección</div>
        )}
      </main>

      {/* Overlay quiz mid-lesson */}
      {midlessonQuizId && (
        <QuizEngine
          quizId={midlessonQuizId}
          enrollmentId={enrollment.id}
          mode="overlay"
          accentColor={accent}
          onComplete={() => setMidlessonQuizId(null)}
          onClose={() => setMidlessonQuizId(null)}
        />
      )}
    </div>
  );
}

function getProgress(lesson: AcademyLesson): LessonProgress | undefined {
  const p = lesson.progress;
  if (!p) return undefined;
  if (Array.isArray(p)) return p[0];
  return p;
}
