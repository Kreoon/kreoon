import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Video,
  DollarSign,
  Calendar,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { LiveSchedulePicker } from './shared/LiveSchedulePicker';
import { useLiveHostingRequests } from '@/hooks/useLiveHosting';
import { useAuth } from '@/hooks/useAuth';
import type {
  HostingChannel,
  StreamingSessionType,
  CreateHostingRequestPayload,
  HostingRequestFormState,
} from '@/types/live-hosting.types';

interface CreateRequestWizardProps {
  organizationId: string;
  brandId?: string;
  clientId?: string;
  defaultChannel?: HostingChannel;
  onSuccess?: (requestId: string) => void;
}

const LIVE_TYPES: { value: StreamingSessionType; label: string; description: string }[] = [
  { value: 'live_shopping', label: 'Live Shopping', description: 'Venta de productos en vivo' },
  { value: 'interview', label: 'Entrevista', description: 'Formato de conversación' },
  { value: 'webinar', label: 'Webinar', description: 'Presentación educativa' },
  { value: 'launch', label: 'Lanzamiento', description: 'Presentación de producto' },
  { value: 'standard', label: 'Estándar', description: 'Transmisión general' },
];

const NICHES = [
  'Belleza', 'Moda', 'Tecnología', 'Gaming', 'Fitness', 'Cocina',
  'Lifestyle', 'Finanzas', 'Educación', 'Entretenimiento', 'Música', 'Arte',
];

const INITIAL_STATE: HostingRequestFormState = {
  step: 0,
  channel: 'marketplace',
  basicInfo: {
    title: '',
    description: '',
    requirements: [],
  },
  scheduling: {
    scheduled_date: null,
    scheduled_time_start: '10:00',
    scheduled_time_end: '',
    timezone: 'America/Bogota',
    estimated_duration_minutes: 60,
  },
  configuration: {
    live_type: 'live_shopping',
    products_to_showcase: [],
    target_audience: '',
    content_guidelines: '',
    preferred_niches: [],
    preferred_languages: ['es'],
  },
  budget: {
    budget_type: 'range',
    budget_min_usd: 100,
    budget_max_usd: 500,
    fixed_rate_usd: 200,
    commission_on_sales_pct: 10,
  },
};

