import { useState } from 'react';
import { addWeeks, addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Clock, ShieldOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PauseMode = 'temporary' | 'permanent';

const PRESET_OPTIONS: { label: string; weeks?: number; months?: number }[] = [
  { label: '1 semana',   weeks: 1 },
  { label: '2 semanas',  weeks: 2 },
  { label: '1 mes',      months: 1 },
  { label: '3 meses',    months: 3 },
];

function computeUntil(preset: typeof PRESET_OPTIONS[number]): Date {
  const base = new Date();
  if (preset.months) return addMonths(base, preset.months);
  return addWeeks(base, preset.weeks ?? 1);
}

interface Props {
  open: boolean;
  onClose: () => void;
  memberName: string;
  creatorProfileId: string;
  currentPausedUntil: string | null;
  currentIsActive: boolean | null;
  onConfirm: (args: { creatorProfileId: string; pausedUntil: string | null; permanent: boolean }) => void;
  loading?: boolean;
}

export function TalentMarketplacePauseDialog({
  open,
  onClose,
  memberName,
  creatorProfileId,
  currentPausedUntil,
  currentIsActive,
  onConfirm,
  loading,
}: Props) {
  const isCurrentlyPaused = currentIsActive === false ||
    (currentPausedUntil != null && new Date(currentPausedUntil) > new Date());

  const [mode, setMode] = useState<PauseMode>('temporary');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customDate, setCustomDate] = useState('');

  if (isCurrentlyPaused) {
    // ── Reactivation mode ─────────────────────────────────────────────────
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Reactivar en marketplace
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Deseas volver a hacer visible a <span className="font-semibold text-foreground">{memberName}</span> en el marketplace?
          </p>
          {currentPausedUntil && currentIsActive !== false && (
            <p className="text-xs text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
              Pausa activa hasta: {format(new Date(currentPausedUntil), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          )}
          {currentIsActive === false && !currentPausedUntil && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-3 py-2">
              Desactivado permanentemente del marketplace
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
              onClick={() => onConfirm({ creatorProfileId, pausedUntil: null, permanent: false })}
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Sí, reactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Pause mode ────────────────────────────────────────────────────────────
  const untilDate = customDate
    ? new Date(customDate + 'T23:59:59')
    : computeUntil(PRESET_OPTIONS[selectedPreset]);

  function handleConfirm() {
    if (mode === 'permanent') {
      onConfirm({ creatorProfileId, pausedUntil: null, permanent: true });
    } else {
      onConfirm({ creatorProfileId, pausedUntil: untilDate.toISOString(), permanent: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-amber-500" />
            Ocultar del marketplace
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          ¿Cuánto tiempo quieres ocultar a <span className="font-semibold text-foreground">{memberName}</span>?
        </p>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('temporary')}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-all',
              mode === 'temporary'
                ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground',
            )}
          >
            <Clock className="h-5 w-5" />
            <span className="font-medium">Temporal</span>
            <span className="text-[10px] opacity-70">Se reactiva solo</span>
          </button>
          <button
            onClick={() => setMode('permanent')}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-all',
              mode === 'permanent'
                ? 'border-red-500 bg-red-500/10 text-red-400'
                : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground',
            )}
          >
            <ShieldOff className="h-5 w-5" />
            <span className="font-medium">Permanente</span>
            <span className="text-[10px] opacity-70">Manual para activar</span>
          </button>
        </div>

        {mode === 'temporary' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {PRESET_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => { setSelectedPreset(i); setCustomDate(''); }}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-all',
                    selectedPreset === i && !customDate
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Fecha personalizada
              </label>
              <input
                type="date"
                value={customDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground [color-scheme:dark]"
              />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Se reactivará automáticamente el{' '}
              <span className="font-medium text-foreground">
                {format(customDate ? new Date(customDate + 'T23:59:59') : untilDate, "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </p>
          </div>
        )}

        {mode === 'permanent' && (
          <div className="flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">
              El talento quedará oculto del marketplace indefinidamente. Solo se reactiva manualmente desde esta misma tarjeta.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={loading}
            className={mode === 'permanent' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
            onClick={handleConfirm}
          >
            {mode === 'permanent' ? (
              <><ShieldOff className="h-4 w-4 mr-1.5" /> Desactivar permanentemente</>
            ) : (
              <><Clock className="h-4 w-4 mr-1.5" /> Pausar temporalmente</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
