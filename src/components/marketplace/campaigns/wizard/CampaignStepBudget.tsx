import { DollarSign, Gift, Layers, Shield, Gavel, ArrowUpDown, Eye, EyeOff, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignType, CampaignBudgetMode, CampaignPricingMode, BidVisibility } from '../../types/marketplace';

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
}

interface CampaignStepBudgetProps {
  data: CampaignBudgetData;
  onChange: <K extends keyof CampaignBudgetData>(field: K, value: CampaignBudgetData[K]) => void;
  contentCount: number;
}

const TYPE_OPTIONS: { value: CampaignType; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { value: 'paid', label: 'Pagada', description: 'Paga a los creadores por su trabajo', icon: DollarSign, color: 'text-green-400' },
  { value: 'exchange', label: 'Canje', description: 'Ofrece producto a cambio del contenido', icon: Gift, color: 'text-purple-400' },
  { value: 'hybrid', label: 'Hibrida', description: 'Combinacion de pago + producto', icon: Layers, color: 'text-blue-400' },
];

const PRICING_OPTIONS: { value: CampaignPricingMode; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { value: 'fixed', label: 'Precio Fijo', description: 'Tu defines el precio exacto', icon: DollarSign, color: 'text-green-400' },
  { value: 'auction', label: 'Subasta', description: 'Los creadores hacen ofertas libres', icon: Gavel, color: 'text-orange-400' },
  { value: 'range', label: 'Rango', description: 'Define min/max, creadores pujan dentro', icon: ArrowUpDown, color: 'text-blue-400' },
];

import { COMMISSION_RATES } from '@/lib/finance/constants';

const PLATFORM_FEE_PCT = COMMISSION_RATES.campaigns_managed.base;

