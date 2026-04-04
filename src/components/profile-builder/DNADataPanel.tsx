/**
 * DNADataPanel.tsx
 * Panel para visualizar y copiar datos del ADN de Talento en el Profile Builder
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dna,
  Copy,
  Check,
  ChevronRight,
  User,
  Target,
  Palette,
  Workflow,
  Globe,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDNAForBuilder } from './hooks/useDNAForBuilder';

// ─── Iconos por categoria ────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, typeof User> = {
  identity: User,
  specialization: Target,
  style: Palette,
  process: Workflow,
  platforms: Globe,
};

// ─── Componente de item copiable ─────────────────────────────────────────────

interface CopyableItemProps {
  label: string;
  value: unknown;
  preview: string;
}

function CopyableItem({ label, value, preview }: CopyableItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const textToCopy = Array.isArray(value)
        ? value.join(', ')
        : String(value);

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Copiado al portapapeles');

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  if (!preview) return null;

  return (
    <div className="group flex items-start gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-xs text-foreground line-clamp-2">{preview}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
          copied && 'opacity-100'
        )}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

// ─── Estado vacio (sin ADN) ──────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
        <Dna className="h-6 w-6 text-purple-400" />
      </div>
      <h3 className="text-sm font-medium mb-1">Sin ADN de Talento</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
        Genera tu ADN para usar tus datos como contenido predeterminado en los bloques
      </p>
      <Button asChild size="sm" className="gap-1.5">
        <Link to="/settings?section=profile&tab=talent-dna">
          <Sparkles className="h-3.5 w-3.5" />
          Generar ADN
          <ExternalLink className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

// ─── Estado de carga ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function DNADataPanel() {
  const { hasDNA, loading, generatedAt, categories, getCategoryData } =
    useDNAForBuilder();

  if (loading) {
    return <LoadingState />;
  }

  if (!hasDNA) {
    return <EmptyState />;
  }

  // Formatear fecha de generacion
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Dna className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Tu ADN de Talento</p>
            {formattedDate && (
              <p className="text-[10px] text-muted-foreground">
                Generado el {formattedDate}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Activo
          </Badge>
        </div>

        {/* Tip de uso */}
        <div className="bg-muted/50 rounded-md p-2 text-[10px] text-muted-foreground">
          <p className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400 flex-shrink-0" />
            <span>
              Selecciona un bloque para ver sugerencias de tu ADN en el panel derecho
            </span>
          </p>
        </div>

        {/* Acordeon de categorias */}
        <Accordion type="multiple" defaultValue={['identity']} className="space-y-1">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.id] || ChevronRight;
            const categoryData = getCategoryData(category.id);

            // No mostrar categorias vacias
            if (categoryData.length === 0) return null;

            return (
              <AccordionItem
                key={category.id}
                value={category.id}
                className="border rounded-md px-2 data-[state=open]:bg-muted/30"
              >
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{category.label}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 ml-auto"
                    >
                      {categoryData.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-0.5">
                    {categoryData.map((item) => (
                      <CopyableItem
                        key={item.path}
                        label={item.label}
                        value={item.value}
                        preview={item.preview}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Link a configuracion */}
        <div className="pt-2 border-t">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            <Link to="/settings?section=profile&tab=talent-dna">
              <Dna className="h-3.5 w-3.5 mr-2" />
              Ver o regenerar ADN
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
