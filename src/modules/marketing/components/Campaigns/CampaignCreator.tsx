import { useState } from 'react';
import {
  Sparkles, ArrowLeft, ArrowRight, Check, Loader2,
  Target, DollarSign, Users, Image, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdAccounts } from '../../hooks/useAdAccounts';
import { useAdCampaigns } from '../../hooks/useAdCampaigns';
import { AdPlatformIcon } from '../common/AdPlatformIcon';
import { AD_PLATFORMS, OBJECTIVE_LABELS, OBJECTIVE_DESCRIPTIONS, BID_STRATEGIES } from '../../config';
import type { AdPlatform, AdObjective, CampaignFormData, AdTargeting, AdCreative } from '../../types/marketing.types';
import { toast } from 'sonner';

const STEPS = [
  { id: 'platform', label: 'Plataforma', icon: Zap },
  { id: 'objective', label: 'Objetivo', icon: Target },
  { id: 'audience', label: 'Audiencia', icon: Users },
  { id: 'creative', label: 'Creativo', icon: Image },
  { id: 'budget', label: 'Presupuesto', icon: DollarSign },
] as const;

interface CampaignCreatorProps {
  contentId?: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function CampaignCreator({ contentId, onSuccess, onBack }: CampaignCreatorProps) {
  const { accounts } = useAdAccounts();
  const { createCampaign, aiCreateCampaign } = useAdCampaigns();

  const [step, setStep] = useState(0);
  const [useAI, setUseAI] = useState(true);
  const [isAILoading, setIsAILoading] = useState(false);

  // Form state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [platform, setPlatform] = useState<AdPlatform | ''>('');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState<AdObjective>('traffic');
  const [dailyBudget, setDailyBudget] = useState<number>(10);
  const [lifetimeBudget, setLifetimeBudget] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bidStrategy, setBidStrategy] = useState('lowest_cost');

  // Targeting
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [locations, setLocations] = useState('');
  const [interests, setInterests] = useState('');
  const [genders, setGenders] = useState<string>('all');

