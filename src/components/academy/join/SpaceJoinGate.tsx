import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Sparkles, Users, Loader2, GraduationCap, Tag, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useJoinSpace } from '@/hooks/academy/useAcademyJoinSpace';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { sanitizeReturnTo } from '@/lib/registration/returnTo';
import { REGISTRATION_BASE } from '@/lib/registration/paths';
import { attributionToSearchParams, pickAttribution } from '@/lib/registration/attribution';
import { validateCouponCode, type CouponPlan } from '@/hooks/academy/useAcademyCoupons';

const KREOON_PURPLE = '#7c3aed';

interface SpaceJoinGateProps {
  space: any;
}

/**
 * Pantalla de gate para usuarios que no son miembros de la academia.
 * Estados:
 *  - Anónimo → "Crear cuenta para entrar" (registro express como student).
 *  - Autenticado + academia gratuita → "Unirme gratis" (join directo).
 *  - Autenticado + academia de pago → "Suscribirme por $X/mes" (Stripe Checkout).
 */
export function SpaceJoinGate({ space }: SpaceJoinGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const join = useJoinSpace();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const spaceSlug: string = space.slug;
  const spaceName: string = space.name;
  const spaceAccent: string = space.accent_color || KREOON_PURPLE;
  const description: string | null = space.description ?? null;
  const memberCount: number = space.member_count ?? 0;
  const logoUrl: string | null = space.logo_url ?? null;
  const coverUrl: string | null = space.cover_image_url ?? null;
  const monthlyPrice: number = Number(space.membership_price_usd ?? 0);
  const yearlyPrice: number = Number(space.yearly_price_usd ?? 0);
  const hasMonthly = monthlyPrice > 0;
  const hasYearly = yearlyPrice > 0;
  const isPaid = hasMonthly || hasYearly;

  // Plan seleccionado (default: el que esté disponible primero).
  const [plan, setPlan] = useState<CouponPlan>(hasMonthly ? 'monthly' : 'yearly');
  const currentPrice = plan === 'yearly' ? yearlyPrice : monthlyPrice;
  const planLabel = plan === 'yearly' ? 'año' : 'mes';

  // ─── Cupón ───
  // Si la URL trae ?coupon=CODE, auto-aplicamos al cargar.
  const couponFromUrl = searchParams.get('coupon') || '';
  const [couponCode, setCouponCode] = useState(couponFromUrl);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    finalPrice: number;
    discountAmount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [autoAppliedFromUrl, setAutoAppliedFromUrl] = useState(false);

  // Si el plan cambia, descarto el cupón aplicado (puede no aplicar al nuevo plan).
  useEffect(() => {
    setAppliedCoupon(null);
  }, [plan]);

  // Auto-apply del cupón de la URL al cargar (solo una vez).
  useEffect(() => {
    if (couponFromUrl && !autoAppliedFromUrl && !appliedCoupon && !validatingCoupon) {
      setAutoAppliedFromUrl(true);
      void handleApplyCoupon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponFromUrl, plan]);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setValidatingCoupon(true);
    try {
      const result = await validateCouponCode(space.id, code, plan, user?.id);
      if (!result.valid) {
        const customMsg =
          result.error === 'coupon_max_per_user_reached'
            ? result.limit_per_user === 1
              ? 'Ya usaste este cupón antes'
              : `Ya usaste este cupón ${result.uses_by_user}/${result.limit_per_user} veces`
            : null;
        const msg = customMsg ?? ({
          coupon_not_found: 'Cupón no encontrado',
          coupon_expired: 'Cupón vencido',
          coupon_max_redemptions: 'Cupón agotado',
          coupon_plan_not_applicable: `Este cupón no aplica al plan ${planLabel === 'año' ? 'anual' : 'mensual'}`,
          plan_not_available: 'Plan no disponible',
          invalid_plan: 'Plan inválido',
        }[result.error ?? ''] ?? 'Cupón no válido');
        toast.error(msg);
        return;
      }
      setAppliedCoupon({
        code: result.code ?? code,
        finalPrice: result.final_price_usd ?? currentPrice,
        discountAmount: result.discount_amount_usd ?? 0,
      });
      toast.success(`Cupón aplicado: -USD ${(result.discount_amount_usd ?? 0).toFixed(2)}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'No pudimos validar el cupón');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const finalPrice = appliedCoupon?.finalPrice ?? currentPrice;

  const referrerId = searchParams.get('ref') || null;
  const source = searchParams.get('utm_source') || searchParams.get('source') || null;

  const handleAnonRegister = () => {
    // Sin sesión: alta pública canónica (solo creadores); se vuelve al recurso tras registrarse.
    const next = sanitizeReturnTo(`/academia/${spaceSlug}`);
    const qs = attributionToSearchParams(pickAttribution(searchParams));
    if (next) qs.set('next', next);
    navigate(`${REGISTRATION_BASE}${qs.toString() ? `?${qs.toString()}` : ''}`);
  };

  const handleFreeJoin = async () => {
    try {
      await join.mutateAsync({
        spaceSlug,
        consent: true,
        referrerId,
        source,
      });
      toast.success(`🎉 ¡Bienvenido a ${spaceName}!`);
      // El hook invalida queries → la página re-render como member.
    } catch (e: any) {
      // Si la academia se volvió de pago entre el primer load y este click,
      // el RPC ahora retorna 'paid_membership_required'. Redirigimos a Stripe.
      if (typeof e?.message === 'string' && e.message.includes('paid_membership_required')) {
        await handlePaidCheckout();
        return;
      }
      toast.error(e?.message ?? 'No pudimos unirte. Intenta de nuevo.');
    }
  };

  const handlePaidCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke(
        'stripe-academy-subscribe',
        {
          body: {
            space_slug: spaceSlug,
            plan,
            ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
          },
        }
      );
      if (error) throw error;
      if (!data?.url) throw new Error('No recibimos URL de pago.');
      window.location.href = data.url as string;
    } catch (e: any) {
      console.error('Stripe academy subscribe failed:', e);
      toast.error(e?.message ?? 'No pudimos iniciar el pago. Intenta de nuevo.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-foreground">
      {/* HERO */}
      <div
        className="relative h-64 md:h-80 overflow-hidden"
        style={{
          background: coverUrl
            ? `url(${coverUrl}) center/cover`
            : `linear-gradient(135deg, ${spaceAccent}60, ${spaceAccent}20 50%, hsl(var(--background)))`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 -mt-24 relative pb-16">
        {/* Card central */}
        <div className="rounded-3xl border border-border bg-background/80 backdrop-blur-xl p-6 md:p-10 shadow-2xl text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={spaceName}
                className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover border-2 border-border shadow-xl"
              />
            ) : (
              <div
                className="h-24 w-24 md:h-28 md:w-28 rounded-2xl border-2 border-border shadow-xl flex items-center justify-center text-5xl"
                style={{ backgroundColor: `${spaceAccent}40` }}
                aria-hidden="true"
              >
                🎓
              </div>
            )}
          </div>

          {/* Identidad */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">{spaceName}</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border">
                <Users className="h-3.5 w-3.5" />
                {memberCount} miembros
              </span>
              {isPaid && (
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: `${spaceAccent}30`, color: spaceAccent }}
                >
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Selector de plan + cupón (solo si es de pago y user autenticado) */}
          {isPaid && user && (
            <div className="space-y-3 max-w-md mx-auto w-full">
              {/* Selector mensual / anual */}
              {hasMonthly && hasYearly && (
                <div className="grid grid-cols-2 gap-2">
                  {(['monthly', 'yearly'] as CouponPlan[]).map((p) => {
                    const price = p === 'yearly' ? yearlyPrice : monthlyPrice;
                    const label = p === 'yearly' ? 'Anual' : 'Mensual';
                    const per = p === 'yearly' ? '/año' : '/mes';
                    return (
                      <button
                        key={p}
                        onClick={() => setPlan(p)}
                        className={`rounded-2xl border-2 p-3 text-left transition-all ${
                          plan === p
                            ? 'border-border bg-muted'
                            : 'border-border hover:border-border'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="text-lg font-bold text-foreground mt-0.5">
                          USD {price.toFixed(0)}
                          <span className="text-xs text-muted-foreground font-normal">{per}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Campo de cupón */}
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="¿Tienes un cupón?"
                    className="flex-1 bg-muted/50 border-border text-foreground font-mono"
                  />
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={!couponCode || validatingCoupon}
                    variant="outline"
                    className="border-border"
                  >
                    {validatingCoupon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Aplicar'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <code className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{appliedCoupon.code}</code>
                    <span className="text-xs text-muted-foreground">
                      −USD {appliedCoupon.discountAmount.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Quitar cupón"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Resumen del precio */}
              <div className="text-center pt-1">
                {appliedCoupon && appliedCoupon.finalPrice !== currentPrice ? (
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground line-through text-sm">
                      USD {currentPrice.toFixed(2)}
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      USD {finalPrice.toFixed(2)}{' '}
                      <span className="text-sm font-normal text-muted-foreground">/{planLabel}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    USD {currentPrice.toFixed(2)}{' '}
                    <span className="text-sm font-normal text-muted-foreground">/{planLabel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Descripción */}
          {description && (
            <div
              className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto prose prose-invert prose-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(description) }}
            />
          )}

          {/* Beneficios */}
          <ul className="space-y-2.5 text-sm text-left max-w-md mx-auto">
            {[
              { emoji: '🎬', text: 'Acceso a los cursos de la academia' },
              { emoji: '💬', text: 'Comunidad activa y feed exclusivo' },
              { emoji: '🎥', text: 'Lives semanales con los mentores' },
              { emoji: '🏆', text: 'Sube de nivel y gana insignias' },
            ].map(({ emoji, text }) => (
              <li key={text} className="flex items-center gap-3 text-foreground">
                <span className="text-xl" aria-hidden="true">{emoji}</span>
                {text}
              </li>
            ))}
          </ul>

          {/* CTA dinámico */}
          <div className="space-y-3 pt-2">
            {!user ? (
              <>
                <Button
                  onClick={handleAnonRegister}
                  className="w-full h-14 rounded-2xl font-bold text-white text-base shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                    boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
                  }}
                >
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Crear cuenta para entrar
                </Button>
                <p className="text-xs text-muted-foreground">
                  Es gratis. Solo te pediremos email y contraseña.
                </p>
              </>
            ) : isPaid ? (
              <>
                <Button
                  onClick={handlePaidCheckout}
                  disabled={checkoutLoading}
                  className="w-full h-14 rounded-2xl font-bold text-white text-base shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                    boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
                  }}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Abriendo pago seguro...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Suscribirme · USD {finalPrice.toFixed(2)} /{planLabel}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Pago seguro con Stripe. Cancela cuando quieras.
                </p>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFreeJoin}
                  disabled={join.isPending}
                  className="w-full h-14 rounded-2xl font-bold text-white text-base shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                    boxShadow: `0 8px 24px -4px ${KREOON_PURPLE}80`,
                  }}
                >
                  {join.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Uniéndote...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Unirme gratis
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Acceso inmediato. Sin tarjeta.
                </p>
              </>
            )}
          </div>

          <div className="pt-2">
            <Link to="/academia" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Explorar otras academias
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
