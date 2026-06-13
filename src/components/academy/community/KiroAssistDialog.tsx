import { useState } from 'react';
import { Sparkles, X, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface KiroAssistDialogProps {
  spaceId: string;
  context: string;
  onClose: () => void;
  onApply: (suggestion: { title: string; body: string }) => void;
}

interface Suggestion {
  title: string;
  body_variants: { tone: string; body: string }[];
  hashtags: string[];
}

export function KiroAssistDialog({ spaceId, context, onClose, onApply }: KiroAssistDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Eres KIRO, asistente de comunidad de KREOON Academia. Genera una sugerencia de post para una comunidad educativa.

Contexto del autor (puede estar vacío o ser un borrador): "${context || '(sin contexto)'}"

Responde EXACTAMENTE en este JSON sin texto extra:
{
  "title": "Título atractivo y conciso (máx 80 chars)",
  "body_variants": [
    {"tone": "educativo", "body": "Versión educativa - explica, comparte conocimiento"},
    {"tone": "opinión", "body": "Versión opinión - punto de vista personal"},
    {"tone": "pregunta", "body": "Versión pregunta - invita al debate"}
  ],
  "hashtags": ["3-5 hashtags relevantes sin # ni espacios"]
}

Cada body máximo 280 caracteres. Tono profesional pero cercano. Sin emojis excesivos.`;

      const { data, error: fnError } = await (supabase.functions as any).invoke('ai-assistant', {
        body: {
          prompt,
          space_id: spaceId,
          response_format: 'json',
        },
      });

      if (fnError) throw fnError;

      let parsed: Suggestion | null = null;
      try {
        const raw =
          typeof data === 'string'
            ? data
            : data?.response ?? data?.result ?? data?.content ?? data?.text ?? JSON.stringify(data);
        const jsonMatch = String(raw).match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_parseErr) {
        // intento fallido — mostramos error
      }

      if (!parsed) {
        throw new Error('No se pudo interpretar la respuesta de KIRO');
      }
      setSuggestion(parsed);
    } catch (e: any) {
      setError(e?.message ?? 'KIRO no está disponible ahora mismo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-[#0c0c16] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100">KIRO</h2>
              <p className="text-xs text-zinc-500">Asistente para tu post</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!suggestion && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-400 mb-4">
              {context
                ? 'Voy a sugerirte cómo mejorar este borrador.'
                : 'Voy a inspirarte con ideas para tu post.'}
            </p>
            <Button onClick={generate} className="bg-purple-500 hover:bg-purple-600 text-white">
              <Wand2 className="h-4 w-4 mr-2" /> Generar sugerencias
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-6 gap-3 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <span className="text-sm">Pensando...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {suggestion && (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Título sugerido</div>
              <div className="font-semibold">{suggestion.title}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Variantes del cuerpo</div>
              {suggestion.body_variants?.map((v, i) => (
                <button
                  key={i}
                  onClick={() => onApply({ title: suggestion.title, body: v.body })}
                  className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-purple-300 mb-1">{v.tone}</div>
                  <div className="text-sm text-zinc-200">{v.body}</div>
                </button>
              ))}
            </div>

            {suggestion.hashtags?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Hashtags</div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.hashtags.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    >
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
