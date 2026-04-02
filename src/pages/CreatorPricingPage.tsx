import { useState } from 'react';
import { Check, X, Zap, Star, Shield, ArrowRight, ChevronDown, ChevronUp, Sparkles, BarChart3, Palette, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanFeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
  category?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface Testimonial {
  name: string;
  handle: string;
  avatar: string;
  plan: 'pro' | 'premium';
  quote: string;
  metric: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const COMPARISON_FEATURES: PlanFeatureRow[] = [
  // IA
  { label: 'Tokens IA / mes', free: '800 tokens', pro: '6,000 tokens', premium: '15,000 tokens', category: 'Inteligencia Artificial' },
  { label: 'Generador de Bio con IA', free: false, pro: false, premium: true, category: 'Inteligencia Artificial' },
  { label: 'Optimización SEO con IA', free: false, pro: false, premium: true, category: 'Inteligencia Artificial' },
  { label: 'Sugerencias de contenido IA', free: false, pro: false, premium: true, category: 'Inteligencia Artificial' },
  // Perfil
  { label: 'Bloques en perfil', free: '5 bloques', pro: '10 bloques', premium: '15 bloques', category: 'Perfil' },
  { label: 'Tipos de bloques disponibles', free: '4 básicos', pro: '12 bloques', premium: 'Todos', category: 'Perfil' },
  { label: 'Templates de diseño', free: '1 template', pro: '3 templates', premium: '5 templates', category: 'Perfil' },
  { label: 'CSS personalizado', free: false, pro: false, premium: true, category: 'Perfil' },
  // Visibilidad
  { label: 'Branding "Powered by Kreoon"', free: true, pro: false, premium: false, category: 'Visibilidad' },
  { label: 'Contacto visible', free: 'Oculto', pro: 'Solo email', premium: 'Completo', category: 'Visibilidad' },
  { label: 'Redes sociales visibles', free: false, pro: true, premium: true, category: 'Visibilidad' },
  { label: 'Preview de perfil (días)', free: 'Sin preview', pro: '24h preview', premium: '24h preview', category: 'Visibilidad' },
  // Analytics
  { label: 'Nivel de analytics', free: 'Básico', pro: 'Intermedio', premium: 'Avanzado', category: 'Analytics' },
  // Extras
  { label: 'Badge Premium verificado', free: false, pro: false, premium: true, category: 'Extras' },
  { label: 'Soporte prioritario', free: false, pro: false, premium: true, category: 'Extras' },
  { label: 'Items en portfolio', free: 'Hasta 6', pro: 'Hasta 20', premium: 'Ilimitado', category: 'Extras' },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '¿Puedo cambiar de plan en cualquier momento?',
    answer: 'Sí. Puedes hacer upgrade o downgrade en cualquier momento desde tu panel de configuración. Los cambios aplican en el siguiente ciclo de facturación. Si haces upgrade, el acceso a los nuevos features es inmediato.',
  },
  {
    question: '¿Qué pasa con mis tokens IA si no los uso?',
    answer: 'Los tokens IA no se acumulan entre meses. Cada mes recibes la cantidad correspondiente a tu plan. Si necesitas más tokens, puedes comprar paquetes adicionales desde tu wallet sin necesidad de cambiar de plan.',
  },
  {
    question: '¿El descuento anual aplica desde el primer mes?',
    answer: 'Al elegir el plan anual pagas 12 meses por adelantado con un 20% de descuento sobre el precio mensual. El acceso es inmediato y el descuento se refleja en el precio total al momento del pago.',
  },
  {
    question: '¿Qué bloques están disponibles en el plan Free?',
    answer: 'El plan Free incluye los bloques esenciales: Hero Banner, About (sobre mí), Portfolio y Contacto. Los planes Pro y Premium desbloquean bloques avanzados como estadísticas, reseñas, servicios, FAQ, galería de imágenes, testimonios y más.',
  },
  {
    question: '¿Puedo probar Premium antes de pagar?',
    answer: 'Actualmente no contamos con un período de prueba gratuita para Premium, pero puedes iniciar con el plan Free y hacer upgrade cuando lo necesites. Si tienes dudas sobre qué plan es el correcto para ti, escríbenos y te ayudamos.',
  },
  {
    question: '¿El Badge Premium aparece en el marketplace?',
    answer: 'Sí. El Badge Premium es visible en tu perfil público del marketplace, lo que aumenta tu credibilidad y visibilidad ante marcas que buscan creadores. Es una señal de compromiso con tu carrera.',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Valentina Torres',
    handle: '@vale.ugc',
    avatar: 'VT',
    plan: 'premium',
    quote: 'Desde que activé Premium, las marcas me contactan directamente. El Badge y el perfil completo hacen toda la diferencia.',
    metric: '+340% más contactos de marcas',
  },
  {
    name: 'Mateo Gómez',
    handle: '@mateocrea',
    avatar: 'MG',
    plan: 'pro',
    quote: 'Con Creator Pro puedo mostrar mis redes y contacto real. Ya cerré 3 campañas este mes gracias al perfil profesional.',
    metric: '3 campañas cerradas / mes',
  },
  {
    name: 'Daniela Ruiz',
    handle: '@danielaugc',
    avatar: 'DR',
    plan: 'premium',
    quote: 'La IA de bio me generó un texto que nunca hubiera escrito yo sola. Ahora mi perfil convierte muchísimo mejor.',
    metric: 'Bio generada en 30 segundos',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureItem({ included, label }: { included: boolean | string; label?: string }) {
  if (typeof included === 'boolean') {
    return included ? (
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
        {label && <span className="text-sm text-zinc-300">{label}</span>}
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <X className="h-4 w-4 text-zinc-600 shrink-0" />
        {label && <span className="text-sm text-zinc-600">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="text-sm text-zinc-300">{included}</span>
    </div>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className="flex justify-center">
        <Check className="h-5 w-5 text-emerald-400" />
      </div>
    ) : (
      <div className="flex justify-center">
        <X className="h-5 w-5 text-zinc-600" />
      </div>
    );
  }
  return <span className="text-sm text-zinc-300 text-center block">{value}</span>;
}

function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-900/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-zinc-100">{item.question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0 ml-4" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 ml-4" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-zinc-400 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {testimonial.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{testimonial.name}</p>
          <p className="text-xs text-zinc-500">{testimonial.handle}</p>
        </div>
        <div className="ml-auto">
          <Badge
            variant="outline"
            className={
              testimonial.plan === 'premium'
                ? 'border-amber-500/40 text-amber-400 text-xs'
                : 'border-violet-500/40 text-violet-400 text-xs'
            }
          >
            {testimonial.plan === 'premium' ? 'Premium' : 'Pro'}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed italic">"{testimonial.quote}"</p>
      <div className="mt-auto pt-3 border-t border-zinc-800">
        <p className="text-xs font-semibold text-emerald-400">{testimonial.metric}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreatorPricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const monthlyPro = 24;
  const monthlyPremium = 49;
  const annualPro = Math.round(monthlyPro * 0.8);
  const annualPremium = Math.round(monthlyPremium * 0.8);

  const displayPro = isAnnual ? annualPro : monthlyPro;
  const displayPremium = isAnnual ? annualPremium : monthlyPremium;

  const categoriesInOrder = ['Inteligencia Artificial', 'Perfil', 'Visibilidad', 'Analytics', 'Extras'];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav minimal */}
      <nav className="border-b border-zinc-800/50 sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            KREOON
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm">
                Empezar gratis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">

        {/* ── Header ── */}
        <section className="pt-16 pb-10 text-center">
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 mb-4 text-xs px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1.5 inline" />
            Planes para Creadores
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Elige el plan que{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              impulsa tu carrera
            </span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Desde creadores que empiezan hasta profesionales que quieren destacar en el marketplace. Empieza gratis, escala cuando lo necesites.
          </p>

          {/* Toggle mensual / anual */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>Mensual</span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              aria-label="Cambiar entre facturación mensual y anual"
              className="data-[state=checked]:bg-amber-500"
            />
            <span className={`text-sm font-medium ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>
              Anual
              <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                -20%
              </Badge>
            </span>
          </div>
        </section>

        {/* ── Plan Cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20" aria-label="Planes disponibles">

          {/* Card: Free */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col hover:border-zinc-700 transition-colors">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Free</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-zinc-500 text-sm">/ mes</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">Para empezar a construir tu presencia online.</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-8 flex-1">
              <FeatureItem included="800 tokens IA/mes" />
              <FeatureItem included="5 bloques en perfil" />
              <FeatureItem included="4 bloques básicos" />
              <FeatureItem included="1 template de diseño" />
              <FeatureItem included="Analytics básico" />
              <FeatureItem included={false} label="Sin branding Kreoon" />
              <FeatureItem included={false} label="Contacto visible" />
              <FeatureItem included={false} label="Redes sociales visibles" />
            </div>

            <Link to="/register" className="w-full">
              <Button
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                aria-label="Empezar con el plan gratuito"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Card: Pro */}
          <div className="relative bg-zinc-900 border border-violet-500/40 rounded-2xl p-6 flex flex-col hover:border-violet-500/70 transition-colors">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Creator Pro</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">${displayPro}</span>
                <span className="text-zinc-500 text-sm">/ mes</span>
              </div>
              {isAnnual && (
                <p className="mt-1 text-xs text-zinc-500">
                  Facturado anualmente (${annualPro * 12} / año)
                </p>
              )}
              <p className="mt-2 text-sm text-zinc-500">Para creadores que quieren profesionalizar su perfil.</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-8 flex-1">
              <FeatureItem included="6,000 tokens IA/mes" />
              <FeatureItem included="10 bloques en perfil" />
              <FeatureItem included="12 tipos de bloques" />
              <FeatureItem included="3 templates de diseño" />
              <FeatureItem included="Sin branding Kreoon" />
              <FeatureItem included="Email visible" />
              <FeatureItem included="Redes sociales visibles" />
              <FeatureItem included="Preview 24h" />
              <FeatureItem included="Analytics intermedio" />
              <FeatureItem included={false} label="Generador de bio IA" />
              <FeatureItem included={false} label="Badge Premium" />
            </div>

            <Link to="/register?plan=creator_pro" className="w-full">
              <Button
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold"
                aria-label="Hacer upgrade al plan Creator Pro"
              >
                Upgrade a Pro
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Card: Premium (destacado) */}
          <div className="relative rounded-2xl p-px bg-gradient-to-b from-amber-400 via-orange-500 to-transparent flex flex-col">
            <div className="relative bg-zinc-900 rounded-[calc(1rem-1px)] p-6 flex flex-col h-full">

              {/* Badge Más popular */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  <Star className="h-3 w-3 fill-black" />
                  Mas popular
                </span>
              </div>

              <div className="mb-6 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Creator Premium</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">${displayPremium}</span>
                  <span className="text-zinc-500 text-sm">/ mes</span>
                </div>
                {isAnnual && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Facturado anualmente (${annualPremium * 12} / año)
                  </p>
                )}
                <p className="mt-2 text-sm text-zinc-500">Para creadores que quieren destacar y cerrar mas campañas.</p>
              </div>

              <div className="flex flex-col gap-2.5 mb-8 flex-1">
                <FeatureItem included="15,000 tokens IA/mes" />
                <FeatureItem included="15 bloques en perfil" />
                <FeatureItem included="Todos los bloques" />
                <FeatureItem included="5 templates + CSS custom" />
                <FeatureItem included="Sin branding Kreoon" />
                <FeatureItem included="Contacto completo visible" />
                <FeatureItem included="Redes sociales visibles" />
                <FeatureItem included="Preview 24h" />
                <FeatureItem included="IA: Bio, SEO y sugerencias" />
                <FeatureItem included="Analytics avanzado" />
                <FeatureItem included="Badge Premium verificado" />
                <FeatureItem included="Soporte prioritario" />
              </div>

              <Link to="/register?plan=creator_premium" className="w-full">
                <Button
                  className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40"
                  aria-label="Hacer upgrade al plan Creator Premium"
                >
                  Ir Premium
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

        </section>

        {/* ── Tabla comparativa ── */}
        <section className="pb-20" aria-label="Tabla comparativa de planes">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Comparacion detallada</h2>
            <p className="text-zinc-400 mt-2 text-sm">Todo lo que incluye cada plan, sin letra chica.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-4 text-sm font-semibold text-zinc-400 w-1/2">Feature</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-zinc-300">Free</span>
                    <p className="text-xs text-zinc-500 font-normal">$0/mes</p>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-violet-400">Pro</span>
                    <p className="text-xs text-zinc-500 font-normal">${displayPro}/mes</p>
                  </th>
                  <th className="px-4 py-4 text-center bg-amber-500/5">
                    <span className="text-sm font-semibold text-amber-400">Premium</span>
                    <p className="text-xs text-zinc-500 font-normal">${displayPremium}/mes</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoriesInOrder.map((category) => {
                  const rows = COMPARISON_FEATURES.filter((f) => f.category === category);
                  const categoryIcons: Record<string, React.ReactNode> = {
                    'Inteligencia Artificial': <Sparkles className="h-3.5 w-3.5 text-violet-400" />,
                    'Perfil': <Palette className="h-3.5 w-3.5 text-blue-400" />,
                    'Visibilidad': <Eye className="h-3.5 w-3.5 text-emerald-400" />,
                    'Analytics': <BarChart3 className="h-3.5 w-3.5 text-amber-400" />,
                    'Extras': <Star className="h-3.5 w-3.5 text-orange-400" />,
                  };

                  return (
                    <>
                      <tr key={`cat-${category}`} className="border-t border-zinc-800/70">
                        <td colSpan={4} className="px-5 py-2.5 bg-zinc-900/60">
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                            {categoryIcons[category]}
                            {category}
                          </span>
                        </td>
                      </tr>
                      {rows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-t border-zinc-800/40 hover:bg-zinc-900/30 transition-colors"
                        >
                          <td className="px-5 py-3 text-sm text-zinc-300">{row.label}</td>
                          <td className="px-4 py-3">
                            <ComparisonCell value={row.free} />
                          </td>
                          <td className="px-4 py-3">
                            <ComparisonCell value={row.pro} />
                          </td>
                          <td className="px-4 py-3 bg-amber-500/[0.03]">
                            <ComparisonCell value={row.premium} />
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Testimonios ── */}
        <section className="pb-20" aria-label="Testimonios de creadores">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Creadores que ya escalaron</h2>
            <p className="text-zinc-400 mt-2 text-sm">Lo que dicen quienes ya dieron el salto.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.handle} testimonial={t} />
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pb-20" aria-label="Preguntas frecuentes">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Preguntas frecuentes</h2>
            <p className="text-zinc-400 mt-2 text-sm">Resolvemos las dudas mas comunes antes de que empieces.</p>
          </div>

          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <FAQAccordionItem key={item.question} item={item} />
            ))}
          </div>
        </section>

        {/* ── CTA Final ── */}
        <section className="text-center py-16 border border-zinc-800 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950">
          <h2 className="text-3xl font-extrabold text-white mb-3">
            Empieza hoy, gratis
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm">
            No necesitas tarjeta de credito. Crea tu perfil en minutos y haz upgrade cuando tu carrera lo pida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold px-8 shadow-lg shadow-amber-500/20"
                aria-label="Crear cuenta gratuita en Kreoon"
              >
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button
                variant="ghost"
                size="lg"
                className="text-zinc-400 hover:text-white"
              >
                Ver el marketplace
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* Footer minimal */}
      <footer className="border-t border-zinc-800/50 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2026 KREOON. Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-zinc-400 transition-colors">Terminos</Link>
            <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacidad</Link>
            <Link to="/marketplace" className="hover:text-zinc-400 transition-colors">Marketplace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
