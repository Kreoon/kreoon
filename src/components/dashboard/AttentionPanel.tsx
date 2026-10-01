import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { StatTile, type StatTone } from "./StatTile";

export interface AttentionItem {
  key: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone: StatTone;
  onClick?: () => void;
}

/**
 * Bloque principal de «Inicio»: lo que pide acción primero (parados, esperando al cliente, entregas).
 * Las tarjetas son las únicas superficies: el panel solo aporta título, sin caja anidada.
 */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="atencion-titulo">
      <h2 id="atencion-titulo" className="mb-3 text-base font-semibold text-foreground">
        Requiere tu atención
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {items.map(({ key, ...item }) => (
          <StatTile key={key} size="hero" {...item} />
        ))}
      </div>
    </section>
  );
}
