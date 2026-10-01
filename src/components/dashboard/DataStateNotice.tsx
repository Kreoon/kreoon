import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataStateNoticeProps {
  /** Mensaje de error de carga (null = sin error). */
  error: string | null;
  /** El hook devolvió una página completa: puede haber más resultados de los que se muestran. */
  truncated: boolean;
  /** Tamaño de página usado al cargar, para decir «primeros N». */
  pageSize: number;
  onRetry: () => void;
}

/**
 * Distingue «error al cargar» de «resultado truncado». El «cero real» y el «sin datos» los resuelve
 * cada pantalla con su estado vacío; aquí solo se avisa de lo que NO es un cero verdadero.
 */
export function DataStateNotice({ error, truncated, pageSize, onRetry }: DataStateNoticeProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 p-4"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-foreground">No pudimos cargar los videos.</p>
          <p className="text-muted-foreground">Las cifras de abajo pueden estar incompletas. Inténtalo de nuevo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} className="rounded-control">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  }
  if (truncated) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-card border border-border bg-accent px-4 py-3 text-sm text-accent-foreground"
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Mostrando los primeros {pageSize.toLocaleString()} videos: las cifras pueden estar subcontadas.
        </span>
      </div>
    );
  }
  return null;
}
