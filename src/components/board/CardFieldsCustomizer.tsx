import { useState, useMemo } from "react";
import { SlidersHorizontal, GripVertical, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BOARD_FIELDS_CONFIG, type BoardFieldKey } from "./boardFieldsConfig";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CardFieldsCustomizerProps {
  visibleFields: string[];
  onFieldsChange: (fields: string[]) => void;
  className?: string;
  /** Mostrar solo campos de tarjeta (no tabla) */
  cardFieldsOnly?: boolean;
}

// Campos disponibles para personalizar en tarjetas Kanban
const CARD_CUSTOMIZABLE_FIELDS: { key: BoardFieldKey; label: string; description?: string; category?: string }[] = [
  // === Información básica ===
  { key: "title", label: "Título", description: "Nombre del contenido", category: "Básico" },
  { key: "status", label: "Estado", description: "Badge de estado actual", category: "Básico" },
  { key: "thumbnail", label: "Miniatura", description: "Imagen de preview", category: "Básico" },
  { key: "client", label: "Cliente", description: "Nombre del cliente", category: "Básico" },

  // === Equipo ===
  { key: "creator", label: "Creador", description: "Usuario asignado como creador", category: "Equipo" },
  { key: "editor", label: "Editor", description: "Usuario asignado como editor", category: "Equipo" },
  { key: "responsible", label: "Responsable", description: "Creador y/o editor juntos", category: "Equipo" },

  // === Fechas ===
  { key: "deadline", label: "Fecha límite", description: "Fecha de entrega", category: "Fechas" },
  { key: "start_date", label: "Fecha inicio", description: "Fecha de inicio del proyecto", category: "Fechas" },
  { key: "created_at", label: "Creado", description: "Fecha de creación", category: "Fechas" },

  // === Campaña ===
  { key: "sphere_phase", label: "Fase de esfera", description: "Engage, Solution, etc.", category: "Campaña" },
  { key: "campaign_week", label: "Semana campaña", description: "Semana dentro de campaña", category: "Campaña" },
  { key: "marketing_status", label: "Estado MKT", description: "Aprobado/Rechazado MKT", category: "Campaña" },
  { key: "product", label: "Producto", description: "Producto asociado", category: "Campaña" },
  { key: "sales_angle", label: "Ángulo de ventas", description: "Estrategia de venta", category: "Campaña" },

  // === Indicadores ===
  { key: "progress", label: "Progreso", description: "Barra de progreso", category: "Indicadores" },
  { key: "indicators", label: "Indicadores", description: "Video, script, raw video", category: "Indicadores" },
  { key: "video", label: "Preview video", description: "Área de reproducción", category: "Indicadores" },
  { key: "points", label: "Puntos UP", description: "Sistema de puntos", category: "Indicadores" },
  { key: "views_count", label: "Vistas", description: "Contador de visualizaciones", category: "Indicadores" },

  // === Pagos ===
  { key: "creator_payment", label: "Pago creador", description: "Monto a pagar al creador", category: "Pagos" },
  { key: "editor_payment", label: "Pago editor", description: "Monto a pagar al editor", category: "Pagos" },
  { key: "payment_status", label: "Estado de pago", description: "Pagado/Pendiente", category: "Pagos" },
  { key: "invoiced", label: "Facturado", description: "Estado de facturación", category: "Pagos" },

  // === Extras ===
  { key: "tags", label: "Etiquetas", description: "Tags del contenido", category: "Extras" },
];

// Categorías con iconos de color
const CATEGORY_COLORS: Record<string, string> = {
  "Básico": "text-blue-400",
  "Equipo": "text-cyan-400",
  "Fechas": "text-amber-400",
  "Campaña": "text-purple-400",
  "Indicadores": "text-green-400",
  "Pagos": "text-emerald-400",
  "Extras": "text-zinc-400",
};

