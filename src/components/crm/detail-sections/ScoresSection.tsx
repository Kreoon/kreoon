import { Star, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailSection } from '@/components/crm/DetailSection';

interface ScoresSectionProps {
  qualityScoreAvg: number | null;
  reliabilityScore: number | null;
  velocityScore: number | null;
  editorRating: number | null;
  aiRecommendedLevel: string | null;
  aiRiskFlag: string | null;
}

function getBarColor(value: number): string {
  if (value >= 70) return 'bg-green-500';
  if (value >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-white/40">{label}</span>
        <span className="text-[10px] text-white/70 font-medium">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getBarColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} className="h-3 w-3 text-amber-400 fill-amber-400" />
      ))}
      {hasHalf && (
        <Star className="h-3 w-3 text-amber-400 fill-amber-400/50" />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e-${i}`} className="h-3 w-3 text-white/10" />
      ))}
      <span className="text-[10px] text-white/50 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

export function ScoresSection({
  qualityScoreAvg,
  reliabilityScore,
  velocityScore,
  editorRating,
  aiRecommendedLevel,
  aiRiskFlag,
}: ScoresSectionProps) {
  const hasAnyScore =
    qualityScoreAvg != null ||
    reliabilityScore != null ||
    velocityScore != null ||
    editorRating != null ||
    aiRecommendedLevel != null ||
    aiRiskFlag != null;

  if (!hasAnyScore) return null;

  return (
    <DetailSection title="Scores">
      <div className="space-y-3">
        {/* Score bars - 2 column grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {qualityScoreAvg != null && (
            <ScoreBar label="Calidad" value={qualityScoreAvg} />
          )}
          {reliabilityScore != null && (
            <ScoreBar label="Confiabilidad" value={reliabilityScore} />
          )}
          {velocityScore != null && (
            <ScoreBar label="Velocidad" value={velocityScore} />
          )}
        </div>

        {/* Editor rating */}
        {editorRating != null && (
          <div>
            <p className="text-[10px] text-white/40 mb-0.5">Rating editor</p>
            <StarRating value={editorRating} />
          </div>
        )}

        {/* AI badges */}
        <div className="flex flex-wrap gap-1.5">
          {aiRecommendedLevel != null && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              AI: {aiRecommendedLevel}
            </span>
          )}
          {aiRiskFlag != null && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              {aiRiskFlag}
            </span>
          )}
        </div>
      </div>
    </DetailSection>
  );
}
