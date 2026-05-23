import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGeoCountry } from '@/hooks/useGeoCountry';
import {
  Check, Zap, Sparkles, Rocket, Crown, ChevronDown, ChevronUp,
  ShieldCheck, CalendarDays, Infinity, CreditCard, MessageCircle,
  TrendingDown, BarChart3, Loader2, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Constantes de precios (fuente: UGC Colombia) ─────────────────────────────

type Currency = 'USD' | 'COP';
type BillingDuration = 1 | 3 | 6 | 12;

const DURATION_DISCOUNT: Record<BillingDuration, number> = { 1: 0, 3: 0.2, 6: 0.3, 12: 0.4 };
const DURATION_LABEL: Record<BillingDuration, string> = { 1: 'Mensual', 3: 'Trimestral', 6: 'Semestral', 12: 'Anual' };
const BILLING_DURATIONS: BillingDuration[] = [1, 3, 6, 12];

const PLAN_PRICES = {
  inicio:     { USD: 590,    COP: 1_590_000 },
  crecimiento:{ USD: 890,    COP: 2_590_000 },
  escala:     { USD: 1_890,  COP: 5_890_000 },
};

const SOLO_RATES = {
  USD: { script: 45, edit: 33, creator: 75, strategy: 225 },
  COP: { script: 179_000, edit: 129_000, creator: 299_000, strategy: 899_000 },
};

function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
  if (amount >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(1).replace('.0', '')}M`;
  return `$${(amount / 1_000).toFixed(0)}K`;
}

function applyDiscount(monthly: number, duration: BillingDuration): number {
  return Math.round(monthly * duration * (1 - DURATION_DISCOUNT[duration]));
}

// ─── Datos de planes ──────────────────────────────────────────────────────────

interface Plan {
  id: keyof typeof PLAN_PRICES;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  videos: string;
  videosCount: number;
  variantsPerVideo: number;
  description: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  whatsappMessage: string;
}

const PLANES: Plan[] = [
  {
    id: 'inicio',
    name: 'INICIO',
    icon: Zap,
    videos: '6 videos UGC',
    videosCount: 6,
    variantsPerVideo: 2,
    description: 'Para marcas que quieren probar sin complicarse.',
    features: [
      '6 videos UGC × 2 variantes = 12 entregables',
      'Investigación de mercado básica',
      'Hasta 2 creadores verificados',
      'Guiones escritos por nuestro equipo',
      'Selección curada de creadores',
      'Edición profesional lista para publicar',
      '1 ronda de revisión por video',
      'Entrega en 7 días',
      'Garantía de performance (CTR ≥ 1.5% / Hook Rate ≥ 25%)',
      'Licencia de publicidad 12 meses',
    ],
    whatsappMessage: 'Hola, estoy en KREOON y me interesa conocer más sobre las campañas de contenido. Específicamente el plan INICIO de 6 videos al mes. ¿Me pueden dar más información?',
  },
  {
    id: 'crecimiento',
    name: 'CRECIMIENTO',
    icon: Sparkles,
    videos: '10 videos UGC',
    videosCount: 10,
    variantsPerVideo: 3,
    description: 'El más popular: para marcas que ya saben lo que funciona.',
    features: [
      '10 videos UGC × 3 variantes = 30 entregables',
      'Investigación de mercado V2 (continua)',
      'Parrilla de contenido mensual planificada',
      'Hasta 5 creadores nivel premium',
      'Análisis de competencia trimestral',
      'Guiones con marcos y ángulos ganadores',
      'Edición profesional + gráficos animados',
      '2 rondas de revisión por video',
      'Reporte mensual de resultados',
      'Asesora de cuenta dedicada',
      'Entrega en 7 días',
      'Garantía de performance (CTR ≥ 1.5% / Hook Rate ≥ 25%)',
      'Licencia de publicidad 12 meses',
    ],
    badge: 'MÁS POPULAR',
    highlighted: true,
    whatsappMessage: 'Hola, estoy en KREOON y me interesa adquirir o conocer más sobre las campañas de contenido. Me llama la atención el plan CRECIMIENTO de 10 videos al mes. ¿Podemos hablar?',
  },
  {
    id: 'escala',
    name: 'ESCALA',
    icon: Rocket,
    videos: '30 videos UGC',
    videosCount: 30,
    variantsPerVideo: 3,
    description: 'Para marcas que ya entendieron que el contenido es su mayor ventaja.',
    features: [
      '30 videos UGC × 3 variantes = 90 entregables',
      'Investigación V3 Plus (análisis profundo del mercado)',
      'Rastreo automatizado de la competencia',
      'Estrategia V3 Plus (omnicanal + embudos de venta)',
      'Hasta 10 creadores nivel premium exclusivo',
      'Consultoría estratégica mensual con Alexander Cast',
      'Banco de guiones por ángulo ganador',
      'Edición cinematográfica + subtítulos animados',
      'Revisiones ilimitadas',
      'Reportes semanales con datos accionables',
      'Asesora de cuenta senior dedicada',
      'Entrega prioritaria',
      'Garantía de performance (CTR ≥ 1.5% / Hook Rate ≥ 25%)',
      'Licencia de publicidad 12 meses',
    ],
    whatsappMessage: 'Hola, estoy en KREOON y me interesa adquirir o conocer más sobre las campañas de contenido. Quiero escalar con 30 videos al mes. ¿Podemos hablar?',
  },
];

const ENTERPRISE_FEATURES = [
  '60+ videos UGC al mes (escalable)',
  '3 variantes por video',
  'Estrategia 360° con tu equipo',
  'Director creativo asignado',
  'Equipo dedicado nivel premium exclusivo',
  'Posproducción cinematográfica ilimitada',
  'Integración directa con tu equipo de pauta',
  'Panel de resultados en tiempo real',
  'Canal Slack / Teams compartido',
  'Acuerdos de servicio garantizados (SLA)',
  'Garantía de performance personalizada por contrato',
  'Arranque ejecutivo con Alexander Cast',
];

const WA_NUMBER = '573113842399';

function buildWhatsAppLink(message: string, currency: Currency, duration: BillingDuration, price: number) {
  const priceStr = formatPrice(price, currency);
  const full = `${message} Estoy viendo la opción ${DURATION_LABEL[duration].toLowerCase()} por ${priceStr} ${currency}.`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(full)}`;
}

