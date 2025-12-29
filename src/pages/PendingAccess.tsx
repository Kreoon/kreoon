import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Clock, LogOut, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PendingAccess() {
  const { user, signOut, roles, loading, rolesLoaded, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);

  // Check if user should be here
  const isPending = profile?.organization_status === 'pending_assignment' || roles.length === 0;

  // If user has roles and is active, redirect to their dashboard
  useEffect(() => {
    if (!loading && rolesLoaded && roles.length > 0 && profile?.organization_status !== 'pending_assignment') {
      if (roles.includes('admin')) {
        navigate('/dashboard', { replace: true });
      } else if (roles.includes('creator')) {
        navigate('/creator-dashboard', { replace: true });
      } else if (roles.includes('editor')) {
        navigate('/editor-dashboard', { replace: true });
      } else if (roles.includes('client')) {
        navigate('/client-dashboard', { replace: true });
      } else if (roles.includes('strategist')) {
        navigate('/strategist-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loading, rolesLoaded, roles, profile, navigate]);

  // If no user, redirect to auth
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const fetchWhatsappNumber = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'whatsapp_access_request')
          .single();

        if (error) throw error;
        setWhatsappNumber(data?.value || '573113842399');
      } catch (error) {
        console.error('Error fetching WhatsApp number:', error);
        setWhatsappNumber('573113842399'); // Fallback
      } finally {
        setLoadingWhatsapp(false);
      }
    };

    fetchWhatsappNumber();
  }, []);

  const handleRequestAccess = () => {
    if (!whatsappNumber) return;
    
    const message = encodeURIComponent(
      `¡Hola! 👋\n\nMe acabo de registrar en KREOON y quiero solicitar acceso.\n\n` +
      `📧 Mi correo: ${user?.email}\n` +
      `👤 Mi nombre: ${user?.user_metadata?.full_name || 'No especificado'}\n\n` +
      `Me gustaría ser parte del equipo como:\n` +
      `[ ] Creador de contenido\n` +
      `[ ] Editor de video\n` +
      `[ ] Cliente/Marca\n\n` +
      `¡Gracias!`
    );
    
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente'
    });
  };

  // Show loading while checking auth state
  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if user should be elsewhere
  if (!user || roles.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a KREOON
        </Button>

        <Card className="bg-slate-900/80 border-slate-800 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-violet-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl text-white">¡Registro exitoso!</CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Tu cuenta ha sido creada. Ahora necesitas solicitar acceso para poder usar la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Tu cuenta está registrada como:</span>
              </div>
              <p className="font-medium text-white">{user?.email}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Para activar tu cuenta, escríbenos por WhatsApp indicando qué rol deseas:
              </p>
              <ul className="text-sm text-left space-y-1 text-slate-400 pl-4">
                <li>• <strong className="text-white">Creador:</strong> Graba contenido para marcas</li>
                <li>• <strong className="text-white">Editor:</strong> Edita videos profesionalmente</li>
                <li>• <strong className="text-white">Cliente:</strong> Contrata creadores para tu marca</li>
              </ul>
            </div>

            <Button 
              size="lg" 
              className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
              onClick={handleRequestAccess}
            >
              <MessageCircle className="w-5 h-5" />
              Solicitar mi acceso por WhatsApp
            </Button>

            <div className="pt-4 border-t border-slate-700">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