export function CampaignStepBudget({ data, onChange, contentCount }: CampaignStepBudgetProps) {
  const showPaymentFields = data.campaign_type === 'paid' || data.campaign_type === 'hybrid';
  const showExchangeFields = data.campaign_type === 'exchange' || data.campaign_type === 'hybrid';

  // Financial summary
  const totalCreatorPayment = data.budget_mode === 'per_video'
    ? data.budget_per_video * contentCount * data.max_creators
    : data.total_budget;
  const platformFee = Math.round(totalCreatorPayment * PLATFORM_FEE_PCT / 100);
  const totalCost = totalCreatorPayment + platformFee;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Presupuesto y Compensacion</h2>
        <p className="text-gray-500 text-sm">Define como compensaras a los creadores</p>
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
                  'text-left p-4 rounded-xl border transition-all',
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
                    'text-left p-3 rounded-xl border transition-all',
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

      {/* Fixed price fields */}
      {showPaymentFields && data.pricing_mode === 'fixed' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-white text-sm font-semibold">Presupuesto Fijo</h3>
          <div className="flex gap-3">
            <button
              onClick={() => onChange('budget_mode', 'per_video')}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all',
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
                'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all',
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
              <div>
                <label className="text-gray-500 text-xs block mb-1">Precio por video (COP)</label>
                <input type="number" value={data.budget_per_video || ''} onChange={e => onChange('budget_per_video', Number(e.target.value) || 0)} placeholder="300000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
              </div>
            ) : (
              <div>
                <label className="text-gray-500 text-xs block mb-1">Presupuesto total (COP)</label>
                <input type="number" value={data.total_budget || ''} onChange={e => onChange('total_budget', Number(e.target.value) || 0)} placeholder="3000000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
              </div>
            )}
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          {(data.budget_per_video > 0 || data.total_budget > 0) && (
            <div className="bg-background rounded-lg p-4 space-y-2">
              <h4 className="text-gray-400 text-xs font-semibold uppercase">Resumen Financiero</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pago a creadores</span>
                <span className="text-white">${totalCreatorPayment.toLocaleString()} COP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><Shield className="h-3 w-3" />Comision Kreoon ({PLATFORM_FEE_PCT}%)</span>
                <span className="text-gray-400">${platformFee.toLocaleString()} COP</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-white font-semibold">Costo total estimado</span>
                <span className="text-purple-300 font-bold">${totalCost.toLocaleString()} COP</span>
              </div>
              {data.budget_mode === 'per_video' && (
                <p className="text-gray-600 text-xs">Basado en {contentCount} videos x {data.max_creators} creadores</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Auction mode fields */}
      {showPaymentFields && data.pricing_mode === 'auction' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-orange-400" />
            <h3 className="text-white text-sm font-semibold">Configuracion de Subasta</h3>
          </div>
          <p className="text-gray-500 text-xs">Los creadores enviaran ofertas libremente. Tu seleccionas las mejores.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />Fecha limite de ofertas</label>
              <input type="date" value={data.bid_deadline} onChange={e => onChange('bid_deadline', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-xs">Visibilidad de ofertas</label>
            <div className="flex gap-3">
              <button onClick={() => onChange('bid_visibility', 'public')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all', data.bid_visibility === 'public' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <Eye className="h-4 w-4" />Publica
              </button>
              <button onClick={() => onChange('bid_visibility', 'sealed')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all', data.bid_visibility === 'sealed' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <EyeOff className="h-4 w-4" />Sellada
              </button>
            </div>
            <p className="text-gray-600 text-[10px]">
              {data.bid_visibility === 'public' ? 'Los creadores pueden ver las ofertas de otros participantes' : 'Las ofertas son privadas — solo tu puedes verlas'}
            </p>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Presupuesto referencia por video (opcional, COP)</label>
            <input type="number" value={data.budget_per_video || ''} onChange={e => onChange('budget_per_video', Number(e.target.value) || 0)} placeholder="No se muestra a creadores" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            <p className="text-gray-600 text-[10px] mt-1">Solo para tu referencia interna. No se muestra a los creadores.</p>
          </div>
        </div>
      )}

      {/* Range mode fields */}
      {showPaymentFields && data.pricing_mode === 'range' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-blue-400" />
            <h3 className="text-white text-sm font-semibold">Rango de Presupuesto</h3>
          </div>
          <p className="text-gray-500 text-xs">Define un rango de precio. Los creadores haran ofertas dentro de estos limites.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Oferta minima (COP)</label>
              <input type="number" value={data.min_bid || ''} onChange={e => onChange('min_bid', Number(e.target.value) || 0)} placeholder="150000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Oferta maxima (COP)</label>
              <input type="number" value={data.max_bid || ''} onChange={e => onChange('max_bid', Number(e.target.value) || 0)} placeholder="500000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          {data.min_bid > 0 && data.max_bid > 0 && data.min_bid > data.max_bid && (
            <p className="text-red-400 text-xs">La oferta minima no puede ser mayor a la maxima</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="5" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />Fecha limite de ofertas</label>
              <input type="date" value={data.bid_deadline} onChange={e => onChange('bid_deadline', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-xs">Visibilidad de ofertas</label>
            <div className="flex gap-3">
              <button onClick={() => onChange('bid_visibility', 'public')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all', data.bid_visibility === 'public' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <Eye className="h-4 w-4" />Publica
              </button>
              <button onClick={() => onChange('bid_visibility', 'sealed')} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all', data.bid_visibility === 'sealed' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/10 text-gray-400')}>
                <EyeOff className="h-4 w-4" />Sellada
              </button>
            </div>
          </div>
          {data.min_bid > 0 && data.max_bid > 0 && data.max_bid >= data.min_bid && (
            <div className="bg-background rounded-lg p-4 space-y-2">
              <h4 className="text-gray-400 text-xs font-semibold uppercase">Estimacion de Costos</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rango por video</span>
                <span className="text-white">${data.min_bid.toLocaleString()} - ${data.max_bid.toLocaleString()} COP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Costo min estimado</span>
                <span className="text-foreground/80">${Math.round(data.min_bid * contentCount * data.max_creators * (1 + PLATFORM_FEE_PCT / 100)).toLocaleString()} COP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Costo max estimado</span>
                <span className="text-purple-300 font-bold">${Math.round(data.max_bid * contentCount * data.max_creators * (1 + PLATFORM_FEE_PCT / 100)).toLocaleString()} COP</span>
              </div>
              <p className="text-gray-600 text-xs">Incluye {PLATFORM_FEE_PCT}% comision | {contentCount} videos x {data.max_creators} creadores</p>
            </div>
          )}
        </div>
      )}

      {/* Exchange fields */}
      {showExchangeFields && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-400" />
            <h3 className="text-white text-sm font-semibold">Producto para Canje</h3>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Nombre del producto</label>
            <input value={data.exchange_product_name} onChange={e => onChange('exchange_product_name', e.target.value)} placeholder="Ej: Audifonos Bluetooth TG-500" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Valor estimado (COP)</label>
            <input type="number" value={data.exchange_product_value || ''} onChange={e => onChange('exchange_product_value', Number(e.target.value) || 0)} placeholder="180000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Descripcion del producto</label>
            <textarea value={data.exchange_product_description} onChange={e => onChange('exchange_product_description', e.target.value)} placeholder="Describe el producto que recibiran los creadores..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
          {data.campaign_type === 'exchange' && (
            <div>
              <label className="text-gray-500 text-xs block mb-1">Maximo de creadores</label>
              <input type="number" min="1" value={data.max_creators || ''} onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))} placeholder="10" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
