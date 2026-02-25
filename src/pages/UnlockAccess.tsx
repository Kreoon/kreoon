import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, Key, Users, DollarSign, TrendingUp,
  Gift, Star, Zap, Crown, Share2, CheckCircle2, Copy, Check,
  MessageCircle, Send, Link2, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReferralGate } from '@/hooks/useReferralGate';
import { useUnifiedReferrals } from '@/hooks/useUnifiedReferrals';
import { ReferralProgressRing } from '@/components/gate/ReferralProgressRing';
import { ReferralDetailList } from '@/components/gate/ReferralDetailList';
import { CustomSlugInput } from '@/components/gate/CustomSlugInput';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKiro } from '@/contexts/KiroContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Share Platforms ────────────────────────────────────────
const SHARE_PLATFORMS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-green-500 hover:bg-green-600',
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'bg-blue-500 hover:bg-blue-600',
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: 'bg-gray-800 hover:bg-gray-700',
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: 'bg-blue-600 hover:bg-blue-700',
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: 'bg-blue-700 hover:bg-blue-800',
    getUrl: (url: string, text: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

// ─── Kiro Messages ──────────────────────────────────────────
const KIRO_MESSAGES = {
  0: [
    "Hola, soy Kiro! Te ayudaré a conseguir tus llaves.",
    "Comparte tu link con otros creadores y gana dinero por cada referido que complete su perfil.",
    "Cada llave que consigas te acerca más a desbloquear todas las oportunidades de KREOON!"
  ],
  1: [
    "Excelente! Ya tienes tu primera llave!",
    "Vas muy bien, solo te faltan 2 más.",
    "Sigue compartiendo, tus referidos también ganarán beneficios!"
  ],
  2: [
    "Wow! Ya tienes 2 llaves!",
    "Estás a solo 1 llave de desbloquear todo KREOON.",
    "El último empujón! Comparte tu link una vez más."
  ],
  3: [
    "FELICIDADES! Desbloqueaste KREOON!",
    "Ahora tienes acceso completo a todas las funciones.",
    "Puedes seguir invitando amigos y ganar comisiones por siempre!"
  ],
};

// ─── Earnings Info ──────────────────────────────────────────
const EARNINGS_INFO = [
  {
    icon: DollarSign,
    title: '20% de sus suscripciones',
    description: 'Ganas el 20% de lo que paguen por planes premium',
    color: 'text-emerald-400',
  },
  {
    icon: TrendingUp,
    title: '5% de sus transacciones',
    description: 'Comisión de por vida en sus proyectos del marketplace',
    color: 'text-blue-400',
  },
  {
    icon: Gift,
    title: 'Beneficios exclusivos',
    description: 'Acceso anticipado a nuevas funciones y campañas VIP',
    color: 'text-purple-400',
  },
];

const UnlockAccess = () => {
  const navigate = useNavigate();
  const { user, profile, roles, loading: authLoading } = useAuth();
  const { isUnlocked, isGateLoading, qualifiedCount, remaining, referralCode, referrals } = useReferralGate();
  const { codes, generateCode, isGenerating, updateSlug, isUpdatingSlug } = useUnifiedReferrals();
  const { speak } = useKiro();
  const [copied, setCopied] = useState(false);
  const [kiroMessageIndex, setKiroMessageIndex] = useState(0);

  // Get the current Kiro messages based on progress
  const currentMessages = KIRO_MESSAGES[Math.min(qualifiedCount, 3) as keyof typeof KIRO_MESSAGES] || KIRO_MESSAGES[0];

  // Cycle through Kiro messages
  useEffect(() => {
    const interval = setInterval(() => {
      setKiroMessageIndex((prev) => (prev + 1) % currentMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentMessages.length]);

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

  // Generate code on mount if needed
  useEffect(() => {
    if (!isGateLoading && !referralCode && user && !isGenerating) {
      generateCode();
    }
  }, [isGateLoading, referralCode, user, isGenerating, generateCode]);

  const referralUrl = referralCode ? `${window.location.origin}/r/${referralCode}` : '';
  const shareText = "Te invito a KREOON, la plataforma donde los creadores monetizan su talento conectando con marcas de LATAM. Regístrate gratis con mi link:";

  const copyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const shareToplatform = (platform: typeof SHARE_PLATFORMS[number]) => {
    const url = platform.getUrl(referralUrl, shareText);
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

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
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Kiro Section - Gamified */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="!bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/10 !border-purple-500/20 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Kiro Avatar */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20"
              >
                <span className="text-3xl sm:text-4xl">🤖</span>
              </motion.div>

              {/* Message Bubble */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-white">Kiro</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">Tu guía</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={kiroMessageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm sm:text-base text-white/80"
                  >
                    {currentMessages[kiroMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Progress indicator dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {currentMessages.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === kiroMessageIndex ? 'bg-purple-400' : 'bg-white/20'
                  )}
                />
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Header with Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          {/* Early Bird Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Early Bird</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {qualifiedCount >= 3 ? '🎉 ¡Desbloqueaste KREOON!' : `Consigue tus llaves, ${userName}`}
          </h1>

          <p className="text-white/60 text-sm sm:text-base max-w-md mx-auto">
            {qualifiedCount >= 3
              ? 'Ya tienes acceso completo. Sigue invitando para ganar comisiones.'
              : 'Invita a 3 creadores para desbloquear todas las funciones'}
          </p>
        </motion.div>

        {/* Progress Ring - Bigger and more prominent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <ReferralProgressRing qualified={qualifiedCount} />
            {qualifiedCount >= 3 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <Check className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-8"
        >
          <Card className="!bg-white/[0.03] !border-white/10 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold text-white">Tu link de invitación</h2>
            </div>

            {/* Referral Link Display */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
              <Link2 className="w-4 h-4 text-white/40 shrink-0" />
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-white/80 outline-none truncate"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={copyLink}
                className="shrink-0 text-purple-400 hover:text-purple-300"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Share Buttons Grid */}
            <p className="text-sm text-white/50 mb-3">Comparte en:</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SHARE_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <Button
                    key={platform.id}
                    onClick={() => shareToplatform(platform)}
                    className={cn('flex-col gap-1 h-auto py-3', platform.color)}
                  >
                    <Icon />
                    <span className="text-[10px] sm:text-xs">{platform.name}</span>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Custom Slug */}
          {primaryCode && primaryCode.id && (
            <Card className="!bg-white/[0.03] !border-white/10 p-5">
              <CustomSlugInput
                currentCode={primaryCode.code}
                codeId={primaryCode.id}
                onSave={updateSlug}
                isSaving={isUpdatingSlug}
              />
            </Card>
          )}
        </motion.div>

        {/* Earnings Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="!bg-gradient-to-br from-emerald-500/5 to-blue-500/5 !border-emerald-500/20 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">Gana dinero por cada referido</h2>
            </div>

            <p className="text-sm text-white/60 mb-4">
              Mientras tú y tus referidos sigan activos en KREOON, seguirás ganando comisiones.
              Es ingreso pasivo de por vida!
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              {EARNINGS_INFO.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className={cn('w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0', item.color)}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-white/50">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-200">
                <Star className="w-3 h-3 inline mr-1" />
                <strong>Ejemplo:</strong> Si invitas a 10 creadores activos, podrías ganar $50-200 USD/mes en comisiones pasivas.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="!bg-white/[0.02] !border-white/10 p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-400" />
              ¿Cómo funcionan las llaves?
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-purple-400">1</span>
                </div>
                <p className="text-sm font-medium text-white mb-1">Comparte tu link</p>
                <p className="text-xs text-white/50">Envíalo a otros creadores que conozcas</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-purple-400">2</span>
                </div>
                <p className="text-sm font-medium text-white mb-1">Ellos se registran</p>
                <p className="text-xs text-white/50">Y completan su perfil con foto y portafolio</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold text-purple-400">3</span>
                </div>
                <p className="text-sm font-medium text-white mb-1">Desbloqueas todo</p>
                <p className="text-xs text-white/50">Con 3 referidos obtienes acceso completo</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Referral List */}
        {referrals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <ReferralDetailList referrals={referrals} />
          </motion.div>
        )}

        {/* CTA if not unlocked */}
        {qualifiedCount >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/marketplace')}
              className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Explorar KREOON
              <ExternalLink className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-white/30 mt-8 pb-8"
        >
          Estás construyendo el futuro de la economía creativa en LATAM
        </motion.p>
      </div>
    </div>
  );
};

export default UnlockAccess;
