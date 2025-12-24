import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Video, BarChart3, Brain, Palette, Calendar } from "lucide-react";

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

interface ScriptBlockCardProps {
  content: ContentItem;
  blockType: 'creator' | 'editor' | 'trafficker' | 'strategist' | 'designer' | 'admin';
  onClick: () => void;
  isSelected?: boolean;
}

const blockConfig = {
  creator: {
    icon: FileText,
    label: 'Guión Creador',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    field: 'script' as const,
  },
  editor: {
    icon: Video,
    label: 'Bloque Editor',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    field: 'editor_guidelines' as const,
  },
  trafficker: {
    icon: BarChart3,
    label: 'Bloque Trafficker',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    field: 'trafficker_guidelines' as const,
  },
  strategist: {
    icon: Brain,
    label: 'Bloque Estratega',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    field: 'strategist_guidelines' as const,
  },
  designer: {
    icon: Palette,
    label: 'Bloque Diseñador',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    field: 'designer_guidelines' as const,
  },
  admin: {
    icon: Calendar,
    label: 'Bloque Admin',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    field: 'admin_guidelines' as const,
  },
};

export function ScriptBlockCard({ content, blockType, onClick, isSelected }: ScriptBlockCardProps) {
  const config = blockConfig[blockType];
  const Icon = config.icon;
  const hasContent = !!content[config.field];
  
  // Get preview text
  const getPreview = () => {
    const rawContent = content[config.field];
    if (!rawContent) return null;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawContent, 'text/html');
    const textContent = doc.body.textContent || '';
    return textContent.slice(0, 100).trim() + (textContent.length > 100 ? '...' : '');
  };

  const preview = getPreview();

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        !hasContent && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={content.client?.logo_url || undefined} />
              <AvatarFallback className="bg-muted">
                {content.client?.name?.slice(0, 2).toUpperCase() || 'N/A'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {content.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {content.client?.name || 'Sin cliente'} 
                {content.product?.name && ` • ${content.product.name}`}
              </p>
            </div>
          </div>
          <div className={cn(
            "p-2 rounded-lg flex-shrink-0",
            config.bgColor
          )}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {hasContent ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {preview}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sin contenido generado
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <Badge variant={hasContent ? "default" : "secondary"} className="text-xs">
              {hasContent ? "Generado" : "Pendiente"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(content.created_at), "d MMM", { locale: es })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}