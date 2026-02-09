import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, FileText, CheckCircle, Flag, MessageSquare, X, Gift, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorPackage } from '../types/marketplace';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useHasPendingInvitation } from '@/hooks/useMarketplaceOrgInvitations';
import { OrgInviteModal } from './OrgInviteModal';

interface PricingSidebarProps {
  creatorId: string;
  creatorUserId?: string;
  basePrice: number | null;
  currency: string;
  packages: CreatorPackage[];
  creatorName: string;
  acceptsExchange: boolean;
  exchangeConditions?: string;
  hasPaidPlan?: boolean;
}

export function PricingSidebar({
  creatorId,
  creatorUserId,
  basePrice,
  currency,
  packages,
  creatorName,
  acceptsExchange,
  exchangeConditions,
  hasPaidPlan = false,
}: PricingSidebarProps) {
  const [selectedPkg, setSelectedPkg] = useState(
    packages.find(p => p.is_popular)?.id || packages[0]?.id || '',
  );
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const userOrgId = profile?.current_organization_id ?? null;
  const isOwnProfile = user?.id === creatorUserId;
  const hasPendingInvite = useHasPendingInvitation(userOrgId, creatorUserId);
  const canInvite = !!userOrgId && !!creatorUserId && !isOwnProfile;

  const handleHire = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/marketplace/hire/${creatorId}`);
  };

  const handleMessage = () => {
    toast({
      title: 'Chat disponible después de contratar',
      description: 'El chat seguro se habilita una vez que inicies un proyecto con este creador.',
    });
  };

  const handleExchange = () => {
    if (!hasPaidPlan) {
      toast({
        title: 'Plan requerido',
        description: 'Actualiza tu plan para acceder al canje de producto y ahorrar en tus campañas.',
      });
      return;
    }
    toast({
      title: 'Próximamente',
      description: 'La solicitud de canje de producto estará disponible pronto.',
    });
  };

  const selected = packages.find(p => p.id === selectedPkg);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-24">
        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl shadow-purple-500/5 space-y-6">
          {/* Base price */}
          {basePrice != null && (
            <div>
              <span className="text-gray-400 text-sm">Desde </span>
              <span className="text-3xl font-bold text-white">
                ${basePrice.toLocaleString()}
              </span>
              <span className="text-gray-400 text-base"> {currency} / video</span>
            </div>
          )}

          <div className="border-t border-white/10" />

          {/* Exchange option (gated) */}
          {acceptsExchange && (
            <>
              <div className="relative">
                <button
                  onClick={handleExchange}
                  className={cn(
                    'w-full text-left border rounded-xl p-4 transition-all',
                    hasPaidPlan
                      ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                      : 'border-white/10 bg-white/5 opacity-60 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Gift className={cn('h-5 w-5 mt-0.5 flex-shrink-0', hasPaidPlan ? 'text-green-400' : 'text-gray-500')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold', hasPaidPlan ? 'text-green-400' : 'text-gray-400')}>
                          Canje de producto
                        </span>
                        {!hasPaidPlan && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {exchangeConditions || 'Este creador acepta productos a cambio de contenido.'}
                      </p>
                    </div>
                  </div>
                </button>
                {!hasPaidPlan && (
                  <p className="text-gray-600 text-xs mt-1.5 text-center">
                    Disponible con plan pagado
                  </p>
                )}
              </div>
              <div className="border-t border-white/10" />
            </>
          )}

          {/* Packages */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Paquetes disponibles</h3>
            {packages.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                className={cn(
                  'w-full text-left border rounded-xl p-4 transition-all',
                  selectedPkg === pkg.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 hover:border-purple-500/50',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Radio */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      selectedPkg === pkg.id ? 'border-purple-500' : 'border-gray-600',
                    )}
                  >
                    {selectedPkg === pkg.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-semibold">{pkg.name}</span>
                      {pkg.is_popular && (
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-white font-bold">
                        ${pkg.price.toLocaleString()} {pkg.currency}
                      </span>
                      {pkg.discount_pct && (
                        <span className="text-green-400 text-xs">
                          (ahorra {pkg.discount_pct}%)
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-xs">Entrega: {pkg.delivery_days}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Package details */}
          {selected && (
            <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
              <p className="text-gray-400 text-xs font-medium">Incluye:</p>
              {selected.includes.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/10" />

          {/* CTA buttons */}
          <button
            onClick={handleHire}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold py-4 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-purple-500/25"
          >
            Contratar Ahora
          </button>
          <div>
            <button
              onClick={handleMessage}
              className="w-full bg-transparent border border-white/20 text-white font-semibold py-4 rounded-xl text-base hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              Chat Seguro
            </button>
            <p className="text-gray-600 text-xs text-center mt-1.5">
              Comunicación protegida dentro de Kreoon
            </p>
          </div>

          {/* Invite to org button */}
          {canInvite && (
            <button
              onClick={() => hasPendingInvite ? undefined : setShowInviteModal(true)}
              disabled={hasPendingInvite}
              className={cn(
                'w-full border font-semibold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2',
                hasPendingInvite
                  ? 'border-green-500/30 bg-green-500/10 text-green-400 cursor-default'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50',
              )}
            >
              {hasPendingInvite ? (
                <>
                  <Check className="h-4 w-4" />
                  Invitación enviada
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Invitar a mi organización
                </>
              )}
            </button>
          )}

          <div className="border-t border-white/10" />

          {/* Trust section */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-300 text-sm font-medium">Pago protegido por Kreoon</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Tu dinero se libera solo cuando apruebes el contenido
                </p>
              </div>
            </div>
            <div className="space-y-2 pl-7">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Escrow seguro</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Contrato digital</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Garantía de entrega</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Comunicación protegida dentro de Kreoon</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10" />

          <button className="text-gray-600 text-xs hover:text-gray-400 underline transition-colors flex items-center gap-1">
            <Flag className="h-3 w-3" />
            Reportar este perfil
          </button>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0f] border-t border-white/10 p-4 z-50 safe-area-bottom">
        <div className="flex items-center gap-3">
          {basePrice != null && (
            <div className="flex-1 min-w-0">
              <span className="text-gray-400 text-xs">Desde </span>
              <span className="text-white font-bold text-lg">
                ${basePrice.toLocaleString()} {currency}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowMobileSheet(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold py-3 px-5 rounded-xl text-sm"
          >
            Contratar
          </button>
          <button
            onClick={handleMessage}
            className="border border-white/20 text-white py-3 px-4 rounded-xl"
            title="Chat seguro"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          {canInvite && !hasPendingInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="border border-amber-500/30 bg-amber-500/10 text-amber-300 py-3 px-4 rounded-xl"
              title="Invitar a mi organización"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {showMobileSheet && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileSheet(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 rounded-t-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 safe-area-bottom">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Elige un paquete</h3>
                <button
                  onClick={() => setShowMobileSheet(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Exchange option in mobile sheet */}
              {acceptsExchange && (
                <button
                  onClick={handleExchange}
                  className={cn(
                    'w-full text-left border rounded-xl p-4 transition-all',
                    hasPaidPlan
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-white/10 bg-white/5 opacity-60',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className={cn('h-4 w-4', hasPaidPlan ? 'text-green-400' : 'text-gray-500')} />
                      <span className={cn('text-sm font-semibold', hasPaidPlan ? 'text-green-400' : 'text-gray-400')}>
                        Canje de producto
                      </span>
                      {!hasPaidPlan && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                    </div>
                  </div>
                </button>
              )}

              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  className={cn(
                    'w-full text-left border rounded-xl p-4 transition-all',
                    selectedPkg === pkg.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{pkg.name}</span>
                        {pkg.is_popular && (
                          <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs">{pkg.delivery_days}</span>
                    </div>
                    <span className="text-white font-bold text-sm">
                      ${pkg.price.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}

              {selected && (
                <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
                  <p className="text-gray-400 text-xs font-medium">Incluye:</p>
                  {selected.includes.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowMobileSheet(false);
                  handleHire();
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold py-4 rounded-xl text-base"
              >
                Contratar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Org invite modal */}
      {showInviteModal && creatorUserId && (
        <OrgInviteModal
          creatorUserId={creatorUserId}
          creatorName={creatorName}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}
