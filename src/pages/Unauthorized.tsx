import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { signOut, roles, isAdmin, isCreator, isEditor, isClient } = useAuth();

  const handleGoToMyDashboard = () => {
    if (isAdmin) {
      navigate('/');
    } else if (isCreator) {
      navigate('/creator-dashboard');
    } else if (isEditor) {
      navigate('/editor-dashboard');
    } else if (isClient) {
      navigate('/client-dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Acceso no autorizado</h1>
          <p className="text-muted-foreground mb-6">
            No tienes permisos para acceder a esta página. 
            {roles.length > 0 && ` Tu rol actual es: ${roles.join(', ')}`}
          </p>

          <div className="space-y-3">
            <Button onClick={handleGoToMyDashboard} className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Ir a mi panel
            </Button>
            
            <Button variant="outline" onClick={signOut} className="w-full gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
