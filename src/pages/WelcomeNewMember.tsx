import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, Loader2, CheckCircle2, Video, Scissors, 
  Building2, LineChart, Star, Users, ArrowRight, Rocket
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const ROLE_INFO: Record<string, { 
  label: string; 
  description: string; 
  icon: React.ReactNode;
  benefits: string[];
  color: string;
  dashboardPath: string;
  dashboardLabel: string;
}> = {
  creator: {
    label: 'Creador de Contenido',
    description: 'Bienvenido al equipo de creadores. Estás listo para crear contenido increíble.',
    icon: <Video className="w-8 h-8" />,
    benefits: [
      'Recibe briefs y graba contenido para marcas',
      'Gestiona tus pagos y comisiones',
      'Construye tu portafolio profesional',
      'Accede a oportunidades exclusivas'
    ],
    color: 'from-pink-500 to-rose-500',
    dashboardPath: '/creator-dashboard',
    dashboardLabel: 'Ir a Mi Dashboard'
  },
  editor: {
    label: 'Editor de Video',
    description: 'Bienvenido al equipo de editores. Tu talento transformará contenido en obras maestras.',
    icon: <Scissors className="w-8 h-8" />,
    benefits: [
      'Recibe videos para editar y producir',
      'Trabaja con las mejores marcas',
      'Gestiona tus entregas y pagos',
      'Desarrolla tu estilo editorial único'
    ],
    color: 'from-blue-500 to-cyan-500',
    dashboardPath: '/editor-dashboard',
    dashboardLabel: 'Ir a Mi Dashboard'
  },
  client: {
    label: 'Cliente / Marca',
    description: 'Bienvenido a la plataforma. Estás listo para gestionar tus campañas de contenido.',
    icon: <Building2 className="w-8 h-8" />,
    benefits: [
      'Crea y gestiona campañas de contenido',
      'Accede a creadores verificados',
      'Revisa y aprueba contenido fácilmente',
      'Descarga contenido listo para publicar'
    ],
    color: 'from-emerald-500 to-teal-500',
    dashboardPath: '/client-dashboard',
    dashboardLabel: 'Ir a Mi Dashboard'
  },
  strategist: {
    label: 'Estratega',
    description: 'Bienvenido al equipo estratégico. Tu visión guiará las campañas hacia el éxito.',
    icon: <LineChart className="w-8 h-8" />,
    benefits: [
      'Planifica estrategias de contenido',
      'Coordina equipos creativos',
      'Analiza métricas de rendimiento',
      'Optimiza campañas en tiempo real'
    ],
    color: 'from-violet-500 to-purple-500',
    dashboardPath: '/strategist-dashboard',
    dashboardLabel: 'Ir a Mi Dashboard'
  },
  ambassador: {
    label: 'Embajador',
    description: 'Bienvenido como embajador. Tu red de contactos impulsará nuestra comunidad.',
    icon: <Star className="w-8 h-8" />,
    benefits: [
      'Invita y gestiona nuevos creadores',
      'Gana comisiones por referidos activos',
      'Accede a bonificaciones especiales',
      'Participa en eventos exclusivos'
    ],
    color: 'from-amber-500 to-orange-500',
    dashboardPath: '/dashboard',
    dashboardLabel: 'Ir a Mi Dashboard'
  },
  admin: {
    label: 'Administrador',
    description: 'Bienvenido como administrador. Tienes control total de la organización.',
    icon: <Users className="w-8 h-8" />,
    benefits: [
      'Control total de la organización',
      'Gestión de usuarios y permisos',
      'Configuración de flujos de trabajo',
      'Acceso a reportes y analytics'
    ],
    color: 'from-indigo-500 to-blue-500',
    dashboardPath: '/dashboard',
    dashboardLabel: 'Ir al Panel de Control'
  }
};

export default function WelcomeNewMember() {
  const { user, loading, rolesLoaded, roles } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // Get the role info - prefer URL param, fallback to first role
  const userRole = roleFromUrl || (roles.length > 0 ? roles[0] : null);
  const roleInfo = userRole ? ROLE_INFO[userRole] : null;

  // Fetch organization name
  useEffect(() => {
    async function fetchOrgName() {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.current_organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.current_organization_id)
            .single();

          if (org) {
            setOrganizationName(org.name);
          }
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setLoadingOrg(false);
      }
    }

    if (user) {
      fetchOrgName();
    }
  }, [user]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleContinue = () => {
    if (roleInfo) {
      navigate(roleInfo.dashboardPath, { replace: true });
    } else {
      navigate('/social', { replace: true });
    }
  };

  const handleExploreNetwork = () => {
    navigate('/social');
  };

  if (loading || !rolesLoaded || loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="border-0 shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${roleInfo?.color || 'from-primary to-primary/80'} p-6 text-white`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {roleInfo?.icon || <Sparkles className="w-10 h-10" />}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Rocket className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">¡Registro Exitoso!</span>
              </div>
              <h1 className="text-2xl font-bold mb-1">
                ¡Bienvenido{roleInfo ? ` como ${roleInfo.label}` : ''}!
              </h1>
              {organizationName && (
                <p className="text-sm opacity-90">
                  Te has unido a <span className="font-semibold">{organizationName}</span>
                </p>
              )}
            </motion.div>
          </div>

          <CardContent className="p-6 space-y-6">
            {roleInfo && (
              <>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-muted-foreground"
                >
                  {roleInfo.description}
                </motion.p>

                {/* Benefits list */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <p className="text-sm font-medium text-foreground">Lo que puedes hacer:</p>
                  <ul className="space-y-2">
                    {roleInfo.benefits.map((benefit, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="space-y-3 pt-2"
            >
              <Button 
                onClick={handleContinue} 
                className={`w-full bg-gradient-to-r ${roleInfo?.color || 'from-primary to-primary/80'} hover:opacity-90 text-white`}
                size="lg"
              >
                {roleInfo?.dashboardLabel || 'Continuar'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button 
                onClick={handleExploreNetwork} 
                variant="outline" 
                className="w-full"
              >
                Explorar la Red Social
              </Button>
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xs text-center text-muted-foreground"
            >
              Puedes acceder a tu perfil y configuración en cualquier momento desde el menú.
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
