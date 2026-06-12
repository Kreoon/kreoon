import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Sparkles, Users, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useJoinSpace } from '@/hooks/academy/useAcademyJoinSpace';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHTML } from '@/lib/sanitizeHTML';

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
  const priceUsd: number = Number(space.membership_price_usd ?? 0);
  const isPaid = priceUsd > 0;

  const referrerId = searchParams.get('ref') || null;
  const source = searchParams.get('utm_source') || searchParams.get('source') || null;

  const handleAnonRegister = () => {
    const redirectTo = `/academia/${spaceSlug}`;
    navigate(`/register?role=student&redirect=${encodeURIComponent(redirectTo)}`);
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
        { body: { space_slug: spaceSlug } }
      );
      if (error) throw error;
      // Caso especial: el owner aún no completó Stripe Connect.
      if (data?.error === 'connect_pending') {
        toast.info(
          'Esta academia está verificando su cuenta de pagos. Vuelve pronto.',
          { duration: 6000 }
        );
        setCheckoutLoading(false);
        return;
      }
      if (!data?.url) throw new Error('No recibimos URL de pago.');
      window.location.href = data.url as string;
    } catch (e: any) {
      console.error('Stripe academy subscribe failed:', e);
      const msg = typeof e?.message === 'string' ? e.message : '';
      if (msg.includes('connect_pending')) {
        toast.info(
          'Esta academia está verificando su cuenta de pagos. Vuelve pronto.',
          { duration: 6000 }
        );
      } else {
        toast.error(msg || 'No pudimos iniciar el pago. Intenta de nuevo.');
      }
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      {/* HERO */}
      <div
        className="relative h-64 md:h-80 overflow-hidden"
        style={{
          background: coverUrl
            ? `url(${coverUrl}) center/cover`
            : `linear-gradient(135deg, ${spaceAccent}60, ${spaceAccent}20 50%, #0a0a0f)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 -mt-24 relative pb-16">
        {/* Card central */}
        <div className="rounded-3xl border border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl p-6 md:p-10 shadow-2xl text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={spaceName}
                className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
              />
            ) : (
              <div
                className="h-24 w-24 md:h-28 md:w-28 rounded-2xl border-2 border-white/10 shadow-xl flex items-center justify-center text-5xl"
                style={{ backgroundColor: `${spaceAccent}40` }}
                aria-hidden="true"
              >
                🎓
              </div>
            )}
          </div>

          {/* Identidad */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">{spaceName}</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Users className="h-3.5 w-3.5" />
                {memberCount} miembros
              </span>
              {isPaid && (
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: `${spaceAccent}30`, color: spaceAccent }}
                >
                  Premium · USD {priceUsd.toFixed(0)} /mes
                </span>
              )}
            </div>
          </div>

          {/* Descripción */}
          {description && (
            <div
              className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl mx-auto prose prose-invert prose-sm"
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
              <li key={text} className="flex items-center gap-3 text-zinc-200">
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
                <p className="text-xs text-zinc-500">
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
                      Suscribirme · USD {priceUsd.toFixed(0)} /mes
                    </>
                  )}
                </Button>
                <p className="text-xs text-zinc-500">
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
                <p className="text-xs text-zinc-500">
                  Acceso inmediato. Sin tarjeta.
                </p>
              </>
            )}
          </div>

          <div className="pt-2">
            <Link to="/academia" className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Explorar otras academias
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
