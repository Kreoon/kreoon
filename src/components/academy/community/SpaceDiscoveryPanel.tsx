import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSpaceDiscovery, useUpdateDiscovery } from '@/hooks/academy/useSpaceDiscovery';
import type { SpaceDiscovery } from '@/types/academy-community';

interface SpaceDiscoveryPanelProps {
  spaceId: string;
  spaceName: string;
  accentColor?: string;
}

const CATEGORIES = [
  'business',
  'tech',
  'health',
  'arts',
  'education',
  'fitness',
  'finance',
  'marketing',
  'creators',
  'spirituality',
  'general',
];

const LANGUAGES = ['es', 'en', 'pt', 'fr'];
const MAX_KEYWORDS = 11;

export function SpaceDiscoveryPanel({ spaceId, spaceName, accentColor = '#8B5CF6' }: SpaceDiscoveryPanelProps) {
  const { data } = useSpaceDiscovery(spaceId);
  const update = useUpdateDiscovery();
  const [draft, setDraft] = useState<Partial<SpaceDiscovery>>({
    is_discoverable: true,
    category: 'general',
    language: 'es',
    keywords: [],
  });
  const [keywordDraft, setKeywordDraft] = useState('');

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  function addKeyword() {
    const k = keywordDraft.trim().toLowerCase();
    if (!k || (draft.keywords ?? []).includes(k)) return;
    if ((draft.keywords ?? []).length >= MAX_KEYWORDS) return;
    setDraft((d) => ({ ...d, keywords: [...(d.keywords ?? []), k] }));
    setKeywordDraft('');
  }

  function removeKeyword(k: string) {
    setDraft((d) => ({ ...d, keywords: (d.keywords ?? []).filter((x) => x !== k) }));
  }

  function save() {
    update.mutate({ spaceId, updates: draft });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Visible en Discovery</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Permite que tu academia aparezca en búsquedas y marketplace</p>
          </div>
          <Toggle
            value={!!draft.is_discoverable}
            onChange={(v) => setDraft((d) => ({ ...d, is_discoverable: v }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Categoría</Label>
            <select
              value={draft.category ?? 'general'}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-sm mt-1"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Idioma</Label>
            <select
              value={draft.language ?? 'es'}
              onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-sm mt-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Keywords (máx {MAX_KEYWORDS})</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Agrega una keyword y presiona Enter"
              className="bg-black/30 border-white/10"
            />
            <Button onClick={addKeyword} variant="outline">
              Agregar
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(draft.keywords ?? []).map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20"
                style={{ color: accentColor }}
              >
                {k}
                <button onClick={() => removeKeyword(k)} className="hover:text-rose-400">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {(draft.keywords ?? []).length === 0 && (
              <span className="text-xs text-zinc-500">Sin keywords aún</span>
            )}
          </div>
        </div>

        <div>
          <Label>Meta description (SEO)</Label>
          <textarea
            value={draft.meta_description ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, meta_description: e.target.value }))}
            placeholder="Resumen de tu academia para motores de búsqueda (máx 160 chars)"
            maxLength={160}
            className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm h-16 mt-1 focus:outline-none focus:border-purple-500/50"
          />
          <div className="text-[10px] text-zinc-500 text-right">
            {(draft.meta_description ?? '').length}/160
          </div>
        </div>
      </Card>

      {/* Preview card */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Vista previa en Discovery
        </h3>
        <div className="max-w-sm rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div
            className="h-24"
            style={{ background: `linear-gradient(135deg, ${accentColor}40, transparent)` }}
          />
          <div className="p-4">
            <h4 className="font-bold">{spaceName}</h4>
            {draft.meta_description && (
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{draft.meta_description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                {draft.category}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                {(draft.language ?? '').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Button onClick={save} disabled={update.isPending} className="bg-purple-500 hover:bg-purple-600 text-white">
        {update.isPending ? 'Guardando...' : 'Guardar Discovery'}
      </Button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors',
        value ? 'bg-purple-500' : 'bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          value ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
