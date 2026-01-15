import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { MonitorPlay } from "lucide-react";
import { TeleprompterMode } from "./TeleprompterMode";
import { sanitizeHTML } from "@/lib/sanitizeHTML";

interface ScriptViewerProps {
  content: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
  showTeleprompterButton?: boolean;
}

type SectionType = 'hooks' | 'desarrollo' | 'cierre' | 'teleprompter' | 'info' | 'other' | 'title';

// Parse HTML and detect script sections
function parseScriptSections(html: string): { type: SectionType; content: string }[] {
  if (!html || html.trim() === '') return [];
  
  const sections: { type: SectionType; content: string }[] = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  let currentSection: { type: SectionType; content: string } | null = null;
  
  const detectSectionType = (text: string): SectionType | null => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('hook')) return 'hooks';
    if (lowerText.includes('desarrollo') || lowerText.includes('escena') || lowerText.includes('derrotero')) return 'desarrollo';
    if (lowerText.includes('teleprompter')) return 'teleprompter';
    if (lowerText.includes('cierre') || lowerText.includes('cta final')) return 'cierre';
    if (lowerText.includes('información') || lowerText.includes('avatar') || lowerText.includes('perfil') || lowerText.includes('tono')) return 'info';
    if (lowerText.includes('guión') || lowerText.includes('guion') || lowerText.includes('script') || lowerText.includes('bloque creador')) return 'title';
    return null;
  };

  const children = Array.from(body.childNodes);
  
  children.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent || '';
      
      if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        const sectionType = detectSectionType(textContent);
        if (sectionType) {
          if (currentSection && currentSection.content.trim()) {
            sections.push(currentSection);
          }
          currentSection = { type: sectionType, content: element.outerHTML };
          return;
        }
      }
      
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
  
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

const sectionConfig: Record<SectionType, {
  icon: string;
  label: string;
  gradient: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
}> = {
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
  info: {
    icon: '📋',
    label: 'INFORMACIÓN',
    gradient: 'from-slate-500/20 to-gray-500/20',
    borderColor: 'border-slate-500/30',
    iconBg: 'bg-slate-500/20',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  desarrollo: {
    icon: '🎬',
    label: 'DESARROLLO / ESCENAS',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  teleprompter: {
    icon: '🎙️',
    label: 'TELEPROMPTER',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    borderColor: 'border-indigo-500/30',
    iconBg: 'bg-indigo-500/20',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  cierre: {
    icon: '📢',
    label: 'CTA FINAL',
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
  type: SectionType; 
  content: string;
  compact?: boolean;
}) {
  const config = sectionConfig[type];
  
  const cleanContent = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const body = doc.body;
    
    const headers = body.querySelectorAll('h2, h3, h4');
    headers.forEach((header) => {
      const text = header.textContent?.toLowerCase() || '';
      if (
        text.includes('hook') || 
        text.includes('desarrollo') || 
        text.includes('escena') ||
        text.includes('cierre') || 
        text.includes('cta') ||
        text.includes('teleprompter') ||
        text.includes('guión') ||
        text.includes('guion') ||
        text.includes('script') ||
        text.includes('bloque creador')
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
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60",
        config.gradient
      )} />
      
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
      
      <div 
        className={cn(
          "relative p-4",
          compact ? "text-sm" : "text-base",
          "prose prose-sm dark:prose-invert max-w-none",
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2",
          "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1",
          "[&_p]:leading-relaxed [&_p]:mb-3 [&_p]:last:mb-0",
          "[&_em]:text-muted-foreground [&_em]:font-medium [&_em]:not-italic [&_em]:text-xs [&_em]:uppercase [&_em]:tracking-wide [&_em]:bg-muted/50 [&_em]:px-2 [&_em]:py-0.5 [&_em]:rounded",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          "[&_ul]:space-y-1 [&_ul]:pl-4 [&_ul]:mb-3",
          "[&_li]:leading-relaxed",
          "[&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-2 [&_u]:decoration-primary",
        )}
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(cleanContent) }}
      />
    </div>
  );
}

export function ScriptViewer({ 
  content, 
  className, 
  maxHeight = "max-h-[600px]", 
  compact = false,
  showTeleprompterButton = true 
}: ScriptViewerProps) {
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
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

  return (
    <>
      <div className="space-y-4">
        {/* Teleprompter button */}
        {showTeleprompterButton && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTeleprompterOpen(true)}
              className="gap-2"
            >
              <MonitorPlay className="h-4 w-4" />
              Modo Teleprompter
            </Button>
          </div>
        )}
        
        {sections.length === 0 ? (
          <div className={cn("overflow-y-auto", maxHeight, className)}>
            <div 
              className={cn(
                "p-5 rounded-xl border bg-card",
                "prose prose-sm dark:prose-invert max-w-none",
                "[&_p]:leading-relaxed [&_p]:mb-3",
                "[&_strong]:font-bold",
                "[&_em]:text-muted-foreground"
              )}
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
            />
          </div>
        ) : (
          <div className={cn("overflow-y-auto", maxHeight, className)}>
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
          </div>
        )}
      </div>

      {/* Teleprompter Modal */}
      <TeleprompterMode
        content={content}
        isOpen={teleprompterOpen}
        onClose={() => setTeleprompterOpen(false)}
      />
    </>
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

  const sectionIndicators = sections
    .filter(s => s.type !== 'other' && s.type !== 'title')
    .map(s => sectionConfig[s.type].icon)
    .join(' ');

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
