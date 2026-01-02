import { useEffect } from 'react';
import { Building2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export default function NoCompany() {
  const navigate = useNavigate();
  const { user, roles, rolesLoaded, loading } = useAuth();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();

  useEffect(() => {
    // If the user is not a client anymore (e.g. role was removed), this page becomes irrelevant.
    if (loading || !rolesLoaded || orgLoading) return;
    if (!user) return;

    const isClient = roles.includes('client');
    const isAdmin = roles.includes('admin') || roles.includes('team_leader');

    if (!isClient && isAdmin) {
      // Platform root must select an org before accessing org-required modules.
      if (isPlatformRoot && !currentOrgId) {
        navigate('/no-organization', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [loading, rolesLoaded, orgLoading, user, roles, isPlatformRoot, currentOrgId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full border-primary/10 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">¡Ya casi estás listo!</CardTitle>
          <CardDescription className="text-base mt-2">Tu cuenta ha sido creada exitosamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
            <div className="flex justify-center mb-3">
              <Users className="w-8 h-8 text-primary/70" />
            </div>
            <p className="text-foreground font-medium mb-2">En breve un administrador te asignará a tu empresa</p>
            <p className="text-sm text-muted-foreground">
              Una vez asignado, podrás acceder a todas las funcionalidades de la plataforma: ver el contenido de tu marca,
              aprobar videos, comunicarte con el equipo y mucho más.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 Mientras tanto, puedes explorar nuestra red social y descubrir creadores de contenido
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={() => navigate('/social')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Explorar la red social
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