// ─── Componente tarjeta de plan ───────────────────────────────────────────────

function PlanCard({
  plan,
  currency,
  duration,
  onPay,
  paying,
}: {
  plan: Plan;
  currency: Currency;
  duration: BillingDuration;
  onPay: (planId: string) => void;
  paying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = plan.icon;
  const MAX_VISIBLE = 8;

  const monthlyBase = PLAN_PRICES[plan.id][currency];
  const cycleTotal = applyDiscount(monthlyBase, duration);
  const monthlyEquiv = duration > 1 ? Math.round(cycleTotal / duration) : monthlyBase;
  const perVideo = Math.round(monthlyEquiv / plan.videosCount);
  const totalDeliverables = plan.videosCount * plan.variantsPerVideo;

  const visibleFeatures = expanded ? plan.features : plan.features.slice(0, MAX_VISIBLE);
  const hiddenCount = plan.features.length - MAX_VISIBLE;

  const waLink = buildWhatsAppLink(plan.whatsappMessage, currency, duration, cycleTotal);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl p-5 sm:p-6 h-full transition-all duration-300',
        plan.highlighted
          ? 'border-2 border-primary bg-primary/5 shadow-[0_0_40px_-15px] shadow-primary/40 md:-mt-4 md:mb-4'
          : 'border border-border bg-card hover:border-primary/40 hover:bg-card/80',
      )}
    >
      {/* Barra superior plan destacado */}
      {plan.highlighted && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-t-xl" />
      )}

      {plan.badge && (
        <div className="flex justify-center mb-4 -mt-1">
          <Badge className="bg-primary text-primary-foreground font-bold tracking-widest text-[10px] uppercase px-4 py-1">
            {plan.badge}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            plan.highlighted
              ? 'bg-primary text-primary-foreground shadow-[0_0_16px] shadow-primary/50'
              : 'bg-primary/10 border border-primary/25 text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn('text-xs tracking-[0.2em] font-bold uppercase', plan.highlighted ? 'text-primary' : 'text-muted-foreground')}>
          {plan.name}
        </span>
      </div>

      {/* Precio */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-bold text-foreground leading-none">
            {formatPrice(duration > 1 ? cycleTotal : monthlyBase, currency)}
          </span>
          <span className="text-muted-foreground text-sm">
            {duration === 1 ? `${currency}/mes` : `${currency} · ${DURATION_LABEL[duration].toLowerCase()}`}
          </span>
        </div>
        {duration > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            Equivale a <span className="text-foreground font-semibold">{formatPrice(monthlyEquiv, currency)}/mes</span>
            {' · '}
            <span className="text-emerald-500 font-semibold">-{Math.round(DURATION_DISCOUNT[duration] * 100)}% prepago</span>
          </p>
        )}
        <p className="text-xs text-primary/70 mt-1">
          {formatPrice(perVideo, currency)}/video · todo incluido
        </p>
      </div>

      {/* Videos highlight */}
      <div
        className={cn(
          'mt-2 mb-4 rounded-lg px-3 py-2.5 border',
          plan.highlighted ? 'border-primary/50 bg-primary/8' : 'border-border bg-muted/30',
        )}
      >
        <p className={cn('font-bold text-lg leading-tight', plan.highlighted ? 'text-primary' : 'text-foreground')}>
          {plan.videos} + {plan.variantsPerVideo} variantes
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{totalDeliverables} entregables totales</p>
      </div>

      {/* Descripción */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{plan.description}</p>

      {/* Features */}
      <ul className="space-y-2 mb-4 flex-1">
        {visibleFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span
              className={cn(
                'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5',
                plan.highlighted
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/15 border border-primary/35 text-primary',
              )}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span className="text-xs text-foreground/80 leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="self-start flex items-center gap-1.5 text-xs font-semibold mb-4 text-primary/70 hover:text-primary transition-colors"
        >
          {expanded
            ? <><ChevronUp className="h-3.5 w-3.5" />Ver menos</>
            : <><ChevronDown className="h-3.5 w-3.5" />+{hiddenCount} más incluido</>}
        </button>
      )}

      {/* CTA principal: Pagar con Stripe */}
      <button
        onClick={() => onPay(plan.id)}
        disabled={paying}
        className={cn(
          'flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg font-bold text-sm tracking-wide transition-all disabled:opacity-70',
          plan.highlighted
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_30px_-8px] shadow-primary/50 hover:shadow-primary/70'
            : 'bg-muted border border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/70',
        )}
      >
        {paying ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Preparando pago...</>
        ) : (
          <><CreditCard className="h-4 w-4" />Contratar y pagar</>
        )}
      </button>

      {/* CTA secundario: WhatsApp */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full px-5 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Hablar con un asesor
      </a>

      <p className="text-[10px] text-center text-muted-foreground">
        Sin permanencia forzada · Garantía 7 días
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CampanasGestionadasPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isColombia } = useGeoCountry();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [duration, setDuration] = useState<BillingDuration>(1);
  const [payingPlan, setPayingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isColombia) setCurrency('COP');
  }, [isColombia]);

  // Toast al regresar de Stripe
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('¡Pago recibido! El equipo KREOON te contactará en las próximas horas.', { duration: 8000 });
      setSearchParams({}, { replace: true });
    } else if (payment === 'cancelled') {
      toast.info('Pago cancelado. Puedes volver a intentarlo cuando quieras.');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handlePay = async (planId: string) => {
    setPayingPlan(planId);
    try {
      const res = await supabase.functions.invoke('stripe-campaign-checkout', {
        body: { plan: planId, currency, duration },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || 'Error al crear sesión de pago');
      }
      const { url } = res.data as { url: string };
      if (!url) throw new Error('No se recibió la URL de pago');
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo iniciar el pago');
      setPayingPlan(null);
    }
  };

  const savings = useMemo(() => {
    const r = SOLO_RATES[currency];
    const soloPerVideo = r.script + r.edit + r.creator;
    const soloFor10 = soloPerVideo * 10 + r.strategy;
    const kreoonFor10 = PLAN_PRICES.crecimiento[currency];
    return Math.max(0, soloFor10 - kreoonFor10);
  }, [currency]);

  const enterpriseWaLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, estoy en KREOON y me interesa adquirir o conocer más sobre las campañas de contenido a la medida para alto volumen (60+ videos/mes). ¿Podemos hablar?')}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5">
            <Sparkles className="h-3.5 w-3.5" />
            Campañas Gestionadas por KREOON
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
            Invierte una vez.{' '}
            <span className="text-primary">Vende durante meses.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-6">
            4 paquetes diseñados por etapa de negocio. Incluye estrategia, guiones, creadores verificados,
            edición profesional y <strong className="text-foreground">licencia de publicidad 12 meses</strong>.
            Elige el volumen que calce con tu presupuesto hoy.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-8">
            {[
              { value: '+30', label: 'Creadores activos' },
              { value: '38%', label: 'Hook rate promedio' },
              { value: '2.8%', label: 'CTR Meta Ads' },
            ].map(stat => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Banner pago exitoso ── */}
        {searchParams.get('payment') === null && sessionStorage.getItem('campaign_paid') && (
          <div className="mb-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              ¡Pago recibido! El equipo KREOON te contactará en las próximas horas para hacer el onboarding de tu campaña.
            </p>
          </div>
        )}

        {/* ── Selectores Moneda + Compromiso ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          {/* Moneda */}
          {isColombia ? (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2 text-sm font-semibold">
              🇨🇴 COP
            </div>
          ) : (
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              {(['USD', 'COP'] as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-semibold transition-all',
                    currency === c
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c === 'USD' ? '🇺🇸 USD' : '🇨🇴 COP'}
                </button>
              ))}
            </div>
          )}

          {/* Compromiso */}
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            {BILLING_DURATIONS.map(d => {
              const pct = Math.round(DURATION_DISCOUNT[d] * 100);
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    'relative px-3 py-2 rounded-md text-xs font-semibold transition-all flex flex-col items-center',
                    duration === d
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{DURATION_LABEL[d]}</span>
                  {pct > 0 && (
                    <span className="text-emerald-500 text-[10px] font-bold">-{pct}%</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ahorro vs contratar solo */}
        {savings > 0 && (
          <div className="flex items-center justify-center gap-2 mb-8 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 max-w-sm mx-auto">
            <TrendingDown className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-500 font-semibold">
              Ahorras ~{formatPrice(savings, currency)}/mes vs contratar por separado
            </p>
          </div>
        )}

        {/* ── Grid de planes ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-8">
          {PLANES.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              duration={duration}
              onPay={handlePay}
              paying={payingPlan === plan.id}
            />
          ))}
        </div>

        {/* ── Banner Enterprise ── */}
        <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-7 sm:p-10">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 10% 50%, hsl(var(--primary)/0.08) 0%, transparent 55%)' }}
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Info */}
            <div className="flex flex-col">
              <div className="inline-flex self-start items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/40 mb-5">
                <Crown className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-primary">
                  A la Medida · Personalizado
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
                ¿Necesitas algo{' '}
                <span className="text-primary">a tu medida?</span>
              </h3>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
                Para empresas con alto volumen que necesitan equipo dedicado y SLAs. 60+ videos al mes, director creativo asignado y acuerdos de servicio por contrato.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {ENTERPRISE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center mt-0.5">
                      <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                    </span>
                    <span className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="flex flex-col justify-center gap-5">
              <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px] shadow-primary/40">
                    <Crown className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground leading-none">A la medida</p>
                    <p className="text-xs text-muted-foreground mt-0.5">60+ videos / mes · Escalable</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-5">
                  Cotización personalizada según volumen, verticales y acuerdos de servicio requeridos.
                </p>

                <a
                  href={enterpriseWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full px-6 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base tracking-wide transition-all hover:bg-primary/90 hover:shadow-[0_10px_40px_-10px] hover:shadow-primary/50"
                >
                  <CalendarDays className="h-5 w-5" />
                  Hablemos
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>

                <p className="text-[10px] text-center text-muted-foreground mt-3">
                  Llamada 30 min · Cotización personalizada · Sin compromiso
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  'Equipo dedicado exclusivo para tu marca',
                  'Acuerdos de servicio garantizados por contrato',
                  'Integración directa con tu equipo de pauta',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-foreground/85">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust row ── */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
          {[
            { icon: CreditCard, text: 'Pago seguro' },
            { icon: ShieldCheck, text: 'Garantía 7 días' },
            { icon: Infinity, text: 'Sin permanencia' },
            { icon: BarChart3, text: 'Licencia ads 12 meses' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary/60 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>

        {/* ── Precios por video (volumen) ── */}
        <div className="mt-10">
          <p className="text-center text-sm font-semibold text-foreground mb-4">Tarifas por volumen</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {[
              { label: '50–99 videos', price: currency === 'USD' ? 40 : 159_000 },
              { label: '100–200 videos', price: currency === 'USD' ? 35 : 139_000 },
              { label: '200+ videos', price: currency === 'USD' ? 29 : 119_000 },
            ].map(tier => (
              <div key={tier.label} className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">{tier.label}</p>
                <p className="text-lg font-bold text-primary">{formatPrice(tier.price, currency)}</p>
                <p className="text-[10px] text-muted-foreground">por video</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            * Comparación basada en tarifas individuales: {currency === 'USD' ? '$45' : '$179K'} guión ·{' '}
            {currency === 'USD' ? '$33' : '$129K'} edición · {currency === 'USD' ? '$75' : '$299K'} creador ·{' '}
            {currency === 'USD' ? '$225' : '$899K'} estrategia base
          </p>
        </div>

        {/* ── CTA final ── */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">¿Tienes dudas sobre qué plan elegir?</p>
          <Button
            size="lg"
            onClick={() => window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, estoy en KREOON y me interesa adquirir o conocer más sobre las campañas de contenido. Necesito ayuda para elegir el plan correcto para mi marca.')}`, '_blank')}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Hablar con un asesor
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Respuesta en menos de 24h · Sin compromiso
          </p>
        </div>
      </div>
    </div>
  );
}
