import { memo, useState } from 'react';
import { Play, TrendingUp, Eye, Heart, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BlockProps } from '../types/profile-builder';

interface CaseStudyItem {
  id: string;
  title: string;
  client: string;
  clientLogo?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType: 'image' | 'video';
  metrics: {
    views?: string;
    engagement?: string;
    roi?: string;
  };
  testimonial?: string;
}

interface CaseStudyConfig {
  layout: 'carousel' | 'grid';
  showMetrics: boolean;
  showTestimonials: boolean;
  autoplay: boolean;
  autoplayInterval: number;
}

interface CaseStudyContent {
  items?: CaseStudyItem[];
}

function CaseStudyBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as CaseStudyConfig;
  const content = block.content as CaseStudyContent;
  const styles = block.styles;
  const items = content.items || [];
  const [activeIndex, setActiveIndex] = useState(0);

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const handleAddItem = () => {
    const newItem: CaseStudyItem = {
      id: crypto.randomUUID(),
      title: 'Nuevo caso de exito',
      client: '',
      mediaUrl: '',
      mediaType: 'image',
      metrics: {},
    };
    onUpdate({
      content: {
        ...content,
        items: [...items, newItem],
      },
    });
  };

  const handleRemoveItem = (id: string) => {
    onUpdate({
      content: {
        ...content,
        items: items.filter(item => item.id !== id),
      },
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<CaseStudyItem>) => {
    onUpdate({
      content: {
        ...content,
        items: items.map(item => item.id === id ? { ...item, ...updates } : item),
      },
    });
  };

  const goNext = () => setActiveIndex(prev => (prev + 1) % items.length);
  const goPrev = () => setActiveIndex(prev => prev === 0 ? items.length - 1 : prev - 1);

  const renderCaseStudyCard = (item: CaseStudyItem, index: number) => (
    <div
      key={item.id}
      className={cn(
        'relative rounded-xl overflow-hidden bg-card border border-border',
        'group transition-all',
        config.layout === 'carousel' && index !== activeIndex && 'hidden',
      )}
    >
      {/* Media - Vertical 9:16 */}
      <div className="relative aspect-[9/16] bg-muted">
        {item.mediaUrl ? (
          <>
            <img
              src={item.thumbnailUrl || item.mediaUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            {item.mediaType === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-8 w-8 text-white fill-white ml-1" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Plus className="h-12 w-12" />
          </div>
        )}

        {/* Metrics Overlay */}
        {config.showMetrics && (item.metrics.views || item.metrics.engagement || item.metrics.roi) && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="flex items-center justify-center gap-4 text-white">
              {item.metrics.views && (
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.metrics.views}</span>
                </div>
              )}
              {item.metrics.engagement && (
                <div className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.metrics.engagement}</span>
                </div>
              )}
              {item.metrics.roi && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.metrics.roi}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client badge */}
        {item.client && (
          <div className="absolute top-3 left-3">
            <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="text-xs font-medium text-white">{item.client}</span>
            </div>
          </div>
        )}

        {/* Edit/Delete buttons */}
        {isEditing && isSelected && (
          <div className="absolute top-3 right-3">
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRemoveItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-4 space-y-3">
        {isEditing && isSelected ? (
          <>
            <Input
              value={item.title}
              onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
              placeholder="Titulo del caso"
              className="font-semibold"
            />
            <Input
              value={item.client}
              onChange={(e) => handleUpdateItem(item.id, { client: e.target.value })}
              placeholder="Nombre del cliente"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={item.metrics.views || ''}
                onChange={(e) => handleUpdateItem(item.id, {
                  metrics: { ...item.metrics, views: e.target.value }
                })}
                placeholder="Views"
              />
              <Input
                value={item.metrics.engagement || ''}
                onChange={(e) => handleUpdateItem(item.id, {
                  metrics: { ...item.metrics, engagement: e.target.value }
                })}
                placeholder="Eng %"
              />
              <Input
                value={item.metrics.roi || ''}
                onChange={(e) => handleUpdateItem(item.id, {
                  metrics: { ...item.metrics, roi: e.target.value }
                })}
                placeholder="ROI"
              />
            </div>
            {config.showTestimonials && (
              <Textarea
                value={item.testimonial || ''}
                onChange={(e) => handleUpdateItem(item.id, { testimonial: e.target.value })}
                placeholder="Testimonio del cliente..."
                rows={2}
              />
            )}
          </>
        ) : (
          <>
            <h3 className="font-semibold text-foreground">{item.title}</h3>
            {config.showTestimonials && item.testimonial && (
              <p className="text-sm text-muted-foreground italic">"{item.testimonial}"</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(paddingClasses[styles.padding || 'md'])}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Casos de Exito</h2>
        {isEditing && isSelected && (
          <Button variant="outline" size="sm" onClick={handleAddItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>

      {items.length > 0 ? (
        <>
          {config.layout === 'carousel' ? (
            <div className="relative">
              {/* Carousel container */}
              <div className="max-w-sm mx-auto">
                {items.map((item, index) => renderCaseStudyCard(item, index))}
              </div>

              {/* Navigation */}
              {items.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-10 w-10 rounded-full"
                    onClick={goNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  {/* Dots */}
                  <div className="flex justify-center gap-2 mt-4">
                    {items.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          'w-2 h-2 rounded-full transition-all',
                          index === activeIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30',
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Grid layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item, index) => renderCaseStudyCard(item, index))}
            </div>
          )}
        </>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Muestra tus mejores resultados con clientes
          </p>
          {isEditing && isSelected && (
            <Button variant="outline" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar caso de exito
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export const CaseStudyBlock = memo(CaseStudyBlockComponent);