export function CardFieldsCustomizer({
  visibleFields,
  onFieldsChange,
  className,
  cardFieldsOnly = true,
  compact = false,
}: CardFieldsCustomizerProps & { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Básico", "Equipo"])
  );

  const toggleField = (fieldKey: string) => {
    if (visibleFields.includes(fieldKey)) {
      if (fieldKey === "title") return;
      onFieldsChange(visibleFields.filter((f) => f !== fieldKey));
    } else {
      onFieldsChange([...visibleFields, fieldKey]);
    }
  };

  const isFieldVisible = (fieldKey: string) => visibleFields.includes(fieldKey);

  // Agrupar campos por categoría
  const fieldsByCategory = useMemo(() => {
    const grouped: Record<string, typeof CARD_CUSTOMIZABLE_FIELDS> = {};
    CARD_CUSTOMIZABLE_FIELDS.forEach((field) => {
      const cat = field.category || "Otros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(field);
    });
    return grouped;
  }, []);

  const visibleCount = CARD_CUSTOMIZABLE_FIELDS.filter((f) =>
    visibleFields.includes(f.key)
  ).length;

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Presets rápidos
  const presets = {
    minimal: ["title", "status"],
    standard: ["title", "status", "client", "deadline", "creator", "progress"],
    full: ["title", "status", "client", "deadline", "creator", "editor", "sphere_phase", "campaign_week", "progress", "indicators"],
    payments: ["title", "status", "client", "creator_payment", "editor_payment", "payment_status", "invoiced"],
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-purple-500/20 text-zinc-400 hover:text-purple-400",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-zinc-900 border-purple-500/30"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h4 className="text-sm font-medium text-white">Personalizar tarjeta</h4>
            <span className="text-xs text-zinc-500">
              {visibleCount} campos
            </span>
          </div>

          {/* Presets rápidos */}
          <div className="flex flex-wrap gap-1 pb-2 border-b border-white/10">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-zinc-400 hover:text-white hover:bg-purple-500/20"
              onClick={() => onFieldsChange(presets.minimal)}
            >
              Mínimo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-zinc-400 hover:text-white hover:bg-purple-500/20"
              onClick={() => onFieldsChange(presets.standard)}
            >
              Estándar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-zinc-400 hover:text-white hover:bg-purple-500/20"
              onClick={() => onFieldsChange(presets.full)}
            >
              Completo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-6 px-2 text-emerald-400 hover:text-white hover:bg-emerald-500/20"
              onClick={() => onFieldsChange(presets.payments)}
            >
              💰 Pagos
            </Button>
          </div>

          {/* Campos agrupados por categoría */}
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {Object.entries(fieldsByCategory).map(([category, fields]) => {
              const isExpanded = expandedCategories.has(category);
              const categoryVisibleCount = fields.filter((f) =>
                visibleFields.includes(f.key)
              ).length;

              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-1.5 rounded hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className={cn("h-3 w-3", CATEGORY_COLORS[category])} />
                      ) : (
                        <ChevronRight className={cn("h-3 w-3", CATEGORY_COLORS[category])} />
                      )}
                      <span className={cn("text-xs font-medium", CATEGORY_COLORS[category])}>
                        {category}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {categoryVisibleCount}/{fields.length}
                    </span>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pl-4 space-y-0.5">
                    {fields.map((field) => {
                      const isVisible = isFieldVisible(field.key);
                      const isRequired = field.key === "title";

                      return (
                        <div
                          key={field.key}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md transition-colors cursor-pointer",
                            isVisible
                              ? "bg-purple-500/10 hover:bg-purple-500/20"
                              : "hover:bg-white/5",
                            isRequired && "opacity-70 cursor-not-allowed"
                          )}
                          onClick={() => !isRequired && toggleField(field.key)}
                        >
                          <Checkbox
                            checked={isVisible}
                            disabled={isRequired}
                            onCheckedChange={() => toggleField(field.key)}
                            className="h-3.5 w-3.5 border-purple-500/50 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <Label
                              className={cn(
                                "text-xs cursor-pointer",
                                isVisible ? "text-white" : "text-zinc-400"
                              )}
                            >
                              {field.label}
                            </Label>
                          </div>
                          {isVisible ? (
                            <Eye className="h-3 w-3 text-purple-400" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-zinc-600" />
                          )}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-white/10 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-400 hover:text-white h-7"
              onClick={() => {
                onFieldsChange(CARD_CUSTOMIZABLE_FIELDS.map((f) => f.key));
                setExpandedCategories(new Set(Object.keys(fieldsByCategory)));
              }}
            >
              Mostrar todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-400 hover:text-red-300 h-7"
              onClick={() => onFieldsChange(["title", "status"])}
            >
              Resetear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
