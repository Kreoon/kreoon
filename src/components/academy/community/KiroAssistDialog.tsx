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

      // KIRO usa multi-ai (genérico, multi-provider). El edge function
      // ai-assistant requiere ai_assistant_config por organization_id y no
      // aplica en contexto de academia (que usa space_id).
      const { data, error: fnError } = await (supabase.functions as any).invoke('multi-ai', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Eres KIRO, asistente de comunidad de KREOON Academia. Respondes SIEMPRE en JSON válido sin texto extra alrededor.',
            },
            { role: 'user', content: prompt },
          ],
          mode: 'first',
        },
      });

      if (fnError) throw fnError;

      let parsed: Suggestion | null = null;
      try {
        // multi-ai devuelve { responses: [{content, provider, ...}], combined: string, ... }
        const raw =
          typeof data === 'string'
            ? data
            : data?.combined
              ?? data?.responses?.[0]?.content
              ?? data?.response ?? data?.result ?? data?.content ?? data?.text
              ?? JSON.stringify(data);
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
        className="bg-background border border-border rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">KIRO</h2>
              <p className="text-xs text-muted-foreground">Asistente para tu post</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!suggestion && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              {context
                ? 'Voy a sugerirte cómo mejorar este borrador.'
                : 'Voy a inspirarte con ideas para tu post.'}
            </p>
            <Button onClick={generate} className="bg-primary hover:bg-primary/90 text-white">
              <Wand2 className="h-4 w-4 mr-2" /> Generar sugerencias
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-6 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Pensando...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {suggestion && (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Título sugerido</div>
              <div className="font-semibold">{suggestion.title}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Variantes del cuerpo</div>
              {suggestion.body_variants?.map((v, i) => (
                <button
                  key={i}
                  onClick={() => onApply({ title: suggestion.title, body: v.body })}
                  className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-wide text-primary mb-1">{v.tone}</div>
                  <div className="text-sm text-foreground">{v.body}</div>
                </button>
              ))}
            </div>

            {suggestion.hashtags?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Hashtags</div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.hashtags.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
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
