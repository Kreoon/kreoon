import { useState, useEffect } from 'react';
import { Loader2, ChevronRight, ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PlatformIcon } from '../common/PlatformIcon';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TikTokPostSettings {
  privacyLevel: string | null;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandContentToggle: boolean;
  brandOrganic: boolean;
  brandedContent: boolean;
}

const DEFAULT_SETTINGS: TikTokPostSettings = {
  privacyLevel: null,
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  brandContentToggle: false,
  brandOrganic: false,
  brandedContent: false,
};

interface CreatorInfo {
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
  creator_nickname?: string;
  display_name?: string;
}

interface TikTokSettingsProps {
  accountId: string;
  accountName: string;
  onChange: (settings: TikTokPostSettings) => void;
}

// ── Privacy options ───────────────────────────────────────────────────────────

const PRIVACY_OPTIONS = [
  {
    value: 'PUBLIC_TO_EVERYONE',
    emoji: '🌍',
    label: 'Todo el mundo',
    desc: 'Cualquier persona en TikTok puede verlo',
    bg: 'hover:bg-green-500/10 border-border hover:border-green-500/40',
    selectedBg: 'bg-green-500/15 border-green-500/60',
    dot: 'bg-green-400',
  },
  {
    value: 'FOLLOWER_OF_CREATOR',
    emoji: '👥',
    label: 'Mis seguidores',
    desc: 'Solo la gente que te sigue',
    bg: 'hover:bg-blue-500/10 border-border hover:border-blue-500/40',
    selectedBg: 'bg-blue-500/15 border-blue-500/60',
    dot: 'bg-blue-400',
  },
  {
    value: 'MUTUAL_FOLLOW_FRIENDS',
    emoji: '🤝',
    label: 'Amigos mutuos',
    desc: 'Solo los que se siguen entre sí',
    bg: 'hover:bg-purple-500/10 border-border hover:border-purple-500/40',
    selectedBg: 'bg-purple-500/15 border-purple-500/60',
    dot: 'bg-purple-400',
  },
  {
    value: 'SELF_ONLY',
    emoji: '🔒',
    label: 'Solo yo',
    desc: 'Nadie más puede verlo',
    bg: 'hover:bg-muted/60 border-border hover:border-muted-foreground/30',
    selectedBg: 'bg-muted/60 border-muted-foreground/40',
    dot: 'bg-muted-foreground',
  },
];

// ── Interaction options ───────────────────────────────────────────────────────

const INTERACTION_OPTIONS = [
  { key: 'allowComment' as const, emoji: '💬', label: 'Comentarios', desc: '¿Pueden comentar?' },
  { key: 'allowDuet' as const,   emoji: '🎵', label: 'Dueto',        desc: '¿Pueden hacer dueto?' },
  { key: 'allowStitch' as const, emoji: '✂️', label: 'Stitch',       desc: '¿Pueden recortarlo?' },
];

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i < current  ? 'w-4 h-1.5 bg-primary' :
            i === current ? 'w-6 h-1.5 bg-primary' :
                            'w-1.5 h-1.5 bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

// ── Big option card ───────────────────────────────────────────────────────────

function BigCard({
  emoji,
  label,
  desc,
  selected,
  disabled,
  onClick,
  bg,
  selectedBg,
  dot,
}: {
  emoji: string;
  label: string;
  desc: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  bg: string;
  selectedBg: string;
  dot: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all duration-200',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]',
        selected ? selectedBg : bg
      )}
    >
      <span className="text-3xl leading-none select-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className={cn(
        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
        selected ? `${dot} border-transparent` : 'border-muted-foreground/30'
      )}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

// ── Toggle card ───────────────────────────────────────────────────────────────

