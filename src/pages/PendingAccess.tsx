import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Clock, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// WhatsApp number for access requests - update this to your company number
const WHATSAPP_NUMBER = '573001234567'; // Replace with actual company WhatsApp

export default function PendingAccess() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRequestAccess = () => {
    const message = encodeURIComponent(
      `¡Hola! 👋\n\nMe acabo de registrar en UGC Colombia y quiero solicitar acceso.\n\n` +
      `📧 Mi correo: ${user?.email}\n` +
      `👤 Mi nombre: ${user?.user_metadata?.full_name || 'No especificado'}\n\n` +
      `Me gustaría ser parte del equipo como:\n` +
      `[ ] Creador de contenido\n` +
      `[ ] Editor de video\n` +
      `[ ] Cliente/Marca\n\n` +
      `¡Gracias!`
    );
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl">¡Registro exitoso!</CardTitle>
          <CardDescription className="text-base">
            Tu cuenta ha sido creada. Ahora necesitas solicitar acceso para poder usar la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Tu cuenta está registrada como:</span>
            </div>
            <p className="font-medium">{user?.email}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Para activar tu cuenta, escríbenos por WhatsApp indicando qué rol deseas:
            </p>
            <ul className="text-sm text-left space-y-1 text-muted-foreground pl-4">
              <li>• <strong>Creador:</strong> Graba contenido UGC</li>
              <li>• <strong>Editor:</strong> Edita videos profesionalmente</li>
              <li>• <strong>Cliente:</strong> Contrata creadores para tu marca</li>
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

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
