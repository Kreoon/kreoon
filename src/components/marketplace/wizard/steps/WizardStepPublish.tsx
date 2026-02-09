import { CheckCircle2, Circle, Loader2, Globe, Eye, Save, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardDraftState } from '../CreatorProfileWizard';

interface WizardStepPublishProps {
  draft: WizardDraftState;
  portfolioCount: number;
  servicesCount: number;
  avatarUrl: string | null;
  onPublish: () => void;
  onSaveDraft: () => void;
  saving: boolean;
}

interface ChecklistItem {
  label: string;
  completed: boolean;
  required: boolean;
}

export function WizardStepPublish({
  draft,
  portfolioCount,
  servicesCount,
  avatarUrl,
  onPublish,
  onSaveDraft,
  saving,
}: WizardStepPublishProps) {
  const checklist: ChecklistItem[] = [
    { label: 'Nombre profesional', completed: !!draft.basic.display_name, required: true },
    { label: 'Foto de perfil', completed: !!avatarUrl, required: false },
    { label: 'Bio extendida', completed: !!draft.basic.bio_full, required: false },
    { label: 'Al menos 1 rol seleccionado', completed: draft.roles.length > 0, required: true },
    { label: 'Categorias de especializacion', completed: draft.expertise.categories.length > 0, required: false },
    { label: 'Al menos 1 item en portafolio', completed: portfolioCount > 0, required: false },
    { label: 'Al menos 1 servicio creado', completed: servicesCount > 0, required: false },
  ];

  const requiredComplete = checklist.filter(c => c.required).every(c => c.completed);
  const completedCount = checklist.filter(c => c.completed).length;
  const completionPct = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Listo para publicar</h2>
        <p className="text-gray-400 text-sm">Revisa tu perfil antes de hacerlo visible en el marketplace</p>
      </div>

      {/* Completion summary */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Completitud del perfil</h3>
          <span className={cn(
            'text-lg font-bold',
            completionPct === 100 ? 'text-green-400' : completionPct >= 60 ? 'text-yellow-400' : 'text-gray-400'
          )}>
            {completionPct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completionPct === 100 ? 'bg-green-500' : completionPct >= 60 ? 'bg-yellow-500' : 'bg-gray-500'
            )}
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="space-y-2.5 pt-2">
          {checklist.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-600 flex-shrink-0" />
              )}
              <span className={cn(
                'text-sm',
                item.completed ? 'text-gray-300' : 'text-gray-500'
              )}>
                {item.label}
                {item.required && <span className="text-red-400 ml-1">*</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile preview card */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Vista previa
        </h3>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1a2e] overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl font-bold">
                {draft.basic.display_name?.[0] || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-lg">{draft.basic.display_name || 'Tu nombre'}</h4>
            <p className="text-gray-400 text-sm mt-0.5">{draft.basic.tagline || 'Tu tagline profesional'}</p>
            {draft.basic.location_city && (
              <p className="text-gray-500 text-xs mt-1">
                {draft.basic.location_city}{draft.basic.location_country ? `, ${draft.basic.location_country}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {draft.roles.slice(0, 3).map(role => (
                <span key={role} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-[10px] font-medium">
                  {role.replace(/_/g, ' ')}
                </span>
              ))}
              {draft.roles.length > 3 && (
                <span className="px-2 py-0.5 bg-white/10 text-gray-400 rounded-full text-[10px]">
                  +{draft.roles.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <p className="text-white font-semibold">{portfolioCount}</p>
            <p className="text-gray-500 text-[10px]">Portafolio</p>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <p className="text-white font-semibold">{servicesCount}</p>
            <p className="text-gray-500 text-[10px]">Servicios</p>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <p className="text-white font-semibold">{draft.expertise.categories.length}</p>
            <p className="text-gray-500 text-[10px]">Categorias</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={onPublish}
          disabled={!requiredComplete || saving}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold transition-all',
            requiredComplete && !saving
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Globe className="h-5 w-5" />
              Publicar perfil
            </>
          )}
        </button>

        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
        >
          <Save className="h-4 w-4" />
          Guardar como borrador
        </button>

        {!requiredComplete && (
          <p className="text-center text-red-400/70 text-xs">
            Completa los campos marcados con * para publicar tu perfil
          </p>
        )}
      </div>
    </div>
  );
}
