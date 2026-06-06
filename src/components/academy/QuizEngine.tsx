import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, CheckCircle2, XCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  useQuizWithQuestions,
  useStartQuizAttempt,
  useSubmitQuizAttempt,
  useMyQuizAttempts,
} from '@/hooks/academy/useAcademyQuiz';
import type {
  AcademyQuiz,
  AcademyQuestion,
  NewAttemptAnswer,
  GradingResult,
} from '@/types/academy';

type QuizMode = 'overlay' | 'page' | 'inline';

interface QuizEngineProps {
  quizId: string;
  enrollmentId: string;
  mode?: QuizMode;
  accentColor?: string;
  onComplete?: (result: GradingResult) => void;
  onClose?: () => void;
}

type Phase = 'intro' | 'question' | 'submitting' | 'result';

export function QuizEngine({
  quizId,
  enrollmentId,
  mode = 'page',
  accentColor = '#8B5CF6',
  onComplete,
  onClose,
}: QuizEngineProps) {
  const { data: quiz, isLoading } = useQuizWithQuestions(quizId);
  const { data: attempts = [] } = useMyQuizAttempts(quizId, enrollmentId);
  const startAttempt = useStartQuizAttempt();
  const submitAttempt = useSubmitQuizAttempt();

  const [phase, setPhase] = useState<Phase>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, NewAttemptAnswer>>({});
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const questions = useMemo<AcademyQuestion[]>(() => {
    if (!quiz?.questions) return [];
    const qs = [...quiz.questions].sort((a, b) => a.sort_order - b.sort_order);
    return quiz.randomize_questions ? shuffle(qs) : qs;
  }, [quiz]);

  // Timer
  useEffect(() => {
    if (phase !== 'question' || !quiz?.time_limit_minutes || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, phase, quiz?.time_limit_minutes]);

  if (isLoading || !quiz) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-400">
        Cargando evaluación...
      </div>
    );
  }

  const lastAttempt = attempts[0];
  const attemptNumber = (lastAttempt?.attempt_number ?? 0) + 1;
  const maxReached = quiz.max_attempts != null && attempts.length >= quiz.max_attempts;
  const currentQ = questions[qIndex];
  const totalQ = questions.length;

  async function handleStart() {
    const a = await startAttempt.mutateAsync({ quizId, enrollmentId, attemptNumber });
    setAttemptId(a.id);
    setAnswers({});
    setQIndex(0);
    setStartTime(Date.now());
    if (quiz?.time_limit_minutes) setSecondsLeft(quiz.time_limit_minutes * 60);
    setPhase('question');
  }

  function setCurrentAnswer(partial: Partial<NewAttemptAnswer>) {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        question_id: currentQ.id,
        selected_option_ids: [],
        ordering_sequence: [],
        matching_pairs: [],
        text_answer: null,
        file_url: null,
        file_name: null,
        self_eval_checked: [],
        ...(prev[currentQ.id] ?? {}),
        ...partial,
      },
    }));
  }

  async function handleSubmit() {
    if (!attemptId) return;
    setPhase('submitting');
    const list: NewAttemptAnswer[] = questions
      .map((q) =>
        answers[q.id] ?? {
          question_id: q.id,
          selected_option_ids: [],
          ordering_sequence: [],
          matching_pairs: [],
          text_answer: null,
          file_url: null,
          file_name: null,
          self_eval_checked: [],
        }
      );
    try {
      const res = await submitAttempt.mutateAsync({
        attemptId,
        quizId,
        answers: list,
        timeSpentSeconds: Math.floor((Date.now() - startTime) / 1000),
      });
      setResult(res);
      setPhase('result');
      onComplete?.(res);
    } catch (e) {
      console.error('Submit error', e);
      setPhase('question');
    }
  }

  // ─────────────── RENDER ───────────────
  const containerClass = cn(
    'rounded-2xl border border-white/10 bg-[#0c0c16] text-zinc-100 shadow-xl',
    mode === 'overlay' && 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4',
    mode === 'page' && 'mx-auto max-w-3xl p-6 md:p-10',
    mode === 'inline' && 'p-6'
  );

  const inner = (
    <div className={mode === 'overlay' ? 'w-full max-w-3xl rounded-2xl bg-[#0c0c16] p-6 md:p-10 shadow-2xl' : ''}>
      {phase === 'intro' && (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">{quiz.title}</h2>
          {quiz.description && <p className="text-zinc-400">{quiz.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-sm">
            <Stat label="Preguntas" value={totalQ.toString()} />
            <Stat label="Aprobación" value={`${quiz.passing_score_pct}%`} />
            <Stat label="Tiempo" value={quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'Sin límite'} />
            <Stat label="Intentos" value={quiz.max_attempts != null ? `${attempts.length}/${quiz.max_attempts}` : `${attempts.length} usados`} />
          </div>
          <div className="flex justify-center gap-3 pt-4">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleStart}
              disabled={maxReached || startAttempt.isPending}
              style={{ backgroundColor: accentColor }}
              className="text-white hover:opacity-90"
            >
              {maxReached ? 'Sin intentos restantes' : startAttempt.isPending ? 'Iniciando...' : 'Comenzar evaluación'}
            </Button>
          </div>
        </div>
      )}

      {phase === 'question' && currentQ && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-zinc-400">
              Pregunta {qIndex + 1} de {totalQ}
            </div>
            {secondsLeft != null && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: secondsLeft < 60 ? '#ef4444' : '#a1a1aa' }}>
                <Clock className="h-4 w-4" />
                {formatSec(secondsLeft)}
              </div>
            )}
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-6">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${((qIndex + 1) / totalQ) * 100}%`, backgroundColor: accentColor }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xl font-semibold mb-4 leading-snug">{currentQ.question_text}</h3>
              {currentQ.media_url && (
                <img src={currentQ.media_url} alt="" className="mb-4 rounded-lg max-h-64" />
              )}
              <QuestionRenderer
                question={currentQ}
                answer={answers[currentQ.id]}
                onChange={setCurrentAnswer}
                attemptId={attemptId!}
                accentColor={accentColor}
                randomizeOptions={quiz.randomize_options}
              />
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setQIndex((i) => Math.max(0, i - 1))}
              disabled={qIndex === 0}
            >
              Anterior
            </Button>
            {qIndex < totalQ - 1 ? (
              <Button
                onClick={() => setQIndex((i) => Math.min(totalQ - 1, i + 1))}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                Enviar evaluación
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex flex-col items-center gap-3 py-12 text-zinc-300">
          <div
            className="animate-spin h-10 w-10 border-2 rounded-full"
            style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
          />
          <span>Calificando tu evaluación...</span>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="text-center space-y-4">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
          ) : result.has_pending_manual ? (
            <Clock className="h-16 w-16 text-amber-400 mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-rose-400 mx-auto" />
          )}
          <h2 className="text-2xl font-bold">
            {result.passed
              ? '¡Aprobado!'
              : result.has_pending_manual
              ? 'En revisión'
              : 'No aprobado'}
          </h2>
          <p className="text-zinc-400">
            {result.has_pending_manual
              ? 'Algunas respuestas requieren revisión manual del instructor.'
              : `Obtuviste ${result.score_pct.toFixed(1)}% de ${quiz.passing_score_pct}% requerido.`}
          </p>
          <div className="text-sm text-zinc-500">
            {result.earned_points} / {result.total_points} puntos
          </div>
          <div className="flex justify-center gap-3 pt-4">
            {onClose && (
              <Button onClick={onClose} style={{ backgroundColor: accentColor }} className="text-white hover:opacity-90">
                Continuar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (mode === 'overlay') {
    return (
      <div className={containerClass} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 rounded-full bg-zinc-800 p-1.5 hover:bg-zinc-700 z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {inner}
        </div>
      </div>
    );
  }

  return <div className={containerClass}>{inner}</div>;
}

// ─── Helpers ───
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
    </div>
  );
}

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Question Renderer ───
interface QuestionRendererProps {
  question: AcademyQuestion;
  answer: NewAttemptAnswer | undefined;
  onChange: (partial: Partial<NewAttemptAnswer>) => void;
  attemptId: string;
  accentColor: string;
  randomizeOptions: boolean;
}

