import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Link2Off, Loader2, Lock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { KreoonButton, KreoonInput } from '@/components/ui/kreoon';
import { initialAuthUrl } from '@/lib/auth/initialAuthUrl';

type Phase = 'checking' | 'set' | 'invalid' | 'done';

/**
 * Pantalla de recuperación de contraseña (/reset-password).
 *
 * - Enlace válido → establecer la nueva contraseña ANTES de cualquier onboarding o redirección.
 * - Enlace vencido/usado (otp_expired, access_denied) o visita sin enlace → «Este enlace ya no es válido»
 *   con opción de pedir otro. Nunca se envía al usuario en silencio al inicio ni al onboarding.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    // Error explícito del enlace (otp_expired, access_denied…)
    if (initialAuthUrl.errorCode || initialAuthUrl.error) {
      setPhase('invalid');
      return;
    }

    let resolved = false;
    const finish = (p: Phase) => {
      if (resolved) return;
      resolved = true;
      setPhase(p);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) finish('set');
    });

    // El cliente pudo procesar el enlace antes de montar esta página: usar la sesión resultante
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && initialAuthUrl.type === 'recovery') finish('set');
    });

    // Sin enlace de recuperación válido en unos segundos → inválido (no redirigir en silencio)
    const timer = setTimeout(() => finish('invalid'), initialAuthUrl.hasToken ? 6000 : 1500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setSaving(true);
    const { error: updError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updError) {
      setError(
        /expired|invalid|session/i.test(updError.message)
          ? 'Tu enlace venció mientras escribías. Pide uno nuevo para continuar.'
          : 'No pudimos guardar la contraseña. Inténtalo de nuevo.',
      );
      if (/expired|invalid|session/i.test(updError.message)) setPhase('invalid');
      return;
    }
    setPhase('done');
  };

  const handleRequestNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setRequesting(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRequesting(false);
    // Mismo mensaje exista o no la cuenta (no revelar qué correos están registrados)
    setRequestSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {phase === 'checking' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Verificando tu enlace…</p>
          </div>
        )}

        {phase === 'set' && (
          <form onSubmit={handleSave} className="space-y-5" noValidate>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold text-foreground">Crea tu nueva contraseña</h1>
              <p className="text-sm text-muted-foreground">Elige una contraseña de al menos 8 caracteres.</p>
            </div>
            <KreoonInput
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              disabled={saving}
            />
            <KreoonInput
              label="Repite la contraseña"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              disabled={saving}
            />
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <KreoonButton type="submit" size="lg" className="w-full" loading={saving} disabled={saving}>
              Guardar contraseña
            </KreoonButton>
          </form>
        )}

        {phase === 'invalid' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Link2Off className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-foreground">Este enlace ya no es válido</h1>
              <p className="text-sm text-muted-foreground">
                {initialAuthUrl.errorCode === 'otp_expired'
                  ? 'El enlace venció o ya se usó. Los enlaces de recuperación duran poco por seguridad.'
                  : 'No pudimos verificar el enlace. Puede que esté incompleto, vencido o que ya se haya usado.'}
              </p>
            </div>
            {requestSent ? (
              <p role="status" className="rounded-md bg-muted px-3 py-3 text-center text-sm text-foreground">
                Si existe una cuenta con ese correo, te enviamos un enlace nuevo. Revisa tu bandeja y la carpeta de spam.
              </p>
            ) : (
              <form onSubmit={handleRequestNew} className="space-y-4">
                <KreoonInput
                  label="Tu correo"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  disabled={requesting}
                />
                <KreoonButton type="submit" size="lg" className="w-full" loading={requesting} disabled={requesting || !email.trim()}>
                  Enviarme un enlace nuevo
                </KreoonButton>
              </form>
            )}
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="w-full text-center text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Volver a iniciar sesión
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground">Listo, contraseña guardada</h1>
            <p className="text-sm text-muted-foreground">Ya puedes usar tu nueva contraseña.</p>
            {/* Solo ahora sigue el flujo normal (dashboard u onboarding según corresponda) */}
            <KreoonButton size="lg" className="mt-2 w-full" onClick={() => navigate('/auth')}>
              Continuar
            </KreoonButton>
          </div>
        )}
      </div>
    </div>
  );
}
