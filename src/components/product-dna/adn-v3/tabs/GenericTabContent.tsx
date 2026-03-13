/**
 * GenericTabContent
 * Muestra contenido de forma genérica pero atractiva cuando la estructura no coincide
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "../ui/CopyButton";
import { FileText, ChevronDown, ChevronRight, Sparkles, List, Hash, Type, ToggleLeft, Layers } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Colores para diferentes niveles de profundidad
const depthColors = [
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-green-500",
  "border-l-orange-500",
  "border-l-pink-500",
];

interface GenericTabContentProps {
  data: Record<string, unknown>;
  title: string;
  icon?: React.ReactNode;
}

function RenderValue({ value, depth = 0, keyName = "" }: { value: unknown; depth?: number; keyName?: string }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const borderColor = depthColors[depth % depthColors.length];

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic text-sm">No disponible</span>;
  }

  if (typeof value === "string") {
    // Detectar si es un texto largo (posiblemente copy/descripción)
    const isLongText = value.length > 150;
    const isVeryLong = value.length > 300;

    if (isVeryLong) {
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {expanded ? value : value.slice(0, 300) + "..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? "Ver menos" : `Ver todo (${value.length} caracteres)`}
            </button>
            <CopyButton text={value} size="sm" />
          </div>
        </div>
      );
    }

    if (isLongText) {
      return (
        <div className="p-3 rounded-lg bg-muted/20 border">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{value}</p>
          <CopyButton text={value} size="sm" className="mt-2" />
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2">
        <Type className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
        <p className="text-sm">{value}</p>
        {value.length > 50 && <CopyButton text={value} size="sm" />}
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div className="flex items-center gap-2">
        <Hash className="w-3 h-3 text-blue-400" />
        <Badge variant="secondary" className="font-mono">{value}</Badge>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <ToggleLeft className="w-3 h-3 text-muted-foreground" />
        <Badge variant={value ? "default" : "outline"} className={value ? "bg-green-500/20 text-green-400" : ""}>
          {value ? "Sí" : "No"}
        </Badge>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic text-sm">Lista vacía</span>;
    }

    // Si es array de strings simples y cortos, mostrar como badges/pills
    if (value.every((v) => typeof v === "string" && v.length < 60)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs font-normal">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    // Si es array de strings medianos, mostrar como lista con bullets
    if (value.every((v) => typeof v === "string" && v.length < 200)) {
      return (
        <ul className="space-y-1.5">
          {value.slice(0, expanded ? undefined : 5).map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="leading-relaxed">{String(item)}</span>
            </li>
          ))}
          {value.length > 5 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:underline flex items-center gap-1 ml-3.5"
            >
              <List className="w-3 h-3" />
              Ver {value.length - 5} elementos más
            </button>
          )}
        </ul>
      );
    }

    // Array de objetos o strings largos
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Layers className="w-3 h-3" />
          <span>{value.length} elementos</span>
        </div>
        {value.slice(0, expanded ? undefined : 3).map((item, idx) => (
          <div key={idx} className={cn("p-3 rounded-lg bg-muted/20 border-l-2", borderColor)}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                #{idx + 1}
              </Badge>
            </div>
            <RenderValue value={item} depth={depth + 1} />
          </div>
        ))}
        {value.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ChevronRight className="w-3 h-3" />
            Ver {value.length - 3} elementos más
          </button>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => !k.startsWith("_")
    );

    if (entries.length === 0) {
      return <span className="text-muted-foreground italic text-sm">Objeto vacío</span>;
    }

    return (
      <div className="space-y-3">
        {entries.map(([key, val]) => {
          const formattedKey = key.replace(/_/g, " ");
          return (
            <div key={key} className={cn("border-l-2 pl-3 py-1", borderColor)}>
              <p className="text-xs font-semibold text-muted-foreground capitalize mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {formattedKey}
              </p>
              <RenderValue value={val} depth={depth + 1} keyName={key} />
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="text-sm">{String(value)}</span>;
}

export function GenericTabContent({ data, title, icon }: GenericTabContentProps) {
  const [showRaw, setShowRaw] = useState(false);

  // Filtrar campos internos
  const displayData = Object.fromEntries(
    Object.entries(data).filter(([k]) => !k.startsWith("_"))
  );

  // Extraer summary si existe
  const summary = data.summary as string | undefined;

  // Contar total de campos para mostrar
  const totalFields = Object.keys(displayData).filter(k => k !== "summary").length;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            {icon || <Sparkles className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{totalFields} secciones de datos</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm leading-relaxed">{summary}</p>
                <CopyButton text={summary} className="mt-3" size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Cards */}
      <div className="grid gap-4">
        {Object.entries(displayData)
          .filter(([k]) => k !== "summary")
          .map(([key, value], idx) => {
            const formattedKey = key.replace(/_/g, " ");
            const isArray = Array.isArray(value);
            const isObject = typeof value === "object" && !isArray && value !== null;
            const colorClass = depthColors[idx % depthColors.length];

            return (
              <Card key={key} className={cn("overflow-hidden border-l-4", colorClass)}>
                <CardHeader className="pb-3 bg-muted/20">
                  <CardTitle className="text-sm capitalize flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {isArray ? (
                        <Layers className="w-4 h-4 text-muted-foreground" />
                      ) : isObject ? (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Type className="w-4 h-4 text-muted-foreground" />
                      )}
                      {formattedKey}
                    </span>
                    {isArray && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {(value as unknown[]).length} elementos
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <RenderValue value={value} keyName={key} />
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Raw Data Toggle */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showRaw ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{showRaw ? "Ocultar" : "Ver"} datos JSON originales</span>
          </button>
        </CardHeader>
        {showRaw && (
          <CardContent>
            <div className="relative">
              <pre className="p-4 bg-muted/50 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                {JSON.stringify(data, null, 2)}
              </pre>
              <CopyButton
                text={JSON.stringify(data, null, 2)}
                className="absolute top-2 right-2"
                size="sm"
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
