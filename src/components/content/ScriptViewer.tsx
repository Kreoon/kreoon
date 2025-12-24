import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo } from "react";

interface ScriptViewerProps {
  content: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
}

// Parse HTML and detect script sections (HOOKS, DESARROLLO, CIERRE/CTA)
function parseScriptSections(html: string): { type: 'hooks' | 'desarrollo' | 'cierre' | 'other' | 'title'; content: string }[] {
  if (!html || html.trim() === '') return [];
  
  const sections: { type: 'hooks' | 'desarrollo' | 'cierre' | 'other' | 'title'; content: string }[] = [];
  
  // Create a temporary div to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  let currentSection: { type: 'hooks' | 'desarrollo' | 'cierre' | 'other' | 'title'; content: string } | null = null;
  
  const detectSectionType = (text: string): 'hooks' | 'desarrollo' | 'cierre' | 'title' | 'other' | null => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('hook')) return 'hooks';
    if (lowerText.includes('desarrollo') || lowerText.includes('cuerpo') || lowerText.includes('desarrollo')) return 'desarrollo';
    if (lowerText.includes('cierre') || lowerText.includes('cta') || lowerText.includes('llamada a la acción') || lowerText.includes('call to action')) return 'cierre';
    if (lowerText.includes('guión') || lowerText.includes('guion') || lowerText.includes('script')) return 'title';
    return null;
  };

  const children = Array.from(body.childNodes);
  
  children.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent || '';
      
      // Check if this is a section header
      if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        const sectionType = detectSectionType(textContent);
        if (sectionType) {
          // Save previous section
          if (currentSection && currentSection.content.trim()) {
            sections.push(currentSection);
          }
          // Start new section
          currentSection = { type: sectionType, content: element.outerHTML };
          return;
        }
      }
      
      // Add to current section or create 'other' section
      if (currentSection) {
        currentSection.content += element.outerHTML;
      } else {
        currentSection = { type: 'other', content: element.outerHTML };
      }
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      if (currentSection) {
        currentSection.content += `<p>${node.textContent}</p>`;
      } else {
        currentSection = { type: 'other', content: `<p>${node.textContent}</p>` };
      }
    }
  });
  
  // Push last section
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

const sectionConfig = {
  title: {
    icon: '📜',
    label: 'Guión',
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
  hooks: {
    icon: '🎯',
    label: 'HOOKS',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  desarrollo: {
    icon: '💬',
    label: 'DESARROLLO',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  cierre: {
    icon: '📢',
    label: 'CIERRE / CTA',
    gradient: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    iconBg: 'bg-green-500/20',
    textColor: 'text-green-700 dark:text-green-300',
  },
  other: {
    icon: '📝',
    label: 'Contenido',
    gradient: 'from-gray-500/10 to-gray-400/10',
    borderColor: 'border-border',
    iconBg: 'bg-muted',
    textColor: 'text-foreground',
  },
};

function ScriptSection({ 
  type, 
  content, 
  compact 
}: { 
  type: keyof typeof sectionConfig; 
  content: string;
  compact?: boolean;
}) {
  const config = sectionConfig[type];
  
  // Remove the header from content since we're displaying it separately
  const cleanContent = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const body = doc.body;
    
    // Remove h2, h3, h4 that match section headers
    const headers = body.querySelectorAll('h2, h3, h4');
    headers.forEach((header) => {
      const text = header.textContent?.toLowerCase() || '';
      if (
        text.includes('hook') || 
        text.includes('desarrollo') || 
        text.includes('cierre') || 
        text.includes('cta') ||
        text.includes('guión') ||
        text.includes('guion') ||
        text.includes('script')
      ) {
        header.remove();
      }
    });
    
    return body.innerHTML;
  }, [content]);

  return (
    <div 
      className={cn(
        "relative rounded-xl border-2 overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.01]",
        config.borderColor
      )}
    >
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60",
        config.gradient
      )} />
      
      {/* Section header */}
      <div className={cn(
        "relative flex items-center gap-3 px-4 py-3 border-b",
        config.borderColor,
        "bg-background/50 backdrop-blur-sm"
      )}>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg text-xl",
          config.iconBg
        )}>
          {config.icon}
        </div>
        <span className={cn(
          "font-bold text-sm uppercase tracking-wider",
          config.textColor
        )}>
          {config.label}
        </span>
      </div>
      
      {/* Section content */}
      <div 
        className={cn(
          "relative p-4",
          compact ? "text-sm" : "text-base",
          // Rich prose styling
          "prose prose-sm dark:prose-invert max-w-none",
          // Headers
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2",
          "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1",
          // Paragraphs with good spacing
          "[&_p]:leading-relaxed [&_p]:mb-3 [&_p]:last:mb-0",
          // Emphasis and strong
          "[&_em]:text-muted-foreground [&_em]:font-medium [&_em]:not-italic [&_em]:text-xs [&_em]:uppercase [&_em]:tracking-wide [&_em]:bg-muted/50 [&_em]:px-2 [&_em]:py-0.5 [&_em]:rounded",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          // Quoted text (spoken text)
          "[&_p]:has-[text-content*='\"']):font-medium",
          // Lists
          "[&_ul]:space-y-1 [&_ul]:pl-4 [&_ul]:mb-3",
          "[&_li]:leading-relaxed",
          // Underline for CTAs
          "[&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-2 [&_u]:decoration-primary",
        )}
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />
    </div>
  );
}