  // Creative
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('LEARN_MORE');
  const [destinationUrl, setDestinationUrl] = useState('');

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleAIGenerate = async () => {
    if (!contentId || !platform || !selectedAccountId) {
      toast.error('Selecciona plataforma y cuenta primero');
      return;
    }
    setIsAILoading(true);
    try {
      const result = await aiCreateCampaign.mutateAsync({
        contentId,
        platform: platform as AdPlatform,
        adAccountId: selectedAccountId,
        objective,
        budget: dailyBudget,
      });

      if (result.campaign) {
        setName(result.campaign.name || name);
        setHeadline(result.campaign.creative?.headline || '');
        setBody(result.campaign.creative?.body || '');
        setCta(result.campaign.creative?.cta || 'LEARN_MORE');
        if (result.campaign.targeting?.age_min) setAgeMin(result.campaign.targeting.age_min);
        if (result.campaign.targeting?.age_max) setAgeMax(result.campaign.targeting.age_max);
        if (result.campaign.dailyBudget) setDailyBudget(result.campaign.dailyBudget);
        toast.success('Campaña generada con IA');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccountId || !platform) {
      toast.error('Selecciona una cuenta');
      return;
    }

    const targeting: AdTargeting = {
      age_min: ageMin,
      age_max: ageMax,
      genders: genders === 'all' ? ['all'] : [genders as 'male' | 'female'],
      locations: locations.split(',').filter(Boolean).map(l => ({
        type: 'country' as const,
        key: l.trim(),
        name: l.trim(),
      })),
      interests: interests.split(',').filter(Boolean).map(i => ({
        id: i.trim(),
        name: i.trim(),
      })),
    };

    const creative: AdCreative = {
      headline,
      body,
      cta,
    };

    const formData: CampaignFormData = {
      adAccountId: selectedAccountId,
      name: name || `Campaña ${new Date().toLocaleDateString()}`,
      objective,
      dailyBudget,
      lifetimeBudget,
      startDate: startDate || null,
      endDate: endDate || null,
      targeting,
      placements: [],
      creative,
      bidStrategy,
      bidAmount: null,
      contentId: contentId || null,
    };

    try {
      await createCampaign.mutateAsync(formData);
      toast.success('Campaña creada exitosamente');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {onBack && (
          <Button size="icon" variant="ghost" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all',
                  i === step ? 'bg-primary text-primary-foreground' :
                  i < step ? 'bg-primary/20 text-primary' :
                  'bg-muted/30 text-muted-foreground'
                )}
              >
                {i < step ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        {contentId && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Usar IA</Label>
            <Switch checked={useAI} onCheckedChange={setUseAI} />
          </div>
        )}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Selecciona cuenta de ads</Label>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tienes cuentas de ads conectadas. Ve a la pestaña "Cuentas" para conectar.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setPlatform(account.platform);
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      selectedAccountId === account.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <AdPlatformIcon platform={account.platform} size="md" withBg />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{account.account_name}</p>
                      <p className="text-[10px] text-muted-foreground">{account.platform_account_id}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nombre de la campaña</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mi campaña..."
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Objetivo de la campaña</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.entries(OBJECTIVE_LABELS) as [AdObjective, string][])
              .filter(([key]) => !platform || AD_PLATFORMS[platform as AdPlatform]?.supportedObjectives.includes(key))
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setObjective(key)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    objective === key
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/30'
                  )}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {OBJECTIVE_DESCRIPTIONS[key]}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Audiencia</Label>
            {useAI && contentId && (
              <Button size="sm" variant="outline" onClick={handleAIGenerate} disabled={isAILoading}>
                {isAILoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Generar con IA
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Edad mínima</Label>
              <Input type="number" value={ageMin} onChange={e => setAgeMin(+e.target.value)} min={13} max={65} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Edad máxima</Label>
              <Input type="number" value={ageMax} onChange={e => setAgeMax(+e.target.value)} min={18} max={65} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Género</Label>
            <Select value={genders} onValueChange={setGenders}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="male">Hombres</SelectItem>
                <SelectItem value="female">Mujeres</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ubicaciones (separadas por coma)</Label>
            <Input value={locations} onChange={e => setLocations(e.target.value)} placeholder="CO, MX, AR, US..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Intereses (separados por coma)</Label>
            <Input value={interests} onChange={e => setInterests(e.target.value)} placeholder="marketing digital, emprendimiento..." />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Creativo</Label>
            {useAI && contentId && (
              <Button size="sm" variant="outline" onClick={handleAIGenerate} disabled={isAILoading}>
                {isAILoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Generar con IA
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título / Headline</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Tu mejor título..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Texto del anuncio</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Descripción de tu anuncio..." className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">CTA (llamada a la acción)</Label>
              <Select value={cta} onValueChange={setCta}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEARN_MORE">Más información</SelectItem>
                  <SelectItem value="SHOP_NOW">Comprar ahora</SelectItem>
                  <SelectItem value="SIGN_UP">Registrarse</SelectItem>
                  <SelectItem value="CONTACT_US">Contáctanos</SelectItem>
                  <SelectItem value="DOWNLOAD">Descargar</SelectItem>
                  <SelectItem value="WATCH_MORE">Ver más</SelectItem>
                  <SelectItem value="BOOK_NOW">Reservar</SelectItem>
                  <SelectItem value="GET_QUOTE">Cotizar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL destino</Label>
              <Input value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Presupuesto y programación</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Presupuesto diario (USD)</Label>
              <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(+e.target.value)} min={1} step={0.01} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Presupuesto total (opcional)</Label>
              <Input
                type="number"
                value={lifetimeBudget || ''}
                onChange={e => setLifetimeBudget(e.target.value ? +e.target.value : null)}
                placeholder="Sin límite"
                min={1}
                step={0.01}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fecha fin</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Estrategia de puja</Label>
            <Select value={bidStrategy} onValueChange={setBidStrategy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BID_STRATEGIES.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Summary */}
          <Card className="bg-muted/20">
            <CardContent className="py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Resumen</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Plataforma:</span>
                <span className="font-medium capitalize">{platform} Ads</span>
                <span className="text-muted-foreground">Objetivo:</span>
                <span className="font-medium">{OBJECTIVE_LABELS[objective]}</span>
                <span className="text-muted-foreground">Presupuesto/día:</span>
                <span className="font-medium">${dailyBudget}</span>
                {lifetimeBudget && (
                  <>
                    <span className="text-muted-foreground">Presupuesto total:</span>
                    <span className="font-medium">${lifetimeBudget}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>
            Siguiente <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createCampaign.isPending}>
            {createCampaign.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Crear campaña
          </Button>
        )}
      </div>
    </div>
  );
}
