import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight, Sparkles, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignAccessResult } from '@/hooks/useMarketplaceCampaigns';

interface MembershipGateProps {
  children: React.ReactNode;
  feature?: string;
}

const PLAN_FEATURES = {
  starter: [
    '5 campañas por mes',
    '2 campañas activas simultáneas',
    '5 creadores por campaña',
    'Soporte por email',
  ],
  pro: [
    '20 campañas por mes',
    '10 campañas activas simultáneas',
    '20 creadores por campaña',
    'Descuento del 10% en comisión',
    'Soporte prioritario',
  ],
  enterprise: [
    'Campañas ilimitadas',
    '50 campañas activas',
    '100 creadores por campaña',
    'Descuento del 20% en comisión',
    'Account manager dedicado',
    'API access',
  ],
};

export function MembershipGate({ children, feature = 'crear campañas' }: MembershipGateProps) {
  const { checkCampaignAccess } = useMarketplaceCampaigns();
  const [accessResult, setAccessResult] = useState<CampaignAccessResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await checkCampaignAccess('create_campaign');
      if (!cancelled) {
        setAccessResult(result);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [checkCampaignAccess]);

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // ── Fail-open: if check failed (null result) or user has access, show children.
  //    Backwards-compat: no subscription = no restriction (see migration defaults). ──

  if (!accessResult || accessResult.can_create) {
    return <>{children}</>;
  }

  // ── Blocked: determine reason ──────────────────────────────────────

  const { blocked_reason, usage, limits } = accessResult;

  // User has a subscription but hit usage limits → show limits message (not paywall)
  if (blocked_reason === 'max_active_campaigns_reached') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Límite de campañas activas alcanzado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Tienes {usage.active_campaigns} de {limits.max_active_campaigns} campañas activas permitidas
            en tu plan <strong>{limits.plan_name || limits.plan_type}</strong>.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Completa o pausa una campaña existente, o actualiza tu plan para continuar.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Actualizar plan
          </Link>
        </div>
      </div>
    );
  }

  if (blocked_reason === 'max_monthly_campaigns_reached') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Límite mensual de campañas alcanzado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Has creado {usage.month_campaigns} de {limits.max_campaigns_per_month} campañas este mes
            en tu plan <strong>{limits.plan_name || limits.plan_type}</strong>.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            El límite se reinicia el primer día del próximo mes, o actualiza tu plan.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Actualizar plan
          </Link>
        </div>
      </div>
    );
  }

  // ── Default: no paid subscription → show pricing gate ──────────────

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 text-white text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <Crown className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold mb-2">
            Membresía requerida para {feature}
          </h2>
          <p className="text-white/80 mb-8">
            Únete a Kreoon Pro y accede a todas las funcionalidades del marketplace
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Starter */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left">
              <h3 className="font-semibold mb-2">Starter</h3>
              <p className="text-2xl font-bold mb-3">
                $49<span className="text-sm font-normal">/mes</span>
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                {PLAN_FEATURES.starter.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro - Featured */}
            <div className="bg-white text-gray-900 rounded-xl p-4 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full">
                Popular
              </div>
              <h3 className="font-semibold mb-2">Pro</h3>
              <p className="text-2xl font-bold mb-3">
                $149<span className="text-sm font-normal text-gray-500">/mes</span>
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                {PLAN_FEATURES.pro.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left">
              <h3 className="font-semibold mb-2">Enterprise</h3>
              <p className="text-2xl font-bold mb-3">
                $399<span className="text-sm font-normal">/mes</span>
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                {PLAN_FEATURES.enterprise.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Ver todos los planes
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>
            ¿Ya tienes membresía y no puedes acceder?{' '}
            <Link to="/support" className="text-purple-600 hover:underline">
              Contacta soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
