import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, LayoutTemplate, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdTemplates } from '../hooks/useAdTemplates';
import { TEMPLATE_CATEGORIES } from '../config';
import type { AdTemplate, TemplateCategory } from '../types/ad-generator.types';

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: string;
  onSelect: (template: AdTemplate | null) => void;
}

export function TemplateGallery({ open, onOpenChange, selectedId, onSelect }: TemplateGalleryProps) {
  const [category, setCategory] = useState<TemplateCategory>('all');
  const { templates, isLoading } = useAdTemplates(category);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seleccionar Plantilla</SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-1.5 mt-4 mb-4">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={category === cat.value ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay plantillas en esta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* "Sin plantilla" option */}
            <button
              onClick={() => { onSelect(null); onOpenChange(false); }}
              className={cn(
                "rounded-sm border-2 p-3 text-center transition-colors",
                !selectedId ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs font-medium">Sin plantilla</p>
            </button>

            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => { onSelect(tmpl); onOpenChange(false); }}
                className={cn(
                  "relative rounded-sm border-2 overflow-hidden transition-colors",
                  selectedId === tmpl.id ? "border-primary" : "border-border hover:border-primary/40",
                )}
              >
                {tmpl.thumbnail_url ? (
                  <img
                    src={tmpl.thumbnail_url}
                    alt={tmpl.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted/30 flex items-center justify-center">
                    <LayoutTemplate className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{tmpl.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{tmpl.category}</p>
                </div>
                {selectedId === tmpl.id && (
                  <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
