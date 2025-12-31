import { Building2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function NoCompany() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full border-primary/10 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">¡Ya casi estás listo!</CardTitle>
          <CardDescription className="text-base mt-2">
            Tu cuenta ha sido creada exitosamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
            <div className="flex justify-center mb-3">
              <Users className="w-8 h-8 text-primary/70" />
            </div>
            <p className="text-foreground font-medium mb-2">
              En breve un administrador te asignará a tu empresa
            </p>
            <p className="text-sm text-muted-foreground">
              Una vez asignado, podrás acceder a todas las funcionalidades de la plataforma: 
              ver el contenido de tu marca, aprobar videos, comunicarte con el equipo y mucho más.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 Mientras tanto, puedes explorar nuestra red social y descubrir creadores de contenido
            </p>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/social')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Explorar la red social
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
