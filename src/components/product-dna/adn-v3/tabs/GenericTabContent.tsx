/**
 * GenericTabContent
 * Muestra contenido de forma genérica cuando la estructura no coincide
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "../ui/CopyButton";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GenericTabContentProps {
  data: Record<string, unknown>;
  title: string;
  icon?: React.ReactNode;
}

function RenderValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">-</span>;
  }

  if (typeof value === "string") {
    if (value.length > 300) {
      return (
        <div className="space-y-1">
          <p className="text-sm whitespace-pre-wrap">{expanded ? value : value.slice(0, 300) + "..."}</p>
          {value.length > 300 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
          <CopyButton text={value} size="sm" />
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2">
        <p className="text-sm">{value}</p>
        {value.length > 50 && <CopyButton text={value} size="sm" />}
      </div>
    );
  }

  if (typeof value === "number") {
    return <Badge variant="secondary">{value}</Badge>;
  }

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "outline"}>{value ? "Sí" : "No"}</Badge>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">Lista vacía</span>;

    // Si es array de strings simples
    if (value.every((v) => typeof v === "string" && v.length < 100)) {
      return (
        <ul className="space-y-1">
          {value.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-primary">•</span>
              <span>{String(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Array de objetos o strings largos
    return (
      <div className="space-y-2">
        {value.slice(0, expanded ? undefined : 3).map((item, idx) => (
          <div key={idx} className="p-2 rounded bg-muted/30 border">
            <RenderValue value={item} depth={depth + 1} />
          </div>
        ))}
        {value.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-primary hover:underline"
          >
            Ver {value.length - 3} más...
          </button>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => !k.startsWith("_")
    );

    if (entries.length === 0) return <span className="text-muted-foreground italic">Objeto vacío</span>;

    return (
      <div className="space-y-2">
        {entries.map(([key, val]) => (
          <div key={key} className="border-l-2 border-muted pl-3">
            <p className="text-xs font-medium text-muted-foreground capitalize mb-1">
              {key.replace(/_/g, " ")}
            </p>
            <RenderValue value={val} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export function GenericTabContent({ data, title, icon }: GenericTabContentProps) {
  const [showRaw, setShowRaw] = useState(false);

  // Filtrar campos internos
  const displayData = Object.fromEntries(
    Object.entries(data).filter(([k]) => !k.startsWith("_"))
  );

  // Extraer summary si existe
  const summary = data.summary as string | undefined;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {summary && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {icon || <FileText className="w-4 h-4" />}
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary}</p>
            <CopyButton text={summary} className="mt-2" />
          </CardContent>
        </Card>
      )}

      {/* Content Cards */}
      {Object.entries(displayData)
        .filter(([k]) => k !== "summary")
        .map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {key.replace(/_/g, " ")}
                </span>
                {Array.isArray(value) && (
                  <Badge variant="outline" className="text-xs">
                    {(value as unknown[]).length} items
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RenderValue value={value} />
            </CardContent>
          </Card>
        ))}

      {/* Raw Data Toggle */}
      <div className="pt-4 border-t">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {showRaw ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {showRaw ? "Ocultar" : "Ver"} datos JSON
        </button>
        {showRaw && (
          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
