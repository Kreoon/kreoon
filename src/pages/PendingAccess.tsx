import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Clock, LogOut, Sparkles, Loader2, ArrowLeft, Users, Briefcase } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PendingAccess() {
  const { user, signOut, roles, loading, rolesLoaded, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);

  // Check if user should be here
  const isPending = profile?.organization_status === 'pending_assignment';

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

  // If user has no roles, show options for social network or request access
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Users with roles but pending assignment
  if (roles.length > 0 && !isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a KREOON
        </Button>

        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-display">¡Bienvenido a KREOON!</CardTitle>
            <CardDescription className="text-base">
              Tu cuenta está lista. Puedes explorar la red social o solicitar acceso para trabajar con organizaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Tu cuenta está registrada como:</span>
              </div>
              <p className="font-medium text-foreground">{user?.email}</p>
            </div>

            {/* Social Network Access */}
            <Link to="/social" className="block">
              <Button 
                size="lg" 
                variant="default"
                className="w-full gap-2"
              >
                <Users className="w-5 h-5" />
                Ir a la red social
              </Button>
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ¿Quieres trabajar?
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para unirte a una organización como creador, editor o cliente, solicita acceso:
              </p>
              <ul className="text-sm text-left space-y-1 text-muted-foreground pl-4">
                <li>• <strong className="text-foreground">Creador:</strong> Graba contenido para marcas</li>
                <li>• <strong className="text-foreground">Editor:</strong> Edita videos profesionalmente</li>
                <li>• <strong className="text-foreground">Cliente:</strong> Contrata creadores para tu marca</li>
              </ul>
            </div>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full gap-2"
              onClick={handleRequestAccess}
            >
              <Briefcase className="w-5 h-5" />
              Solicitar acceso a una organización
            </Button>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
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
