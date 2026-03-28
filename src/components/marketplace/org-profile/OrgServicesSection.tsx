import { Star } from 'lucide-react';
import type { OrgService } from '../types/marketplace';

interface OrgServicesSectionProps {
  services: OrgService[];
  accentColor: string;
}

export function OrgServicesSection({ services, accentColor }: OrgServicesSectionProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Esta organización aún no ha publicado sus servicios</p>
      </div>
    );
  }

  const featured = services.filter(s => s.is_featured);
  const others = services.filter(s => !s.is_featured);

  return (
    <div className="space-y-6">
      {featured.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="h-4 w-4" style={{ color: accentColor }} />
            Servicios Destacados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.map(service => (
              <ServiceCard key={service.id} service={service} accentColor={accentColor} featured />
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Todos los Servicios</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {others.map(service => (
              <ServiceCard key={service.id} service={service} accentColor={accentColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, accentColor, featured }: { service: OrgService; accentColor: string; featured?: boolean }) {
  return (
    <div className={`p-4 rounded-sm border ${featured ? 'border-purple-500/20 bg-purple-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{service.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{service.title}</h3>
          {service.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-3">{service.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
