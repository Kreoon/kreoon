import { Shield, Lock, FileText, CheckCircle, MessageSquare, Gift, Package, ExternalLink } from 'lucide-react';
import type { CreatorPackage, ProjectPaymentMethod } from '../types/marketplace';

interface HiringStepPaymentProps {
  selectedPackage: CreatorPackage;
  paymentMethod: ProjectPaymentMethod;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function HiringStepPayment({
  selectedPackage,
  paymentMethod,
  onConfirm,
  isSubmitting,
}: HiringStepPaymentProps) {
  return (
    <div className="space-y-6">
      {paymentMethod === 'payment' ? (
        <>
          {/* Escrow explanation */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground font-semibold">Pago protegido por Kreoon</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Tu dinero se mantiene en un escrow seguro y solo se libera cuando apruebes
                  el contenido entregado por el creador.
                </p>
              </div>
            </div>

            <div className="space-y-3 pl-9">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">1</div>
                <span className="text-foreground/80 text-sm">Pagas ahora — el dinero queda en escrow</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">2</div>
                <span className="text-foreground/80 text-sm">El creador produce el contenido</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">3</div>
                <span className="text-foreground/80 text-sm">Revisas y apruebas (o pides cambios)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">4</div>
                <span className="text-foreground/80 text-sm">Al aprobar, se libera el pago al creador</span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-muted/50 rounded-sm p-5 flex items-center justify-between">
            <span className="text-muted-foreground">Total a pagar</span>
            <span className="text-3xl font-bold text-foreground">
              ${selectedPackage.price.toLocaleString()} {selectedPackage.currency}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Exchange explanation */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Gift className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground font-semibold">Canje de producto</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Envias tu producto al creador a cambio de contenido. No hay pago monetario
                  involucrado en este proyecto.
                </p>
              </div>
            </div>

            <div className="space-y-3 pl-9">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">1</div>
                <span className="text-foreground/80 text-sm">Confirmas el proyecto</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">2</div>
                <span className="text-foreground/80 text-sm">Envias el producto a la direccion del creador</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">3</div>
                <span className="text-foreground/80 text-sm">El creador recibe y produce el contenido</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">4</div>
                <span className="text-foreground/80 text-sm">Revisas y apruebas el contenido</span>
              </div>
            </div>
          </div>

          {/* Exchange info */}
          <div className="bg-muted/50 rounded-sm p-5 flex items-center gap-4">
            <Package className="h-8 w-8 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-foreground font-semibold">Sin costo monetario</p>
              <p className="text-muted-foreground text-sm">Solo necesitas enviar tu producto al creador</p>
            </div>
          </div>
        </>
      )}

      {/* Trust badges */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Escrow seguro</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Contrato digital</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Garantia de entrega</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Comunicacion protegida dentro de Kreoon</span>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-sm text-base transition-all hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          'Redirigiendo a Stripe...'
        ) : paymentMethod === 'exchange' ? (
          'Confirmar Canje y Enviar Proyecto'
        ) : (
          <>
            Pagar con Stripe
            <ExternalLink className="h-4 w-4" />
          </>
        )}
      </button>
      {paymentMethod === 'payment' && !isSubmitting && (
        <p className="text-center text-xs text-muted-foreground">
          Serás redirigido a Stripe para completar el pago de forma segura
        </p>
      )}
    </div>
  );
}
