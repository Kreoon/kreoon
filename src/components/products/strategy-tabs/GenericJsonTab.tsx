import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

interface GenericJsonTabProps {
  data: any;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyHint?: string;
}

/**
 * Render genérico para JSON estructurado.
 * Usado por las 7 nuevas tabs del 360 (paid_ads, email_marketing, pricing_strategy,
 * kpis_dashboard, seo_strategy, partnerships, community_strategy).
 *
 * Renderiza recursivamente objetos y arrays con styling adecuado.
 */
export function GenericJsonTab({ data, emptyIcon, emptyTitle, emptyHint }: GenericJsonTabProps) {
  if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mb-3 flex justify-center">{emptyIcon}</div>
          <p className="text-muted-foreground">{emptyTitle}</p>
          {emptyHint && <p className="text-xs text-muted-foreground mt-2">{emptyHint}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <RenderNode data={data} level={0} />
    </div>
  );
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function RenderNode({ data, level }: { data: any; level: number }) {
  if (data === null || data === undefined) return null;

  // Primitivo
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return <span className="text-sm">{String(data)}</span>;
  }

  // Array
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-xs text-muted-foreground italic">vacío</span>;
    const allPrimitive = data.every(
      (item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean"
    );
    if (allPrimitive) {
      return (
        <ul className="list-disc list-inside text-sm space-y-1">
          {data.map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {data.map((item, i) => (
          <Card key={i} className="bg-muted/30">
            <CardContent className="pt-4 space-y-2">
              <RenderNode data={item} level={level + 1} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Objeto
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    return (
      <div className={level === 0 ? "space-y-4" : "space-y-2"}>
        {entries.map(([key, value]) => {
          if (value === null || value === undefined || value === "") return null;
          const isPrimitive =
            typeof value === "string" || typeof value === "number" || typeof value === "boolean";
          const isArray = Array.isArray(value);
          const HeadingTag: any = level === 0 ? "h3" : level === 1 ? "h4" : "h5";

          if (level === 0 && (typeof value === "object" || isArray)) {
            return (
              <Card key={key} className="border-violet-500/20">
                <CardContent className="pt-4">
                  <h3 className="text-base font-semibold mb-3 capitalize text-violet-700 dark:text-violet-400">
                    {humanize(key)}
                  </h3>
                  <RenderNode data={value} level={level + 1} />
                </CardContent>
              </Card>
            );
          }

          if (isPrimitive) {
            return (
              <div key={key} className="text-sm">
                <span className="text-xs font-medium text-muted-foreground">{humanize(key)}:</span>{" "}
                <span>{String(value)}</span>
              </div>
            );
          }

          return (
            <div key={key} className="space-y-1">
              <HeadingTag
                className={`font-semibold ${
                  level === 1 ? "text-sm text-foreground" : "text-xs text-muted-foreground uppercase tracking-wide"
                }`}
              >
                {humanize(key)}
              </HeadingTag>
              <div className={level >= 2 ? "ml-3" : ""}>
                <RenderNode data={value} level={level + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
