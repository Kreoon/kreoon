import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface CalendarItem {
  week?: number;
  day?: number;
  dayLabel?: string;
  platform?: string;
  format?: string;
  pillar?: string;
  title?: string;
  hook?: string;
  description?: string;
  copy?: string;
  cta?: string;
  hashtags?: string[];
  esferaPhase?: string;
  avatar?: string;
  productionNotes?: string;
}

interface WeeklyTheme {
  week?: number;
  theme?: string;
  objective?: string;
  focusPhase?: string;
}

interface ContentCalendarData {
  calendar?: CalendarItem[];
  weeklyThemes?: WeeklyTheme[];
  leadMagnetDays?: { week?: number; day?: number; leadMagnetName?: string; promotionCopy?: string }[];
  generatedAt?: string;
}

interface ContentCalendarTabProps {
  contentCalendar?: ContentCalendarData | null;
}

const PILLAR_COLORS: Record<string, string> = {
  educativo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  emocional: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  autoridad: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  venta: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  comunidad: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const ESFERA_COLORS: Record<string, string> = {
  enganchar: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  solucion: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  remarketing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  fidelizar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const WEEK_LABELS = ['', 'Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];

function safeArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  return [];
}

export function ContentCalendarTab({ contentCalendar }: ContentCalendarTabProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = all
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const calendar = safeArray(contentCalendar?.calendar);
  const weeklyThemes = safeArray(contentCalendar?.weeklyThemes);
  const leadMagnetDays = safeArray(contentCalendar?.leadMagnetDays);

  if (!contentCalendar || calendar.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver la parrilla de contenido</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  const filteredCalendar = calendar.filter((item: CalendarItem) => {
    if (selectedWeek > 0 && item.week !== selectedWeek) return false;
    if (selectedPillar && item.pillar !== selectedPillar) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Semana', 'Día', 'Plataforma', 'Formato', 'Pilar', 'Fase ESFERA', 'Avatar', 'Título', 'Hook', 'Copy', 'CTA', 'Hashtags', 'Notas de Producción'];
    const rows = calendar.map((item: CalendarItem) => [
      item.week || '',
      item.dayLabel || `Día ${item.day || ''}`,
      item.platform || '',
      item.format || '',
      item.pillar || '',
      item.esferaPhase || '',
      item.avatar || '',
      (item.title || '').replace(/"/g, '""'),
      (item.hook || '').replace(/"/g, '""'),
      (item.copy || '').replace(/"/g, '""'),
      (item.cta || '').replace(/"/g, '""'),
      safeArray(item.hashtags).join(' '),
      (item.productionNotes || '').replace(/"/g, '""'),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parrilla-contenido-30-dias.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-500" />
              Parrilla de Contenido — 30 Días
            </h3>
            <p className="text-sm text-muted-foreground">
              {calendar.length} piezas de contenido distribuidas en 4 semanas estratégicas.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
            <Download className="h-3 w-3" />
            CSV
          </Button>
        </div>
      </div>

      {/* Weekly Themes */}
      {weeklyThemes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {weeklyThemes.map((wt: WeeklyTheme, idx: number) => (
            <Card key={idx} className="cursor-pointer hover:border-primary/40 transition-colors duration-150"
              onClick={() => setSelectedWeek(selectedWeek === (wt.week || idx + 1) ? 0 : (wt.week || idx + 1))}>
              <CardContent className="p-3">
                <p className="text-xs font-medium text-primary">{WEEK_LABELS[wt.week || idx + 1] || `Semana ${wt.week || idx + 1}`}</p>
                <p className="text-sm font-semibold mt-1">{wt.theme || 'Tema'}</p>
                <p className="text-xs text-muted-foreground mt-1">{wt.objective || ''}</p>
                {wt.focusPhase && <Badge className={`text-xs mt-2 ${ESFERA_COLORS[wt.focusPhase] || ''}`}>{wt.focusPhase}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button variant={selectedWeek === 0 ? 'default' : 'outline'} size="sm" onClick={() => setSelectedWeek(0)}>Todas</Button>
        {[1, 2, 3, 4].map(w => (
          <Button key={w} variant={selectedWeek === w ? 'default' : 'outline'} size="sm" onClick={() => setSelectedWeek(w)}>
            S{w}
          </Button>
        ))}
        <span className="mx-2 text-muted-foreground">|</span>
        <Button variant={!selectedPillar ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPillar('')}>Todos</Button>
        {Object.keys(PILLAR_COLORS).map(p => (
          <Button key={p} variant={selectedPillar === p ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPillar(selectedPillar === p ? '' : p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
      </div>

      {/* Lead Magnet Days */}
      {leadMagnetDays.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lead Magnets Programados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {leadMagnetDays.map((lm: any, idx: number) => (
                <div key={idx} className="p-2 bg-background rounded border text-xs">
                  <p className="font-medium">S{lm.week} D{lm.day}: {lm.leadMagnetName || 'Lead Magnet'}</p>
                  {lm.promotionCopy && <p className="text-muted-foreground mt-1">{lm.promotionCopy}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Items */}
      <div className="space-y-3">
        {filteredCalendar.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">No hay contenido para los filtros seleccionados</p>
        )}
        {filteredCalendar.map((item: CalendarItem, idx: number) => {
          const isExpanded = expandedItem === idx;
          return (
            <Card key={idx} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors duration-150"
                onClick={() => setExpandedItem(isExpanded ? null : idx)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-xs">{item.dayLabel || `S${item.week} D${item.day}`}</Badge>
                      <Badge variant="outline" className="text-xs">{item.platform || 'N/A'}</Badge>
                      <Badge variant="outline" className="text-xs">{item.format || 'N/A'}</Badge>
                      {item.pillar && <Badge className={`text-xs ${PILLAR_COLORS[item.pillar] || ''}`}>{item.pillar}</Badge>}
                      {item.esferaPhase && <Badge className={`text-xs ${ESFERA_COLORS[item.esferaPhase] || ''}`}>{item.esferaPhase}</Badge>}
                    </div>
                    <p className="text-sm font-medium">{item.title || 'Sin título'}</p>
                    {item.hook && <p className="text-xs text-muted-foreground mt-1 italic">"{item.hook}"</p>}
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t space-y-3">
                  {item.avatar && (
                    <p className="text-xs"><strong>Avatar:</strong> {item.avatar}</p>
                  )}
                  {item.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                      <p className="text-sm">{item.description}</p>
                    </div>
                  )}
                  {item.copy && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Copy listo para publicar</p>
                      <div className="p-3 bg-muted/50 rounded text-sm whitespace-pre-wrap">{item.copy}</div>
                    </div>
                  )}
                  {item.cta && (
                    <p className="text-xs"><strong>CTA:</strong> {item.cta}</p>
                  )}
                  {safeArray(item.hashtags).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {safeArray(item.hashtags).map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {item.productionNotes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notas de producción</p>
                      <p className="text-xs text-muted-foreground">{item.productionNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
