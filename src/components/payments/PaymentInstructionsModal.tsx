import { useState } from 'react';
import { X, Loader2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { KREOON_PAYMENT } from '@/lib/paymentConfig';

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotified: () => void;
  campaignTitle: string;
  totalAmount: number;
  currency?: string;
  isNotifying?: boolean;
}

export function PaymentInstructionsModal({
  isOpen,
  onClose,
  onNotified,
  campaignTitle,
  totalAmount,
  currency = 'USD',
  isNotifying = false,
}: PaymentInstructionsModalProps) {
  const [bankExpanded, setBankExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bankDetails = [
    { label: 'Beneficiario', value: KREOON_PAYMENT.mercury.account_name },
    { label: 'Banco', value: KREOON_PAYMENT.mercury.bank_name },
    { label: 'Routing ACH', value: KREOON_PAYMENT.mercury.routing_ach },
    { label: 'Nº de cuenta', value: KREOON_PAYMENT.mercury.account_number },
    { label: 'SWIFT / BIC', value: KREOON_PAYMENT.mercury.swift_bic },
    { label: 'Referencia', value: campaignTitle },
  ];

  const handleCopyBankDetails = async () => {
    const text = bankDetails
      .map(({ label, value }) => `${label}: ${value}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60">
      {/* Overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-background border-t-2 sm:border-2 border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">💳</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Realiza el pago para activar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {KREOON_PAYMENT.mercury.reference_hint}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Cerrar modal de pago"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Monto prominente */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-primary">
              ${totalAmount.toLocaleString('en-US')} {currency}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Deposita el 100% antes de que iniciemos la producción.
            </p>
          </div>

          {/* Separador */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground bg-background">
              Elige cómo pagar:
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* BigCard 1 — Stripe */}
          <div className="border-2 border-border hover:border-primary/40 bg-card rounded-2xl px-5 py-4 transition-colors">
            <div className="flex items-start gap-4">
              <span className="text-2xl leading-none mt-0.5">💳</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Tarjeta / ACH en línea</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pago instantáneo con tarjeta de crédito o transferencia ACH (EE.UU.)
                </p>
                <button
                  onClick={() => window.open(KREOON_PAYMENT.stripe_link, '_blank')}
                  className="mt-3 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                >
                  Ir a Stripe →
                </button>
              </div>
            </div>
          </div>

          {/* BigCard 2 — Mercury Bank */}
          <div className="border-2 border-border hover:border-primary/40 bg-card rounded-2xl px-5 py-4 transition-colors">
            <button
              onClick={() => setBankExpanded(prev => !prev)}
              className="w-full flex items-start gap-4 text-left"
              aria-expanded={bankExpanded}
            >
              <span className="text-2xl leading-none mt-0.5">🏦</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Transferencia bancaria internacional</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wire transfer SWIFT o ACH directo a nuestra cuenta Mercury
                </p>
              </div>
              {bankExpanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              }
            </button>

            {bankExpanded && (
              <div className="mt-4 space-y-2">
                {bankDetails.map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center gap-2 py-1 border-b border-border/40 last:border-0">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
                    <span className="font-mono text-sm text-foreground text-right truncate">{value}</span>
                  </div>
                ))}
                <button
                  onClick={handleCopyBankDetails}
                  className="mt-3 w-full flex items-center justify-center gap-2 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  {copied
                    ? <><Check className="h-4 w-4 text-green-500" /> Copiado</>
                    : <><Copy className="h-4 w-4" /> Copiar datos bancarios</>
                  }
                </button>
              </div>
            )}
          </div>

          {/* Nota informativa */}
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ⏱️ Una vez verifiquemos el pago, activamos tu campaña en menos de 24 horas.
              Recibirás confirmación a tu correo.
            </p>
          </div>

          {/* CTA principal */}
          <button
            onClick={onNotified}
            disabled={isNotifying}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isNotifying
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Notificando...</>
              : '✅ Ya pagué — Notificar al equipo'
            }
          </button>

          {/* Link secundario */}
          <p className="text-center text-xs text-muted-foreground">
            ¿Tienes dudas?{' '}
            <a
              href={`mailto:${KREOON_PAYMENT.notify_email}`}
              className="underline hover:text-foreground transition-colors"
            >
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
