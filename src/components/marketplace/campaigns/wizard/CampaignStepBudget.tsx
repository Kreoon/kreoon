import { DollarSign, Gift, Layers, Shield, Gavel, ArrowUpDown, Eye, EyeOff, Calendar, Briefcase, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceInput } from '@/components/ui/PriceInput';
import { InlinePrice } from '@/components/ui/Price';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { CampaignType, CampaignBudgetMode, CampaignPricingMode, BidVisibility, MarketplaceRoleId } from '../../types/marketplace';
import { getMinBudgetForRoles, MARKETPLACE_ROLES_MAP } from '../../roles/marketplaceRoleConfig';

export interface CampaignBudgetData {
  campaign_type: CampaignType;
  budget_mode: CampaignBudgetMode;
  budget_per_video: number;
  total_budget: number;
  max_creators: number;
  exchange_product_name: string;
  exchange_product_value: number;
  exchange_product_description: string;
  pricing_mode: CampaignPricingMode;
  min_bid: number;
  max_bid: number;
  bid_deadline: string;
  bid_visibility: BidVisibility;
  requires_agency_support: boolean;
}

interface CampaignStepBudgetProps {
  data: CampaignBudgetData;
  onChange: <K extends keyof CampaignBudgetData>(field: K, value: CampaignBudgetData[K]) => void;
  contentCount: number;
  desiredRoles?: MarketplaceRoleId[];
}

const TYPE_OPTIONS: { value: CampaignType; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { value: 'paid', label: 'Pagada', description: 'Paga a los creadores por su trabajo', icon: DollarSign, color: 'text-[var(--nova-success)]' },
  { value: 'exchange', label: 'Canje', description: 'Ofrece producto a cambio del contenido', icon: Gift, color: 'text-[var(--nova-accent-primary)]' },
  { value: 'hybrid', label: 'Hibrida', description: 'Combinacion de pago + producto', icon: Layers, color: 'text-[var(--nova-accent-secondary)]' },
];

const PRICING_OPTIONS: { value: CampaignPricingMode; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { value: 'fixed', label: 'Precio Fijo', description: 'Tu defines el precio exacto', icon: DollarSign, color: 'text-[var(--nova-success)]' },
  { value: 'auction', label: 'Subasta', description: 'Los creadores hacen ofertas libres', icon: Gavel, color: 'text-[var(--nova-warning)]' },
  { value: 'range', label: 'Rango', description: 'Define min/max, creadores pujan dentro', icon: ArrowUpDown, color: 'text-[var(--nova-info)]' },
];

import { COMMISSION_RATES } from '@/lib/finance/constants';

