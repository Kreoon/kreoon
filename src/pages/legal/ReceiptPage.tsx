import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ShieldCheck, Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicReceipt {
  id: string;
  document_type: string;
  document_title: string;
  document_title_label: string;
  document_version: string;
  document_hash: string;
  signer_full_name: string;
  signer_email_masked: string;
  declaration_text: string;
  signature_method: string;
  signature_method_label: string;
  signed_at: string;
  status: string;
}

const DOC_EMOJI: Record<string, string> = {
  client_agreement: '🤝',
  creator_agreement: '✍️',
  talent_agreement: '🎬',
  brand_agreement: '🏢',
  organization_agreement: '🏛️',
  terms_of_service: '📋',
  privacy_policy: '🔒',
  escrow_payment_terms: '💳',
  data_processing_agreement: '📊',
};

export default function ReceiptPage() {
  const { signatureId } = useParams<{ signatureId: string }>();
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signatureId) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const fnUrl = `${supabaseUrl}/functions/v1/get-public-receipt?id=${signatureId}`;

    fetch(fnUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No encontrado');
        setReceipt(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [signatureId]);

  const signedDate = receipt
    ? new Date(receipt.signed_at).toLocaleString('es-CO', {
        dateStyle: 'full',
        timeStyle: 'medium',
        timeZone: 'America/Bogota',
      })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Cargando comprobante...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Comprobante no encontrado</h1>
          <p className="text-muted-foreground text-sm">
            Este enlace puede ser inválido o el documento no existe.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const docEmoji = DOC_EMOJI[receipt.document_type] ?? '📄';

  return (
    <div className="min-h-screen bg-[#0a0a14] text-foreground print:bg-white print:text-black">
      {/* Barra top — solo en pantalla */}
      <div className="print:hidden border-b border-border/30 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            KREOON
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Guardar PDF
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5 print:py-6 print:px-0">

        {/* Header */}
        <div className={cn(
          "rounded-3xl p-8 text-center space-y-2",
          "bg-gradient-to-br from-violet-600 to-purple-700",
          "print:rounded-none print:bg-none print:border-b-2 print:border-purple-600 print:pb-6"
        )}>
          <span className="text-5xl block print:hidden">{docEmoji}</span>
          <p className="text-xs font-semibold tracking-widest text-purple-200 uppercase print:text-purple-700">KREOON</p>
          <h1 className="text-2xl font-bold text-white print:text-gray-900">Comprobante de Firma</h1>
          <p className="text-sm text-purple-200 print:text-gray-500">Documento firmado electrónicamente con validez legal</p>
        </div>

        {/* Documento */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden print:border print:border-gray-200">
          <div className="px-5 py-4 border-b border-border/30 bg-muted/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documento firmado</p>
            <p className="text-lg font-semibold text-foreground">{receipt.document_title_label || receipt.document_title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Versión {receipt.document_version}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border/30">
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1">Firmado el</p>
              <p className="text-sm text-foreground leading-snug">{signedDate}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1">Método</p>
              <p className="text-sm text-foreground">{receipt.signature_method_label}</p>
            </div>
          </div>
        </div>

        {/* Firmante */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden print:border print:border-gray-200">
          <div className="px-5 py-3 border-b border-border/30 bg-muted/10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos del firmante</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border/30">
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1">Nombre</p>
              <p className="text-sm font-medium text-foreground">{receipt.signer_full_name}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1">Correo</p>
              <p className="text-sm text-foreground font-mono">{receipt.signer_email_masked}</p>
            </div>
          </div>
        </div>

        {/* Declaración */}
        <div className="rounded-2xl border-l-4 border-primary bg-primary/5 px-5 py-4 print:border print:border-gray-300">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Declaración firmada</p>
          <p className="text-sm text-foreground leading-relaxed italic">"{receipt.declaration_text}"</p>
        </div>

        {/* Validez legal */}
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 px-5 py-4 flex items-start gap-3 print:border print:border-green-600">
          <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-400 print:text-green-700 mb-0.5">Firma electrónica válida</p>
            <p className="text-xs text-muted-foreground leading-relaxed print:text-gray-600">
              Esta firma tiene plena validez conforme a la Ley 527 de 1999 (Colombia) y al E-SIGN Act (EE.UU.).
              El registro incluye identidad verificada, timestamp inmutable, IP y huella del documento.
            </p>
          </div>
        </div>

        {/* Hash + ID */}
        <div className="rounded-2xl border border-border/30 bg-muted/5 px-5 py-4 space-y-3 print:border print:border-gray-200">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Huella del documento (SHA-256)</p>
            <p className="text-xs text-muted-foreground font-mono break-all">{receipt.document_hash}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ID de firma</p>
            <p className="text-xs text-muted-foreground font-mono">{receipt.id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pt-2 pb-8 print:pt-6">
          <p className="text-xs text-muted-foreground">KREOON · SICOMMER INT LLC</p>
          <p className="text-xs text-muted-foreground">12550 Biscayne Blvd Ste 218, North Miami FL 33181</p>
          <p className="text-xs text-muted-foreground">
            <a href="mailto:legal@kreoon.com" className="text-primary hover:underline print:text-gray-600">legal@kreoon.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
