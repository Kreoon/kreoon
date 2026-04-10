import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, CheckCircle2, Clock,
  User, Briefcase, Users, Gift, Zap, Award,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

const STEPS = [
  {
    icon: User,
    title: 'Completa tu perfil',
    description: 'Agrega tu foto, bio y redes sociales',
    link: '/settings/profile',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
  },
  {
    icon: Briefcase,
    title: 'Explora el marketplace',
    description: 'Descubre proyectos y oportunidades',
    link: '/marketplace',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    icon: Users,
    title: 'Conecta con marcas',
    description: 'Encuentra marcas que buscan creadores UGC',
    link: '/marketplace/explore',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
  },
];

const PENDING_BENEFITS = [
  { icon: Gift, text: '1 mes gratis de suscripción', color: 'text-amber-400' },
  { icon: Zap, text: '500 tokens AI de bienvenida', color: 'text-amber-400' },
  { icon: Award, text: 'Badge exclusivo "UGC Colombia"', color: 'text-amber-500' },
  { icon: CheckCircle2, text: 'Descuento en comisiones del marketplace', color: 'text-green-400' },
];

// UGC Colombia brand colors
const UGC_YELLOW = '#f9b334';
const UGC_GOLD = '#d4a017';
const KREOON_GREEN = '#22c55e';

export default function WelcomeUGCColombia() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Nota: No redirigimos si el usuario no es de UGC Colombia
  // porque cualquier usuario que inicie sesión desde ugccolombia.co debe ver esta página

  // Confetti effect on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#22c55e', '#fbbf24', '#ffffff'],
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const userName = profile?.full_name?.split(' ')[0] || 'Creador';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-green-500/5" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Co-branding Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <span className="text-2xl font-bold uppercase tracking-wide" style={{ color: UGC_YELLOW }}>
            UGC Colombia
          </span>
          <span className="text-xl" style={{ color: '#666' }}>×</span>
          <span className="text-2xl font-bold uppercase tracking-wide" style={{ color: KREOON_GREEN }}>
            KREOON
          </span>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
            style={{
              backgroundColor: 'rgba(249, 179, 52, 0.15)',
              borderColor: 'rgba(249, 179, 52, 0.4)'
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: UGC_YELLOW }} />
            <span className="text-sm font-medium" style={{ color: UGC_YELLOW }}>Comunidad UGC Colombia</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            ¡Bienvenido, {userName}!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-muted-foreground"
          >
            Tu cuenta está activa. Ya puedes usar{' '}
            <span className="text-green-400 font-semibold">KREOON</span> como freelance.
          </motion.p>
        </motion.div>

        {/* Pending Approval Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-orange-500/20">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Tu solicitud a UGC Colombia está en revisión
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cuando sea aprobada, se activarán todos tus beneficios de comunidad.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-orange-400" />
            Beneficios que se activarán al aprobar tu solicitud:
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PENDING_BENEFITS.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border"
              >
                <benefit.icon className={`w-4 h-4 ${benefit.color}`} />
                <span className="text-sm text-foreground">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-8"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Mientras tanto, puedes:
          </h3>
          <div className="space-y-3">
            {STEPS.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer hover:scale-[1.02] transition-transform ${step.bgColor}`}
                  onClick={() => navigate(step.link)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full bg-background/50`}>
                        <step.icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Paso {index + 1}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="text-center"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8"
            onClick={() => navigate('/dashboard')}
          >
            Ir al Dashboard
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            ¿Preguntas? Escríbenos a{' '}
            <a href="mailto:hola@ugccolombia.co" className="text-orange-400 hover:underline">
              hola@ugccolombia.co
            </a>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-12 text-center text-sm text-muted-foreground"
        >
          <p>© 2026 UGC Colombia × KREOON</p>
        </motion.div>
      </div>
    </div>
  );
}
