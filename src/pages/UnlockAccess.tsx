import { useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReferralGate } from '@/hooks/useReferralGate';
import { useUnifiedReferrals } from '@/hooks/useUnifiedReferrals';
import { ReferralDetailList } from '@/components/gate/ReferralDetailList';
import { CONFIG } from '@/lib/unlock-access/constants';
import { cn } from '@/lib/utils';

import {
  KeysProgress,
  BenefitsGrid,
  ShareSection,
  FomoCard,
  UnlockFAQ,
  KiroSpeaker,
} from '@/components/unlock-access';

const ReactConfetti = lazy(() => import('react-confetti'));

const UnlockAccess = () => {
  const navigate = useNavigate();
  const { user, profile, roles, loading: authLoading } = useAuth();
  const { isUnlocked, isGateLoading, qualifiedCount, referralCode, referrals } = useReferralGate();
  const { codes, generateCode, isGenerating } = useUnifiedReferrals();

  // Auto-redirect when unlocked (only after deadline)
  useEffect(() => {
    if (!isGateLoading && isUnlocked) {
      const deadline = CONFIG.deadline.getTime();
      if (Date.now() > deadline) {
        const dest = roles.length > 0 ? '/dashboard' : '/marketplace';
        navigate(dest, { replace: true });
      }
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
    if (!isGateLoading && !referralCode && codes.length === 0 && user && !isGenerating) {
      generateCode();
    }
  }, [isGateLoading, referralCode, codes.length, user, isGenerating, generateCode]);

  const handleEnterPlatform = useCallback(() => {
    navigate('/marketplace');
  }, [navigate]);

  // Loading state
  if (authLoading || isGateLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Lock className="w-10 h-10 text-purple-400" />
        </motion.div>
        <p className="text-white/50 text-sm">Cargando...</p>
      </div>
    );
  }

  const referralUrl = referralCode ? `${window.location.origin}/unete-talento?ref=${referralCode}` : '';
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const keysCollected = Math.min(qualifiedCount, 3);
  const isComplete = keysCollected >= 3;

  // Build referral info for keys
  const referralInfos = referrals.slice(0, 3).map(r => ({
    name: r.referred_name || 'Usuario',
    avatar: r.referred_avatar
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Confetti when complete */}
      {isComplete && (
        <Suspense fallback={null}>
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={300}
            colors={['#f59e0b', '#fbbf24', '#a855f7', '#ec4899', '#22c55e']}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 200, pointerEvents: 'none' }}
          />
        </Suspense>
      )}

      {/* Platform Preview Background */}
      <div className="absolute inset-0 bg-background">
        {/* Simulated platform UI elements */}
        <div className="absolute inset-0 opacity-40">
          {/* Top navbar simulation */}
          <div className="h-14 bg-white/5 border-b border-white/10 flex items-center px-4">
            <div className="w-24 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded" />
            <div className="flex-1" />
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
            </div>
          </div>

          {/* Sidebar simulation */}
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-white/[0.02] border-r border-white/10 p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-white/10" />
                <div className="h-4 bg-white/10 rounded flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
              </div>
            ))}
          </div>

          {/* Main content simulation - grid of cards */}
          <div className="absolute left-64 top-14 right-0 bottom-0 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div
                  key={i}
                  className="rounded-sm bg-white/5 border border-white/10 overflow-hidden"
                >
                  <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="flex gap-2 mt-3">
                      <div className="w-6 h-6 rounded-full bg-white/10" />
                      <div className="h-3 bg-white/10 rounded flex-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blur overlay */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Animated background effects on top of blur */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-purple-600/30 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -15, 0],
            y: [0, 20, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-pink-600/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/2 right-0 w-[250px] h-[250px] bg-amber-500/15 rounded-full blur-[80px]"
        />
      </div>

      {/* Modal/Popup Container */}
      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'relative w-full max-w-2xl mx-4',
            'bg-background/95',
            'rounded-3xl border border-white/10',
            'shadow-2xl shadow-purple-500/10'
          )}
        >
          {/* Close button (goes to marketplace if unlocked) */}
          {isComplete && (
            <button
              onClick={handleEnterPlatform}
              className={cn(
                'absolute top-4 right-4 z-10',
                'w-8 h-8 rounded-full',
                'bg-white/10 hover:bg-white/20',
                'flex items-center justify-center',
                'transition-colors'
              )}
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          )}

          {/* Modal content */}
          <div className="p-5 sm:p-8 space-y-6">
            {/* Big Idea - Hero Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className={cn(
                'text-2xl sm:text-3xl md:text-4xl font-bold leading-tight',
                'bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent'
              )}>
                Monetiza tu talento{' '}
                <span className="text-amber-400">ahora</span>
              </h1>
              <p className="mt-3 text-base sm:text-lg text-white/70 max-w-lg mx-auto">
                Invita a <span className="text-purple-400 font-semibold">3 amigos</span> a unirse a KREOON
                y desbloquea todo su potencial para empezar a{' '}
                <span className="text-green-400 font-semibold">generar dinero</span> con tu contenido
              </p>
            </motion.div>

            {/* Keys progress */}
            <KeysProgress
              keysCollected={keysCollected}
              referrals={referralInfos}
            />

            {/* Benefits grid - separado */}
            <BenefitsGrid isUnlocked={isComplete} />

            {/* Share section + FOMO urgencia juntos */}
            {referralUrl && !isComplete && (
              <>
                <ShareSection referralLink={referralUrl} />
                <FomoCard show={true} />
              </>
            )}

            {/* Referral list */}
            {referrals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">👥</span>
                  <h3 className="font-medium text-white">Tus referidos</h3>
                  <span className="text-xs text-white/40">({referrals.length})</span>
                </div>
                <ReferralDetailList referrals={referrals} />
              </motion.div>
            )}

            {/* FAQ */}
            <UnlockFAQ />

            {/* CTA if complete */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <motion.button
                  onClick={handleEnterPlatform}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'px-8 py-4 rounded-sm',
                    'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500',
                    'text-white font-bold text-lg',
                    'shadow-lg shadow-amber-500/25',
                    'hover:shadow-xl hover:shadow-amber-500/35',
                    'transition-shadow'
                  )}
                >
                  ✨ Entrar a KREOON ✨
                </motion.button>
                <p className="text-white/40 text-xs mt-3">
                  Ya tienes acceso completo a la plataforma
                </p>
              </motion.div>
            )}

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-xs text-white/30 pt-2 pb-2"
            >
              Estás construyendo algo grande 🚀
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* KIRO flotante */}
      <KiroSpeaker
        userName={userName}
        keysCollected={keysCollected}
      />
    </div>
  );
};

export default UnlockAccess;
