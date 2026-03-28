import { Edit3, Globe, Lock, Target, Video, MapPin, Star, Users, CheckCircle2, Flame, Briefcase, Shield, Gavel, ArrowUpDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { InlinePrice } from '@/components/ui/Price';
import { MARKETPLACE_CATEGORIES, COUNTRIES, VISIBILITY_CONFIG } from '../../types/marketplace';
import { COMMISSION_RATES } from '@/lib/finance/constants';
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

  // Financial breakdown
  const commissionPct = budgetData.requires_agency_support
    ? COMMISSION_RATES.campaigns_managed.max   // 40%
    : COMMISSION_RATES.campaigns_managed.base;  // 30%
  const planLabel = budgetData.requires_agency_support ? 'Kreoon Agency' : 'Self-Service';
  const pricingMode = budgetData.pricing_mode ?? 'fixed';
  const isPaid = budgetData.campaign_type === 'paid' || budgetData.campaign_type === 'hybrid';

  // Calculate total cost & deposit based on pricing mode
  let maxCreatorAmount = 0;
  if (isPaid) {
    if (pricingMode === 'fixed') {
      maxCreatorAmount = budgetData.budget_mode === 'per_video'
        ? budgetData.budget_per_video * totalVideos * visibilityData.max_creators
        : budgetData.total_budget;
    } else if (pricingMode === 'auction') {
      maxCreatorAmount = budgetData.budget_per_video * totalVideos * visibilityData.max_creators;
    } else if (pricingMode === 'range') {
      maxCreatorAmount = budgetData.max_bid * totalVideos * visibilityData.max_creators;
    }
  }
  const maxFee = Math.round(maxCreatorAmount * commissionPct / 100);
  const maxTotal = maxCreatorAmount + maxFee;

  // Deposit calculation per mode:
  // Fixed: 100% upfront | Auction: 70% upfront | Range: based on min_bid
  let depositAmount = maxTotal;
  let remainingAmount = 0;
  if (pricingMode === 'auction') {
    depositAmount = Math.round(maxTotal * 0.7);
    remainingAmount = maxTotal - depositAmount;
  } else if (pricingMode === 'range' && isPaid) {
    const minCreatorAmount = budgetData.min_bid * totalVideos * visibilityData.max_creators;
    const minFee = Math.round(minCreatorAmount * commissionPct / 100);
    depositAmount = minCreatorAmount + minFee;
    remainingAmount = maxTotal - depositAmount;
  }

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
            <div className={cn('w-8 h-8 rounded-sm flex items-center justify-center', visConfig.bgColor)}>
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
      <ReviewSection title="Compensacion" onEdit={() => onEditStep(4)}>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Tipo:</span>
            <span className="text-white">{TYPE_LABELS[budgetData.campaign_type]}</span>
            {pricingMode === 'auction' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 flex items-center gap-0.5">
                <Gavel className="h-3 w-3" /> Subasta
              </span>
            )}
            {pricingMode === 'range' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 flex items-center gap-0.5">
                <ArrowUpDown className="h-3 w-3" /> Rango
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className={cn('h-3.5 w-3.5', budgetData.requires_agency_support ? 'text-amber-400' : 'text-green-400')} />
            <span className={cn('font-medium', budgetData.requires_agency_support ? 'text-amber-300' : 'text-green-300')}>
              Plan {planLabel} ({commissionPct}% comision)
            </span>
          </div>

          {/* Price summary per mode */}
          {isPaid && pricingMode === 'fixed' && (
            <div>
              <span className="text-gray-500">{budgetData.budget_mode === 'per_video' ? 'Precio por video:' : 'Presupuesto total:'}</span>{' '}
              <span className="text-white">
                {budgetData.budget_mode === 'per_video'
                  ? <><InlinePrice amount={budgetData.budget_per_video} /> /video</>
                  : <><InlinePrice amount={budgetData.total_budget} /></>}
              </span>
            </div>
          )}
          {isPaid && pricingMode === 'auction' && (
            <div>
              <span className="text-gray-500">Presupuesto max por video:</span>{' '}
              <span className="text-white"><InlinePrice amount={budgetData.budget_per_video} /> /video</span>
            </div>
          )}
          {isPaid && pricingMode === 'range' && (
            <div>
              <span className="text-gray-500">Rango por video:</span>{' '}
              <span className="text-white"><InlinePrice amount={budgetData.min_bid} /> - <InlinePrice amount={budgetData.max_bid} /></span>
            </div>
          )}

          {(budgetData.campaign_type === 'exchange' || budgetData.campaign_type === 'hybrid') && budgetData.exchange_product_name && (
            <div>
              <span className="text-gray-500">Producto canje:</span>{' '}
              <span className="text-white">{budgetData.exchange_product_name}</span>
              {budgetData.exchange_product_value > 0 && (
                <span className="text-gray-500"> (<InlinePrice amount={budgetData.exchange_product_value} />)</span>
              )}
            </div>
          )}

          {/* ── Financial breakdown (all paid modes) ── */}
          {maxCreatorAmount > 0 && (
            <div className="mt-3 p-4 bg-background border border-white/10 rounded-sm space-y-2.5">
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                {pricingMode === 'fixed' ? 'Desglose de Pago' : 'Resumen de Costos'}
              </h4>

              <div className="flex justify-between">
                <span className="text-gray-400">
                  {pricingMode === 'fixed' ? 'Pago a creadores' : 'Pago max a creadores'}
                </span>
                <span className="text-white"><InlinePrice amount={maxCreatorAmount} /></span>
              </div>
              <p className="text-gray-600 text-xs -mt-1">
                {visibilityData.max_creators} creadores x {totalVideos} video{totalVideos !== 1 ? 's' : ''} x{' '}
                {pricingMode === 'range'
                  ? <><InlinePrice amount={budgetData.max_bid} /> (max)</>
                  : <><InlinePrice amount={budgetData.budget_per_video} /> c/u</>
                }
              </p>

              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Comision {planLabel} ({commissionPct}%)
                </span>
                <span className="text-gray-400"><InlinePrice amount={maxFee} /></span>
              </div>

              {pricingMode !== 'fixed' && (
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Costo max total</span>
                  <span><InlinePrice amount={maxTotal} /></span>
                </div>
              )}

              <div className="border-t border-white/10 pt-2.5 flex justify-between items-center">
                <span className="text-white font-semibold">
                  {pricingMode === 'fixed'
                    ? 'Total a pagar ahora'
                    : pricingMode === 'auction'
                      ? 'Deposito al publicar (70%)'
                      : 'Deposito al publicar (oferta min)'}
                </span>
                <span className={cn('font-bold text-lg', pricingMode === 'auction' ? 'text-orange-300' : pricingMode === 'range' ? 'text-blue-300' : 'text-purple-300')}>
                  <InlinePrice amount={depositAmount} />
                </span>
              </div>

              {(pricingMode === 'auction' || pricingMode === 'range') && remainingAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {pricingMode === 'auction' ? 'Restante al cerrar subasta (30%)' : 'Restante segun ofertas aceptadas'}
                  </span>
                  <span className="text-gray-500">hasta <InlinePrice amount={remainingAmount} /></span>
                </div>
              )}

              {/* Plan description */}
              <p className="text-gray-500 text-[11px] leading-relaxed">
                {budgetData.requires_agency_support
                  ? 'Incluye estrategia, guiones, revision y acompanamiento completo de Kreoon Agency.'
                  : 'Gestion self-service. Tu administras la campana directamente.'}
              </p>

              {/* Escrow explanation for each mode */}
              {pricingMode === 'auction' && (
                <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-sm space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-orange-300 mt-0.5 shrink-0" />
                    <div className="text-orange-200 text-[11px] leading-relaxed space-y-1">
                      <p className="font-semibold">Como funciona el pago en subasta:</p>
                      <p>1. Se cobra el <strong>70%</strong> del costo maximo como deposito al publicar la campana.</p>
                      <p>2. Los creadores envian sus ofertas. Tu seleccionas las mejores.</p>
                      <p>3. Al cerrar la subasta, se calcula el costo real segun las ofertas aceptadas.</p>
                      <p>4. Si el costo real es <strong>menor</strong> al deposito, se te devuelve la diferencia.</p>
                      <p>5. Si el costo real <strong>supera</strong> el deposito, se cobra el 30% restante antes de iniciar la campana.</p>
                    </div>
                  </div>
                </div>
              )}
              {pricingMode === 'range' && (
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-sm space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-blue-300 mt-0.5 shrink-0" />
                    <div className="text-blue-200 text-[11px] leading-relaxed space-y-1">
                      <p className="font-semibold">Como funciona el pago por rango:</p>
                      <p>1. Se cobra un deposito basado en la oferta minima (<InlinePrice amount={budgetData.min_bid} />/video) al publicar.</p>
                      <p>2. Los creadores pujan dentro del rango <InlinePrice amount={budgetData.min_bid} /> - <InlinePrice amount={budgetData.max_bid} />.</p>
                      <p>3. Al cerrar, si las ofertas aceptadas superan el deposito, se cobra la diferencia antes de iniciar.</p>
                      <p>4. Si son menores o iguales, se devuelve el excedente.</p>
                    </div>
                  </div>
                </div>
              )}
              {pricingMode === 'fixed' && (
                <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-sm">
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-purple-300 mt-0.5 shrink-0" />
                    <p className="text-purple-200 text-[11px] leading-relaxed">
                      Se cobra el monto total al publicar. Los fondos se mantienen en escrow y se liberan a cada creador al aprobar su entrega.
                    </p>
                  </div>
                </div>
              )}
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
          Acepto los terminos de servicio de Kreoon y entiendo que se aplicara una comision del{' '}
          {commissionPct}%
          {budgetData.requires_agency_support ? ' (Kreoon Agency)' : ' (Self-service)'}
          {' '}sobre los pagos a creadores.
          {isPaid && (
            <>
              {' '}Al publicar se cobrara <span className="text-white font-medium"><InlinePrice amount={depositAmount} /></span>
              {pricingMode === 'auction' && ' como deposito (70%). El saldo restante se ajustara al cerrar la subasta.'}
              {pricingMode === 'range' && ' como deposito (oferta minima). El saldo restante se cobrara al cerrar la negociacion.'}
              {pricingMode === 'fixed' && ' como pago total de la campana.'}
            </>
          )}
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
    <div className="bg-white/5 border border-white/10 rounded-sm p-4">
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
