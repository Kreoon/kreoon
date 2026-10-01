import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Users, Clock, Zap, ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UGC_PRICE_MATRIX, COMMISSION_RATES } from '@/lib/finance/constants';
import type { UGCContentType, CreatorTier } from '@/lib/finance/constants';
import { supabase } from '@/integrations/supabase/client';

const CONTENT_TYPE_OPTIONS: { id: UGCContentType; label: string; emoji: string }[] = [
  { id: 'ugc', label: 'UGC', emoji: '📱' },
  { id: 'resena', label: 'Resena', emoji: '⭐' },
  { id: 'tutorial', label: 'Tutorial', emoji: '🎓' },
  { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
  { id: 'evento', label: 'Evento', emoji: '🎉' },
];

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
];

const DURATION_OPTIONS = [
  { days: 7, label: '7 dias' },
  { days: 14, label: '14 dias' },
  { days: 21, label: '21 dias' },
  { days: 30, label: '30 dias' },
];

const TIER_OPTIONS: { id: CreatorTier; label: string; desc: string }[] = [
  { id: 'emergente', label: 'Emergente', desc: '<5K seguidores' },
  { id: 'establecido', label: 'Establecido', desc: '5K-50K seguidores' },
  { id: 'premium', label: 'Premium', desc: '50K+ seguidores' },
];

const TEMPLATE_SLUGS: Record<UGCContentType, string> = {
  ugc: 'ugc-producto',
  resena: 'resena-redes',
  tutorial: 'tutorial',
  unboxing: 'unboxing',
  evento: 'evento',
};

export default function UGCPriceCalculator() {
  const navigate = useNavigate();

  const [contentType, setContentType] = useState<UGCContentType>('ugc');
  const [creatorCount, setCreatorCount] = useState(5);
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [duration, setDuration] = useState(14);
  const [tier, setTier] = useState<CreatorTier>('establecido');

  // Lead capture
  const [email, setEmail] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const estimate = useMemo(() => {
    const perCreator = UGC_PRICE_MATRIX[contentType][tier];
    const subtotal = perCreator * creatorCount;
    const platformFeePct = COMMISSION_RATES.campaigns_managed.base;
    const platformFee = Math.round(subtotal * platformFeePct / 100);
    const total = subtotal + platformFee;
    return { perCreator, subtotal, platformFeePct, platformFee, total };
  }, [contentType, creatorCount, tier]);

  const handleCaptureLead = async () => {
    if (!email.trim() || submittingLead) return;
    setSubmittingLead(true);
    try {
      await (supabase as any)
        .from('platform_leads')
        .insert({
          email: email.trim(),
          source: 'ugc_calculator',
          status: 'new',
          metadata: { content_type: contentType, creator_count: creatorCount, tier, platforms, estimate: estimate.total },
        });
      setLeadSubmitted(true);
    } catch {
      // Silent fail for lead capture
    } finally {
      setSubmittingLead(false);
    }
  };

  const handleFindCreators = () => {
    const slug = TEMPLATE_SLUGS[contentType];
    navigate(`/marketplace?tipo=${slug}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            Calculadora de Precios
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Cuanto cuesta una campana UGC?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Calcula el presupuesto estimado para tu campana de contenido con creadores reales.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left: Inputs */}
          <div className="md:col-span-3 space-y-6">
            {/* Content Type */}
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-2 block">Tipo de contenido</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {CONTENT_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setContentType(opt.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-sm border text-center transition-all',
                      contentType === opt.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border',
                    )}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs text-muted-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Creator Count */}
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Creadores: {creatorCount}
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={creatorCount}
                onChange={e => setCreatorCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span><span>25</span><span>50</span>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-2 block">Plataformas</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => togglePlatform(opt.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm border transition-all',
                      platforms.includes(opt.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-border',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Duracion
              </label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => setDuration(opt.days)}
                    className={cn(
                      'flex-1 py-2.5 rounded-sm text-sm border transition-all',
                      duration === opt.days
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border text-muted-foreground hover:border-border',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Creator Tier */}
            <div>
              <label className="text-sm text-muted-foreground font-medium mb-2 block">Nivel de creador</label>
              <div className="space-y-2">
                {TIER_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setTier(opt.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-sm border transition-all',
                      tier === opt.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border',
                    )}
                  >
                    <div className="text-left">
                      <span className="text-foreground font-medium text-sm">{opt.label}</span>
                      <p className="text-muted-foreground text-xs">{opt.desc}</p>
                    </div>
                    <span className="text-foreground font-semibold text-sm">
                      ${UGC_PRICE_MATRIX[contentType][opt.id]}/creador
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Estimate */}
          <div className="md:col-span-2">
            <div className="sticky top-24 bg-card/80 border border-border rounded-sm p-6 space-y-4">
              <h3 className="text-foreground font-bold text-lg">Estimacion</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{creatorCount} creador{creatorCount > 1 ? 'es' : ''} x ${estimate.perCreator}</span>
                  <span className="text-foreground">${estimate.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comision plataforma ({estimate.platformFeePct}%)</span>
                  <span className="text-foreground">${estimate.platformFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="text-foreground font-semibold">Total estimado</span>
                  <span className="text-2xl font-bold text-primary">${estimate.total.toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground text-xs">USD | Los precios pueden variar segun el creador</p>
              </div>

              {/* CTA */}
              <button
                onClick={handleFindCreators}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-sm transition-colors"
              >
                <Zap className="h-4 w-4" />
                Buscar Creadores
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Lead capture */}
              <div className="border-t border-border pt-4">
                <p className="text-muted-foreground text-xs mb-2">Recibe esta cotizacion por email (opcional)</p>
                {leadSubmitted ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Check className="h-4 w-4" />
                    Enviado!
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="flex-1 bg-muted/50 border border-border rounded-sm px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleCaptureLead}
                      disabled={submittingLead || !email.trim()}
                      className="bg-muted hover:bg-muted text-foreground text-sm px-3 py-2 rounded-sm transition-colors"
                    >
                      {submittingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
