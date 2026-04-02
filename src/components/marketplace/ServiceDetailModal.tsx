import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Star,
  Clock,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorService } from '@/types/marketplace';
import { SERVICE_TYPE_ICONS, PRICE_TYPE_LABELS } from '@/types/marketplace';
import { useMarketplaceReviews } from '@/hooks/useMarketplaceReviews';

interface ServiceDetailModalProps {
  service: CreatorService | null;
  isOpen: boolean;
  onClose: () => void;
  onHire?: (service: CreatorService) => void;
}

export function ServiceDetailModal({
  service,
  isOpen,
  onClose,
  onHire,
}: ServiceDetailModalProps) {
  const [currentPortfolioIndex, setCurrentPortfolioIndex] = useState(0);

  // Get reviews for this service's user
  const { reviews, getStats } = useMarketplaceReviews({
    userId: service?.user_id,
    limit: 5,
  });

  if (!service) return null;

  const formatPrice = () => {
    if (service.price_type === 'custom' || !service.price_amount) {
      return 'A convenir';
    }
    const prefix = service.price_type === 'starting' ? 'Desde ' : '';
    const suffix = service.price_type === 'hourly' ? '/hora' : '';
    return `${prefix}$${service.price_amount} ${service.price_currency}${suffix}`;
  };

  const stats = getStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-lg bg-card border-border p-0 gap-0">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6">
            <DialogHeader>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-sm bg-background flex items-center justify-center text-3xl">
                  {SERVICE_TYPE_ICONS[service.service_type]}
                </div>
                <div>
                  <DialogTitle className="text-xl text-foreground text-left">
                    {service.title}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {PRICE_TYPE_LABELS[service.price_type]}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Portfolio carousel */}
            {service.portfolio_items.length > 0 && (
              <div className="mt-6 relative">
                <div className="aspect-video rounded-sm bg-background overflow-hidden">
                  {/* This would show actual portfolio items */}
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                {service.portfolio_items.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPortfolioIndex((i) => Math.max(0, i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                      disabled={currentPortfolioIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPortfolioIndex((i) =>
                          Math.min(service.portfolio_items.length - 1, i + 1)
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                      disabled={currentPortfolioIndex === service.portfolio_items.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {service.portfolio_items.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors",
                            i === currentPortfolioIndex
                              ? "bg-white"
                              : "bg-white/50"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
                <p className="text-xs text-center text-muted-foreground mt-2">
                  ← Desliza para ver ejemplos →
                </p>
              </div>
            )}

            {/* Description */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Descripción
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description || 'Sin descripción'}
              </p>
            </div>

            {/* Deliverables */}
            {service.deliverables.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Lo que incluye
                </h4>
                <ul className="space-y-2">
                  {service.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {d.quantity > 1 && (
                          <span className="font-medium text-foreground">
                            {d.quantity}x{' '}
                          </span>
                        )}
                        {d.item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {service.requirements && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Lo que necesito de ti
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.requirements}
                </p>
              </div>
            )}

            {/* Divider */}
            <hr className="my-6 border-border" />

            {/* Price and details */}
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">
                {formatPrice()}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {service.delivery_days && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {service.delivery_days} días
                  </span>
                )}
                {service.revisions_included > 0 && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4" />
                    {service.revisions_included} revisiones
                  </span>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <Button
              className="w-full mt-4 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              size="lg"
              onClick={() => onHire?.(service)}
            >
              Contratar este servicio
            </Button>

            {/* Reviews section */}
            {reviews.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-foreground">
                    Reviews de este servicio
                  </h4>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">
                      {stats.average}
                    </span>
                    <span className="text-muted-foreground">
                      ({stats.total} reviews)
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-3 w-3",
                                star <= review.overall_rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-muted-foreground">
                          — @{review.reviewer?.username || 'anónimo'}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        "{review.review_text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
