import { Monitor, Smartphone, Eye, Save, Send, Loader2 } from "lucide-react";
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
}

export function TopToolbarV2({
  statusLabel,
  isSaving,
  device,
  onDeviceChange,
  onSave,
  onPreview,
  onPublish,
}: TopToolbarV2Props) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {/* Estado de guardado */}
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <span className="truncate">{statusLabel}</span>
      </div>

      {/* Selector de dispositivo */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onPreview}>
          <Eye className="mr-1.5 h-4 w-4" />
          Vista previa
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="mr-1.5 h-4 w-4" />
          Guardar
        </Button>
        <Button size="sm" onClick={onPublish}>
          <Send className="mr-1.5 h-4 w-4" />
          Publicar
        </Button>
      </div>
    </header>
  );
}
