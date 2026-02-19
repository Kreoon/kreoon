import { useState } from 'react';
import { Star, CheckCircle2, Gift, DollarSign, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HiringBrief, CreatorFullProfile, CreatorPackage, ProjectPaymentMethod } from '../types/marketplace';

interface HiringStepSummaryProps {
  brief: HiringBrief;
  creator: CreatorFullProfile;
  selectedPackage: CreatorPackage;
  paymentMethod: ProjectPaymentMethod;
  onEditStep: (step: number) => void;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
}

export function HiringStepSummary({
  brief,
  creator,
  selectedPackage,
  paymentMethod,
  onEditStep,
  termsAccepted,
  onTermsChange,
}: HiringStepSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Creator mini-card */}
      <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creator.display_name}
            className="w-12 h-12 rounded-full object-cover border border-purple-500/50"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
            {creator.display_name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold text-sm truncate">{creator.display_name}</span>
            {creator.is_verified && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 text-purple-400 fill-purple-400" />
            <span className="text-white">{creator.rating_avg.toFixed(1)}</span>
            <span className="text-gray-500">({creator.rating_count})</span>
          </div>
        </div>
      </div>

      {/* Brief summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/80">Brief del proyecto</h3>
          <button
            type="button"
            onClick={() => onEditStep(0)}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs transition-colors"
          >
            <Edit3 className="h-3 w-3" />
            Editar
          </button>
        </div>
        <div className="bg-white/5 rounded-lg p-4 space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Producto:</span>
            <span className="text-white ml-2">{brief.product_name}</span>
          </div>
          <div>
            <span className="text-gray-500">Objetivo:</span>
            <span className="text-white ml-2">{brief.objective}</span>
          </div>
          {brief.target_audience && (
            <div>
              <span className="text-gray-500">Audiencia:</span>
              <span className="text-white ml-2">{brief.target_audience}</span>
            </div>
          )}
          {brief.tone && (
            <div>
              <span className="text-gray-500">Tono:</span>
              <span className="text-white ml-2">{brief.tone}</span>
            </div>
          )}
          {brief.key_messages.length > 0 && (
            <div>
              <span className="text-gray-500 block mb-1">Mensajes clave:</span>
              <div className="flex flex-wrap gap-1.5">
                {brief.key_messages.map((msg, i) => (
                  <span key={i} className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                    {msg}
                  </span>
                ))}
              </div>
            </div>
          )}
          {brief.deadline && (
            <div>
              <span className="text-gray-500">Fecha limite:</span>
              <span className="text-white ml-2">{new Date(brief.deadline).toLocaleDateString('es-CO')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Package summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/80">Paquete seleccionado</h3>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs transition-colors"
          >
            <Edit3 className="h-3 w-3" />
            Cambiar
          </button>
        </div>
        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">{selectedPackage.name}</span>
            <div className="flex items-center gap-1">
              {paymentMethod === 'exchange' ? (
                <Gift className="h-4 w-4 text-green-400" />
              ) : (
                <DollarSign className="h-4 w-4 text-purple-400" />
              )}
              <span className="text-white font-bold">
                {paymentMethod === 'exchange'
                  ? 'Canje de producto'
                  : `$${selectedPackage.price.toLocaleString()} ${selectedPackage.currency}`}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-xs">{selectedPackage.description}</p>
          <p className="text-gray-500 text-xs">Entrega: {selectedPackage.delivery_days}</p>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Total</span>
          <span className="text-2xl font-bold text-white">
            {paymentMethod === 'exchange' ? (
              <span className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-400" />
                <span className="text-green-400">Canje</span>
              </span>
            ) : (
              `$${selectedPackage.price.toLocaleString()} ${selectedPackage.currency}`
            )}
          </span>
        </div>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="mt-0.5">
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
              termsAccepted
                ? 'bg-purple-600 border-purple-600'
                : 'border-gray-600 group-hover:border-purple-500',
            )}
          >
            {termsAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
          </div>
        </div>
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={e => onTermsChange(e.target.checked)}
          className="sr-only"
        />
        <span className="text-gray-400 text-sm leading-relaxed">
          Acepto los{' '}
          <span className="text-purple-400 underline">terminos de servicio</span> de Kreoon.
          Entiendo que el pago se mantiene en escrow hasta que apruebe el contenido entregado.
        </span>
      </label>
    </div>
  );
}
