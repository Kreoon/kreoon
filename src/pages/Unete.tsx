import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Palette, Building2, Users, Sparkles,
  ArrowRight, Star, ChevronDown,
} from 'lucide-react';
import { Kiro3D } from '@/components/kiro/Kiro3D';
import { useUTMTracking, useTrackEvent } from '@/hooks/useUTMTracking';
import type { KiroState } from '@/components/kiro/Kiro3D';

// ─── Types ────────────────────────────────────────────────
type UserType = 'talent' | 'brand' | 'organization';

interface UserTypeCard {
  type: UserType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
  route: string;
  features: string[];
}

// ─── Data ─────────────────────────────────────────────────
const USER_TYPE_CARDS: UserTypeCard[] = [
  {
    type: 'talent',
    title: 'Soy Talento',
    subtitle: 'Creadores, editores y freelancers',
    description: 'Únete al marketplace de talento creativo más grande de LATAM. Encuentra proyectos, construye tu portafolio y crece profesionalmente.',
    icon: Camera,
    gradient: 'from-purple-600 to-pink-600',
    borderColor: 'border-purple-500/30',
    route: '/unete/talento',
    features: ['Portafolio profesional', 'Proyectos pagados', 'Red de creadores', 'Herramientas AI'],
  },
  {
    type: 'brand',
    title: 'Soy Marca',
    subtitle: 'Empresas y negocios',
    description: 'Accede a talento verificado para tus campañas de contenido. Gestiona proyectos, pagos y resultados en un solo lugar.',
    icon: Building2,
    gradient: 'from-blue-600 to-cyan-600',
    borderColor: 'border-blue-500/30',
    route: '/unete/marcas',
    features: ['Talento verificado', 'Gestión de campañas', 'Métricas en tiempo real', 'Pagos seguros'],
  },
  {
    type: 'organization',
    title: 'Soy Organización',
    subtitle: 'Agencias y equipos creativos',
    description: 'Gestiona tu equipo creativo, clientes y operaciones con el sistema operativo definitivo para organizaciones de contenido.',
    icon: Users,
    gradient: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-500/30',
    route: '/unete/organizaciones',
    features: ['Multi-tenant', 'Gestión de equipo', 'CRM integrado', 'Automatización AI'],
  },
];

const SOCIAL_PROOF_STATS = [
  { label: 'Creadores activos', value: '2,500+' },
  { label: 'Marcas conectadas', value: '400+' },
  { label: 'Proyectos completados', value: '8,000+' },
  { label: 'Países', value: '12' },
];

// ─── Kiro Mascot ──────────────────────────────────────────
function KiroMascot({ hoveredType }: { hoveredType: UserType | null }) {
  const [mouseAngle, setMouseAngle] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const kiroState: KiroState = hoveredType ? 'celebrating' : 'idle';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setMouseAngle({
        x: (e.clientX - cx) / 200,
        y: (e.clientY - cy) / 200,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="relative"
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Kiro3D
        size={160}
        mouseAngle={mouseAngle}
        state={kiroState}
        expression={hoveredType ? 'happy' : 'neutral'}
        animate
      />

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={hoveredType || 'default'}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 text-sm text-white">
            {hoveredType === 'talent' && '¡Muestra tu talento al mundo!'}
            {hoveredType === 'brand' && '¡Encuentra el talento perfecto!'}
            {hoveredType === 'organization' && '¡Lleva tu equipo al siguiente nivel!'}
            {!hoveredType && '¡Elige tu camino!'}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white/10 border-r border-b border-white/20" />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── User Type Card Component ─────────────────────────────
function UserTypeCardComponent({
  card,
  index,
  onHover,
  onLeave,
}: {
  card: UserTypeCard;
  index: number;
  onHover: (type: UserType) => void;
  onLeave: () => void;
}) {
  const navigate = useNavigate();
  const { trackEvent } = useTrackEvent();
  const Icon = card.icon;

  const handleClick = () => {
    trackEvent('unete_card_click', { user_type: card.type });
    navigate(card.route);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
      onMouseEnter={() => onHover(card.type)}
      onMouseLeave={onLeave}
      onClick={handleClick}
      className={`group relative cursor-pointer rounded-2xl border ${card.borderColor} bg-white/5 backdrop-blur-sm p-6 md:p-8 transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:scale-[1.02] hover:shadow-2xl`}
    >
      {/* Gradient glow on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} mb-5`}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{card.title}</h3>
        <p className="text-white/50 text-sm mb-4">{card.subtitle}</p>
        <p className="text-white/70 text-sm leading-relaxed mb-6">{card.description}</p>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {card.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-white/60">
              <Star className="w-3.5 h-3.5 text-yellow-400/70 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className={`flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all duration-300`}>
          Comenzar
          <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function Unete() {
  const [hoveredType, setHoveredType] = useState<UserType | null>(null);
  const { hasUTMs } = useUTMTracking();
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    trackEvent('unete_page_view', { has_utms: hasUTMs });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              KREOON
            </span>
          </Link>
          <Link
            to="/auth"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-8 md:pt-16 pb-12">
          <KiroMascot hoveredType={hoveredType} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-8 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              El ecosistema creativo de LATAM
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                Únete a KREOON
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-xl mx-auto">
              Conectamos talento creativo con marcas y organizaciones.
              Elige tu perfil para comenzar.
            </p>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-8 md:hidden"
          >
            <ChevronDown className="w-5 h-5 text-white/30 animate-bounce" />
          </motion.div>
        </section>

        {/* Cards */}
        <section className="px-6 md:px-12 pb-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {USER_TYPE_CARDS.map((card, i) => (
              <UserTypeCardComponent
                key={card.type}
                card={card}
                index={i}
                onHover={setHoveredType}
                onLeave={() => setHoveredType(null)}
              />
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="px-6 md:px-12 pb-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10"
            >
              {SOCIAL_PROOF_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/40 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 md:px-12 py-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/30">
              &copy; {new Date().getFullYear()} KREOON. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link to="/" className="hover:text-white/60 transition-colors">Inicio</Link>
              <Link to="/auth" className="hover:text-white/60 transition-colors">Iniciar sesión</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
