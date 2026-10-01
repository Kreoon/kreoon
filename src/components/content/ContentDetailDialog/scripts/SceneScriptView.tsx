import { useMemo, useState } from 'react';
import { ChevronDown, Clapperboard } from 'lucide-react';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { cn } from '@/lib/utils';
import { splitScriptIntoScenes } from './sceneScript';

interface SceneScriptViewProps {
  html: string;
}

/** Guión para grabar: bloques (Hooks, Desarrollo, CTA) con escenas numeradas e indicaciones plegadas. */
export function SceneScriptView({ html }: SceneScriptViewProps) {
  const parsed = useMemo(() => splitScriptIntoScenes(html), [html]);
  const [showNotes, setShowNotes] = useState(false);

  if (!parsed) return <RichTextViewer content={html} maxHeight="" />;

  return (
    <div className="space-y-4">
      {parsed.introHtml && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
          <RichTextViewer content={parsed.introHtml} maxHeight="" />
        </div>
      )}

      {parsed.groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
          {group.introHtml && (
            <div className="text-sm text-muted-foreground">
              <RichTextViewer content={group.introHtml} maxHeight="" />
            </div>
          )}
          <ol className="space-y-2">
            {group.scenes.map((scene) => (
              <li key={scene.number} className="rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {scene.number}
                  </span>
                  <h4 className="text-sm font-semibold text-foreground">Escena {scene.number} · {scene.title}</h4>
                </div>
                <div className="px-3 py-2">
                  <RichTextViewer content={scene.html} maxHeight="" />
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {parsed.notesHtml && (
        <div className="rounded-lg border border-dashed border-border">
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            aria-expanded={showNotes}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground"
          >
            <Clapperboard className="h-4 w-4 text-muted-foreground" />
            Indicaciones de grabación
            <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', showNotes && 'rotate-180')} />
          </button>
          {showNotes && (
            <div className="border-t border-dashed border-border px-3 py-2">
              <RichTextViewer content={parsed.notesHtml} maxHeight="" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
