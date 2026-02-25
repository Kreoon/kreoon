import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, PartyPopper, ArrowRight, CheckCircle2,
  Crown, Rocket, Users, DollarSign, Heart, Star,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import confetti from 'canvas-confetti';

const WHAT_AWAITS = [
  { icon: DollarSign, text: 'Conecta con marcas que pagan por contenido', color: 'text-emerald-400' },
  { icon: Users, text: 'Únete a la comunidad de creadores de LATAM', color: 'text-blue-400' },
  { icon: Star, text: 'Destaca con tu portafolio profesional', color: 'text-amber-400' },
  { icon: Rocket, text: 'Accede a campañas exclusivas', color: 'text-purple-400' },
];

const WelcomeTalent = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Confetti effect on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981'],
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const userName = profile?.full_name?.split(' ')[0] || 'Creador';

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Celebration icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 flex items-center justify-center"
          >
            <PartyPopper className="w-12 h-12 text-purple-400" />
          </motion.div>

          {/* Early Bird Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Early Bird Member</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
          >
            ¡Felicidades, {userName}!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl text-white/70 mb-2"
          >
            Ya eres parte de <span className="text-purple-400 font-semibold">KREOON</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-white/50"
          >
            Gracias por confiar en nosotros. Estás a punto de transformar tu talento en oportunidades reales.
          </motion.p>
        </motion.div>

        {/* What awaits you */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-10"
        >
          <Card className="!bg-white/[0.03] !border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              Lo que te espera
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {WHAT_AWAITS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-white/70">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Next steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-8"
        >
          <Card className="!bg-gradient-to-br from-purple-500/10 to-pink-500/10 !border-purple-500/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Siguientes pasos</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-300">1</span>
                </div>
                <div>
                  <p className="font-medium text-white">Completa tu perfil</p>
                  <p className="text-sm text-white/50">Agrega tu foto, bio y especialidades para que las marcas te encuentren</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-white/50">2</span>
                </div>
                <div>
                  <p className="font-medium text-white/60">Sube tu portafolio</p>
                  <p className="text-sm text-white/40">Muestra tu mejor trabajo para destacar</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-white/50">3</span>
                </div>
                <div>
                  <p className="font-medium text-white/60">Obtén tus llaves</p>
                  <p className="text-sm text-white/40">Invita a 3 creadores y desbloquea todo KREOON</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => navigate('/onboarding/profile')}
            className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Completar mi perfil
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="mt-4 text-sm text-white/40">
            Solo te tomará 2 minutos
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="text-center text-xs text-white/30 mt-12"
        >
          Bienvenido al futuro de la economía creativa en LATAM
        </motion.p>
      </div>
    </div>
  );
};

export default WelcomeTalent;
