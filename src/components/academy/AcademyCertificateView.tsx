import { Download, ShieldCheck, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AcademyCertificate, CertificateRequirements } from '@/types/academy';

interface AcademyCertificateViewProps {
  certificate: AcademyCertificate;
  requirements?: CertificateRequirements;
  showActions?: boolean;
}

export function AcademyCertificateView({
  certificate,
  requirements,
  showActions = true,
}: AcademyCertificateViewProps) {
  const bg = requirements?.cert_background_color ?? '#0a0a0f';
  const accent = requirements?.cert_accent_color ?? '#8B5CF6';
  const title = requirements?.cert_title ?? 'Certificado de Finalización';
  const subtitle = requirements?.cert_subtitle ?? 'KREOON Academia';
  const signatureName = requirements?.cert_signature_name ?? certificate.instructor_name;
  const signatureTitle = requirements?.cert_signature_title ?? 'Instructor';
  const logoUrl = requirements?.cert_logo_url;

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    certificate.verification_url
  )}&bgcolor=${bg.replace('#', '')}&color=${accent.replace('#', '')}`;

  function handleDownload() {
    window.print();
  }

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Certificado verificado · #{certificate.cert_code}</span>
          </div>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Descargar PDF
          </Button>
        </div>
      )}

      <div
        id="academy-cert-printable"
        className="academy-cert relative mx-auto w-full max-w-4xl aspect-[1.414/1] rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: bg, color: '#f5f5f5' }}
      >
        {/* Borde decorativo */}
        <div
          className="absolute inset-3 rounded-xl border-2 pointer-events-none"
          style={{ borderColor: accent }}
        />
        <div
          className="absolute inset-5 rounded-lg border pointer-events-none"
          style={{ borderColor: `${accent}40` }}
        />

        {/* Esquina decorativa accent */}
        <div
          className="absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: `${accent}33` }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: `${accent}26` }}
        />

        {/* Contenido */}
        <div className="relative h-full px-8 md:px-16 py-8 md:py-12 flex flex-col">
          {/* Header con logos */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accent}26` }}
                >
                  <Award className="h-6 w-6" style={{ color: accent }} />
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">{subtitle}</div>
                <div className="text-base font-bold">{certificate.space_name}</div>
              </div>
            </div>
            <div className="text-right text-[10px] uppercase tracking-[0.2em] opacity-60">
              Cód · {certificate.cert_code}
            </div>
          </div>

          {/* Centro */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-xs uppercase tracking-[0.3em] opacity-60 mb-3" style={{ color: accent }}>
              {title}
            </div>
            <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Se otorga a</div>
            <h1
              className="text-3xl md:text-5xl font-bold mb-6 text-center"
              style={{ fontFamily: 'BricolageGrotesque, system-ui, sans-serif' }}
            >
              {certificate.student_name}
            </h1>
            <div className="max-w-2xl text-sm md:text-base opacity-80 leading-relaxed">
              Por completar satisfactoriamente el curso
            </div>
            <div className="mt-3 text-lg md:text-2xl font-semibold" style={{ color: accent }}>
              "{certificate.course_title}"
            </div>
            {certificate.final_score_pct != null && (
              <div className="mt-4 text-sm opacity-70">
                Calificación final: {certificate.final_score_pct.toFixed(1)}%
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-end justify-between">
            <div>
              <div className="border-t pt-2 w-48" style={{ borderColor: accent }}>
                <div className="text-sm font-semibold">{signatureName}</div>
                <div className="text-[10px] uppercase tracking-wide opacity-60">{signatureTitle}</div>
              </div>
            </div>
            <div className="text-center">
              <img src={qrUrl} alt="QR de verificación" className="h-20 w-20 rounded bg-white/5 p-1" />
              <div className="mt-1 text-[9px] uppercase tracking-wide opacity-60">Verificar</div>
            </div>
            <div className="text-right">
              <div className="text-sm">{issuedDate}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-60">Fecha de emisión</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #academy-cert-printable, #academy-cert-printable * { visibility: visible; }
          #academy-cert-printable {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            box-shadow: none !important;
          }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
}
