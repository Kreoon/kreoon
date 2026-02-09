import {
  Video, Package, Star, Smartphone, MessageSquare, BookOpen,
  PlayCircle, Camera, type LucideIcon,
} from 'lucide-react';
import type { CreatorService } from '../types/marketplace';

const ICON_MAP: Record<string, LucideIcon> = {
  Video,
  Package,
  Star,
  Smartphone,
  MessageSquare,
  BookOpen,
  PlayCircle,
  Camera,
};

interface ServicesSectionProps {
  services: CreatorService[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  if (services.length === 0) return null;

  return (
    <div className="pb-8 border-b border-white/10 space-y-4">
      <h2 className="text-xl font-semibold text-white">Lo que puedo crear para tu marca</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {services.map(service => {
          const Icon = ICON_MAP[service.icon] || Video;
          return (
            <div
              key={service.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-purple-500/30 transition-all"
            >
              <Icon className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-white font-semibold text-sm mb-2">{service.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{service.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
