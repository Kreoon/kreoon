import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  contentCalendar?: {
    calendar?: any[];
    weeklyThemes?: any[];
    leadMagnetDays?: any[];
  } | null;
}

const PILLAR_COLORS: Record<string, string> = {
  educativo: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  emocional: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  autoridad: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  venta: 'bg-green-500/15 text-green-300 border-green-500/20',
  comunidad: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
};

const ESFERA_COLORS: Record<string, string> = {
  enganchar: 'text-cyan-300',
  solucion: 'text-indigo-300',
  remarketing: 'text-orange-300',
  fidelizar: 'text-emerald-300',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" title="Copiar copy">
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function LandingContentCalendar({ contentCalendar }: Props) {
  const calendar = safeArray(contentCalendar?.calendar);
  const weeklyThemes = safeArray(contentCalendar?.weeklyThemes);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = all
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  if (calendar.length === 0) return <EmptySection label="Parrilla de Contenido" />;

  const filtered = selectedWeek > 0 ? calendar.filter((c: any) => c.week === selectedWeek) : calendar;

  // Pillar distribution
  const pillarCounts: Record<string, number> = {};
  calendar.forEach((c: any) => {
    const p = c.pillar?.toLowerCase();
    if (p) pillarCounts[p] = (pillarCounts[p] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      {/* Weekly themes */}
      {weeklyThemes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {weeklyThemes.map((wt: any, i: number) => (
            <div key={i} className="bg-muted/40 border border-border rounded-sm p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground/70 uppercase">Semana {wt.week || i + 1}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{wt.theme || '-'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Week filter */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map(w => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${selectedWeek === w ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
          >
            {w === 0 ? `Todas (${calendar.length})` : `Sem ${w}`}
          </button>
        ))}
      </div>

      {/* Calendar items */}
      <div className="space-y-2">
        {filtered.map((item: any, i: number) => {
          const isExpanded = expandedItem === i;
          const pillarClass = PILLAR_COLORS[item.pillar?.toLowerCase()] || 'bg-muted text-muted-foreground';
          const esferaClass = ESFERA_COLORS[item.esferaPhase?.toLowerCase()] || 'text-muted-foreground/70';

          return (
            <div key={i} className="bg-muted/40 border border-border rounded-sm overflow-hidden">
              <button
                onClick={() => setExpandedItem(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="text-center shrink-0 w-10">
                  <p className="text-[10px] text-muted-foreground/70">S{item.week || '?'}</p>
                  <p className="text-xs font-bold text-muted-foreground">D{item.day || '?'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{item.title || 'Sin titulo'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.format && <span className="text-[10px] text-muted-foreground/70">{item.format}</span>}
                    {item.platform && <span className="text-[10px] text-muted-foreground/70">· {item.platform}</span>}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${pillarClass}`}>
                  {item.pillar || '?'}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
                  {item.hook && (
                    <div>
                      <h6 className="text-[10px] text-muted-foreground/70 uppercase">Hook</h6>
                      <p className="text-xs text-purple-300/80 italic">"{item.hook}"</p>
                    </div>
                  )}
                  {item.description && (
                    <div>
                      <h6 className="text-[10px] text-muted-foreground/70 uppercase">Descripcion</h6>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  )}
                  {item.copy && (
                    <div>
                      <div className="flex items-center justify-between">
                        <h6 className="text-[10px] text-muted-foreground/70 uppercase">Copy</h6>
                        <CopyButton text={item.copy} />
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{item.copy}</p>
                    </div>
                  )}
                  {item.cta && (
                    <div>
                      <h6 className="text-[10px] text-muted-foreground/70 uppercase">CTA</h6>
                      <p className="text-xs text-muted-foreground">{item.cta}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {safeArray(item.hashtags).map((h: string, j: number) => (
                      <span key={j} className="text-[10px] text-purple-400/50">{h.startsWith('#') ? h : `#${h}`}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    {item.esferaPhase && <span className={esferaClass}>{item.esferaPhase}</span>}
                    {item.avatar && <span className="text-muted-foreground/70">{item.avatar}</span>}
                  </div>
                  {item.productionNotes && (
                    <p className="text-[10px] text-muted-foreground/70 italic">{item.productionNotes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pillar Distribution */}
      {Object.keys(pillarCounts).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Distribucion por Pilar</h4>
          <div className="space-y-1.5">
            {Object.entries(pillarCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([pillar, count]) => {
                const pct = Math.round((count / calendar.length) * 100);
                return (
                  <div key={pillar} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 capitalize">{pillar}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground/70 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
