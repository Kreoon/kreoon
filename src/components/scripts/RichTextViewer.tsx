import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizeHTML } from "@/lib/sanitizeHTML";

interface RichTextViewerProps {
  content: string;
  className?: string;
  maxHeight?: string;
}

export function RichTextViewer({ content, className, maxHeight = "max-h-[600px]" }: RichTextViewerProps) {
  if (!content || content.trim() === '' || content === '<p></p>') {
    return (
      <div className={cn(
        "flex items-center justify-center p-8 rounded-xl border-2 border-dashed border-muted-foreground/20",
        "bg-muted/20 text-muted-foreground text-sm",
        className
      )}>
        <div className="text-center space-y-2">
          <div className="text-3xl">📝</div>
          <p>Sin contenido disponible</p>
          <p className="text-xs opacity-70">Genera contenido con IA</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn(maxHeight, className)}>
      <div 
        className={cn(
          "p-5 rounded-xl border bg-card",
          "prose prose-sm dark:prose-invert max-w-none",
          // Headers
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-foreground",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-foreground",
          "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:text-foreground",
          // Paragraphs
          "[&_p]:leading-relaxed [&_p]:mb-3 [&_p]:last:mb-0",
          // Emphasis
          "[&_em]:text-muted-foreground [&_em]:font-medium",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          // Lists
          "[&_ul]:space-y-1 [&_ul]:pl-4 [&_ul]:mb-3",
          "[&_li]:leading-relaxed",
          // Underline for CTAs
          "[&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-2 [&_u]:decoration-primary",
        )}
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
      />
    </ScrollArea>
  );
}