import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function getRecoveryFlagFromUrl(location: { search: string; hash: string }) {
  const params = new URLSearchParams(location.search);
  const typeFromSearch = params.get('type');

  // Some providers include params in hash: #access_token=...&type=recovery
  const hash = location.hash?.startsWith('#') ? location.hash.slice(1) : location.hash;
  const hashParams = new URLSearchParams(hash);
  const typeFromHash = hashParams.get('type');

  return (typeFromSearch || typeFromHash) === 'recovery';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const isRecovery = useMemo(() => getRecoveryFlagFromUrl(location), [location]);

  const [booting, setBooting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let mounted = true;

    // The session is established via the recovery link. We just verify it's present.
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        // If there's no session, user likely opened a stale/invalid link.
        if (!data.session) {
          if (!mounted) return;
          setBooting(false);
          return;
        }
      } catch (e: any) {
        console.error('[reset-password] boot error:', e);
      } finally {
        if (mounted) setBooting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Contraseña actualizada. Ya puedes ingresar.');
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            {isRecovery
              ? 'Define tu nueva contraseña para ingresar a tu cuenta.'
              : 'Abre el enlace de recuperación desde tu correo para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar contraseña
            </Button>

            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/', { replace: true })}>
              Volver
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