function QuestionRenderer({ question, answer, onChange, attemptId, accentColor, randomizeOptions }: QuestionRendererProps) {
  const options = useMemo(() => {
    const opts = (question.options ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    return randomizeOptions && question.type !== 'ordering' ? shuffle(opts) : opts;
  }, [question.options, randomizeOptions, question.type]);

  if (question.type === 'single_choice' || question.type === 'true_false') {
    const sel = answer?.selected_option_ids?.[0];
    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const checked = sel === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ selected_option_ids: [opt.id] })}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                checked
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
              style={checked ? { borderColor: accentColor, backgroundColor: `${accentColor}1a` } : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-4 w-4 rounded-full border-2 flex-shrink-0',
                    checked ? 'border-transparent' : 'border-zinc-600'
                  )}
                  style={checked ? { backgroundColor: accentColor } : undefined}
                />
                <span>{opt.option_text}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'multiple_choice') {
    const sel = new Set(answer?.selected_option_ids ?? []);
    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">Selecciona todas las opciones correctas.</p>
        {options.map((opt) => {
          const checked = sel.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                const next = new Set(sel);
                checked ? next.delete(opt.id) : next.add(opt.id);
                onChange({ selected_option_ids: Array.from(next) });
              }}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                checked
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
              style={checked ? { borderColor: accentColor, backgroundColor: `${accentColor}1a` } : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-4 w-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                    checked ? 'border-transparent' : 'border-zinc-600'
                  )}
                  style={checked ? { backgroundColor: accentColor } : undefined}
                >
                  {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span>{opt.option_text}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'ordering') {
    const order = answer?.ordering_sequence?.length
      ? answer.ordering_sequence
      : options.map((o) => o.id);
    return <OrderingQuestion options={options} order={order} onChange={(newOrder) => onChange({ ordering_sequence: newOrder })} />;
  }

  if (question.type === 'open_text') {
    return (
      <div>
        <textarea
          value={answer?.text_answer ?? ''}
          onChange={(e) => onChange({ text_answer: e.target.value })}
          className="w-full min-h-32 rounded-lg bg-white/5 border border-white/10 p-3 text-zinc-100 focus:outline-none focus:border-purple-500"
          placeholder="Escribe tu respuesta..."
        />
        <div className="mt-2 text-xs text-zinc-500">{(answer?.text_answer ?? '').length} caracteres</div>
      </div>
    );
  }

  if (question.type === 'file_upload') {
    return (
      <FileUploadQuestion
        answer={answer}
        onChange={onChange}
        attemptId={attemptId}
        questionId={question.id}
      />
    );
  }

  if (question.type === 'self_evaluation') {
    const checked = new Set(answer?.self_eval_checked ?? []);
    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const isChecked = checked.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                const next = new Set(checked);
                isChecked ? next.delete(opt.id) : next.add(opt.id);
                onChange({ self_eval_checked: Array.from(next) });
              }}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                isChecked
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-4 w-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                    isChecked ? 'bg-emerald-500 border-transparent' : 'border-zinc-600'
                  )}
                >
                  {isChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span>{opt.option_text}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'matching') {
    return (
      <div className="text-sm text-zinc-400 p-4 bg-white/5 rounded-lg">
        Tipo "relacionar" disponible en próxima versión.
      </div>
    );
  }

  return null;
}

