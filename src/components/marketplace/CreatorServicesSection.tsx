import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Star, Clock, RefreshCw, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCreatorServices } from '@/hooks/useCreatorServices';
import { ServiceDetailModal } from './ServiceDetailModal';
import type { CreatorService, ServiceType } from '@/types/marketplace';
import { SERVICE_TYPE_ICONS, SERVICE_TYPE_LABELS, PRICE_TYPE_LABELS } from '@/types/marketplace';

interface CreatorServicesSectionProps {
  userId: string;
  isOwner?: boolean;
  onRequestCustom?: () => void;
}

export function CreatorServicesSection({
  userId,
  isOwner = false,
  onRequestCustom,
}: CreatorServicesSectionProps) {
  const { services, isLoading } = useCreatorServices({ userId, activeOnly: !isOwner });
  const [selectedService, setSelectedService] = useState<CreatorService | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-background rounded animate-pulse w-40" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-background rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (services.length === 0 && !isOwner) {
    return null;
  }

  const formatPrice = (service: CreatorService) => {
    if (service.price_type === 'custom' || !service.price_amount) {
      return 'A convenir';
    }
    const prefix = service.price_type === 'starting' ? 'Desde ' : '';
    const suffix = service.price_type === 'hourly' ? '/hora' : '';
    return `${prefix}$${service.price_amount} ${service.price_currency}${suffix}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Servicios que ofrezco
        </h3>
        {isOwner && (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar servicio
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedService(service)}
              className={cn(
                "relative p-4 rounded-sm border cursor-pointer transition-all duration-200",
                "bg-card border-border",
                "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                "group"
              )}
            >
              {/* Featured badge */}
              {service.is_featured && (
                <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  DESTACADO
                </div>
              )}

              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-sm bg-background flex items-center justify-center text-2xl">
                  {SERVICE_TYPE_ICONS[service.service_type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {service.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {service.description || SERVICE_TYPE_LABELS[service.service_type]}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  {/* Deliverables preview */}
                  {service.deliverables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {service.deliverables.slice(0, 3).map((d, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full bg-background text-muted-foreground"
                        >
                          {d.quantity > 1 ? `${d.quantity}x ` : ''}{d.item}
                        </span>
                      ))}
                      {service.deliverables.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-background text-muted-foreground">
                          +{service.deliverables.length - 3} más
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer info */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {service.delivery_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {service.delivery_days} días
                        </span>
                      )}
                      {service.revisions_included > 0 && (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3.5 w-3.5" />
                          {service.revisions_included} revisión{service.revisions_included > 1 ? 'es' : ''}
                        </span>
                      )}
                      {service.avg_rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {service.avg_rating}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatPrice(service)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state for owner */}
        {services.length === 0 && isOwner && (
          <div className="text-center py-8 px-4 rounded-sm border border-dashed border-border">
            <p className="text-muted-foreground mb-3">
              Aún no has agregado servicios
            </p>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar tu primer servicio
            </Button>
          </div>
        )}

        {/* Custom service request */}
        {!isOwner && services.length > 0 && onRequestCustom && (
          <button
            onClick={onRequestCustom}
            className={cn(
              "w-full p-4 rounded-sm border border-dashed",
              "border-border hover:border-primary/50",
              "text-muted-foreground hover:text-foreground",
              "transition-all duration-200 text-center"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Solicitar servicio personalizado
            </span>
          </button>
        )}
      </div>

      {/* Service Detail Modal */}
      <ServiceDetailModal
        service={selectedService}
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
      />
    </div>
  );
}
