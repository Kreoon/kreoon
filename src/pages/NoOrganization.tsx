import { Building2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { RootOrgSwitcher } from '@/components/layout/RootOrgSwitcher';

export default function NoOrganization() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Selecciona una organización</CardTitle>
          <CardDescription className="text-base mt-2">
            Como administrador de plataforma, debes seleccionar una organización para acceder a sus módulos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <RootOrgSwitcher />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Una vez seleccionada, podrás ver el Dashboard, Tablero, Contenido, Clientes, 
              Equipo y demás módulos de esa organización.
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Ir a Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
