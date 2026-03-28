import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText, Video, BarChart3, Brain, Palette, Calendar,
  X, ExternalLink, Copy, Check, Sparkles
} from "lucide-react";
import { ScriptViewer } from "@/components/content/ScriptViewer";
import { RichTextViewer } from "./RichTextViewer";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { NovaCard, NovaCardContent, NovaCardHeader, NovaCardTitle, NovaButton } from "@/components/ui/nova";

interface ContentItem {
  id: string;
  title: string;
  client?: { name: string; logo_url?: string | null } | null;
  product?: { name: string } | null;
  status: string;
  created_at: string;
  script?: string | null;
  editor_guidelines?: string | null;
  strategist_guidelines?: string | null;
  trafficker_guidelines?: string | null;
  designer_guidelines?: string | null;
  admin_guidelines?: string | null;
}

interface ScriptDetailPanelProps {
  content: ContentItem | null;
  blockType: 'creator' | 'editor' | 'trafficker' | 'strategist' | 'designer' | 'admin';
  onClose: () => void;
  onRegenerate?: (contentId: string, blockType: string) => void;
}

const blockConfig = {
  creator: {
    icon: FileText,
    title: '🧍‍♂️ Bloque Creador',
    subtitle: 'Guión completo para grabación',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    field: 'script' as const,
  },
  editor: {
    icon: Video,
    title: '🎬 Bloque Editor',
    subtitle: 'Pautas de edición y storyboard',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    field: 'editor_guidelines' as const,
  },
  trafficker: {
    icon: BarChart3,
    title: '💰 Bloque Trafficker',
    subtitle: 'Estrategia de pauta y copies',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    field: 'trafficker_guidelines' as const,
  },
  strategist: {
    icon: Brain,
    title: '🧠 Bloque Estratega',
    subtitle: 'Análisis y métricas de éxito',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    field: 'strategist_guidelines' as const,
  },
  designer: {
    icon: Palette,
    title: '🎨 Bloque Diseñador',
    subtitle: 'Lineamiento gráfico y visual',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    field: 'designer_guidelines' as const,
  },
  admin: {
    icon: Calendar,
    title: '📋 Bloque Admin / PM',
    subtitle: 'Cronograma y checklist',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    field: 'admin_guidelines' as const,
  },
};

export function ScriptDetailPanel({ content, blockType, onClose, onRegenerate }: ScriptDetailPanelProps) {
  const config = blockConfig[blockType];
  const Icon = config.icon;
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!content) {
    return (
      <NovaCard variant="elevated" className="h-full flex items-center justify-center">
        <NovaCardContent className="text-center py-12">
          <div className={cn("mx-auto w-16 h-16 rounded-sm flex items-center justify-center mb-4", config.bgColor)}>
            <Icon className={cn("h-8 w-8", config.color)} />
          </div>
          <h3 className="font-semibold mb-2 text-[var(--nova-text-bright)]">Selecciona un contenido</h3>
          <p className="text-sm text-[var(--nova-text-muted)]">
            Elige un contenido de la lista para ver el {config.title.toLowerCase()}
          </p>
        </NovaCardContent>
      </NovaCard>
    );
  }

  const blockContent = content[config.field];

  const handleCopy = async () => {
    if (!blockContent) return;
    
    // Extract plain text from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(blockContent, 'text/html');
    const textContent = doc.body.textContent || '';
    
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast({
      title: "Copiado",
      description: "Contenido copiado al portapapeles",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NovaCard variant="elevated" className={cn("h-full flex flex-col", config.borderColor, "border-l-4")}>
      <NovaCardHeader className="flex-shrink-0 pb-3 border-b border-[var(--nova-border-subtle)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={content.client?.logo_url || undefined} />
              <AvatarFallback className={config.bgColor}>
                {content.client?.name?.slice(0, 2).toUpperCase() || 'N/A'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <NovaCardTitle className="text-base font-semibold truncate">
                {content.title}
              </NovaCardTitle>
              <p className="text-sm text-[var(--nova-text-muted)] truncate">
                {content.client?.name || 'Sin cliente'}
                {content.product?.name && ` - ${content.product.name}`}
              </p>
              <p className="text-xs text-[var(--nova-text-muted)] mt-0.5">
                {format(new Date(content.created_at), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <NovaButton variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </NovaButton>
        </div>

        {/* Block header */}
        <div className={cn("mt-4 p-3 rounded-sm flex items-center gap-3", config.bgColor)}>
          <Icon className={cn("h-5 w-5", config.color)} />
          <div>
            <h3 className={cn("font-semibold text-sm", config.color)}>{config.title}</h3>
            <p className="text-xs text-[var(--nova-text-muted)]">{config.subtitle}</p>
          </div>
        </div>
      </NovaCardHeader>
      
      <NovaCardContent className="flex-1 overflow-hidden p-0">
        {blockContent ? (
          <ScrollArea className="h-full">
            <div className="p-4">
              {/* Action buttons */}
              <div className="flex gap-2 mb-4">
                <NovaButton variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </NovaButton>
                {onRegenerate && (
                  <NovaButton
                    variant="outline"
                    size="sm"
                    onClick={() => onRegenerate(content.id, blockType)}
                    className="gap-2"
                  >
                    <Sparkles className="h-3 w-3" />
                    Regenerar
                  </NovaButton>
                )}
              </div>

              {/* Content viewer */}
              {blockType === 'creator' ? (
                <ScriptViewer content={blockContent} maxHeight="max-h-none" />
              ) : (
                <RichTextViewer content={blockContent} maxHeight="max-h-none" />
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
              <div className={cn("mx-auto w-16 h-16 rounded-sm flex items-center justify-center mb-4", config.bgColor)}>
                <Icon className={cn("h-8 w-8 opacity-50", config.color)} />
              </div>
              <h3 className="font-semibold mb-2 text-[var(--nova-text-bright)]">Sin contenido generado</h3>
              <p className="text-sm text-[var(--nova-text-muted)] mb-4">
                Este bloque aun no ha sido generado
              </p>
              {onRegenerate && (
                <NovaButton onClick={() => onRegenerate(content.id, blockType)} variant="primary" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generar con IA
                </NovaButton>
              )}
            </div>
          </div>
        )}
      </NovaCardContent>
    </NovaCard>
  );
}