import { motion } from 'framer-motion';
import {
  Sparkles, Trophy, Layout, ShieldCheck, Users,
  UserPlus, Search, Rocket, Share2, Scissors,
  Megaphone, Gift, Brain, Palette,
} from 'lucide-react';
import { KreoonGlassCard } from '@/components/ui/kreoon/KreoonGlassCard';
import { STAGGER_CONTAINER, STAGGER_ITEM, FADE_IN_UP, useScrollAnimation, withDelay } from '@/lib/animations';

// ─── Early Bird Perks (highlighted) ──────────────────────
const EARLY_BIRD_PERKS = [
  {
    icon: Sparkles,
    title: 'Créditos de IA gratis',
    description: 'Genera guiones, copys para redes, ideas de contenido y thumbnails con inteligencia artificial. Los Early Birds reciben créditos IA incluidos.',
  },
  {
    icon: Gift,
    title: 'Acceso anticipado a todo',
    description: 'Serás de los primeros en acceder a nuevas funciones, campañas exclusivas y herramientas antes que nadie.',
  },
  {
    icon: Trophy,
    title: 'Reputación desde el día 1',
    description: 'Los Early Birds arrancan con ventaja. Tu perfil tendrá badge de fundador y prioridad en el marketplace.',
  },
];

// ─── Main Benefits ───────────────────────────────────────
const BENEFITS = [
  {
    icon: Megaphone,
    title: 'Aplica a campañas pagadas',
    description: 'Marcas y agencias publican campañas con presupuesto real. Tú aplicas con un clic — sin DMs fríos, sin negociar tarifas por chat.',
    color: 'text-pink-400 bg-pink-500/10',
  },
  {
    icon: Share2,
    title: 'Publica en todas tus redes',
    description: 'Conecta Instagram, TikTok, YouTube y más. Programa y publica tu contenido en todas las plataformas desde un solo lugar.',
    color: 'text-blue-400 bg-blue-500/10',
  },
  {
    icon: Scissors,
    title: '¿No editas? No hay problema',
    description: 'Si lo tuyo es crear pero no editar, un editor profesional de la plataforma se encarga de la postproducción. Tú grabas, nosotros entregamos.',
    color: 'text-orange-400 bg-orange-500/10',
  },
  {
    icon: Users,
    title: 'Comunidad + Estrategia',
    description: 'Accede a una comunidad activa de creadores, estrategas y mentores. Comparte ideas, aprende nuevas técnicas y haz networking real.',
    color: 'text-indigo-400 bg-indigo-500/10',
  },
  {
    icon: Brain,
    title: 'IA que trabaja por ti',
    description: 'Genera scripts virales, propuestas para marcas, ideas de contenido y creativos para redes en segundos. Deja que la IA haga el trabajo pesado.',
    color: 'text-kreoon-purple-400 bg-kreoon-purple-500/10',
  },
  {
    icon: Layout,
    title: 'Portafolio profesional',
    description: 'Tu perfil público con tus mejores videos, métricas y especialidades. Las marcas te descubren sin que hagas nada.',
    color: 'text-cyan-400 bg-cyan-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Pagos con Escrow',
    description: 'El dinero queda protegido antes de que empieces. Cuando la marca aprueba, se libera automáticamente. Nunca más perseguir pagos.',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  {
    icon: Palette,
    title: 'Todo en un solo lugar',
    description: 'Campañas, contratos, entregas, pagos, portfolio, redes y comunicación con marcas — todo centralizado. Adiós al caos de WhatsApp y Excel.',
    color: 'text-rose-400 bg-rose-500/10',
  },
  {
    icon: Trophy,
    title: 'Reputación que te abre puertas',
    description: 'Cada proyecto completado sube tu rating y nivel. Más reputación = mejores campañas, mejores marcas y mejores tarifas.',
    color: 'text-amber-400 bg-amber-500/10',
  },
];

// ─── Steps ───────────────────────────────────────────────
const STEPS = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Regístrate gratis',
    description: 'Crea tu perfil, sube tu portafolio y conecta tus redes. En 2 minutos estás listo.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Aplica a campañas',
    description: 'Explora campañas de marcas y agencias. Aplica a las que encajan con tu estilo y tarifa.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Crea, cobra y crece',
    description: 'Entrega tu contenido, cobra seguro por escrow y sube de nivel con cada proyecto.',
  },
];

