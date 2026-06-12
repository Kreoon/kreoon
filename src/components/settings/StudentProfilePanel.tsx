import { useState } from 'react';
import { Camera, Building2, GraduationCap, ArrowRight, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { UpgradeToCreatorWizard } from '@/components/registration-v2/upgrade/UpgradeToCreatorWizard';
import { UpgradeToBrandWizard } from '@/components/registration-v2/upgrade/UpgradeToBrandWizard';

/**
 * Panel de perfil para usuarios con rol único 'student'.
 * Muestra los datos básicos + dos cards de upgrade a Creador/Empresa.
 *
 * Los datos legales (mayoría 18, ToS, privacidad, tratamiento) NO se piden en
 * el registro express; se piden únicamente al activar uno de los wizards de upgrade.
 */
export function StudentProfilePanel() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [openCreator, setOpenCreator] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);

  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Estudiante';
  const email = user?.email || '';
  const avatarUrl = (profile as any)?.avatar_url || undefined;
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header: identidad básica */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold truncate">{fullName}</h2>
                <Badge variant="secondary" className="gap-1 bg-violet-500/10 text-violet-600 border-violet-500/20">
                  <GraduationCap className="h-3 w-3" />
                  Estudiante
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de funciones bloqueadas */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Hoy solo tienes acceso a la academia.</p>
            <p className="text-muted-foreground">
              Para usar el marketplace, gestionar contenido o contratar talento,
              activa tu cuenta como creador o empresa más abajo. Te pediremos los
              datos legales en ese momento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards de upgrade */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Creador */}
        <Card className="group transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-pink-500/10 text-pink-500">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Activarme como creador</CardTitle>
                <CardDescription>Crea contenido y aparece en el marketplace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Recibe propuestas de marcas y agencias</li>
              <li>Publica tu portafolio y servicios</li>
              <li>Tablero de producción y guiones con IA</li>
            </ul>
            <Button className="w-full" onClick={() => setOpenCreator(true)}>
              Empezar activación
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Empresa */}
        <Card className="group transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Activarme como empresa</CardTitle>
                <CardDescription>Contrata talento y gestiona tus campañas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Publica briefs y recibe propuestas</li>
              <li>Aprueba entregables y pagos en escrow</li>
              <li>Dashboard de marca con métricas</li>
            </ul>
            <Button className="w-full" onClick={() => setOpenBrand(true)}>
              Empezar activación
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <UpgradeToCreatorWizard open={openCreator} onOpenChange={setOpenCreator} />
      <UpgradeToBrandWizard open={openBrand} onOpenChange={setOpenBrand} />
    </div>
  );
}
