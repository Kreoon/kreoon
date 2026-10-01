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
  { label: 'Tokens IA / mes', free: '500 tokens', pro: '6,000 tokens', premium: '15,000 tokens', category: 'Inteligencia Artificial' },
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
    answer: 'Al elegir el plan anual pagas 12 meses por adelantado con un 30% de descuento sobre el precio mensual. El acceso es inmediato y el descuento se refleja en el precio total al momento del pago.',
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
    quote: 'Con Creator Pro puedo mostrar mis redes y contacto real. Ya cerré 3 proyectos este mes gracias al perfil profesional.',
    metric: '3 proyectos cerrados / mes',
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
        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <X className="h-4 w-4 text-muted-foreground shrink-0" />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
      <span className="text-sm text-muted-foreground">{included}</span>
    </div>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className="flex justify-center">
        <Check className="h-5 w-5 text-emerald-600" />
      </div>
    ) : (
      <div className="flex justify-center">
        <X className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return <span className="text-sm text-muted-foreground text-center block">{value}</span>;
}

function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-card/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground">{item.question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
          {testimonial.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground">{testimonial.handle}</p>
        </div>
        <div className="ml-auto">
          <Badge
            variant="outline"
            className={
              testimonial.plan === 'premium'
                ? 'border-primary/40 text-primary text-xs'
                : 'border-primary/40 text-primary text-xs'
            }
          >
            {testimonial.plan === 'premium' ? 'Premium' : 'Pro'}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed italic">"{testimonial.quote}"</p>
      <div className="mt-auto pt-3 border-t border-border">
        <p className="text-xs font-semibold text-primary">{testimonial.metric}</p>
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav minimal */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            KREOON
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/registro">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm">
                Empezar gratis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">

        {/* ── Header ── */}
        <section className="pt-16 pb-10 text-center">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4 text-xs px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1.5 inline" />
            Planes para Creadores
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Elige el plan que{' '}
            <span className="text-primary">
              impulsa tu carrera
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Desde creadores que empiezan hasta profesionales que quieren destacar en el marketplace. Empieza gratis, escala cuando lo necesites.
          </p>

          {/* Toggle mensual / anual */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Mensual</span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              aria-label="Cambiar entre facturación mensual y anual"
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Anual
              <Badge className="ml-2 bg-primary/10 text-primary border-primary/30 text-xs">
                -20%
              </Badge>
            </span>
          </div>
        </section>

        {/* ── Plan Cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20" aria-label="Planes disponibles">

          {/* Card: Free */}
          <div className="relative bg-card border border-border rounded-2xl p-6 flex flex-col hover:border-border transition-colors">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Free</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">$0</span>
                <span className="text-muted-foreground text-sm">/ mes</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Para empezar a construir tu presencia online.</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-8 flex-1">
              <FeatureItem included="500 tokens IA/mes" />
              <FeatureItem included="5 bloques en perfil" />
              <FeatureItem included="4 bloques básicos" />
              <FeatureItem included="1 template de diseño" />
              <FeatureItem included="Analytics básico" />
              <FeatureItem included={false} label="Sin branding Kreoon" />
              <FeatureItem included={false} label="Contacto visible" />
              <FeatureItem included={false} label="Redes sociales visibles" />
            </div>

            <Link to="/registro" className="w-full">
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-card hover:text-foreground"
                aria-label="Empezar con el plan gratuito"
              >
                Empezar gratis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Card: Pro */}
          <div className="relative bg-card border border-primary/40 rounded-2xl p-6 flex flex-col hover:border-primary/70 transition-colors">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Creator Pro</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">${displayPro}</span>
                <span className="text-muted-foreground text-sm">/ mes</span>
              </div>
              {isAnnual && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Facturado anualmente (${annualPro * 12} / año)
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">Para creadores que quieren profesionalizar su perfil.</p>
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

            <Link to="/registro" className="w-full">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                aria-label="Hacer upgrade al plan Creator Pro"
              >
                Upgrade a Pro
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Card: Premium (destacado) */}
          <div className="relative rounded-2xl p-px bg-gradient-to-b from-primary via-primary/60 to-transparent flex flex-col">
            <div className="relative bg-card rounded-[calc(1rem-1px)] p-6 flex flex-col h-full">

              {/* Badge Más popular */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  <Star className="h-3 w-3 fill-primary-foreground" />
                  Mas popular
                </span>
              </div>

              <div className="mb-6 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Creator Premium</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">${displayPremium}</span>
                  <span className="text-muted-foreground text-sm">/ mes</span>
                </div>
                {isAnnual && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Facturado anualmente (${annualPremium * 12} / año)
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">Para creadores que quieren destacar y cerrar mas proyectos.</p>
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

              <Link to="/registro" className="w-full">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all"
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
            <h2 className="text-2xl font-bold text-foreground">Comparacion detallada</h2>
            <p className="text-muted-foreground mt-2 text-sm">Todo lo que incluye cada plan, sin letra chica.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-4 text-sm font-semibold text-muted-foreground w-1/2">Feature</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-muted-foreground">Free</span>
                    <p className="text-xs text-muted-foreground font-normal">$0/mes</p>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-primary">Pro</span>
                    <p className="text-xs text-muted-foreground font-normal">${displayPro}/mes</p>
                  </th>
                  <th className="px-4 py-4 text-center bg-primary/5">
                    <span className="text-sm font-semibold text-primary">Premium</span>
                    <p className="text-xs text-muted-foreground font-normal">${displayPremium}/mes</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoriesInOrder.map((category) => {
                  const rows = COMPARISON_FEATURES.filter((f) => f.category === category);
                  const categoryIcons: Record<string, React.ReactNode> = {
                    'Inteligencia Artificial': <Sparkles className="h-3.5 w-3.5 text-primary" />,
                    'Perfil': <Palette className="h-3.5 w-3.5 text-primary" />,
                    'Visibilidad': <Eye className="h-3.5 w-3.5 text-emerald-600" />,
                    'Analytics': <BarChart3 className="h-3.5 w-3.5 text-primary" />,
                    'Extras': <Star className="h-3.5 w-3.5 text-primary" />,
                  };

                  return (
                    <>
                      <tr key={`cat-${category}`} className="border-t border-border">
                        <td colSpan={4} className="px-5 py-2.5 bg-card/60">
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {categoryIcons[category]}
                            {category}
                          </span>
                        </td>
                      </tr>
                      {rows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-t border-border hover:bg-card/30 transition-colors"
                        >
                          <td className="px-5 py-3 text-sm text-muted-foreground">{row.label}</td>
                          <td className="px-4 py-3">
                            <ComparisonCell value={row.free} />
                          </td>
                          <td className="px-4 py-3">
                            <ComparisonCell value={row.pro} />
                          </td>
                          <td className="px-4 py-3 bg-primary/[0.03]">
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
            <h2 className="text-2xl font-bold text-foreground">Creadores que ya escalaron</h2>
            <p className="text-muted-foreground mt-2 text-sm">Lo que dicen quienes ya dieron el salto.</p>
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
            <h2 className="text-2xl font-bold text-foreground">Preguntas frecuentes</h2>
            <p className="text-muted-foreground mt-2 text-sm">Resolvemos las dudas mas comunes antes de que empieces.</p>
          </div>

          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <FAQAccordionItem key={item.question} item={item} />
            ))}
          </div>
        </section>

        {/* ── CTA Final ── */}
        <section className="text-center py-16 border border-border rounded-3xl bg-gradient-to-b from-card to-background">
          <h2 className="text-3xl font-extrabold text-foreground mb-3">
            Empieza hoy, gratis
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
            No necesitas tarjeta de credito. Crea tu perfil en minutos y haz upgrade cuando tu carrera lo pida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/registro">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20"
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
                className="text-muted-foreground hover:text-foreground"
              >
                Ver el marketplace
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* Footer minimal */}
      <footer className="border-t border-border py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 KREOON. Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-muted-foreground transition-colors">Terminos</Link>
            <Link to="/privacy" className="hover:text-muted-foreground transition-colors">Privacidad</Link>
            <Link to="/marketplace" className="hover:text-muted-foreground transition-colors">Marketplace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
