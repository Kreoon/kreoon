import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReferralGate } from '@/hooks/useReferralGate';
import { useUnifiedReferrals } from '@/hooks/useUnifiedReferrals';
import { ReferralProgressRing } from '@/components/gate/ReferralProgressRing';
import { ReferralShareCard } from '@/components/gate/ReferralShareCard';
import { ReferralDetailList } from '@/components/gate/ReferralDetailList';
import { GateProfileSetup } from '@/components/gate/GateProfileSetup';
import { CustomSlugInput } from '@/components/gate/CustomSlugInput';
import { Card } from '@/components/ui/card';

const UnlockAccess = () => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  const { isUnlocked, isGateLoading, qualifiedCount, remaining, referralCode, referrals } = useReferralGate();
  const { codes, generateCode, isGenerating, updateSlug, isUpdatingSlug } = useUnifiedReferrals();

  // Auto-redirect when unlocked (org members, admins, already-unlocked)
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

  // Find the primary code (first active one)
  const primaryCode = codes.find(c => c.is_active) || (referralCode ? { id: '', code: referralCode, is_active: true } : null);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Key className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Desbloquea KREOON</h1>
          <p className="text-white/50 text-sm max-w-sm mx-auto">
            Invita a <strong className="text-white">3 personas</strong> que completen su perfil en el marketplace para desbloquear todas las funciones de la plataforma.
          </p>
        </div>

        {/* Progress Ring */}
        <div className="flex justify-center py-4">
          <ReferralProgressRing qualified={qualifiedCount} />
        </div>

        {/* Remaining message */}
        {remaining > 0 && (
          <Card className="!bg-purple-500/5 !border-purple-500/20 p-4 text-center">
            <p className="text-sm text-white/70">
              Te {remaining === 1 ? 'falta' : 'faltan'} <strong className="text-purple-300">{remaining} {remaining === 1 ? 'llave' : 'llaves'}</strong> para desbloquear la plataforma.
            </p>
          </Card>
        )}

        {/* Share Card */}
        <ReferralShareCard
          code={referralCode}
          onGenerateCode={async () => { await generateCode(); }}
          isGenerating={isGenerating}
        />

        {/* Custom Slug */}
        {primaryCode && primaryCode.id && (
          <Card className="p-6">
            <CustomSlugInput
              currentCode={primaryCode.code}
              codeId={primaryCode.id}
              onSave={updateSlug}
              isSaving={isUpdatingSlug}
            />
          </Card>
        )}

        {/* Referral List */}
        <ReferralDetailList referrals={referrals} />

        {/* Profile Setup */}
        <GateProfileSetup />

        {/* How it works */}
        <Card className="p-6">
          <h3 className="text-white font-semibold text-sm mb-3">Como funciona</h3>
          <ol className="space-y-2 text-xs text-white/50 list-decimal list-inside">
            <li>Comparte tu link de referido con otros creadores</li>
            <li>Ellos se registran y completan su perfil en el marketplace</li>
            <li>Un referido <strong className="text-white/70">calificado</strong> tiene: perfil activo, foto de perfil, y al menos 1 pieza en su portafolio</li>
            <li>Al completar 3 referidos calificados, se desbloquea la plataforma automaticamente</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default UnlockAccess;
