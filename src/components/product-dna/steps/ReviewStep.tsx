import { Edit3, Mic, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import type { WizardState, WizardStep } from '../ProductDNAWizard';

interface ReviewStepProps {
  state: WizardState;
  onEdit: (step: WizardStep) => void;
}

export function ReviewStep({ state, onEdit }: ReviewStepProps) {
  return (
    <div className="space-y-4">
      {/* Service selection */}
      <ReviewCard
        title="Servicios"
        onEdit={() => onEdit('group_selection')}
      >
        {state.selectedGroup && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <state.selectedGroup.icon className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white font-medium">{state.selectedGroup.name}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.selectedServices.map((s) => {
                const Icon = s.icon;
                return (
                  <span key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                               bg-white/5 border border-white/10 text-xs text-gray-300">
                    <Icon className="w-3 h-3" />
                    {s.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </ReviewCard>

      {/* Goals */}
      {state.responses.primary_goal && (
        <ReviewCard title="Objetivo" onEdit={() => onEdit('goal_selection')}>
          <p className="text-sm text-gray-300 capitalize">
            {formatGoal(state.responses.primary_goal)}
          </p>
          {state.responses.goal_description && (
            <p className="text-xs text-gray-400 mt-1">{state.responses.goal_description}</p>
          )}
        </ReviewCard>
      )}

      {/* Audience */}
      {(state.responses.target_age || state.responses.target_gender) && (
        <ReviewCard title="Audiencia" onEdit={() => onEdit('audience')}>
          <div className="flex flex-wrap gap-1.5">
            {Array.isArray(state.responses.target_age) && state.responses.target_age.map((age: string) => (
              <span key={age} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                {age}
              </span>
            ))}
            {state.responses.target_gender && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                {state.responses.target_gender === 'female' ? 'Femenino' : state.responses.target_gender === 'male' ? 'Masculino' : 'Todos'}
              </span>
            )}
          </div>
          {Array.isArray(state.responses.target_interests) && state.responses.target_interests.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {state.responses.target_interests.map((interest: string) => (
                <span key={interest} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </ReviewCard>
      )}

      {/* Audio */}
      <ReviewCard title="Audio" onEdit={() => onEdit('audio')}>
        {state.audioUrl ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Audio grabado</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Sin audio</span>
          </div>
        )}
      </ReviewCard>

      {/* References */}
      <ReviewCard title="Referencias" onEdit={() => onEdit('references')}>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            {state.referenceLinks.length} producto
          </span>
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            {state.competitorLinks.length} competencia
          </span>
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            {state.inspirationLinks.length} inspiración
          </span>
        </div>
      </ReviewCard>
    </div>
  );
}

// ── Review Card ────────────────────────────────────────────────

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</h4>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Formatters ─────────────────────────────────────────────────

function formatGoal(goal: string): string {
  const map: Record<string, string> = {
    brand_awareness: 'Reconocimiento de Marca',
    lead_generation: 'Generación de Leads',
    sales: 'Ventas Directas',
    engagement: 'Engagement',
    education: 'Educación',
    other: 'Otro',
  };
  return map[goal] || goal;
}

