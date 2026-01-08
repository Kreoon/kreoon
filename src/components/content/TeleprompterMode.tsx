import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitizeHTML";
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minus, 
  Plus,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface TeleprompterModeProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TeleprompterMode({ content, isOpen, onClose }: TeleprompterModeProps) {
  const [fontSize, setFontSize] = useState(32);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Extract teleprompter text from HTML content
  const extractTeleprompterText = useCallback((html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // First try to find teleprompter-specific content
    const teleprompterDiv = doc.querySelector('[data-teleprompter="true"]') || 
                           doc.querySelector('.teleprompter-text');
    
    if (teleprompterDiv) {
      return teleprompterDiv.innerHTML;
    }
    
    // Look for "Guión para Teleprompter" section
    const headers = doc.querySelectorAll('h3, h4');
    for (const header of headers) {
      if (header.textContent?.toLowerCase().includes('teleprompter')) {
        let content = '';
        let sibling = header.nextElementSibling;
        while (sibling && !['H2', 'H3'].includes(sibling.tagName)) {
          content += sibling.outerHTML;
          sibling = sibling.nextElementSibling;
        }
        if (content) return content;
      }
    }
    
    // Fallback: extract all paragraph text
    const paragraphs = doc.querySelectorAll('p');
    const texts: string[] = [];
    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 20) {
        texts.push(`<p>${text}</p>`);
      }
    });
    
    return texts.join('\n\n');
  }, []);

  const teleprompterContent = extractTeleprompterText(content);

  // Auto-scroll functionality
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += scrollSpeed / 50;
        }
      }, 16); // ~60fps
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isPlaying, scrollSpeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'Escape':
          onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop -= 50;
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop += 50;
          }
          break;
        case '+':
        case '=':
          setFontSize(prev => Math.min(prev + 4, 72));
          break;
        case '-':
          setFontSize(prev => Math.max(prev - 4, 16));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset scroll position
  const handleReset = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setIsPlaying(false);
  };

  // Toggle controls visibility
  const toggleControls = () => setShowControls(prev => !prev);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Main content area */}
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto scroll-smooth"
        onClick={toggleControls}
      >
        {/* Reading guide line */}
        <div className="fixed left-0 right-0 top-1/3 h-1 bg-primary/30 pointer-events-none z-10" />
        
        {/* Top gradient fade */}
        <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
        
        {/* Bottom gradient fade */}
        <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
        
        {/* Content with padding */}
        <div className="min-h-screen flex flex-col justify-start px-8 md:px-16 lg:px-32 pt-[40vh] pb-[60vh]">
          <div 
            className={cn(
              "text-white leading-relaxed max-w-4xl mx-auto",
              // Prose styling for teleprompter
              "[&_p]:mb-8 [&_p]:leading-[1.6]",
              "[&_strong]:text-yellow-300 [&_strong]:font-bold",
              "[&_em]:text-gray-400 [&_em]:text-sm [&_em]:block [&_em]:mb-2 [&_em]:not-italic",
              "[&_u]:text-green-400 [&_u]:no-underline [&_u]:font-bold",
              "[&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mb-4 [&_h3]:mt-8",
              "[&_h4]:text-xl [&_h4]:font-semibold [&_h4]:text-primary/80 [&_h4]:mb-3 [&_h4]:mt-6",
              "[&_ul]:space-y-2 [&_ul]:mb-6",
              "[&_li]:text-gray-300"
            )}
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(teleprompterContent) }}
          />
        </div>
      </div>

      {/* Controls panel */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10 transition-transform duration-300",
          showControls ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="container mx-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isPlaying ? "destructive" : "default"}
                size="icon"
                onClick={() => setIsPlaying(prev => !prev)}
                className="h-12 w-12"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
            </div>

            {/* Font size control */}
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">Tamaño:</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFontSize(prev => Math.max(prev - 4, 16))}
                className="border-white/20 text-white hover:bg-white/10 h-8 w-8"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-white font-mono w-12 text-center">{fontSize}px</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFontSize(prev => Math.min(prev + 4, 72))}
                className="border-white/20 text-white hover:bg-white/10 h-8 w-8"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Scroll speed control */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <span className="text-white/60 text-sm">Velocidad:</span>
              <Slider
                value={[scrollSpeed]}
                onValueChange={(value) => setScrollSpeed(value[0])}
                min={10}
                max={100}
                step={5}
                className="flex-1"
              />
            </div>

            {/* Manual scroll buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop -= 100;
                  }
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop += 100;
                  }
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/40">
            <span>ESPACIO: Play/Pause</span>
            <span>↑↓: Scroll manual</span>
            <span>+/-: Tamaño</span>
            <span>ESC: Cerrar</span>
          </div>
        </div>
      </div>

      {/* Show controls button when hidden */}
      {!showControls && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleControls}
          className="fixed bottom-4 right-4 border-white/20 text-white hover:bg-white/10 z-20"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Controles
        </Button>
      )}
    </div>
  );
}
