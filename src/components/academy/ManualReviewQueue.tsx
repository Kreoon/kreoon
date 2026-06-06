import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, RotateCcw, FileText, Download, Loader2 } from 'lucide-react';
import type { ManualReview } from '@/types/academy';

interface ManualReviewQueueProps {
  courseId: string;
  accentColor?: string;
}

interface ReviewExpanded extends ManualReview {
  question?: { question_text: string; points: number; type: string };
  student?: { full_name: string | null; email: string | null };
  answer?: { text_answer: string | null; file_url: string | null; file_name: string | null };
}

export function ManualReviewQueue({ courseId, accentColor = '#8B5CF6' }: ManualReviewQueueProps) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['academy', 'manual-reviews', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_manual_reviews')
        .select(`
          *,
          question:academy_questions(question_text, points, type),
          student:profiles!student_id(full_name, email),
          answer:academy_attempt_answers!answer_id(text_answer, file_url, file_name)
        `)
        .eq('course_id', courseId)
        .in('status', ['pending', 'reviewing'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReviewExpanded[];
    },
  });

  const submitReview = useMutation({
    mutationFn: async (args: {
      reviewId: string;
      answerId: string;
      approved: boolean;
      score: number;
      maxScore: number;
      feedback: string;
    }) => {
      const newStatus = args.approved ? 'approved' : 'revision_requested';

      const { error: rErr } = await (supabase as any)
        .from('academy_manual_reviews')
        .update({
          status: newStatus,
          score_awarded: args.score,
          feedback: args.feedback,
          instructor_id: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', args.reviewId);
      if (rErr) throw rErr;

      const { error: aErr } = await (supabase as any)
        .from('academy_attempt_answers')
        .update({
          is_correct: args.approved,
          points_awarded: args.score,
          instructor_feedback: args.feedback,
          graded_at: new Date().toISOString(),
        })
        .eq('id', args.answerId);
      if (aErr) throw aErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy', 'manual-reviews'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando revisiones...
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="p-8 text-center text-zinc-500">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
        Sin revisiones pendientes
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewRow
          key={review.id}
          review={review}
          accentColor={accentColor}
          onSubmit={(approved, score, feedback) =>
            submitReview.mutate({
              reviewId: review.id,
              answerId: review.answer_id,
              approved,
              score,
              maxScore: review.question?.points ?? 1,
              feedback,
            })
          }
        />
      ))}
    </div>
  );
}

function ReviewRow({
  review,
  accentColor,
  onSubmit,
}: {
  review: ReviewExpanded;
  accentColor: string;
  onSubmit: (approved: boolean, score: number, feedback: string) => void;
}) {
  const maxScore = review.question?.points ?? 1;
  const [score, setScore] = useState(maxScore);
  const [feedback, setFeedback] = useState('');

  return (
    <Card className="p-5 bg-white/5 border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-zinc-500">{review.student?.full_name ?? review.student?.email ?? 'Estudiante'}</div>
          <div className="text-base font-semibold mt-1">{review.question?.question_text}</div>
        </div>
        <div className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
          Pendiente
        </div>
      </div>

      <div className="rounded-lg bg-black/30 border border-white/5 p-3 mb-4">
        {review.answer?.text_answer && (
          <p className="text-sm whitespace-pre-wrap text-zinc-200">{review.answer.text_answer}</p>
        )}
        {review.answer?.file_url && (
          <a
            href={review.answer.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm hover:underline"
            style={{ color: accentColor }}
          >
            <FileText className="h-4 w-4" />
            {review.answer.file_name ?? 'Archivo entregado'}
            <Download className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">Calificación (0–{maxScore})</label>
          <input
            type="number"
            min={0}
            max={maxScore}
            step={0.5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="mt-1 w-full rounded bg-black/30 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-wide text-zinc-500">Feedback</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mt-1 w-full rounded bg-black/30 border border-white/10 p-2 text-sm h-16 focus:outline-none focus:border-purple-500"
            placeholder="Comentario para el estudiante..."
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <Button variant="outline" onClick={() => onSubmit(false, 0, feedback)}>
          <RotateCcw className="h-4 w-4 mr-2" /> Solicitar revisión
        </Button>
        <Button
          onClick={() => onSubmit(true, score, feedback)}
          style={{ backgroundColor: accentColor }}
          className="text-white"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar
        </Button>
      </div>
    </Card>
  );
}
