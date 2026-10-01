import { ArrowLeft, Monitor, Smartphone, Eye, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DevicePreview } from "./types";

interface TopToolbarV2Props {
  statusLabel: string;
  isSaving: boolean;
  device: DevicePreview;
  onDeviceChange: (device: DevicePreview) => void;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onExit: () => void;
}

export function TopToolbarV2({
  statusLabel,
  isSaving,
  device,
  onDeviceChange,
  onSave,
  onPreview,
  onPublish,
  onExit,
}: TopToolbarV2Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 sm:px-4">
      {/* Salir + estado de guardado */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onExit}
          aria-label="Salir del editor"
          title="Salir del editor"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
          <span className="truncate">{statusLabel}</span>
        </div>
      </div>

      {/* Selector de dispositivo (en el teléfono el lienzo ya es móvil) */}
      <div className="hidden items-center gap-1 rounded-lg border border-border bg-background p-1 sm:flex">
        <button
          type="button"
          onClick={() => onDeviceChange("desktop")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            device === "desktop"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Vista escritorio"
          aria-pressed={device === "desktop"}
        >
          <Monitor className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDeviceChange("mobile")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            device === "mobile"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Vista movil"
          aria-pressed={device === "mobile"}
        >
          <Smartphone className="h-4 w-4" />
        </button>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreview}
          aria-label="Vista previa"
          className="px-2 sm:px-3"
        >
          <Eye className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Vista previa</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          aria-label="Guardar"
          className="hidden px-2 sm:inline-flex sm:px-3"
        >
          <Save className="h-4 w-4 sm:mr-1.5" />
          Guardar
        </Button>
        <Button size="sm" onClick={onPublish} className="px-3">
          <Send className="mr-1.5 h-4 w-4" />
          Publicar
        </Button>
      </div>
    </header>
  );
}
