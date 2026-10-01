import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Link2Off, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initialAuthUrl } from '@/lib/auth/initialAuthUrl';

type Phase = 'checking' | 'set' | 'invalid' | 'done';

/**
 * Pantalla de recuperación de contraseña (/reset-password).
 *
 * El correo de recuperación siempre apuntó aquí, pero la ruta no existía: el usuario caía en 404 o en el
 * inicio con sesión iniciada y sin forma de fijar la contraseña.
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
      const expired = /expired|invalid|session/i.test(updError.message);
      setError(expired
        ? 'Tu enlace venció mientras escribías. Pide uno nuevo para continuar.'
        : 'No pudimos guardar la contraseña. Inténtalo de nuevo.');
      if (expired) setPhase('invalid');
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
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
            <div className="space-y-2">
              <Label htmlFor="rp-password">Nueva contraseña</Label>
              <Input id="rp-password" type="password" autoComplete="new-password" value={password}
                onChange={(e) => setPassword(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-confirm">Repite la contraseña</Label>
              <Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} disabled={saving} />
            </div>
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Guardar contraseña
            </Button>
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
                <div className="space-y-2">
                  <Label htmlFor="rp-email">Tu correo</Label>
                  <Input id="rp-email" type="email" autoComplete="email" placeholder="tu@correo.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} disabled={requesting} />
                </div>
                <Button type="submit" className="w-full" disabled={requesting || !email.trim()}>
                  {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Enviarme un enlace nuevo
                </Button>
              </form>
            )}
            <button type="button" onClick={() => navigate('/auth')}
              className="w-full text-center text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80">
              Volver a iniciar sesión
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground">Listo, contraseña guardada</h1>
            <p className="text-sm text-muted-foreground">Ya puedes usar tu nueva contraseña.</p>
            <Button className="mt-2 w-full" onClick={() => navigate('/auth')}>Continuar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
