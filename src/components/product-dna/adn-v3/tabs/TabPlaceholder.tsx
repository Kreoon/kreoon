/**
 * TabPlaceholder
 * Componente que renderiza datos de cualquier estructura de forma amigable
 */

import { FileText } from "lucide-react";
import { GenericTabContent } from "./GenericTabContent";

interface TabPlaceholderProps {
  tabName: string;
  data: unknown;
}

export function TabPlaceholder({ tabName, data }: TabPlaceholderProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin datos disponibles</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta sección aún no tiene contenido generado. Ejecuta el análisis
          completo para obtener resultados.
        </p>
      </div>
    );
  }

  // Usar GenericTabContent para renderizar cualquier estructura
  return (
    <GenericTabContent
      data={data as Record<string, unknown>}
      title={tabName}
      icon={<FileText className="w-4 h-4" />}
    />
  );
}
