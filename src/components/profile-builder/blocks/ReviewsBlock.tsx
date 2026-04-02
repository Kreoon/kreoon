import { memo, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BlockProps } from '../types/profile-builder';

interface ReviewItem {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  text: string;
  date?: string;
}

interface ReviewsConfig {
  layout: 'carousel' | 'grid';
  maxItems: number;
}

interface ReviewsContent {
  title?: string;
  items?: ReviewItem[];
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: '1',
    author: 'Maria Garcia',
    rating: 5,
    text: 'Excelente trabajo! El contenido supero todas nuestras expectativas. Muy profesional y puntual.',
    date: 'Enero 2025',
  },
  {
    id: '2',
    author: 'Carlos Lopez',
    rating: 5,
    text: 'El mejor creador de contenido con quien he trabajado. Entiende perfectamente la vision de la marca.',
    date: 'Febrero 2025',
  },
  {
    id: '3',
    author: 'Ana Rodriguez',
    rating: 4,
    text: 'Gran calidad de produccion y muy buena comunicacion durante todo el proceso.',
    date: 'Marzo 2025',
  },
];

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

function StarRating({
  rating,
  editable = false,
  onChange,
}: {
  rating: number;
  editable?: boolean;
  onChange?: (val: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!editable}
          onClick={() => editable && onChange?.(star)}
          className={cn(
            'transition-colors',
            editable ? 'cursor-pointer hover:scale-110' : 'cursor-default',
          )}
          aria-label={editable ? `Calificacion ${star} de 5` : undefined}
        >
          <Star
            className={cn(
              'h-4 w-4',
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as ReviewsConfig;
  const content = block.content as ReviewsContent;
  const styles = block.styles;
  const allItems = content.items || DEFAULT_REVIEWS;
  const maxItems = config.maxItems || 5;
  const items = allItems.slice(0, maxItems);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleContentUpdate = (updates: Partial<ReviewsContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateItem = (id: string, updates: Partial<ReviewItem>) => {
    const newItems = allItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    handleContentUpdate({ items: newItems });
  };

  const handleAddItem = () => {
    const newItem: ReviewItem = {
      id: crypto.randomUUID(),
      author: 'Nuevo cliente',
      rating: 5,
      text: 'Excelente trabajo y muy profesional.',
      date: new Date().getFullYear().toString(),
    };
    handleContentUpdate({ items: [...allItems, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    handleContentUpdate({ items: allItems.filter((item) => item.id !== id) });
  };

  return (
    <div
      className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}
      style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}
    >
      {/* Titulo */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Lo que dicen de mi"
          className="text-xl md:text-2xl font-bold text-foreground bg-transparent border-none w-full mb-6 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        />
      ) : (
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
          {content.title || 'Lo que dicen de mi'}
        </h2>
      )}

      {/* Grid layout */}
      {(config.layout === 'grid' || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((review) => (
            <div
              key={review.id}
              className="relative bg-card/50 rounded-lg border border-border/50 p-5 flex flex-col gap-3"
            >
              <StarRating
                rating={review.rating}
                editable={isEditing && isSelected}
                onChange={(val) => handleUpdateItem(review.id, { rating: val })}
              />

              {isEditing && isSelected ? (
                <Textarea
                  value={review.text}
                  onChange={(e) => handleUpdateItem(review.id, { text: e.target.value })}
                  placeholder="Texto de la resena"
                  className="text-sm text-muted-foreground bg-transparent border-border/50 resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  "{review.text}"
                </p>
              )}

              <div className="flex items-center gap-3 mt-auto">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt={review.author}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {review.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  {isEditing && isSelected ? (
                    <Input
                      value={review.author}
                      onChange={(e) => handleUpdateItem(review.id, { author: e.target.value })}
                      placeholder="Nombre del cliente"
                      className="text-sm font-medium bg-transparent border-border/50 h-6 p-1"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground truncate">{review.author}</p>
                  )}
                  {isEditing && isSelected ? (
                    <Input
                      value={review.date || ''}
                      onChange={(e) => handleUpdateItem(review.id, { date: e.target.value })}
                      placeholder="Fecha (ej: Enero 2025)"
                      className="text-xs bg-transparent border-border/50 h-5 p-1 mt-0.5"
                    />
                  ) : review.date ? (
                    <p className="text-xs text-muted-foreground">{review.date}</p>
                  ) : null}
                </div>
              </div>

              {isEditing && isSelected && (
                <button
                  onClick={() => handleRemoveItem(review.id)}
                  className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Eliminar resena de ${review.author}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Carousel layout (solo en preview) */}
      {config.layout === 'carousel' && !isEditing && items.length > 0 && (
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {items.map((review) => (
                <div key={review.id} className="w-full flex-shrink-0 px-2">
                  <div className="bg-card/50 rounded-lg border border-border/50 p-6 flex flex-col gap-4 max-w-2xl mx-auto">
                    <StarRating rating={review.rating} />
                    <p className="text-muted-foreground leading-relaxed text-center">
                      "{review.text}"
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {review.avatar ? (
                        <img
                          src={review.avatar}
                          alt={review.author}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {review.author.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{review.author}</p>
                        {review.date && (
                          <p className="text-xs text-muted-foreground">{review.date}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {items.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                  aria-label={`Ir a resena ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isEditing && isSelected && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddItem}
          className="mt-4 gap-1"
        >
          <Plus className="h-4 w-4" />
          Agregar resena
        </Button>
      )}
    </div>
  );
}

export const ReviewsBlock = memo(ReviewsBlockComponent);
