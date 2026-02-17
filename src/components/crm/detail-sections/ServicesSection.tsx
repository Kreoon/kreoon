import { Clock, Star } from 'lucide-react';
import { DetailSection } from '@/components/crm/DetailSection';

interface ServiceItem {
  id: string;
  title: string;
  service_type: string;
  price_type: string;
  price_amount: number | null;
  price_currency: string;
  delivery_days: number | null;
  is_featured: boolean;
}

interface ServicesSectionProps {
  services: ServiceItem[];
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ServicesSection({ services }: ServicesSectionProps) {
  if (services.length === 0) return null;

  return (
    <DetailSection title="Servicios">
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-white/70 font-medium truncate flex-1">
                {service.title}
              </p>
              {service.is_featured && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium shrink-0">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Destacado
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {service.service_type}
              </span>

              {service.price_amount != null && (
                <span className="text-xs text-white/60">
                  {formatPrice(service.price_amount, service.price_currency)}
                  {service.price_type === 'hourly' && '/hr'}
                </span>
              )}

              {service.delivery_days != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                  <Clock className="h-2.5 w-2.5" />
                  {service.delivery_days}d
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
