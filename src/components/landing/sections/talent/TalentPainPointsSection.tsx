import { motion } from 'framer-motion';
import { DollarSign, Eye, Zap, Users, ArrowRight } from 'lucide-react';
import { KreoonGlassCard } from '@/components/ui/kreoon/KreoonGlassCard';
import { STAGGER_CONTAINER, STAGGER_ITEM, useScrollAnimation } from '@/lib/animations';

const PAIN_POINTS = [
  {
    icon: DollarSign,
    iconColor: 'from-red-500 to-orange-500',
    pain: 'Ingresos inconsistentes',
    painDetail: 'Un mes facturas bien, el siguiente no sabes de dónde saldrá.',
    solution: 'Marketplace con proyectos pagados',
    solutionDetail: 'Accede a campañas activas de marcas que ya tienen presupuesto asignado.',
  },
  {
    icon: Eye,
    iconColor: 'from-amber-500 to-yellow-500',
    pain: 'Invisible para las marcas',
    painDetail: 'Tu trabajo es increíble, pero nadie lo encuentra.',
    solution: 'Perfil público + reputación',
    solutionDetail: 'Las marcas te descubren por tu portafolio, rating y especialidad.',
  },
  {
    icon: Zap,
    iconColor: 'from-blue-500 to-cyan-500',
    pain: 'Lo admin te consume',
    painDetail: 'Cotizar, cobrar, perseguir pagos... no es lo tuyo.',
    solution: 'Pagos escrow + herramientas IA',
    solutionDetail: 'Cobra seguro con escrow automático y deja que la IA genere tus propuestas.',
  },
  {
    icon: Users,
    iconColor: 'from-purple-500 to-pink-500',
    pain: 'Conseguir clientes es agotador',
    painDetail: 'Pasas más tiempo buscando trabajo que creando.',
    solution: 'Las marcas vienen a ti',
    solutionDetail: 'Marcas publican campañas y tú aplicas con un clic. Sin DMs fríos.',
  },
];

interface TalentPainPointsSectionProps {
  id?: string;
}

export default function TalentPainPointsSection({ id }: TalentPainPointsSectionProps) {
  const scrollAnim = useScrollAnimation();

  return (
    <section id={id} className="relative bg-kreoon-bg-primary py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        {/* Section header */}
        <motion.div variants={STAGGER_CONTAINER} {...scrollAnim} className="text-center mb-14">
          <motion.p variants={STAGGER_ITEM} className="text-sm font-medium text-kreoon-purple-400 uppercase tracking-wider mb-3">
            El problema
          </motion.p>
          <motion.h2 variants={STAGGER_ITEM} className="text-3xl font-bold tracking-tight text-kreoon-text-primary md:text-4xl">
            Crear contenido es fácil.{' '}
            <span className="text-kreoon-text-muted">Lo difícil es vivir de ello.</span>
          </motion.h2>
          <motion.p variants={STAGGER_ITEM} className="mt-4 text-kreoon-text-secondary max-w-2xl mx-auto">
            Si algo de esto te suena, Kreoon fue diseñado para ti.
          </motion.p>
        </motion.div>

        {/* Pain point cards */}
        <motion.div
          variants={STAGGER_CONTAINER}
          {...scrollAnim}
          className="grid gap-6 sm:grid-cols-2"
        >
          {PAIN_POINTS.map((item) => (
            <motion.div key={item.pain} variants={STAGGER_ITEM}>
              <KreoonGlassCard
                intensity="medium"
                className="p-6 h-full hover:border-kreoon-purple-400/30 transition-all group"
              >
                {/* Icon */}
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-sm bg-gradient-to-br ${item.iconColor} mb-4`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>

                {/* Pain */}
                <h3 className="text-lg font-semibold text-kreoon-text-primary mb-1">
                  {item.pain}
                </h3>
                <p className="text-sm text-kreoon-text-muted mb-4">
                  {item.painDetail}
                </p>

                {/* Divider */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-kreoon-border" />
                  <ArrowRight className="h-4 w-4 text-kreoon-purple-400" />
                  <div className="h-px flex-1 bg-kreoon-border" />
                </div>

                {/* Solution */}
                <p className="text-sm font-medium text-kreoon-purple-400 mb-1">
                  {item.solution}
                </p>
                <p className="text-sm text-kreoon-text-secondary">
                  {item.solutionDetail}
                </p>
              </KreoonGlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
