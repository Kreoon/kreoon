import { ArrowLeft, Lock, Plus } from "lucide-react";
import {
  getBlocksByCategory,
  type BlockCategory,
  type BlockType,
  type ProfileBlock,
} from "@/components/profile-builder/types/profile-builder";
import { useCreatorPlanFeatures } from "@/hooks/useCreatorPlanFeatures";
import { cn } from "@/lib/utils";

/**
 * Lista de tipos de sección para añadir TOCANDO (sin arrastrar).
 *
 * Fuera de esta lista:
 * - `layout` (columnas/contenedores): V2 aún no permite añadir hijos dentro de un contenedor.
 * - Contacto directo, redes y WhatsApp: regla de fase «portafolio público sin datos de contacto»
 *   (docs/hermes/enlace-profesional/restriccion-contacto.md).
 */
const HIDDEN_TYPES: BlockType[] = ["contact", "social_links", "whatsapp_button"];

const CATEGORIES: Array<{ id: BlockCategory; label: string }> = [
  { id: "core", label: "Perfil" },
  { id: "content", label: "Contenido" },
  { id: "media", label: "Multimedia" },
  { id: "conversion", label: "Conversión" },
];

interface AddSectionPanelProps {
  blocks: ProfileBlock[];
  onAdd: (type: BlockType) => void;
  onBack: () => void;
}

export function AddSectionPanel({ blocks, onAdd, onBack }: AddSectionPanelProps) {
  const { canUseBlock } = useCreatorPlanFeatures();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a las secciones
      </button>

      {CATEGORIES.map((category) => {
        const definitions = getBlocksByCategory(category.id).filter(
          (definition) => !HIDDEN_TYPES.includes(definition.type),
        );
        if (definitions.length === 0) return null;

        return (
          <div key={category.id} className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </p>
            <ul className="space-y-1.5">
              {definitions.map((definition) => {
                const count = blocks.filter((b) => b.type === definition.type).length;
                const atLimit = definition.maxInstances > 0 && count >= definition.maxInstances;
                const locked = !canUseBlock(definition.type);
                const disabled = atLimit || locked;

                return (
                  <li key={definition.type}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAdd(definition.type)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                        disabled
                          ? "cursor-not-allowed border-border opacity-50"
                          : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {definition.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {locked
                            ? "Requiere un plan superior"
                            : atLimit
                              ? "Ya está en tu perfil"
                              : definition.description}
                        </span>
                      </span>
                      {locked ? (
                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
