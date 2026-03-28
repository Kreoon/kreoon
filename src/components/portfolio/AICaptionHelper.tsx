import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Loader2, Check, Copy } from 'lucide-react';
import { usePortfolioAI } from '@/hooks/usePortfolioAI';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AICaptionHelperProps {
  context: string;
  contentType?: string;
  onApply: (caption: string, hashtags: string[]) => void;
  trigger?: React.ReactNode;
}

export function AICaptionHelper({ context, contentType = 'post', onApply, trigger }: AICaptionHelperProps) {
  const [open, setOpen] = useState(false);
  const [captions, setCaptions] = useState<Array<{ text: string; hashtags: string[] }>>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { generateCaption, loading } = usePortfolioAI();

  const handleGenerate = async () => {
    const result = await generateCaption(context, contentType);
    if (result?.captions) {
      setCaptions(result.captions);
      setSelectedIndex(null);
    }
  };

  const handleApply = () => {
    if (selectedIndex !== null && captions[selectedIndex]) {
      onApply(captions[selectedIndex].text, captions[selectedIndex].hashtags || []);
      setOpen(false);
      toast.success('Caption aplicado');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generar Caption
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Asistente de Captions
          </DialogTitle>
          <DialogDescription>
            Genera captions creativos con IA para tu contenido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context preview */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Contexto</label>
            <div className="mt-1 p-3 bg-muted rounded-sm text-sm line-clamp-3">
              {context || <span className="text-muted-foreground italic">Describe tu contenido...</span>}
            </div>
          </div>

          {/* Generate button */}
          {captions.length === 0 && (
            <Button onClick={handleGenerate} disabled={loading || !context} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Captions
                </>
              )}
            </Button>
          )}

          {/* Results */}
          {captions.length > 0 && (
            <>
              <div className="space-y-3">
                {captions.map((caption, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "p-3 rounded-sm border cursor-pointer transition-all",
                      selectedIndex === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="text-sm">{caption.text}</p>
                    {caption.hashtags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {caption.hashtags.map((tag, i) => (
                          <span key={i} className="text-xs text-primary">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(`${caption.text}\n\n${caption.hashtags?.map(t => `#${t}`).join(' ') || ''}`);
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleApply} 
                  disabled={selectedIndex === null}
                  className="flex-1 gap-2"
                >
                  <Check className="h-4 w-4" />
                  Usar Seleccionado
                </Button>
                <Button variant="ghost" onClick={handleGenerate} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerar'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
