import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExchangeMemberCode } from '@/hooks/academy/useAcademyCalendar';

export default function AcademiaMemberCalendarCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const exchange = useExchangeMemberCode();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const oauthError = params.get('error');
    if (oauthError) {
      setStatus('error');
      setErrorMsg(oauthError);
      return;
    }
    if (!code) {
      setStatus('error');
      setErrorMsg('Código OAuth faltante');
      return;
    }
    exchange
      .mutateAsync(code)
      .then(() => setStatus('success'))
      .catch((e) => {
        setStatus('error');
        setErrorMsg(e?.message ?? 'No se pudo conectar tu Google Calendar');
      });
  }, [params, exchange]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-purple-400 animate-spin" />
            <h1 className="text-xl font-bold">Conectando tu Google Calendar...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400" />
            <h1 className="text-xl font-bold">¡Conectado!</h1>
            <p className="text-sm text-zinc-400">
              Ahora los eventos a los que digas "Voy" se agregarán a tu Google Calendar.
            </p>
            <Button
              onClick={() => navigate('/academia/dashboard')}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Continuar
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-rose-400" />
            <h1 className="text-xl font-bold">Error al conectar</h1>
            <p className="text-sm text-zinc-400">{errorMsg}</p>
            <Button onClick={() => navigate('/academia/dashboard')} variant="outline">
              Volver
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