export default function TalentBenefitsSection() {
  const scrollAnim = useScrollAnimation();

  return (
    <section className="relative overflow-hidden bg-kreoon-bg-primary py-20 md:py-28">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 lg:px-8">

        {/* ── Early Bird Section ──────────────────────────── */}
        <motion.div variants={STAGGER_CONTAINER} {...scrollAnim} className="text-center mb-10">
          <motion.div variants={STAGGER_ITEM} className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 mb-5">
            <Gift className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">
              Beneficios exclusivos Early Bird
            </span>
          </motion.div>
          <motion.h2 variants={STAGGER_ITEM} className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl">
            Sé de los primeros y{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              llévate ventaja
            </span>
          </motion.h2>
          <motion.p variants={STAGGER_ITEM} className="mt-4 text-kreoon-text-secondary max-w-2xl mx-auto">
            Los que se registran ahora reciben beneficios que no estarán disponibles después.
            Sin costo. Sin compromisos. Solo ventajas por llegar temprano.
          </motion.p>
        </motion.div>

        {/* Early Bird cards */}
        <motion.div
          variants={STAGGER_CONTAINER}
          {...scrollAnim}
          className="grid gap-5 md:grid-cols-3 mb-20"
        >
          {EARLY_BIRD_PERKS.map((perk) => (
            <motion.div key={perk.title} variants={STAGGER_ITEM}>
              <KreoonGlassCard
                intensity="medium"
                className="p-6 h-full border-amber-500/20 hover:border-amber-400/40 transition-all relative overflow-hidden"
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" aria-hidden />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
                    <perk.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-kreoon-text-primary mb-2">
                    {perk.title}
                  </h3>
                  <p className="text-sm text-kreoon-text-secondary leading-relaxed">
                    {perk.description}
                  </p>
                </div>
              </KreoonGlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* ── All Benefits ────────────────────────────────── */}
        <motion.div variants={STAGGER_CONTAINER} {...scrollAnim} className="text-center mb-14">
          <motion.p variants={STAGGER_ITEM} className="text-sm font-medium text-kreoon-purple-400 uppercase tracking-wider mb-3">
            La plataforma completa
          </motion.p>
          <motion.h2 variants={STAGGER_ITEM} className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl">
            Todo lo que necesitas para{' '}
            <span className="bg-gradient-to-r from-kreoon-purple-400 to-pink-400 bg-clip-text text-transparent">
              vivir de tu creatividad
            </span>
          </motion.h2>
          <motion.p variants={STAGGER_ITEM} className="mt-4 text-kreoon-text-secondary max-w-2xl mx-auto">
            No importa si eres creador UGC, editor, fotógrafo o estratega de contenido.
            Kreoon tiene las herramientas para que te enfoques en crear y nosotros nos encargamos del resto.
          </motion.p>
        </motion.div>

        {/* Benefits grid — 9 cards, 3x3 */}
        <motion.div
          variants={STAGGER_CONTAINER}
          {...scrollAnim}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {BENEFITS.map((item) => (
            <motion.div key={item.title} variants={STAGGER_ITEM}>
              <KreoonGlassCard
                intensity="light"
                className="p-6 h-full hover:border-kreoon-purple-400/20 transition-all"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-sm ${item.color} mb-4`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-kreoon-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-kreoon-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </KreoonGlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* ── How it works ────────────────────────────────── */}
        <div className="mt-24">
          <motion.div variants={STAGGER_CONTAINER} {...scrollAnim} className="text-center mb-14">
            <motion.p variants={STAGGER_ITEM} className="text-sm font-medium text-kreoon-purple-400 uppercase tracking-wider mb-3">
              Cómo funciona
            </motion.p>
            <motion.h2 variants={STAGGER_ITEM} className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl">
              Empieza en 3 pasos
            </motion.h2>
          </motion.div>

          <motion.div
            variants={STAGGER_CONTAINER}
            {...scrollAnim}
            className="grid gap-8 md:grid-cols-3"
          >
            {STEPS.map((step, idx) => (
              <motion.div key={step.number} variants={STAGGER_ITEM} className="relative">
                {/* Connector line (hidden on last) */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-kreoon-purple-500/40 to-transparent" />
                )}

                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-sm border border-kreoon-purple-500/30 bg-kreoon-bg-card/60 backdrop-blur-sm">
                    <step.icon className="h-8 w-8 text-kreoon-purple-400" />
                  </div>
                  <span className="text-xs font-bold text-kreoon-purple-400 tracking-widest uppercase">
                    Paso {step.number}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-kreoon-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-kreoon-text-secondary max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