// ── Ordering con DnD ──
function OrderingQuestion({
  options,
  order,
  onChange,
}: {
  options: { id: string; option_text: string }[];
  order: string[];
  onChange: (newOrder: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const items = order.map((id) => options.find((o) => o.id === id)).filter(Boolean) as { id: string; option_text: string }[];

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    onChange(arrayMove(items, oldIndex, newIndex).map((i) => i.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Arrastra para reordenar.</p>
          {items.map((item, idx) => (
            <SortableItem key={item.id} id={item.id} text={item.option_text} idx={idx + 1} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, text, idx }: { id: string; text: string; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5',
        isDragging && 'opacity-50'
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-500">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm text-zinc-500 font-mono w-6">{idx}.</span>
      <span>{text}</span>
    </div>
  );
}

// ── File Upload ──
function FileUploadQuestion({
  answer,
  onChange,
  attemptId,
  questionId,
}: {
  answer: NewAttemptAnswer | undefined;
  onChange: (partial: Partial<NewAttemptAnswer>) => void;
  attemptId: string;
  questionId: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      // Sanitiza nombre del archivo: extrae extensión segura, descarta el resto
      // Esto evita path traversal y colisiones con caracteres especiales
      const extMatch = file.name.match(/\.([a-zA-Z0-9]{1,8})$/);
      const safeExt = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
      const randomId = crypto.randomUUID();
      const path = `academy/submissions/${attemptId}/${questionId}/${randomId}${safeExt}`;
      const { data, error } = await (supabase.storage as any)
        .from('public-uploads')
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = (supabase.storage as any).from('public-uploads').getPublicUrl(data.path);
      // Conservamos el nombre original solo como metadato para UI; nunca se usa en el path
      onChange({ file_url: pub.publicUrl, file_name: file.name });
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {answer?.file_url ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <Upload className="h-4 w-4 text-emerald-400" />
            <span className="text-sm truncate">{answer.file_name}</span>
          </div>
          <button
            onClick={() => onChange({ file_url: null, file_name: null })}
            className="text-rose-400 hover:text-rose-300 text-sm"
          >
            Quitar
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-white/20 transition-colors">
          <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-2" />
          <span className="text-sm text-zinc-400">
            {uploading ? 'Subiendo...' : 'Haz clic o arrastra un archivo'}
          </span>
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
        </label>
      )}
    </div>
  );
}