export function CampaignStepBudget({ data, onChange, contentCount, desiredRoles = [] }: CampaignStepBudgetProps) {
  const { formatPrice } = useCurrency();
  const showPaymentFields = data.campaign_type === 'paid' || data.campaign_type === 'hybrid';
  const showExchangeFields = data.campaign_type === 'exchange' || data.campaign_type === 'hybrid';

  // Dynamic commission: 30% self-service, 40% with agency support
  const commissionPct = data.requires_agency_support
    ? COMMISSION_RATES.campaigns_managed.max   // 40%
    : COMMISSION_RATES.campaigns_managed.base;  // 30%

  // Financial summary (all values in USD)
  const totalCreatorPayment = data.budget_mode === 'per_video'
    ? data.budget_per_video * contentCount * data.max_creators
    : data.total_budget;
  const platformFee = Math.round(totalCreatorPayment * commissionPct / 100);
  const totalCost = totalCreatorPayment + platformFee;

  // Budget validation based on selected roles
  const suggestedMinBudget = getMinBudgetForRoles(desiredRoles);
  const currentBudgetPerVideo = data.budget_mode === 'per_video' ? data.budget_per_video : (data.total_budget / Math.max(1, contentCount * data.max_creators));
  const isBudgetLow = showPaymentFields && currentBudgetPerVideo > 0 && currentBudgetPerVideo < suggestedMinBudget;
  const highestRoleLabel = desiredRoles.length > 0
    ? MARKETPLACE_ROLES_MAP[desiredRoles.sort((a, b) => (getMinBudgetForRoles([b]) - getMinBudgetForRoles([a])))[0]]?.label
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--nova-text-bright)] mb-1">Presupuesto y Compensacion</h2>
        <p className="text-[var(--nova-text-muted)] text-sm">Define como compensaras a los creadores</p>
      </div>

      {/* Agency support toggle */}
      <div className="nova-glass rounded-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[var(--nova-warning)]" />
          <h3 className="text-[var(--nova-text-bright)] text-sm font-semibold">Tipo de Gestion</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => onChange('requires_agency_support', false)}
            className={cn(
              'text-left p-4 rounded-sm border transition-all',
              !data.requires_agency_support
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20',
            )}
          >
            <p className="text-white text-sm font-medium">Self-Service</p>
            <p className="text-gray-500 text-xs mt-0.5">Tu gestionas la campana directamente</p>
            <p className="text-green-400 text-xs mt-2 font-semibold">Comision: 30%</p>
          </button>
          <button
            onClick={() => onChange('requires_agency_support', true)}
            className={cn(
              'text-left p-4 rounded-sm border transition-all',
              data.requires_agency_support
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20',
            )}
          >
            <p className="text-white text-sm font-medium">Con Kreoon Agency</p>
            <p className="text-gray-500 text-xs mt-0.5">Estrategia, guiones y acompanamiento completo</p>
            <p className="text-amber-400 text-xs mt-2 font-semibold">Comision: 40%</p>
          </button>
        </div>
        {data.requires_agency_support && (
          <p className="text-amber-400/80 text-xs bg-amber-500/5 rounded-sm px-3 py-2">
            Kreoon Agency te acompana con estrategia, guiones, revision y todo el proceso hasta la entrega final.
          </p>
        )}
      </div>

      {/* Campaign type selection */}
      <div className="space-y-3">
        <label className="text-foreground/80 text-sm font-medium">Tipo de Compensacion</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TYPE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = data.campaign_type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange('campaign_type', opt.value)}
                className={cn(
                  'text-left p-4 rounded-sm border transition-all',
                  isSelected
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20',
                )}
              >
                <Icon className={cn('h-5 w-5 mb-2', opt.color)} />
                <p className="text-white text-sm font-medium">{opt.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing mode (only for paid/hybrid) */}
      {showPaymentFields && (
        <div className="space-y-3">
          <label className="text-foreground/80 text-sm font-medium">Modo de Precio</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRICING_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isSelected = data.pricing_mode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange('pricing_mode', opt.value)}
                  className={cn(
                    'text-left p-3 rounded-sm border transition-all',
                    isSelected
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20',
                  )}
                >
                  <Icon className={cn('h-4 w-4 mb-1.5', opt.color)} />
                  <p className="text-white text-xs font-medium">{opt.label}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget warning based on roles */}
      {isBudgetLow && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-medium">Presupuesto por debajo del promedio del mercado</p>
            <p className="text-amber-400/80 text-xs mt-1">
              Para los roles seleccionados{highestRoleLabel && ` (incluyendo ${highestRoleLabel})`}, el presupuesto sugerido es de al menos{' '}
              <InlinePrice amount={suggestedMinBudget} /> por video. Tu oferta actual de{' '}
              <InlinePrice amount={currentBudgetPerVideo} /> puede limitar las aplicaciones de calidad.
            </p>
          </div>
        </div>
      )}

      {/* Fixed price fields */}
      {showPaymentFields && data.pricing_mode === 'fixed' && (
        <div className="bg-white/5 border border-white/10 rounded-sm p-5 space-y-4">
          <h3 className="text-white text-sm font-semibold">Presupuesto Fijo</h3>
          <div className="flex gap-3">
            <button
              onClick={() => onChange('budget_mode', 'per_video')}
              className={cn(
                'flex-1 py-2.5 rounded-sm text-sm font-medium border transition-all',
                data.budget_mode === 'per_video'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-400',
              )}
            >
              Por video
            </button>
            <button
              onClick={() => onChange('budget_mode', 'total_budget')}
              className={cn(
                'flex-1 py-2.5 rounded-sm text-sm font-medium border transition-all',
                data.budget_mode === 'total_budget'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-gray-400',
              )}
            >
              Presupuesto total
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.budget_mode === 'per_video' ? (
              <PriceInput
                label="Precio por video"
                valueUsd={data.budget_per_video}
                onChangeUsd={(v) => onChange('budget_per_video', v)}
                placeholder="75"
              />
            ) : (
              <PriceInput
                label="Presupuesto total"
                valueUsd={data.total_budget}
                onChangeUsd={(v) => onChange('total_budget', v)}
                placeholder="750"
              />
            )}
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          {(data.budget_per_video > 0 || data.total_budget > 0) && (
            <div className="bg-background rounded-sm p-4 space-y-2">
              <h4 className="text-gray-400 text-xs font-semibold uppercase">Resumen Financiero</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pago a creadores</span>
                <span className="text-white"><InlinePrice amount={totalCreatorPayment} /></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><Shield className="h-3 w-3" />Comision Kreoon ({commissionPct}%)</span>
                <span className="text-gray-400"><InlinePrice amount={platformFee} /></span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-white font-semibold">Costo total estimado</span>
                <span className="text-purple-300 font-bold"><InlinePrice amount={totalCost} /></span>
              </div>
              {data.budget_mode === 'per_video' && (
                <p className="text-gray-600 text-xs">Basado en {contentCount} videos x {data.max_creators} creadores</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Auction mode fields */}
      {showPaymentFields && data.pricing_mode === 'auction' && (() => {
        const auctionMaxTotal = data.budget_per_video * contentCount * data.max_creators;
        const auctionMaxFee = Math.round(auctionMaxTotal * commissionPct / 100);
        const auctionMaxCost = auctionMaxTotal + auctionMaxFee;
        const auctionDepositPct = 0.7;
        const auctionDeposit = Math.round(auctionMaxCost * auctionDepositPct);
        return (
        <div className="bg-white/5 border border-white/10 rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-orange-400" />
            <h3 className="text-white text-sm font-semibold">Configuracion de Subasta</h3>
          </div>
          <p className="text-gray-500 text-xs">Los creadores enviaran ofertas libremente. Tu seleccionas las mejores.</p>
          <PriceInput
            label="Presupuesto maximo por video"
            valueUsd={data.budget_per_video}
            onChangeUsd={(v) => onChange('budget_per_video', v)}
            placeholder="100"
          />
          <p className="text-gray-600 text-[10px]">Este es el monto maximo que estas dispuesto a pagar por video. Se cobra el 70% como deposito al publicar.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />Fecha limite de ofertas</label>
              <input type="date" value={data.bid_deadline} onChange={e => onChange('bid_deadline', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-xs">Visibilidad de ofertas</label>
            <div className="flex gap-3">
              <button onClick={() => onChange('bid_visibility', 'public')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-medium border transition-all', data.bid_visibility === 'public' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <Eye className="h-4 w-4" />Publica
              </button>
              <button onClick={() => onChange('bid_visibility', 'sealed')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-medium border transition-all', data.bid_visibility === 'sealed' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <EyeOff className="h-4 w-4" />Sellada
              </button>
            </div>
            <p className="text-gray-600 text-[10px]">
              {data.bid_visibility === 'public' ? 'Los creadores pueden ver las ofertas de otros participantes' : 'Las ofertas son privadas — solo tu puedes verlas'}
            </p>
          </div>
          {data.budget_per_video > 0 && (
            <div className="bg-background rounded-sm p-4 space-y-2">
              <h4 className="text-gray-400 text-xs font-semibold uppercase">Resumen de Costos</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pago max a creadores</span>
                <span className="text-white"><InlinePrice amount={auctionMaxTotal} /></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><Shield className="h-3 w-3" />Comision Kreoon ({commissionPct}%)</span>
                <span className="text-gray-400"><InlinePrice amount={auctionMaxFee} /></span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Costo max total</span>
                <span><InlinePrice amount={auctionMaxCost} /></span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-white font-semibold">Deposito inicial (70%)</span>
                <span className="text-orange-300 font-bold"><InlinePrice amount={auctionDeposit} /></span>
              </div>
              <p className="text-gray-600 text-xs">Basado en {contentCount} videos x {data.max_creators} creadores</p>
              <div className="mt-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-sm">
                <p className="text-orange-300 text-[11px] leading-relaxed">
                  La campana se publica sin cobro. Al aprobar creadores, se cobra el 70% como deposito. El 30% restante se cobra al cerrar la subasta.
                </p>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Range mode fields */}
      {showPaymentFields && data.pricing_mode === 'range' && (
        <div className="bg-white/5 border border-white/10 rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-blue-400" />
            <h3 className="text-white text-sm font-semibold">Rango de Presupuesto</h3>
          </div>
          <p className="text-gray-500 text-xs">Define un rango de precio. Los creadores haran ofertas dentro de estos limites.</p>
          <div className="grid grid-cols-2 gap-3">
            <PriceInput
              label="Oferta minima"
              valueUsd={data.min_bid}
              onChangeUsd={(v) => onChange('min_bid', v)}
              placeholder="40"
            />
            <PriceInput
              label="Oferta maxima"
              valueUsd={data.max_bid}
              onChangeUsd={(v) => onChange('max_bid', v)}
              placeholder="125"
            />
          </div>
          {data.min_bid > 0 && data.max_bid > 0 && data.min_bid > data.max_bid && (
            <p className="text-red-400 text-xs">La oferta minima no puede ser mayor a la maxima</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />Fecha limite de ofertas</label>
              <input type="date" value={data.bid_deadline} onChange={e => onChange('bid_deadline', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-xs">Visibilidad de ofertas</label>
            <div className="flex gap-3">
              <button onClick={() => onChange('bid_visibility', 'public')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-medium border transition-all', data.bid_visibility === 'public' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <Eye className="h-4 w-4" />Publica
              </button>
              <button onClick={() => onChange('bid_visibility', 'sealed')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-medium border transition-all', data.bid_visibility === 'sealed' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <EyeOff className="h-4 w-4" />Sellada
              </button>
            </div>
          </div>
          {data.min_bid > 0 && data.max_bid > 0 && data.max_bid >= data.min_bid && (() => {
            const rangeMinCreator = data.min_bid * contentCount * data.max_creators;
            const rangeMinFee = Math.round(rangeMinCreator * commissionPct / 100);
            const rangeDeposit = rangeMinCreator + rangeMinFee;
            const rangeMaxCreator = data.max_bid * contentCount * data.max_creators;
            const rangeMaxFee = Math.round(rangeMaxCreator * commissionPct / 100);
            const rangeMaxTotal = rangeMaxCreator + rangeMaxFee;
            return (
            <div className="bg-background rounded-sm p-4 space-y-2">
              <h4 className="text-gray-400 text-xs font-semibold uppercase">Resumen de Costos</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rango por video</span>
                <span className="text-white"><InlinePrice amount={data.min_bid} /> - <InlinePrice amount={data.max_bid} /></span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Costo max total (incl. {commissionPct}%)</span>
                <span><InlinePrice amount={rangeMaxTotal} /></span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-white font-semibold">Deposito inicial (oferta min)</span>
                <span className="text-blue-300 font-bold"><InlinePrice amount={rangeDeposit} /></span>
              </div>
              <p className="text-gray-600 text-xs">{contentCount} videos x {data.max_creators} creadores x <InlinePrice amount={data.min_bid} /> + {commissionPct}%</p>
              <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-sm">
                <p className="text-blue-300 text-[11px] leading-relaxed">
                  La campana se publica sin cobro. Al aprobar creadores, se cobra el deposito basado en la oferta minima. Si las ofertas aceptadas lo superan, se cobra la diferencia.
                </p>
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Exchange fields */}
      {showExchangeFields && (
        <div className="bg-white/5 border border-white/10 rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-400" />
            <h3 className="text-white text-sm font-semibold">Producto para Canje</h3>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Nombre del producto</label>
            <input value={data.exchange_product_name} onChange={e => onChange('exchange_product_name', e.target.value)} placeholder="Ej: Audifonos Bluetooth TG-500" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
          </div>
          <PriceInput
            label="Valor estimado"
            valueUsd={data.exchange_product_value}
            onChangeUsd={(v) => onChange('exchange_product_value', v)}
            placeholder="45"
          />
          <div>
            <label className="text-gray-500 text-xs block mb-1">Descripcion del producto</label>
            <textarea value={data.exchange_product_description} onChange={e => onChange('exchange_product_description', e.target.value)} placeholder="Describe el producto que recibiran los creadores..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
          {data.campaign_type === 'exchange' && (
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="10" className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
