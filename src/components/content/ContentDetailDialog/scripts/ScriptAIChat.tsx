import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invokeAIWithTokens } from '@/lib/ai/token-gate';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Sparkles,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  Save,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeHTMLWithBreaks } from '@/lib/sanitizeHTML';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ScriptAIChatProps {
  contentId: string;
  currentScript: string;
  onScriptUpdate: (newScript: string) => void;
  onSaveComplete?: () => void;
  productName?: string;
  spherePhase?: string | null;
  organizationId?: string;
  disabled?: boolean;
}

const QUICK_ACTIONS = [
  { label: 'Más corto', prompt: 'Hazlo más corto y directo, manteniendo el mensaje principal' },
  { label: 'Más persuasivo', prompt: 'Hazlo más persuasivo con gatillos emocionales más fuertes' },
  { label: 'Más informal', prompt: 'Hazlo más casual e informal, como si hablaras con un amigo' },
  { label: 'Más urgente', prompt: 'Agrega más urgencia y escasez al mensaje' },
  { label: 'Nuevos hooks', prompt: 'Genera 3 hooks alternativos más disruptivos' },
  { label: 'Mejor CTA', prompt: 'Mejora el llamado a la acción para que sea más efectivo' },
];

export function ScriptAIChat({ 
  contentId,
  currentScript, 
  onScriptUpdate,
  onSaveComplete,
  productName,
  spherePhase,
  organizationId,
  disabled = false 
}: ScriptAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [usePerplexity, setUsePerplexity] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !currentScript) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await invokeAIWithTokens('script-chat', 'script_chat', {
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: messageText }
        ],
        currentScript,
        productName,
        spherePhase,
        organizationId,
        use_perplexity: usePerplexity,
      }, organizationId);

      if (data?.error) {
        const err = new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Error') as any;
        err.status = data.status ?? 500;
        throw err;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data?.content || 'No se pudo generar una respuesta',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error('Error in AI chat:', error);
      const status = error?.status ?? error?.context?.status;
      const msg = String(error?.message || '');
      let detail = '';
      try {
        const body = typeof error?.responseBody === 'string' ? JSON.parse(error.responseBody) : error?.responseBody;
        if (body?.detail) detail = ` (${body.detail})`;
      } catch { /* ignore */ }
      const is429 = status === 429 || msg.includes('429') || msg.toLowerCase().includes('too many requests');
      const is402 = status === 402 || msg.includes('insufficient_tokens') || msg.includes('402');
      toast({
        title: 'Error',
        description: is402
          ? `No tienes tokens suficientes. Compra más o conecta tu propia API en Configuración.${detail}`
          : is429
            ? 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.'
            : 'No se pudo procesar tu solicitud. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({ title: 'Copiado al portapapeles' });
    } catch (err) {
      toast({ title: 'Error al copiar', variant: 'destructive' });
    }
  };

  const applyToScript = (content: string) => {
    onScriptUpdate(content);
    toast({ 
      title: 'Guión actualizado', 
      description: 'Revisa los cambios y guarda cuando estés listo' 
    });
  };

  const saveScriptToDatabase = async () => {
    if (!contentId || !currentScript) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({ 
          script: currentScript,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);

      if (error) throw error;

      toast({ 
        title: 'Guión guardado', 
        description: 'El guión refinado está disponible para todos los usuarios' 
      });
      
      onSaveComplete?.();
    } catch (error) {
      console.error('Error saving script:', error);
      toast({ 
        title: 'Error al guardar', 
        description: 'No se pudo guardar el guión. Intenta de nuevo.',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentScript) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed rounded-lg">
        <Sparkles className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Genera un guión primero para poder refinarlo con IA</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm">Asistente de Guiones</span>
        <span className="text-xs text-muted-foreground ml-auto">
          Refina y mejora tu guión
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-1.5 p-2 border-b bg-muted/10">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => sendMessage(action.prompt)}
            disabled={isLoading || disabled}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">¿Cómo quieres mejorar tu guión?</p>
            <p className="text-xs mt-1">Usa los botones rápidos o escribe tu solicitud</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTMLWithBreaks(message.content) }}
                  />
                  {message.role === 'assistant' && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => copyToClipboard(message.content, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copiar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-primary hover:text-primary"
                        onClick={() => applyToScript(message.content)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Usar este guión
                      </Button>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-muted/10 space-y-2">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium">Incluir datos actuales (Perplexity)</span>
          </div>
          <Switch checked={usePerplexity} onCheckedChange={setUsePerplexity} />
        </div>
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe qué cambios quieres en el guión..."
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            disabled={isLoading || disabled}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || disabled}
            className="self-end"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Save Final Script Button */}
        {messages.length > 0 && !disabled && (
          <Button
            onClick={saveScriptToDatabase}
            disabled={isSaving}
            className="w-full"
            variant="default"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Guión Final
          </Button>
        )}
      </div>
    </div>
  );
}
