import { Edit3, Globe, Lock, Target, Video, MapPin, Star, Users, CheckCircle2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_CATEGORIES, COUNTRIES, VISIBILITY_CONFIG } from '../../types/marketplace';
import type {
  CampaignContentRequirement,
  CampaignCreatorRequirements,
  CampaignType,
  CampaignVisibilityData,
} from '../../types/marketplace';
import type { CampaignBasicInfo } from './CampaignStepBasicInfo';
import type { CampaignBudgetData } from './CampaignStepBudget';

interface CampaignStepReviewProps {
  basicInfo: CampaignBasicInfo;
  visibilityData: CampaignVisibilityData;
  contentRequirements: CampaignContentRequirement[];
  budgetData: CampaignBudgetData;
  creatorRequirements: CampaignCreatorRequirements;
  onEditStep: (step: number) => void;
  termsAccepted: boolean;
  onTermsChange: (v: boolean) => void;
}

const TYPE_LABELS: Record<CampaignType, string> = { paid: 'Pagada', exchange: 'Canje', hybrid: 'Hibrida' };
const VISIBILITY_ICONS = { public: Globe, internal: Lock, selective: Target };

export function CampaignStepReview({
  basicInfo,
  visibilityData,
  contentRequirements,
  budgetData,
  creatorRequirements,
  onEditStep,
  termsAccepted,
  onTermsChange,
}: CampaignStepReviewProps) {
  const categoryLabel = MARKETPLACE_CATEGORIES.find(c => c.id === basicInfo.category)?.label ?? basicInfo.category;
  const totalVideos = contentRequirements.reduce((sum, r) => sum + r.quantity, 0);
  const visConfig = VISIBILITY_CONFIG[visibilityData.visibility];
  const VisIcon = VISIBILITY_ICONS[visibilityData.visibility];

  // Estimated budget
  const estimatedBudget = budgetData.campaign_type !== 'exchange'
    ? budgetData.budget_mode === 'per_video'
      ? budgetData.budget_per_video * totalVideos * visibilityData.max_creators
      : budgetData.total_budget
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Revision Final</h2>
        <p className="text-gray-500 text-sm">Revisa toda la informacion antes de publicar</p>
      </div>

      {/* Basic info section */}
      <ReviewSection title="Informacion Basica" onEdit={() => onEditStep(0)}>
        <div className="space-y-2 text-sm">
          <div><span className="text-gray-500">Titulo:</span> <span className="text-white">{basicInfo.title}</span></div>
          <div><span className="text-gray-500">Categoria:</span> <span className="text-white">{categoryLabel}</span></div>
          {basicInfo.deadline && (
            <div><span className="text-gray-500">Fecha limite:</span> <span className="text-white">{new Date(basicInfo.deadline).toLocaleDateString('es-CO')}</span></div>
          )}
          <div><span className="text-gray-500">Descripcion:</span> <p className="text-foreground/80 text-xs mt-1">{basicInfo.description}</p></div>
          {basicInfo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {basicInfo.tags.map(tag => (
                <span key={tag} className="bg-white/5 text-gray-400 text-xs px-2 py-0.5 rounded-full">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Visibility section */}
      <ReviewSection title="Alcance y Visibilidad" onEdit={() => onEditStep(1)}>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', visConfig.bgColor)}>
              <VisIcon className={cn('h-4 w-4', visConfig.color)} />
            </div>
            <div>
              <span className="text-white font-medium">{visConfig.label}</span>
              <p className="text-gray-500 text-xs">{visConfig.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-gray-400">Max. creadores: <span className="text-white">{visibilityData.max_creators}</span></span>
          </div>
          {visibilityData.visibility === 'selective' && visibilityData.invited_profiles.length > 0 && (
            <div className="text-gray-400">
              {visibilityData.invited_profiles.length} creadores invitados
            </div>
          )}
          {visibilityData.auto_approve_applications && (
            <div className="text-xs text-amber-400 flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Aprobacion automatica activada
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Content requirements section */}
      <ReviewSection title="Contenido Requerido" onEdit={() => onEditStep(2)}>
        <div className="space-y-2">
          {contentRequirements.map((req, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Video className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-white">{req.quantity}x {req.content_type}</span>
              {req.duration_seconds && <span className="text-gray-500">({req.duration_seconds}s)</span>}
            </div>
          ))}
          <p className="text-gray-500 text-xs mt-1">Total: {totalVideos} piezas de contenido</p>
        </div>
      </ReviewSection>

      {/* Budget section */}
      <ReviewSection title="Compensacion" onEdit={() => onEditStep(3)}>
        <div className="space-y-2 text-sm">
          <div><span className="text-gray-500">Tipo:</span> <span className="text-white">{TYPE_LABELS[budgetData.campaign_type]}</span></div>
          {(budgetData.campaign_type === 'paid' || budgetData.campaign_type === 'hybrid') && (
            <div>
              <span className="text-gray-500">Presupuesto:</span>{' '}
              <span className="text-white">
                {budgetData.budget_mode === 'per_video'
                  ? `$${budgetData.budget_per_video.toLocaleString()} /video`
                  : `$${budgetData.total_budget.toLocaleString()} total`}
              </span>
            </div>
          )}
          {(budgetData.campaign_type === 'exchange' || budgetData.campaign_type === 'hybrid') && budgetData.exchange_product_name && (
            <div>
              <span className="text-gray-500">Producto canje:</span>{' '}
              <span className="text-white">{budgetData.exchange_product_name}</span>
              {budgetData.exchange_product_value > 0 && (
                <span className="text-gray-500"> (${budgetData.exchange_product_value.toLocaleString()})</span>
              )}
            </div>
          )}
          {estimatedBudget > 0 && (
            <div className="mt-2 p-2 bg-white/5 rounded-lg">
              <span className="text-gray-500 text-xs">Presupuesto total estimado:</span>
              <p className="text-white font-semibold">${estimatedBudget.toLocaleString()} USD</p>
              <p className="text-gray-600 text-xs">({visibilityData.max_creators} creadores x {totalVideos} videos)</p>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* Creator requirements section */}
      {visibilityData.visibility !== 'internal' && (
        <ReviewSection title="Requisitos del Creador" onEdit={() => onEditStep(1)}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-gray-400">Rating minimo: <span className="text-white">{creatorRequirements.min_rating}+</span></span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              <span className="text-gray-400">Proyectos: <span className="text-white">{creatorRequirements.min_completed_projects}+</span></span>
            </div>
            {creatorRequirements.countries.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-gray-400">
                  {creatorRequirements.countries.map(code => COUNTRIES.find(c => c.code === code)?.label ?? code).join(', ')}
                </span>
              </div>
            )}
            {creatorRequirements.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {creatorRequirements.categories.map(cat => (
                  <span key={cat} className="bg-purple-500/15 text-purple-300 text-xs px-2 py-0.5 rounded-full">{cat}</span>
                ))}
              </div>
            )}
          </div>
        </ReviewSection>
      )}

      {/* Terms checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={e => onTermsChange(e.target.checked)}
          className="mt-1 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
        />
        <span className="text-gray-400 text-sm">
          Acepto los terminos de servicio de Kreoon y entiendo que se aplicara una comision del 15% sobre los pagos a creadores.
        </span>
      </label>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-foreground/80 text-sm font-semibold">{title}</h3>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-purple-400 text-xs hover:text-purple-300 transition-colors"
        >
          <Edit3 className="h-3 w-3" />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}
