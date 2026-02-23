import { motion } from 'framer-motion';
import {
  ShoppingBag, Sparkles, Trophy, Layout, ShieldCheck, Users,
  UserPlus, Search, Rocket,
} from 'lucide-react';
import { KreoonGlassCard } from '@/components/ui/kreoon/KreoonGlassCard';
import { STAGGER_CONTAINER, STAGGER_ITEM, FADE_IN_UP, useScrollAnimation, withDelay } from '@/lib/animations';

const BENEFITS = [
  {
    icon: ShoppingBag,
    title: 'Marketplace',
    description: 'Aplica a campañas de marcas reales con presupuesto asignado.',
    color: 'text-pink-400 bg-pink-500/10',
  },
  {
    icon: Sparkles,
    title: 'Herramientas IA',
    description: 'Genera propuestas, scripts y thumbnails con inteligencia artificial.',
    color: 'text-kreoon-purple-400 bg-kreoon-purple-500/10',
  },
  {
    icon: Trophy,
    title: 'Sistema de Reputación',
    description: 'Tu rating y nivel crecen con cada proyecto. Más reputación = mejores campañas.',
    color: 'text-amber-400 bg-amber-500/10',
  },
  {
    icon: Layout,
    title: 'Portafolio Público',
    description: 'Muestra tu mejor trabajo con un perfil profesional que las marcas pueden descubrir.',
    color: 'text-cyan-400 bg-cyan-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Pagos Escrow',
    description: 'El dinero queda protegido hasta que el trabajo se aprueba. Nunca más perseguir pagos.',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  {
    icon: Users,
    title: 'Comunidad',
    description: 'Conecta con otros creadores, comparte aprendizajes y crece en equipo.',
    color: 'text-blue-400 bg-blue-500/10',
  },
];

const STEPS = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crea tu perfil',
    description: 'Completa tu portafolio, habilidades y redes. En 2 minutos estás listo.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Aplica a campañas',
    description: 'Explora campañas activas y aplica a las que encajan con tu estilo.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Cobra y crece',
    description: 'Entrega tu trabajo, cobra seguro por escrow y sube tu reputación.',
  },
];

export default function TalentBenefitsSection() {
  const scrollAnim = useScrollAnimation();

  return (
    <section className="relative bg-kreoon-bg-primary py-20 md:py-28">
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
        {/* Benefits header */}
        <motion.div variants={STAGGER_CONTAINER} {...scrollAnim} className="text-center mb-14">
          <motion.p variants={STAGGER_ITEM} className="text-sm font-medium text-kreoon-purple-400 uppercase tracking-wider mb-3">
            Beneficios
          </motion.p>
          <motion.h2 variants={STAGGER_ITEM} className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl">
            Todo lo que necesitas para{' '}
            <span className="bg-gradient-to-r from-kreoon-purple-400 to-pink-400 bg-clip-text text-transparent">
              vivir de tu creatividad
            </span>
          </motion.h2>
        </motion.div>

        {/* Benefits grid */}
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
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${item.color} mb-4`}>
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

        {/* How it works */}
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
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-kreoon-purple-500/30 bg-kreoon-bg-card/60 backdrop-blur-sm">
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
