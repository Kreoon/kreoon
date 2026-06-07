import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExchangeGoogleCode } from '@/hooks/academy/useAcademyCalendar';

export default function AcademiaCalendarCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const exchange = useExchangeGoogleCode();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [spaceSlug, setSpaceSlug] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const stateRaw = params.get('state');
    const oauthError = params.get('error');

    if (oauthError) {
      setStatus('error');
      setErrorMsg(oauthError);
      return;
    }
    if (!code || !stateRaw) {
      setStatus('error');
      setErrorMsg('Parámetros de OAuth incompletos');
      return;
    }

    // El state ahora viene firmado con HMAC. Extraemos solo el payload (1er
    // segmento base64url) para conocer space_id; la verificación real ocurre
    // en la edge function que requiere el state completo.
    let payload: { space_id?: string; type?: string } = {};
    try {
      const firstSegment = stateRaw.split('.')[0];
      const padded = firstSegment + '='.repeat((4 - (firstSegment.length % 4)) % 4);
      const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
      payload = JSON.parse(atob(b64));
    } catch {
      setStatus('error');
      setErrorMsg('State inválido');
      return;
    }

    if (!payload.space_id) {
      setStatus('error');
      setErrorMsg('space_id no presente en state');
      return;
    }

    exchange
      .mutateAsync({ code, spaceId: payload.space_id, state: stateRaw })
      .then(async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data } = await (supabase as any)
            .from('academy_spaces')
            .select('slug')
            .eq('id', payload.space_id)
            .single();
          setSpaceSlug(data?.slug ?? null);
        } catch {
          // Ignore
        }
        setStatus('success');
      })
      .catch((e) => {
        setStatus('error');
        setErrorMsg(e?.message ?? 'No se pudo conectar Google Calendar');
      });
  }, [params, exchange]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-purple-400 animate-spin" />
            <h1 className="text-xl font-bold">Conectando con Google Calendar...</h1>
            <p className="text-sm text-zinc-400">Esto solo tomará un momento.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400" />
            <h1 className="text-xl font-bold">¡Conectado!</h1>
            <p className="text-sm text-zinc-400">
              Tu Google Calendar ya está sincronizado con tu academia.
            </p>
            <Button
              onClick={() =>
                spaceSlug ? navigate(`/academia/${spaceSlug}/calendar`) : navigate('/academia/dashboard')
              }
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Volver al calendario
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-rose-400" />
            <h1 className="text-xl font-bold">Error al conectar</h1>
            <p className="text-sm text-zinc-400">{errorMsg ?? 'Intenta de nuevo desde el calendario.'}</p>
            <Button onClick={() => navigate('/academia/dashboard')} variant="outline">
              Volver al panel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
