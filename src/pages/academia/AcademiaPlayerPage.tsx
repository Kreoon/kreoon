import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import {
  Play, CheckCircle2, Lock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SpaceNavbar } from '@/components/academy/community/SpaceNavbar';
import { AcademyVideoPlayer } from '@/components/academy/AcademyVideoPlayer';
import { QuizEngine } from '@/components/academy/QuizEngine';
import { CertificateProgressPanel } from '@/components/academy/CertificateProgressPanel';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { useAcademyCourseBySlug, useMarkLessonProgress } from '@/hooks/academy/useAcademyCourse';
import { useMyEnrollment } from '@/hooks/academy/useAcademyEnrollment';
import { useUnlockStatus } from '@/hooks/academy/useAcademyUnlock';
import { UnlockRequirements } from '@/components/academy/unlock/UnlockRequirements';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { LessonCommentSection } from '@/components/academy/lesson/LessonCommentSection';
import type { AcademyLesson, LessonProgress } from '@/types/academy';

const KREOON_PURPLE = '#7c3aed';

export default function AcademiaPlayerPage() {
  const { spaceSlug, courseSlug } = useParams<{ spaceSlug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course, isLoading } = useAcademyCourseBySlug(spaceSlug, courseSlug);
  const { data: enrollment } = useMyEnrollment(course?.id);
  const markProgress = useMarkLessonProgress();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [midlessonQuizId, setMidlessonQuizId] = useState<string | null>(null);
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState<number | undefined>(undefined);

  // Desbloqueo condicional de la lección activa
  const { data: lessonUnlock } = useUnlockStatus('lesson', activeLessonId ?? undefined);
  const isOwner = !!user && (course?.instructor_id === user.id || course?.space?.owner_id === user.id);
  const lessonLocked = !isOwner && !!lessonUnlock && !lessonUnlock.unlocked && !lessonUnlock.bypass;

  const flatLessons = useMemo<AcademyLesson[]>(() => {
    if (!course?.modules) return [];
    return course.modules
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((m) =>
        (m.lessons ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
      );
  }, [course]);

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
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Cargando curso...
      </div>
    );
  }

  if (!user || !course || !enrollment) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>No tienes acceso a este curso.</p>
        <Button onClick={() => navigate(`/academia/${spaceSlug}/${courseSlug}`)}>
          Ver detalles del curso
        </Button>
      </div>
    );
  }

  const activeLesson = flatLessons.find((l) => l.id === activeLessonId);
  const activeIndex = flatLessons.findIndex((l) => l.id === activeLessonId);

  function handleVideoProgress(pct: number, lastPos: number) {
    setCurrentVideoTimestamp(lastPos);
    if (!activeLesson || !enrollment) return;
    if (getProgress(activeLesson)?.status === 'completed') return;
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
    // FASE5 Bloque C: si la leccion tiene quiz de fin, la completitud la
    // decide el quiz (handleEndLessonQuizPassed), no el video -- antes se
    // marcaba completed apenas terminaba el video sin importar si el quiz
    // se aprobaba, reprobaba o ni se intentaba.
    if (activeLesson.end_lesson_quiz_id) {
      markProgress.mutate({
        lessonId: activeLesson.id,
        enrollmentId: enrollment.id,
        status: 'in_progress',
        videoPct: 100,
      });
      return;
    }
    markProgress.mutate({
      lessonId: activeLesson.id,
      enrollmentId: enrollment.id,
      status: 'completed',
      videoPct: 100,
    });
  }

  function handleEndLessonQuizPassed() {
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

  const completionPct = Math.round(enrollment.completion_pct);

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100 flex flex-col">
      <SpaceNavbar spaceSlug={spaceSlug!} />

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Sidebar lecciones */}
        <aside className="lg:w-96 border-b lg:border-b-0 lg:border-r border-white/5 bg-kreoon-bg-secondary flex-shrink-0">
          <div className="p-5 border-b border-white/5">
            <Link
              to={`/academia/${spaceSlug}/${courseSlug}`}
              className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 font-bold flex items-center gap-1 mb-2"
            >
              <ChevronLeft className="h-3 w-3" /> Volver al curso
            </Link>
            <h2 className="font-extrabold text-base text-white leading-tight mb-3">
              {course.title}
            </h2>

            {/* Progress bar XL */}
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-zinc-300">📚 Tu progreso</span>
              <span style={{ color: KREOON_PURPLE }}>{completionPct}%</span>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completionPct}%`,
                  background: `linear-gradient(90deg, ${KREOON_PURPLE}, #a855f7)`,
                  boxShadow: `0 0 8px ${KREOON_PURPLE}80`,
                }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-zinc-500">
              Lección {activeIndex + 1} de {flatLessons.length}
            </div>
          </div>

          <nav className="overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-200px)]">
            {(course.modules ?? [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((m, mi) => (
                <div key={m.id} className="border-b border-white/5">
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                      style={{ backgroundColor: `${KREOON_PURPLE}25`, color: '#c084fc' }}
                    >
                      {mi + 1}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      {m.title}
                    </span>
                  </div>
                  <ul>
                    {(m.lessons ?? [])
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((l, li) => {
                        const isActive = l.id === activeLessonId;
                        const prog = getProgress(l);
                        const isComplete = prog?.status === 'completed';
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => setActiveLessonId(l.id)}
                              className={cn(
                                'w-full text-left px-5 py-3 flex items-center gap-3 text-sm transition-all border-l-2',
                                isActive
                                  ? 'text-white bg-white/[0.06]'
                                  : 'text-zinc-400 border-transparent hover:bg-white/[0.03] hover:text-zinc-200'
                              )}
                              style={
                                isActive
                                  ? { borderLeftColor: KREOON_PURPLE }
                                  : undefined
                              }
                            >
                              <span
                                className="text-[10px] font-bold tabular-nums text-zinc-500 w-4 text-right"
                                aria-hidden="true"
                              >
                                {li + 1}
                              </span>
                              {isComplete ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Play
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: isActive ? KREOON_PURPLE : '#71717a' }}
                                />
                              )}
                              <span className="line-clamp-2 flex-1 font-medium">{l.title}</span>
                              {l.duration_minutes && (
                                <span className="text-[10px] text-zinc-500 tabular-nums">
                                  {l.duration_minutes}m
                                </span>
                              )}
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
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: KREOON_PURPLE }}
                >
                  Lección {activeIndex + 1} de {flatLessons.length}
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
                  {activeLesson.title}
                </h1>
              </div>

              {lessonLocked && lessonUnlock ? (
                <UnlockRequirements evaluation={lessonUnlock} accentColor={KREOON_PURPLE} />
              ) : (
              <>
              {/* Player según tipo */}
              {(activeLesson.type === 'video' || activeLesson.type === 'live') && (
                <div className="rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl">
                  <AcademyVideoPlayer
                    lesson={activeLesson}
                    enrollmentId={enrollment.id}
                    accentColor={KREOON_PURPLE}
                    onProgress={handleVideoProgress}
                    onComplete={handleVideoComplete}
                    onMidlessonQuizTrigger={(quizId) => setMidlessonQuizId(quizId)}
                  />
                </div>
              )}

              {activeLesson.type === 'text' && activeLesson.content && (
                <BigCard className="p-6 md:p-8">
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(activeLesson.content) }}
                  />
                </BigCard>
              )}

              {activeLesson.type === 'quiz' && activeLesson.end_lesson_quiz_id && (
                <BigCard className="p-6 md:p-8">
                  <QuizEngine
                    quizId={activeLesson.end_lesson_quiz_id}
                    enrollmentId={enrollment.id}
                    accentColor={KREOON_PURPLE}
                    mode="inline"
                    onComplete={(result) => {
                      if (result.passed) {
                        handleVideoComplete();
                      }
                    }}
                  />
                </BigCard>
              )}

              {/* Quiz end-lesson (después del video) */}
              {(activeLesson.type === 'video' || activeLesson.type === 'live') &&
                activeLesson.end_lesson_quiz_id && (
                  <BigCard accentColor={KREOON_PURPLE} glow gradient="purple" className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-3xl" aria-hidden="true">🧠</span>
                      <div>
                        <h3 className="font-extrabold text-lg text-white">
                          Evaluación de esta lección
                        </h3>
                        <p className="text-sm text-zinc-300">
                          Pon a prueba lo que aprendiste antes de continuar
                        </p>
                      </div>
                    </div>
                    <QuizEngine
                      quizId={activeLesson.end_lesson_quiz_id}
                      enrollmentId={enrollment.id}
                      accentColor={KREOON_PURPLE}
                      mode="inline"
                      onComplete={(result) => {
                        if (result.passed) handleEndLessonQuizPassed();
                      }}
                    />
                  </BigCard>
                )}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <Button
                  variant="outline"
                  className="rounded-2xl font-bold border-2 border-white/15 hover:bg-white/5"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveLessonId(flatLessons[activeIndex - 1].id)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  className="rounded-2xl font-bold text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                    boxShadow: `0 6px 20px -4px ${KREOON_PURPLE}80`,
                  }}
                  disabled={activeIndex >= flatLessons.length - 1}
                  onClick={goToNextLesson}
                >
                  Siguiente lección <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Comentarios de la lección */}
              {activeLesson && course.space && (
                <LessonCommentSection
                  lessonId={activeLesson.id}
                  courseId={course.id}
                  spaceId={course.space.id!}
                  instructorId={course.instructor_id}
                  currentVideoTimestamp={currentVideoTimestamp}
                  accentColor={KREOON_PURPLE}
                />
              )}

              {/* Panel de certificado al final del curso */}
              {course.cert_requirements && (
                <CertificateProgressPanel
                  courseId={course.id}
                  requirements={course.cert_requirements}
                  enrollment={enrollment}
                  accentColor={KREOON_PURPLE}
                  onIssued={(certCode) => navigate(`/cert/${certCode}`)}
                />
              )}
              </>
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
            accentColor={KREOON_PURPLE}
            onComplete={() => setMidlessonQuizId(null)}
            onClose={() => setMidlessonQuizId(null)}
          />
        )}
      </div>
    </div>
  );
}

function getProgress(lesson: AcademyLesson): LessonProgress | undefined {
  const p = lesson.progress;
  if (!p) return undefined;
  if (Array.isArray(p)) return p[0];
  return p;
}
