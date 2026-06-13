import { CheckCircle2, Circle, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCertEligibility, useIssueCertificate } from '@/hooks/academy/useAcademyCertificate';
import type { CertificateRequirements, AcademyEnrollment } from '@/types/academy';

interface CertProgressPanelProps {
  courseId: string;
  requirements?: CertificateRequirements;
  enrollment?: AcademyEnrollment;
  accentColor?: string;
  onIssued?: (certCode: string) => void;
}

export function CertificateProgressPanel({
  courseId,
  requirements,
  enrollment,
  accentColor = '#8B5CF6',
  onIssued,
}: CertProgressPanelProps) {
  const { data: eligibility, isLoading, refetch } = useCertEligibility(courseId);
  const issue = useIssueCertificate();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando elegibilidad...
      </div>
    );
  }

  if (!eligibility) return null;
  if (eligibility.reason === 'no_requirements_configured') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-zinc-400">
        Este curso aún no tiene certificado configurado.
      </div>
    );
  }
  if (eligibility.reason === 'not_enrolled') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-zinc-400">
        Inscríbete al curso para optar al certificado.
      </div>
    );
  }

  const missing = eligibility.missing ?? [];
  const completionPct = eligibility.completion_pct ?? enrollment?.completion_pct ?? 0;

  const reqRows = buildRequirementRows(requirements, missing, completionPct);

  async function handleIssue() {
    const res = await issue.mutateAsync(courseId);
    refetch();
    if (res.cert_code) onIssued?.(res.cert_code);
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}26` }}
        >
          <Award className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100">Tu certificado</h3>
          <p className="text-xs text-zinc-500">Requisitos para obtenerlo</p>
        </div>
      </div>

      <ul className="space-y-2">
        {reqRows.map((row, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            {row.done ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <Circle className="h-4 w-4 flex-shrink-0 mt-0.5 text-zinc-600" />
            )}
            <span className={cn(row.done ? 'text-zinc-300' : 'text-zinc-500')}>{row.label}</span>
          </li>
        ))}
      </ul>

      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center justify-between mb-2 text-xs text-zinc-500">
          <span>Progreso</span>
          <span>{Math.round(completionPct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${Math.min(100, completionPct)}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      <Button
        disabled={!eligibility.eligible || issue.isPending}
        onClick={handleIssue}
        className="w-full text-white"
        style={{ backgroundColor: eligibility.eligible ? accentColor : undefined }}
      >
        {issue.isPending ? 'Emitiendo...' : eligibility.eligible ? 'Obtener mi certificado' : 'Continúa para desbloquear'}
      </Button>
    </div>
  );
}

function buildRequirementRows(
  req: CertificateRequirements | undefined,
  missing: Array<string | { type: string; required: number; current: number }>,
  completionPct: number
) {
  const rows: { label: string; done: boolean }[] = [];
  const missingTypes = new Set(missing.map((m) => (typeof m === 'string' ? m : m.type)));

  if (req) {
    rows.push({
      label: `Completar ${req.min_lessons_completed_pct}% de las lecciones`,
      done: completionPct >= req.min_lessons_completed_pct,
    });
    if (req.require_final_exam) {
      rows.push({
        label: `Aprobar examen final (≥${req.min_final_exam_score}%)`,
        done: !missingTypes.has('final_exam_not_passed'),
      });
    }
    if (req.require_all_module_exams) {
      rows.push({
        label: 'Aprobar exámenes de módulos requeridos',
        done: !missingTypes.has('module_exams_pending'),
      });
    }
    if (req.require_all_manual_reviews) {
      rows.push({
        label: 'Revisiones manuales aprobadas',
        done: !missingTypes.has('manual_reviews_pending'),
      });
    }
  }

  return rows;
}
