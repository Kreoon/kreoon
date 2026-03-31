import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Users, Building2, Briefcase, Star } from 'lucide-react';
import { KreoonBadge } from '@/components/ui/kreoon/KreoonBadge';
import { FADE_IN_UP, useScrollAnimation, withDelay } from '@/lib/animations';

const STATS = [
  { icon: Users, value: 'Early Bird', label: 'Acceso anticipado' },
  { icon: Building2, value: 'Gratis', label: 'Sin costo para talento' },
  { icon: Briefcase, value: 'Escrow', label: 'Pagos protegidos' },
  { icon: Star, value: 'IA', label: 'Herramientas incluidas' },
];

interface TalentHeroSectionProps {
  onScrollToForm: () => void;
  onScrollToInterest: () => void;
}

export default function TalentHeroSection({ onScrollToForm, onScrollToInterest }: TalentHeroSectionProps) {
  const scrollAnim = useScrollAnimation();

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-kreoon-bg-primary pt-20 pb-16 md:min-h-screen md:pt-28 md:pb-24">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -right-[20%] -top-[20%] h-[80vh] w-[80vw] max-w-[800px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(168,85,247,0.15) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute -bottom-[10%] -left-[10%] h-[40vh] w-[40vw] max-w-[400px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        {/* Two-column layout */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <motion.div variants={FADE_IN_UP} {...scrollAnim}>
              <KreoonBadge variant="purple" size="lg">
                Kreoon para Talento
              </KreoonBadge>
            </motion.div>

            <motion.h1
              variants={withDelay(FADE_IN_UP, 0.1)}
              {...scrollAnim}
              className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl"
            >
              Tu talento merece ser{' '}
              <span className="bg-gradient-to-r from-kreoon-purple-400 via-kreoon-purple-300 to-kreoon-purple-400 bg-clip-text text-transparent">
                visto y bien pagado
              </span>
            </motion.h1>

            <motion.p
              variants={withDelay(FADE_IN_UP, 0.2)}
              {...scrollAnim}
              className="mt-6 text-lg text-kreoon-text-secondary md:text-xl max-w-xl mx-auto lg:mx-0"
            >
              Aplica a campañas pagadas, publica en todas tus redes desde un solo lugar,
              genera guiones con IA y cobra seguro con escrow. Si no editas, nosotros lo hacemos por ti.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={withDelay(FADE_IN_UP, 0.3)}
              {...scrollAnim}
              className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <button
                onClick={onScrollToForm}
                className="inline-flex items-center gap-2 rounded-sm bg-kreoon-gradient px-8 py-3.5 font-semibold text-white shadow-kreoon-glow-sm transition-all hover:shadow-kreoon-glow hover:scale-[1.02]"
              >
                Quiero unirme <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onScrollToInterest}
                className="inline-flex items-center gap-2 rounded-sm border border-kreoon-border bg-kreoon-bg-card/50 px-8 py-3.5 font-semibold text-kreoon-text-primary transition-all hover:border-kreoon-purple-400/40 hover:bg-kreoon-bg-card/80"
              >
                Conocer más
              </button>
            </motion.div>

            {/* Trust strip */}
            <motion.p
              variants={withDelay(FADE_IN_UP, 0.45)}
              {...scrollAnim}
              className="mt-6 text-sm text-kreoon-text-muted"
            >
              Acceso Early Bird &middot; Gratis para siempre &middot; Plataforma en crecimiento
            </motion.p>
          </div>

          {/* Right: floating visual (hidden mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden lg:block relative"
          >
            <div className="relative mx-auto max-w-md">
              {/* Card 1: profile */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-sm border border-kreoon-purple-500/30 bg-kreoon-bg-card/80 p-6 shadow-kreoon-glow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-kreoon-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white">
                    K
                  </div>
                  <div>
                    <p className="font-semibold text-kreoon-text-primary">Perfil Verificado</p>
                    <p className="text-sm text-kreoon-text-secondary">Creador &middot; Video &middot; UGC</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 rounded-sm bg-kreoon-purple-500/10 p-3 text-center">
                    <p className="text-lg font-bold text-kreoon-purple-400">4.9</p>
                    <p className="text-xs text-kreoon-text-muted">Rating</p>
                  </div>
                  <div className="flex-1 rounded-sm bg-emerald-500/10 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">32</p>
                    <p className="text-xs text-kreoon-text-muted">Proyectos</p>
                  </div>
                  <div className="flex-1 rounded-sm bg-pink-500/10 p-3 text-center">
                    <p className="text-lg font-bold text-pink-400">12K</p>
                    <p className="text-xs text-kreoon-text-muted">Alcance</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: payment received (floating offset) */}
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-8 -right-8 rounded-sm border border-emerald-500/30 bg-kreoon-bg-card/90 p-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 text-lg">$</span>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-400">+$850 USD</p>
                    <p className="text-xs text-kreoon-text-muted">Pago recibido</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: engagement (floating offset) */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -top-6 -left-6 rounded-sm border border-kreoon-purple-500/30 bg-kreoon-bg-card/90 p-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-kreoon-purple-500/20 flex items-center justify-center">
                    <Star className="h-4 w-4 text-kreoon-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-kreoon-text-primary">Top Creator</p>
                    <p className="text-xs text-kreoon-text-muted">Reputación Elite</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          variants={withDelay(FADE_IN_UP, 0.5)}
          {...scrollAnim}
          className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 lg:mt-20"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-sm border border-kreoon-border bg-kreoon-bg-card/40 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-kreoon-purple-500/10">
                <stat.icon className="h-5 w-5 text-kreoon-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-kreoon-text-primary">{stat.value}</p>
                <p className="text-xs text-kreoon-text-muted">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <button onClick={onScrollToInterest} className="text-kreoon-text-muted hover:text-kreoon-purple-400 transition-colors">
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="block"
          >
            <ChevronDown className="h-7 w-7" />
          </motion.span>
        </button>
      </motion.div>
    </section>
  );
}
