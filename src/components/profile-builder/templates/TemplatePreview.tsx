import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ProfileTemplate } from '../types/profile-builder';
import {
  User,
  Star,
  Briefcase,
  MessageSquare,
  Check,
  Play,
  ChevronRight,
  Instagram,
  Youtube,
  ExternalLink,
} from 'lucide-react';

interface TemplatePreviewProps {
  template: ProfileTemplate;
  className?: string;
}

// Datos de ejemplo para el preview
const SAMPLE_DATA = {
  name: 'Maria Garcia',
  bio: 'Creadora de contenido | UGC Creator | +500K seguidores',
  avatar: null,
  stats: {
    followers: '500K',
    projects: '150+',
    rating: '4.9',
    clients: '80+',
  },
  services: [
    { name: 'Video UGC', price: '$150' },
    { name: 'Reel Instagram', price: '$200' },
    { name: 'Pack Contenido', price: '$450' },
  ],
  testimonial: {
    text: '"Maria entrego un contenido increible que supero nuestras expectativas. Muy profesional!"',
    author: 'Carlos R. - Brand Manager',
  },
  brands: ['Nike', 'Adidas', 'Samsung', 'L\'Oreal'],
  skills: ['Video', 'Fotografia', 'Storytelling', 'Edicion'],
};

function TemplatePreviewComponent({ template, className }: TemplatePreviewProps) {
  const { config, blocks } = template;
  const accentColor = config.accentColor;

  // Determinar que bloques mostrar basado en la plantilla
  const blockTypes = blocks.map(b => b.type);
  const hasStats = blockTypes.includes('stats');
  const hasServices = blockTypes.includes('services');
  const hasTestimonials = blockTypes.includes('testimonials') || blockTypes.includes('reviews');
  const hasBrands = blockTypes.includes('brands') || blockTypes.includes('social_proof');
  const hasVideo = blockTypes.includes('video_embed') || blockTypes.includes('video_hero');
  const hasCTA = blockTypes.includes('cta_banner');
  const hasHeadline = blockTypes.includes('headline');
  const hasIconList = blockTypes.includes('icon_list');
  const hasPricing = blockTypes.includes('pricing');
  const hasSkills = blockTypes.includes('skills');

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-lg',
        config.theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900',
        className
      )}
      style={{ fontSize: '10px' }}
    >
      {/* Hero Section */}
      <div
        className="relative p-6 text-center"
        style={{
          background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
        }}
      >
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: accentColor + '30' }}
        >
          <User className="w-7 h-7" style={{ color: accentColor }} />
        </div>

        {/* Name & Bio */}
        <h2 className="text-base font-bold mb-1">{SAMPLE_DATA.name}</h2>
        <p className={cn('text-[9px] mb-3', config.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
          {SAMPLE_DATA.bio}
        </p>

        {/* CTA Button */}
        <button
          className="px-4 py-1.5 rounded-md text-[10px] font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          Contactar
        </button>
      </div>

      {/* Stats */}
      {hasStats && (
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-zinc-800/50">
          {Object.entries(SAMPLE_DATA.stats).slice(0, 4).map(([key, value]) => (
            <div key={key} className="text-center">
              <p className="text-sm font-bold" style={{ color: accentColor }}>{value}</p>
              <p className={cn('text-[8px] capitalize', config.theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {key}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Headline */}
      {hasHeadline && (
        <div className="p-4 text-center">
          <h3
            className="text-sm font-bold"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, #EC4899)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Contenido que convierte
          </h3>
        </div>
      )}

      {/* Video placeholder */}
      {hasVideo && (
        <div className="mx-3 mb-3">
          <div
            className="aspect-video rounded-md flex items-center justify-center"
            style={{ backgroundColor: config.theme === 'dark' ? '#1a1a1a' : '#f0f0f0' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Icon List */}
      {hasIconList && (
        <div className="px-3 pb-3 space-y-1.5">
          {['Contenido viral optimizado', 'Entrega en 48 horas', 'Revision ilimitada'].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: accentColor + '20' }}
              >
                <Check className="w-2.5 h-2.5" style={{ color: accentColor }} />
              </div>
              <span className={cn('text-[9px]', config.theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                {item}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Services */}
      {hasServices && (
        <div className="p-3 border-t border-zinc-800/50">
          <p className="text-[9px] font-medium mb-2 text-zinc-400">Servicios</p>
          <div className="space-y-1.5">
            {SAMPLE_DATA.services.map((service, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between p-2 rounded-md',
                  config.theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100'
                )}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3 h-3" style={{ color: accentColor }} />
                  <span className="text-[9px]">{service.name}</span>
                </div>
                <span className="text-[9px] font-medium" style={{ color: accentColor }}>
                  {service.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Banner */}
      {hasCTA && (
        <div
          className="mx-3 my-3 p-4 rounded-lg text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #EC4899 100%)`,
          }}
        >
          <p className="text-[10px] font-bold mb-1">Listo para colaborar?</p>
          <p className="text-[8px] opacity-80 mb-2">Agenda una llamada gratis</p>
          <button className="px-3 py-1 bg-white/20 rounded text-[9px] font-medium">
            Contactar ahora
          </button>
        </div>
      )}

      {/* Pricing */}
      {hasPricing && (
        <div className="p-3 border-t border-zinc-800/50">
          <p className="text-[9px] font-medium mb-2 text-zinc-400">Paquetes</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['Basico', 'Pro', 'Premium'].map((plan, i) => (
              <div
                key={i}
                className={cn(
                  'p-2 rounded-md text-center',
                  i === 1 ? 'ring-1' : '',
                  config.theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100'
                )}
                style={i === 1 ? { ringColor: accentColor } : undefined}
              >
                <p className="text-[8px] font-medium mb-0.5">{plan}</p>
                <p className="text-[10px] font-bold" style={{ color: i === 1 ? accentColor : undefined }}>
                  ${150 + i * 100}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonial */}
      {hasTestimonials && (
        <div className="p-3 border-t border-zinc-800/50">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
            <div>
              <p className={cn('text-[8px] italic mb-1', config.theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                {SAMPLE_DATA.testimonial.text}
              </p>
              <p className="text-[8px] font-medium">{SAMPLE_DATA.testimonial.author}</p>
            </div>
          </div>
        </div>
      )}

      {/* Brands */}
      {hasBrands && (
        <div className="p-3 border-t border-zinc-800/50">
          <p className="text-[8px] text-center text-zinc-500 mb-2">Confian en mi</p>
          <div className="flex justify-center gap-3">
            {SAMPLE_DATA.brands.map((brand, i) => (
              <div
                key={i}
                className={cn(
                  'px-2 py-1 rounded text-[8px]',
                  config.theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                )}
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {hasSkills && (
        <div className="p-3 border-t border-zinc-800/50">
          <p className="text-[9px] font-medium mb-2 text-zinc-400">Habilidades</p>
          <div className="flex flex-wrap gap-1">
            {SAMPLE_DATA.skills.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-[8px]"
                style={{
                  backgroundColor: accentColor + '20',
                  color: accentColor,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer branding */}
      {config.showKreoonBranding && (
        <div className="p-2 border-t border-zinc-800/50 text-center">
          <span className="text-[7px] text-zinc-600">Creado con Kreoon</span>
        </div>
      )}
    </div>
  );
}

export const TemplatePreview = memo(TemplatePreviewComponent);