function ToggleCard({
  emoji,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  emoji: string;
  label: string;
  desc: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-200',
        disabled ? 'opacity-30 cursor-not-allowed' :
        checked   ? 'border-primary/60 bg-primary/10 active:scale-[0.98]' :
                    'border-border hover:border-primary/30 hover:bg-muted/30 active:scale-[0.98]'
      )}
    >
      <span className="text-2xl leading-none select-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className={cn(
        'w-12 h-6 rounded-full border-2 shrink-0 flex items-center transition-all px-0.5',
        checked ? 'border-primary bg-primary justify-end' : 'border-muted-foreground/30 justify-start'
      )}>
        <div className="w-4 h-4 rounded-full bg-white shadow" />
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export function TikTokSettings({ accountId, accountName, onChange }: TikTokSettingsProps) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<TikTokPostSettings>(DEFAULT_SETTINGS);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStep(0);
    setSettings(DEFAULT_SETTINGS);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('social-publish/creator-info', {
          body: { account_id: accountId },
        });
        if (cancelled) return;
        if (fnError) throw fnError;
        setCreatorInfo(data?.creator_info as CreatorInfo);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Error al conectar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [accountId]);

  const update = (patch: Partial<TikTokPostSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      if (patch.brandedContent && next.privacyLevel === 'SELF_ONLY') next.privacyLevel = null;
      onChange(next);
      return next;
    });
  };

  const privacyOptions = creatorInfo?.privacy_level_options || ['SELF_ONLY'];
  const availablePrivacy = settings.brandedContent
    ? privacyOptions.filter(p => p !== 'SELF_ONLY')
    : privacyOptions;

  const canGoNext = step === 0 ? !!settings.privacyLevel : true;

  const creatorName = creatorInfo?.creator_nickname || creatorInfo?.display_name || accountName;

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
          <PlatformIcon platform="tiktok" size="md" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Conectando con TikTok...
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center px-4">
        <span className="text-4xl">😕</span>
        <p className="font-semibold text-sm">No pudimos conectar con TikTok</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  // ── Steps ───────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform="tiktok" size="sm" showBg />
          <p className="text-xs text-muted-foreground">
            Publicando como <span className="text-foreground font-medium">@{creatorName}</span>
          </p>
        </div>
        <Steps current={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div className="px-5 pb-5 space-y-3">

        {/* ── Paso 1: Privacidad ──────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div className="text-center space-y-1 pb-2">
              <p className="text-base font-bold">¿Quién puede ver tu video?</p>
              <p className="text-xs text-muted-foreground">Toca una opción para elegir</p>
            </div>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.filter(o => availablePrivacy.includes(o.value)).map(opt => (
                <BigCard
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  desc={opt.desc}
                  selected={settings.privacyLevel === opt.value}
                  bg={opt.bg}
                  selectedBg={opt.selectedBg}
                  dot={opt.dot}
                  onClick={() => update({ privacyLevel: opt.value })}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Paso 2: Interacciones ───────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="text-center space-y-1 pb-2">
              <p className="text-base font-bold">¿Qué pueden hacer con tu video?</p>
              <p className="text-xs text-muted-foreground">Activa los que quieras permitir</p>
            </div>
            <div className="space-y-2">
              {INTERACTION_OPTIONS.map(opt => (
                <ToggleCard
                  key={opt.key}
                  emoji={opt.emoji}
                  label={opt.label}
                  desc={opt.desc}
                  checked={settings[opt.key]}
                  disabled={
                    (opt.key === 'allowComment' && !!creatorInfo?.comment_disabled) ||
                    (opt.key === 'allowDuet'    && !!creatorInfo?.duet_disabled)    ||
                    (opt.key === 'allowStitch'  && !!creatorInfo?.stitch_disabled)
                  }
                  onChange={(v) => update({ [opt.key]: v })}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Paso 3: Publicidad ──────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="text-center space-y-1 pb-2">
              <p className="text-base font-bold">¿Es publicidad? 📢</p>
              <p className="text-xs text-muted-foreground">Si promocionas algo, TikTok lo pide</p>
            </div>

            <div className="space-y-2">
              {/* No es publicidad */}
              <BigCard
                emoji="🎬"
                label="No, es contenido normal"
                desc="Solo compartes algo sin promover nada"
                selected={!settings.brandContentToggle}
                bg="hover:bg-muted/30 border-border hover:border-muted-foreground/30"
                selectedBg="bg-muted/50 border-muted-foreground/40"
                dot="bg-muted-foreground"
                onClick={() => update({ brandContentToggle: false, brandOrganic: false, brandedContent: false })}
              />

              {/* Sí, mi propia marca */}
              <BigCard
                emoji="⭐"
                label="Sí, promociono mi negocio"
                desc="Hablas de tu propia marca o servicio"
                selected={settings.brandContentToggle && settings.brandOrganic && !settings.brandedContent}
                bg="hover:bg-amber-500/10 border-border hover:border-amber-500/40"
                selectedBg="bg-amber-500/15 border-amber-500/60"
                dot="bg-amber-400"
                onClick={() => update({ brandContentToggle: true, brandOrganic: true, brandedContent: false })}
              />

              {/* Sí, marca de terceros */}
              <BigCard
                emoji="🤝"
                label="Sí, es publicidad pagada"
                desc="Una marca te paga por publicar esto"
                selected={settings.brandContentToggle && settings.brandedContent}
                bg="hover:bg-purple-500/10 border-border hover:border-purple-500/40"
                selectedBg="bg-purple-500/15 border-purple-500/60"
                dot="bg-purple-400"
                onClick={() => update({ brandContentToggle: true, brandOrganic: false, brandedContent: true })}
              />
            </div>

            {/* Resumen y acuerdo */}
            {settings.privacyLevel && (
              <div className="mt-4 p-3.5 rounded-xl bg-muted/30 border border-white/8 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen</p>
                <SummaryLine emoji={PRIVACY_OPTIONS.find(o => o.value === settings.privacyLevel)?.emoji || '🔒'}
                  text={`Lo verán: ${PRIVACY_OPTIONS.find(o => o.value === settings.privacyLevel)?.label || ''}`} />
                {settings.allowComment && <SummaryLine emoji="💬" text="Comentarios activados" />}
                {settings.allowDuet    && <SummaryLine emoji="🎵" text="Dueto activado" />}
                {settings.allowStitch  && <SummaryLine emoji="✂️" text="Stitch activado" />}
                {!settings.allowComment && !settings.allowDuet && !settings.allowStitch && (
                  <SummaryLine emoji="🚫" text="Sin interacciones" />
                )}
                {settings.brandContentToggle && (
                  <SummaryLine emoji="📢" text={settings.brandedContent ? 'Publicidad pagada' : 'Contenido promocional propio'} />
                )}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed px-2">
              {settings.brandContentToggle && settings.brandedContent
                ? 'Al publicar, aceptas la Política de Contenido de Marca de TikTok y la Confirmación de Uso Musical.'
                : 'Al publicar, aceptas la Confirmación de Uso Musical de TikTok.'}
            </p>
          </>
        )}

        {/* ── Navegación ─────────────────────────────────────────────── */}
        <div className={cn('flex gap-2 pt-2', step === 0 ? 'justify-end' : 'justify-between')}>
          {step > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              className="gap-1.5 rounded-xl"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Atrás
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext}
              className="gap-1.5 rounded-xl"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <Check className="w-3.5 h-3.5" />
              ¡Todo listo!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-foreground/80">{text}</span>
    </div>
  );
}
