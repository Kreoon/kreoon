import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Loader2, Rocket, Users, DollarSign, TrendingUp,
  Gift, Star, Zap, Crown, Share2, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReferralGate } from '@/hooks/useReferralGate';
import { useUnifiedReferrals } from '@/hooks/useUnifiedReferrals';
import { ReferralProgressRing } from '@/components/gate/ReferralProgressRing';
import { ReferralShareCard } from '@/components/gate/ReferralShareCard';
import { ReferralDetailList } from '@/components/gate/ReferralDetailList';
import { CustomSlugInput } from '@/components/gate/CustomSlugInput';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'Monetiza tu talento',
    description: 'Conecta con marcas que pagan por contenido auténtico',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Crece tu carrera',
    description: 'Accede a campañas exclusivas y oportunidades únicas',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Users,
    title: 'Comunidad de creadores',
    description: 'Únete a una red de talentos creativos de LATAM',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
];

const EARLY_BIRD_PERKS = [
  'Acceso de por vida sin costo de membresía',
  'Prioridad en campañas de marcas premium',
  'Badge exclusivo de Early Bird en tu perfil',
  'Comisiones reducidas en tus primeros proyectos',
];

const UnlockAccess = () => {
  const navigate = useNavigate();
  const { user, profile, roles, loading: authLoading } = useAuth();
  const { isUnlocked, isGateLoading, qualifiedCount, remaining, referralCode, referrals } = useReferralGate();
  const { codes, generateCode, isGenerating, updateSlug, isUpdatingSlug } = useUnifiedReferrals();

  // Auto-redirect when unlocked
  useEffect(() => {
    if (!isGateLoading && isUnlocked) {
      const dest = roles.length > 0 ? '/dashboard' : '/marketplace';
      navigate(dest, { replace: true });
    }
  }, [isUnlocked, isGateLoading, roles, navigate]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isGateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryCode = codes.find(c => c.is_active) || (referralCode ? { id: '', code: referralCode, is_active: true } : null);
  const userName = profile?.full_name?.split(' ')[0] || 'Creador';

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          {/* Early Bird Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Early Bird</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            ¡Bienvenido, {userName}! 🎉
          </h1>

          <p className="text-lg text-white/70 max-w-md mx-auto">
            Eres parte de los <span className="text-purple-400 font-semibold">primeros creadores</span> en unirse a KREOON.
            Gracias por confiar en nosotros.
          </p>
        </motion.div>

        {/* Value Proposition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="!bg-gradient-to-br from-purple-500/10 to-pink-500/10 !border-purple-500/20 p-6 text-center">
            <Rocket className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">
              Tu talento merece ser reconocido
            </h2>
            <p className="text-white/60 text-sm">
              KREOON te conecta con marcas que buscan creadores auténticos como tú.
              Monetiza tu creatividad, trabaja con las mejores marcas de LATAM y
              construye una carrera haciendo lo que amas.
            </p>
          </Card>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {BENEFITS.map((benefit, i) => (
            <Card
              key={i}
              className={cn(
                '!border-white/10 p-4 text-center hover:!border-white/20 transition-colors',
                benefit.bg
              )}
            >
              <benefit.icon className={cn('w-8 h-8 mx-auto mb-2', benefit.color)} />
              <h3 className="font-semibold text-white text-sm mb-1">{benefit.title}</h3>
              <p className="text-xs text-white/50">{benefit.description}</p>
            </Card>
          ))}
        </motion.div>

        {/* Early Bird Perks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="!bg-amber-500/5 !border-amber-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-amber-300">Beneficios Early Bird</h3>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {EARLY_BIRD_PERKS.map((perk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        {/* Unlock Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Un último paso</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Invita a 3 creadores y desbloquea todo
            </h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Ayúdanos a construir la mejor comunidad de creadores.
              Invita a otros talentos y juntos hagamos crecer este movimiento.
            </p>
          </div>

          {/* Progress Ring */}
          <div className="flex justify-center py-2">
            <ReferralProgressRing qualified={qualifiedCount} />
          </div>

          {/* Motivational message based on progress */}
          <Card className="!bg-purple-500/5 !border-purple-500/20 p-4 text-center">
            {qualifiedCount === 0 ? (
              <p className="text-sm text-white/70">
                <Star className="w-4 h-4 text-purple-400 inline mr-1" />
                ¡Comparte tu link y empieza a conseguir tus llaves!
              </p>
            ) : qualifiedCount < 3 ? (
              <p className="text-sm text-white/70">
                <Sparkles className="w-4 h-4 text-purple-400 inline mr-1" />
                ¡Vas muy bien! Te {remaining === 1 ? 'falta solo' : 'faltan'} <strong className="text-purple-300">{remaining} {remaining === 1 ? 'llave' : 'llaves'}</strong> para desbloquear todo.
              </p>
            ) : (
              <p className="text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                ¡Felicidades! Ya tienes acceso completo a KREOON.
              </p>
            )}
          </Card>

          {/* Share Card */}
          <ReferralShareCard
            code={referralCode}
            onGenerateCode={async () => { await generateCode(); }}
            isGenerating={isGenerating}
            showTargetSelector
          />

          {/* Custom Slug */}
          {primaryCode && primaryCode.id && (
            <Card className="p-5">
              <CustomSlugInput
                currentCode={primaryCode.code}
                codeId={primaryCode.id}
                onSave={updateSlug}
                isSaving={isUpdatingSlug}
              />
            </Card>
          )}

          {/* Referral List */}
          {referrals.length > 0 && <ReferralDetailList referrals={referrals} />}
        </motion.div>

        {/* How it works - Simplified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="!bg-white/[0.02] !border-white/10 p-5">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-400" />
              ¿Cómo funciona?
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-purple-400">1</span>
                </div>
                <p className="text-xs text-white/60">Comparte tu link único con otros creadores</p>
              </div>
              <div>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-purple-400">2</span>
                </div>
                <p className="text-xs text-white/60">Ellos se registran y completan su perfil</p>
              </div>
              <div>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-purple-400">3</span>
                </div>
                <p className="text-xs text-white/60">Con 3 referidos, desbloqueas todo KREOON</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Footer message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-white/30 pb-8"
        >
          Estás ayudando a construir el futuro de la economía creativa en LATAM 💜
        </motion.p>
      </div>
    </div>
  );
};

export default UnlockAccess;