export function CreateRequestWizard({
  organizationId,
  brandId,
  clientId,
  defaultChannel,
  onSuccess,
}: CreateRequestWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRequest, isCreating, publishToMarketplace, isPublishing } = useLiveHostingRequests(organizationId);

  const [state, setState] = useState<HostingRequestFormState>({
    ...INITIAL_STATE,
    channel: defaultChannel || 'marketplace',
  });

  const updateState = <K extends keyof HostingRequestFormState>(
    key: K,
    value: HostingRequestFormState[K]
  ) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const updateBasicInfo = (updates: Partial<HostingRequestFormState['basicInfo']>) => {
    setState((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, ...updates },
    }));
  };

  const updateScheduling = (updates: Partial<HostingRequestFormState['scheduling']>) => {
    setState((prev) => ({
      ...prev,
      scheduling: { ...prev.scheduling, ...updates },
    }));
  };

  const updateConfiguration = (updates: Partial<HostingRequestFormState['configuration']>) => {
    setState((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, ...updates },
    }));
  };

  const updateBudget = (updates: Partial<HostingRequestFormState['budget']>) => {
    setState((prev) => ({
      ...prev,
      budget: { ...prev.budget, ...updates },
    }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 0: // Channel selection
        return true;
      case 1: // Basic info
        return state.basicInfo.title.trim().length > 0;
      case 2: // Scheduling
        return state.scheduling.scheduled_date !== null;
      case 3: // Configuration
        return true;
      case 4: // Budget
        return (
          state.budget.budget_type === 'range'
            ? state.budget.budget_min_usd > 0 && state.budget.budget_max_usd > state.budget.budget_min_usd
            : state.budget.budget_type === 'fixed'
            ? state.budget.fixed_rate_usd > 0
            : state.budget.commission_on_sales_pct > 0
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    const payload: CreateHostingRequestPayload = {
      channel: state.channel,
      organization_id: organizationId,
      brand_id: brandId,
      client_id: clientId,
      title: state.basicInfo.title,
      description: state.basicInfo.description,
      requirements: state.basicInfo.requirements,
      preferred_niches: state.configuration.preferred_niches,
      preferred_languages: state.configuration.preferred_languages,
      scheduled_date: state.scheduling.scheduled_date!.toISOString().split('T')[0],
      scheduled_time_start: state.scheduling.scheduled_time_start,
      scheduled_time_end: state.scheduling.scheduled_time_end || undefined,
      timezone: state.scheduling.timezone,
      estimated_duration_minutes: state.scheduling.estimated_duration_minutes,
      live_type: state.configuration.live_type,
      products_to_showcase: state.configuration.products_to_showcase,
      target_audience: state.configuration.target_audience,
      content_guidelines: state.configuration.content_guidelines,
      ...(state.budget.budget_type === 'range' && {
        budget_min_usd: state.budget.budget_min_usd,
        budget_max_usd: state.budget.budget_max_usd,
      }),
      ...(state.budget.budget_type === 'fixed' && {
        fixed_rate_usd: state.budget.fixed_rate_usd,
      }),
      ...(state.budget.budget_type === 'commission' && {
        commission_on_sales_pct: state.budget.commission_on_sales_pct,
      }),
    };

    const result = await createRequest(payload);

    if (result.success && result.request_id) {
      // Si es marketplace, publicar automáticamente
      if (state.channel === 'marketplace') {
        await publishToMarketplace(result.request_id);
      }

      onSuccess?.(result.request_id);
      navigate(`/streaming/hosting/${result.request_id}`);
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Selecciona el tipo de contratación</h2>
              <p className="text-muted-foreground">
                Elige cómo quieres contratar al host para tu transmisión
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card
                className={`cursor-pointer transition-all ${
                  state.channel === 'marketplace'
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => updateState('channel', 'marketplace')}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-blue-100">
                      <Store className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Marketplace</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Publica tu solicitud y recibe aplicaciones de hosts disponibles
                    </p>
                  </div>
                  <Badge variant="outline">20% comisión</Badge>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  state.channel === 'direct'
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => updateState('channel', 'direct')}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-purple-100">
                      <Briefcase className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Invitación Directa</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Invita directamente a un creador específico
                    </p>
                  </div>
                  <Badge variant="outline">20% comisión</Badge>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  state.channel === 'org_managed'
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => updateState('channel', 'org_managed')}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-100">
                      <Building2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Gestión Interna</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Asigna un creador de tu equipo interno
                    </p>
                  </div>
                  <Badge variant="outline">10-12% comisión</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Información básica</h2>
              <p className="text-muted-foreground">
                Describe tu transmisión en vivo
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título de la transmisión *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Live Shopping - Colección Primavera"
                  value={state.basicInfo.title}
                  onChange={(e) => updateBasicInfo({ title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe qué se hará en la transmisión, productos a mostrar, etc."
                  rows={4}
                  value={state.basicInfo.description}
                  onChange={(e) => updateBasicInfo({ description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Requisitos del host (opcional)</Label>
                <Textarea
                  placeholder="Ej: Experiencia en moda, buena iluminación, cámara HD..."
                  rows={3}
                  value={state.basicInfo.requirements.join('\n')}
                  onChange={(e) =>
                    updateBasicInfo({
                      requirements: e.target.value.split('\n').filter((r) => r.trim()),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Un requisito por línea</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Programación</h2>
              <p className="text-muted-foreground">
                Selecciona fecha y hora para tu transmisión
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <LiveSchedulePicker
                date={state.scheduling.scheduled_date}
                onDateChange={(d) => updateScheduling({ scheduled_date: d })}
                timeStart={state.scheduling.scheduled_time_start}
                onTimeStartChange={(t) => updateScheduling({ scheduled_time_start: t })}
                timeEnd={state.scheduling.scheduled_time_end}
                onTimeEndChange={(t) => updateScheduling({ scheduled_time_end: t })}
                timezone={state.scheduling.timezone}
                onTimezoneChange={(tz) => updateScheduling({ timezone: tz })}
                estimatedDuration={state.scheduling.estimated_duration_minutes}
                onEstimatedDurationChange={(m) =>
                  updateScheduling({ estimated_duration_minutes: m })
                }
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Configuración</h2>
              <p className="text-muted-foreground">
                Define el tipo de live y preferencias
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-3">
                <Label>Tipo de transmisión</Label>
                <div className="grid grid-cols-2 gap-3">
                  {LIVE_TYPES.map((type) => (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all p-3 ${
                        state.configuration.live_type === type.value
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => updateConfiguration({ live_type: type.value })}
                    >
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Nichos preferidos</Label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((niche) => (
                    <Badge
                      key={niche}
                      variant={
                        state.configuration.preferred_niches.includes(niche)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const niches = state.configuration.preferred_niches.includes(niche)
                          ? state.configuration.preferred_niches.filter((n) => n !== niche)
                          : [...state.configuration.preferred_niches, niche];
                        updateConfiguration({ preferred_niches: niches });
                      }}
                    >
                      {niche}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audiencia objetivo</Label>
                <Input
                  placeholder="Ej: Mujeres 25-45 años interesadas en moda"
                  value={state.configuration.target_audience}
                  onChange={(e) => updateConfiguration({ target_audience: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Guías de contenido</Label>
                <Textarea
                  placeholder="Instrucciones especiales para el host..."
                  rows={3}
                  value={state.configuration.content_guidelines}
                  onChange={(e) =>
                    updateConfiguration({ content_guidelines: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Presupuesto</h2>
              <p className="text-muted-foreground">
                Define la compensación para el host
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-6">
              <Tabs
                value={state.budget.budget_type}
                onValueChange={(v) => updateBudget({ budget_type: v as 'range' | 'fixed' | 'commission' })}
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="range">Rango</TabsTrigger>
                  <TabsTrigger value="fixed">Fijo</TabsTrigger>
                  <TabsTrigger value="commission">Comisión</TabsTrigger>
                </TabsList>

                <TabsContent value="range" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mínimo (USD)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          className="pl-9"
                          value={state.budget.budget_min_usd}
                          onChange={(e) =>
                            updateBudget({ budget_min_usd: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo (USD)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          className="pl-9"
                          value={state.budget.budget_max_usd}
                          onChange={(e) =>
                            updateBudget({ budget_max_usd: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Los hosts pueden proponer dentro de este rango
                  </p>
                </TabsContent>

                <TabsContent value="fixed" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Tarifa fija (USD)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-9"
                        value={state.budget.fixed_rate_usd}
                        onChange={(e) =>
                          updateBudget({ fixed_rate_usd: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El host recibirá esta cantidad exacta
                  </p>
                </TabsContent>

                <TabsContent value="commission" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Porcentaje de comisión sobre ventas</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={state.budget.commission_on_sales_pct}
                        onChange={(e) =>
                          updateBudget({ commission_on_sales_pct: Number(e.target.value) })
                        }
                      />
                      <span className="absolute right-3 top-3 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El host ganará un porcentaje de las ventas generadas
                  </p>
                </TabsContent>
              </Tabs>

              <Card className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Comisión de plataforma</p>
                    <p className="text-muted-foreground">
                      {state.channel === 'org_managed'
                        ? 'KREOON cobrará 10-12% sobre el total'
                        : 'KREOON cobrará 20% sobre el total'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const totalSteps = 5;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-12 rounded-full transition-colors ${
              i < state.step
                ? 'bg-primary'
                : i === state.step
                ? 'bg-primary/60'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (state.step === 0) {
              navigate(-1);
            } else {
              updateState('step', state.step - 1);
            }
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {state.step === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        {state.step < totalSteps - 1 ? (
          <Button
            onClick={() => updateState('step', state.step + 1)}
            disabled={!canProceed()}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isCreating || isPublishing}
          >
            {isCreating || isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {state.channel === 'marketplace' ? 'Crear y Publicar' : 'Crear Solicitud'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
