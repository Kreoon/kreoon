import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { formatCurrency } from '@/lib/finance-format';
import { toast } from '@/hooks/use-toast';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Array<{
    priority: 'critica' | 'alta' | 'media' | 'baja';
    action: string;
    reason: string;
  }>;
  related_kpis?: Record<string, number | string>;
}

const PRIORITY_STYLES = {
  critica: 'bg-red-500/15 text-red-300 border-red-500/30',
  alta:    'bg-orange-500/15 text-orange-300 border-orange-500/30',
  media:   'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  baja:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
};

const PRIORITY_EMOJI = {
  critica: '🚨',
  alta: '⚠️',
  media: '🟡',
  baja: '🔵',
};

const SUGGESTED_QUESTIONS = [
  '¿Qué cliente me debe más?',
  '¿Es saludable la nómina vs ingresos?',
  '¿Dónde estoy gastando más?',
  '¿Cómo mejoro la utilidad?',
  '¿Cuánto cobré este mes vs el pasado?',
];

interface Props {
  orgId: string;
}

export function FinanceAIChat({ orgId }: Props) {
  const { currency, startDate, endDate } = useFinanceFilters();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('finance-ai', {
        body: { question, orgId, currency, startDate, endDate },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        recommendations: data.recommendations ?? [],
        related_kpis: data.related_kpis,
      }]);
    } catch (err: any) {
      toast({
        title: 'Error al consultar IA',
        description: err.message ?? 'Reintenta en unos segundos',
        variant: 'destructive',
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, no pude procesar tu pregunta. Verifica que la edge function tenga las API keys configuradas (GEMINI_API_KEY o ANTHROPIC_API_KEY).',
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Pregunta a IA
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[90vw] max-w-md h-[600px] max-h-[80vh]">
      <Card className="bg-[#0a0a0a] border-white/10 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-white">Jarvis Finanzas</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
              IA
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                </div>
                <div className="flex-1 bg-white/5 rounded-lg p-3 text-sm text-white/80">
                  ¡Hola! Soy tu analista financiero con IA. Puedo responder preguntas sobre tus
                  ingresos, costos, clientes y darte recomendaciones para mejorar la utilidad.
                  <br /><br />
                  <span className="text-white/50 text-xs">
                    Período actual: {startDate} a {endDate} · {currency}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mt-3">
                <p className="text-xs text-white/40 uppercase tracking-wide">Preguntas sugeridas:</p>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="w-full text-left text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-3 py-2 text-white/80 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <MessageCircle className="w-3 h-3 text-purple-400 shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-500/20 text-white border border-blue-500/30'
                    : 'bg-white/5 text-white/90 border border-white/10'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* KPIs relacionados */}
                  {msg.related_kpis && Object.keys(msg.related_kpis).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5">
                      {Object.entries(msg.related_kpis).map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <p className="text-white/40">{k}</p>
                          <p className="font-medium">
                            {typeof v === 'number' ? formatCurrency(v, currency) : v}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                      <p className="text-[10px] text-white/40 uppercase tracking-wide">Recomendaciones:</p>
                      {msg.recommendations.map((rec, ri) => (
                        <div key={ri} className="text-xs flex items-start gap-1.5">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium border ${PRIORITY_STYLES[rec.priority]}`}>
                            {PRIORITY_EMOJI[rec.priority]}
                          </span>
                          <div className="flex-1">
                            <p className="text-white/85 font-medium">{rec.action}</p>
                            <p className="text-white/40 text-[10px] mt-0.5">{rec.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-purple-300 animate-spin" />
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/50 italic">
                Analizando tu pregunta...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <Input
            placeholder="Pregunta sobre tus finanzas..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white text-sm flex-1"
          />
          <Button
            size="icon"
            onClick={() => ask(input)}
            disabled={!input.trim() || loading}
            className="bg-purple-600 hover:bg-purple-500"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
