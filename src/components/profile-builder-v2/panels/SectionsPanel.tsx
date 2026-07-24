import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderSection } from "../types";

interface SectionsPanelProps {
  sections: BuilderSection[];
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  onToggleVisibility: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onDelete: (blockId: string) => void;
}

export function SectionsPanel({
  sections,
  selectedBlockId,
  onSelect,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SectionsPanelProps) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aun no hay secciones. Aplica una plantilla para comenzar.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {sections.map((section, index) => {
        const isSelected = section.blockId === selectedBlockId;
        return (
          <li
            key={section.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/40",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(section.blockId)}
              className="flex min-w-0 flex-1 flex-col items-start text-left"
            >
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  !section.isVisible && "text-muted-foreground line-through",
                )}
              >
                {section.label}
              </span>
              {section.isRequired && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" />
                  Fija
                </span>
              )}
            </button>

            <div className="flex items-center gap-0.5">
              <IconButton
                label={section.isVisible ? "Ocultar" : "Mostrar"}
                onClick={() => onToggleVisibility(section.blockId)}
              >
                {section.isVisible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </IconButton>
              <IconButton
                label="Subir"
                disabled={index === 0}
                onClick={() => onMoveUp(section.blockId)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                label="Bajar"
                disabled={index === sections.length - 1}
                onClick={() => onMoveDown(section.blockId)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </IconButton>
              {section.isDeletable && (
                <IconButton
                  label="Eliminar"
                  destructive
                  onClick={() => onDelete(section.blockId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
