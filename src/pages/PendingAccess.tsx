import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, LogOut, Sparkles, Loader2, ArrowLeft, Users, 
  CheckCircle2, Video, Scissors, Building2, LineChart, Star
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ROLE_INFO: Record<string, { 
  label: string; 
  description: string; 
  icon: React.ReactNode;
  benefits: string[];
  color: string;
}> = {
  creator: {
    label: 'Creador de Contenido',
    description: 'Crea contenido UGC increíble para marcas y gana dinero haciendo lo que amas.',
    icon: <Video className="w-6 h-6" />,
    benefits: [
      'Recibe briefs y graba contenido para marcas',
      'Gestiona tus pagos y comisiones',
      'Construye tu portafolio profesional',
      'Accede a oportunidades exclusivas'
    ],
    color: 'from-pink-500 to-rose-500'
  },
  editor: {
    label: 'Editor de Video',
    description: 'Edita y produce videos profesionales para las campañas de nuestros clientes.',
    icon: <Scissors className="w-6 h-6" />,
    benefits: [
      'Recibe videos para editar y producir',
      'Trabaja con las mejores marcas',
      'Gestiona tus entregas y pagos',
      'Desarrolla tu estilo editorial único'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  client: {
    label: 'Cliente / Marca',
    description: 'Gestiona tus campañas de contenido UGC y colabora con los mejores creadores.',
    icon: <Building2 className="w-6 h-6" />,
    benefits: [
      'Crea y gestiona campañas de contenido',
      'Accede a creadores verificados',
      'Revisa y aprueba contenido fácilmente',
      'Descarga contenido listo para publicar'
    ],
    color: 'from-emerald-500 to-teal-500'
  },
  strategist: {
    label: 'Estratega',
    description: 'Diseña estrategias de contenido y supervisa el flujo de trabajo creativo.',
    icon: <LineChart className="w-6 h-6" />,
    benefits: [
      'Planifica estrategias de contenido',
      'Coordina equipos creativos',
      'Analiza métricas de rendimiento',
      'Optimiza campañas en tiempo real'
    ],
    color: 'from-violet-500 to-purple-500'
  },
  ambassador: {
    label: 'Embajador',
    description: 'Representa nuestra plataforma y ayuda a crecer la comunidad de creadores.',
    icon: <Star className="w-6 h-6" />,
    benefits: [
      'Invita y gestiona nuevos creadores',
      'Gana comisiones por referidos activos',
      'Accede a bonificaciones especiales',
      'Participa en eventos exclusivos'
    ],
    color: 'from-amber-500 to-orange-500'
  },
  admin: {
    label: 'Administrador',
    description: 'Gestiona la organización, equipos y configuraciones de la plataforma.',
    icon: <Users className="w-6 h-6" />,
    benefits: [
      'Control total de la organización',
      'Gestión de usuarios y permisos',
      'Configuración de flujos de trabajo',
      'Acceso a reportes y analytics'
    ],
    color: 'from-indigo-500 to-blue-500'
  }
};

export default function PendingAccess() {
  const { user, signOut, roles, loading, rolesLoaded, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // Fetch organization info and user role
  useEffect(() => {
    const fetchOrgAndRole = async () => {
      if (!profile?.current_organization_id || !user?.id) {
        setLoadingOrg(false);
        return;
      }

      try {
        // Fetch organization name
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.current_organization_id)
          .single();

        if (orgError) throw orgError;
        setOrganizationName(org?.name || null);

        // Fetch user role in org
        const { data: memberRole, error: roleError } = await supabase
          .from('organization_member_roles')
          .select('role')
          .eq('organization_id', profile.current_organization_id)
          .eq('user_id', user.id)
          .single();

        if (!roleError && memberRole) {
          setUserRole(memberRole.role);
        }
      } catch (error) {
        console.error('Error fetching organization info:', error);
      } finally {
        setLoadingOrg(false);
      }
    };

    fetchOrgAndRole();
  }, [profile?.current_organization_id, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente'
    });
  };

  // Show loading while checking auth state
  if (loading || !rolesLoaded || loadingOrg) {
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

  // Get role info or default
  const roleInfo = userRole ? ROLE_INFO[userRole] : null;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  // If user has an organization and role assigned, show personalized welcome
  if (organizationName && roleInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a KREOON
          </Button>

          <Card className="overflow-hidden">
            {/* Header with gradient based on role */}
            <div className={`bg-gradient-to-r ${roleInfo.color} p-6 text-white`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  {roleInfo.icon}
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">{organizationName}</p>
                  <h2 className="text-xl font-bold">{roleInfo.label}</h2>
                </div>
              </div>
            </div>

            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-display">
                ¡Bienvenido, {displayName}! 🎉
              </CardTitle>
              <CardDescription className="text-base">
                {roleInfo.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pending approval notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-500">Acceso pendiente de aprobación</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Un administrador de <strong>{organizationName}</strong> revisará tu solicitud y te dará acceso completo pronto.
                  </p>
                </div>
              </div>

              {/* What you can do with this role */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Lo que podrás hacer como {roleInfo.label}:
                </h3>
                <ul className="space-y-2">
                  {roleInfo.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* User info */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Tu cuenta está registrada como:</span>
                </div>
                <p className="font-medium text-foreground">{user?.email}</p>
              </div>

              {/* Social Network Access while waiting */}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Mientras esperas, puedes explorar la comunidad:
                </p>
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
              </div>

              <div className="pt-4 border-t border-border flex justify-center">
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

  // Default view for users without org/role (generic pending)
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
              Tu cuenta está lista. Puedes explorar la red social o solicitar acceso a una organización para trabajar.
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
