import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { AcademyCertificateView } from '@/components/academy/AcademyCertificateView';
import { useVerifyCertificate } from '@/hooks/academy/useAcademyCertificate';

export default function AcademiaVerifyPage() {
  const { certCode } = useParams<{ certCode: string }>();
  const { data: cert, isLoading } = useVerifyCertificate(certCode);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        Verificando certificado...
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-center text-zinc-400 gap-3 px-4">
        <ShieldAlert className="h-16 w-16 text-rose-400" />
        <h1 className="text-2xl font-bold text-zinc-100">Certificado no encontrado</h1>
        <p>El código <span className="font-mono text-rose-400">#{certCode}</span> no existe o ha sido revocado.</p>
        <Link to="/academia" className="text-purple-400 hover:text-purple-300 mt-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Volver a Academia
        </Link>
      </div>
    );
  }

  if (!cert.is_valid) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-center text-zinc-400 gap-3 px-4">
        <ShieldAlert className="h-16 w-16 text-amber-400" />
        <h1 className="text-2xl font-bold text-zinc-100">Certificado revocado</h1>
        <p>Este certificado ya no es válido.</p>
        {cert.revoke_reason && (
          <p className="text-sm text-zinc-500 max-w-md">Motivo: {cert.revoke_reason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 print:hidden">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="font-semibold text-emerald-300">Certificado verificado</div>
            <div className="text-xs text-emerald-400/70">
              Emitido el {new Date(cert.issued_at).toLocaleDateString('es-ES')} por {cert.space_name}
            </div>
          </div>
        </div>

        <AcademyCertificateView certificate={cert} />
      </div>
    </div>
  );
}