export function ScriptViewer({ content, className, maxHeight = "max-h-[600px]", compact = false }: ScriptViewerProps) {
  const sections = useMemo(() => parseScriptSections(content), [content]);
  
  if (!content || content.trim() === '' || content === '<p></p>') {
    return (
      <div className={cn(
        "flex items-center justify-center p-8 rounded-xl border-2 border-dashed border-muted-foreground/20",
        "bg-muted/20 text-muted-foreground text-sm",
        className
      )}>
        <div className="text-center space-y-2">
          <div className="text-3xl">📝</div>
          <p>Sin guión disponible</p>
          <p className="text-xs opacity-70">Genera un guión con IA o escribe uno manualmente</p>
        </div>
      </div>
    );
  }
  
  // If we couldn't parse sections, show as single block
  if (sections.length === 0) {
    return (
      <ScrollArea className={cn(maxHeight, className)}>
        <div 
          className={cn(
            "p-5 rounded-xl border bg-card",
            "prose prose-sm dark:prose-invert max-w-none",
            "[&_p]:leading-relaxed [&_p]:mb-3",
            "[&_strong]:font-bold",
            "[&_em]:text-muted-foreground"
          )}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className={cn(maxHeight, className)}>
      <div className={cn(
        "space-y-4 p-1",
        compact ? "space-y-3" : "space-y-5"
      )}>
        {sections.map((section, index) => (
          <ScriptSection 
            key={`${section.type}-${index}`}
            type={section.type}
            content={section.content}
            compact={compact}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// Compact preview version for cards
export function ScriptPreview({ content, className }: { content: string; className?: string }) {
  const sections = useMemo(() => parseScriptSections(content), [content]);
  
  if (!content || content.trim() === '') {
    return (
      <div className={cn("text-muted-foreground text-sm italic", className)}>
        Sin guión
      </div>
    );
  }

  // Show a compact summary with section indicators
  const sectionIndicators = sections
    .filter(s => s.type !== 'other' && s.type !== 'title')
    .map(s => sectionConfig[s.type].icon)
    .join(' ');

  // Get first bit of actual content
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const textContent = doc.body.textContent || '';
  const preview = textContent.slice(0, 120).trim() + (textContent.length > 120 ? '...' : '');

  return (
    <div className={cn("space-y-2", className)}>
      {sectionIndicators && (
        <div className="flex items-center gap-1 text-lg">
          {sectionIndicators}
        </div>
      )}
      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
        {preview}
      </p>
    </div>
  );
}
