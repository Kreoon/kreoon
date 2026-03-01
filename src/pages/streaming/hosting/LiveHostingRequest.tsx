import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  Calendar,
  Clock,
  DollarSign,
  Video,
  Users,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  Star,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CreateRequestWizard,
  ApplicationReviewPanel,
  InviteHostDialog,
  OrgCreatorAssigner,
  HostApplicationForm,
  HostProfileCard,
} from '@/components/streaming/hosting';
import {
  useLiveHostingRequests,
  useLiveHostingHosts,
  useLiveHostingFinancials,
  useLiveHostingLifecycle,
} from '@/hooks/useLiveHosting';
import { useAuth } from '@/hooks/useAuth';
import type { LiveHostingRequestWithRelations, HostingChannel } from '@/types/live-hosting.types';
import {
  HOSTING_CHANNEL_LABELS,
  HOSTING_REQUEST_STATUS_LABELS,
  HOSTING_REQUEST_STATUS_COLORS,
} from '@/types/live-hosting.types';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function LiveHostingRequest() {
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, organizationId, brandId, roles } = useAuth();

  const isNewRequest = requestId === undefined || requestId === 'new';
  const defaultChannel = searchParams.get('channel') as HostingChannel | null;

  const { getRequest, cancelRequest, isCancelling } = useLiveHostingRequests(organizationId || undefined);
  const { hosts, confirmedHost } = useLiveHostingHosts(requestId || undefined);
  const { createCheckout, isCreatingCheckout, checkoutData } = useLiveHostingFinancials();
  const { startLive, endLive, completeHosting, isStartingLive, isEndingLive, isCompleting } =
    useLiveHostingLifecycle();

  const [request, setRequest] = useState<LiveHostingRequestWithRelations | null>(null);
  const [loading, setLoading] = useState(!isNewRequest);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const isOwner = request?.created_by === user?.id;
  const isHost = hosts.some((h) => h.user_id === user?.id);
  const isCreator = roles?.includes('creator');
  const canApply = isCreator && request?.status === 'open' && !isHost;

  useEffect(() => {
    if (!isNewRequest && requestId) {
      loadRequest();
    }
  }, [requestId]);

  const loadRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    const data = await getRequest(requestId);
    setRequest(data);
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!requestId) return;
    await cancelRequest({ requestId, reason: 'Cancelado por el usuario' });
    navigate('/streaming/hosting');
  };

  const handleCheckout = async () => {
    if (!requestId) return;

    const result = await createCheckout(requestId);
    if (result.client_secret) {
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.confirmPayment({
          clientSecret: result.client_secret,
          confirmParams: {
            return_url: `${window.location.origin}/streaming/hosting/${requestId}?payment=success`,
          },
        });

        if (error) {
          toast.error(error.message || 'Error en el pago');
        }
      }
    }
  };

  const handleStartLive = async () => {
    if (!requestId) return;
    await startLive(requestId);
    loadRequest();
  };

  const handleEndLive = async () => {
    if (!requestId) return;
    await endLive({ request_id: requestId });
    loadRequest();
  };

  const handleComplete = async () => {
    if (!requestId) return;
    await completeHosting({ request_id: requestId });
    loadRequest();
  };

  // New request mode
  if (isNewRequest) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/streaming/hosting')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Nueva Solicitud de Hosting</CardTitle>
            <CardDescription>
              Crea una solicitud para contratar un host para tu transmisión en vivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRequestWizard
              organizationId={organizationId || ''}
              brandId={brandId || undefined}
              defaultChannel={defaultChannel || undefined}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!request) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold mb-2">Solicitud no encontrada</h2>
        <p className="text-muted-foreground mb-4">La solicitud que buscas no existe</p>
        <Button onClick={() => navigate('/streaming/hosting')}>Volver al dashboard</Button>
      </div>
    );
  }

  const statusColor = HOSTING_REQUEST_STATUS_COLORS[request.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/streaming/hosting')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{request.title}</h1>
              <Badge className={`bg-${statusColor}-100 text-${statusColor}-700`}>
                {HOSTING_REQUEST_STATUS_LABELS[request.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {HOSTING_CHANNEL_LABELS[request.channel]} • Creado{' '}
              {format(new Date(request.created_at), "d 'de' MMMM", { locale: es })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {request.status === 'pending_payment' && isOwner && (
            <Button onClick={handleCheckout} disabled={isCreatingCheckout}>
              {isCreatingCheckout ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pagar y Confirmar
            </Button>
          )}

          {request.status === 'confirmed' && (isOwner || isHost) && (
            <Button onClick={handleStartLive} disabled={isStartingLive}>
              {isStartingLive ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Live
            </Button>
          )}

          {request.status === 'in_progress' && (isOwner || isHost) && (
            <Button variant="destructive" onClick={handleEndLive} disabled={isEndingLive}>
              {isEndingLive ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Finalizar Live
            </Button>
          )}

          {['draft', 'pending_payment', 'open'].includes(request.status) && isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isCancelling}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar solicitud</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que quieres cancelar esta solicitud? Esta acción no se puede
                    deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, volver</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Sí, cancelar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          {isOwner && request.channel === 'marketplace' && (
            <TabsTrigger value="applications">
              Aplicaciones ({hosts.filter((h) => h.status === 'applied').length})
            </TabsTrigger>
          )}
          {isOwner && request.channel === 'direct' && (
            <TabsTrigger value="negotiation">Negociación</TabsTrigger>
          )}
          {isOwner && request.channel === 'org_managed' && !confirmedHost && (
            <TabsTrigger value="assign">Asignar Host</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main info */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalles de la Transmisión</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.description && (
                    <div>
                      <h4 className="font-medium mb-1">Descripción</h4>
                      <p className="text-muted-foreground">{request.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha</p>
                        <p className="font-medium">
                          {format(new Date(request.scheduled_date), "EEEE d 'de' MMMM", {
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hora</p>
                        <p className="font-medium">
                          {request.scheduled_time_start.slice(0, 5)} ({request.estimated_duration_minutes}min)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo</p>
                        <p className="font-medium capitalize">
                          {request.live_type?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Presupuesto</p>
                        <p className="font-medium">
                          {request.fixed_rate_usd
                            ? `$${request.fixed_rate_usd}`
                            : request.budget_min_usd
                            ? `$${request.budget_min_usd} - $${request.budget_max_usd}`
                            : 'Por definir'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {request.preferred_niches && request.preferred_niches.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Nichos preferidos</h4>
                      <div className="flex flex-wrap gap-2">
                        {request.preferred_niches.map((niche) => (
                          <Badge key={niche} variant="outline">
                            {niche}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.requirements && request.requirements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Requisitos</h4>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {request.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Application form for hosts */}
              {canApply && (
                <Card>
                  <CardContent className="pt-6">
                    {showApplicationForm ? (
                      <HostApplicationForm
                        requestId={request.id}
                        budgetMin={request.budget_min_usd || undefined}
                        budgetMax={request.budget_max_usd || undefined}
                        onSuccess={() => {
                          setShowApplicationForm(false);
                          loadRequest();
                        }}
                        onCancel={() => setShowApplicationForm(false)}
                      />
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground mb-4">
                          ¿Interesado en ser el host de esta transmisión?
                        </p>
                        <Button onClick={() => setShowApplicationForm(true)}>
                          <Users className="h-4 w-4 mr-2" />
                          Aplicar como Host
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Host info */}
              {confirmedHost && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Host Confirmado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HostProfileCard host={confirmedHost} showStatus={false} />
                    <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        Tarifa acordada: ${confirmedHost.agreed_rate_usd} USD
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invite button for direct channel */}
              {isOwner && request.channel === 'direct' && !confirmedHost && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground mb-4">
                      Invita a un creador específico para este live
                    </p>
                    <Button onClick={() => setInviteDialogOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Invitar Host
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Results after completion */}
              {request.status === 'completed' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {request.actual_duration_minutes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duración:</span>
                        <span>{request.actual_duration_minutes} min</span>
                      </div>
                    )}
                    {request.actual_revenue_usd && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-semibold text-green-600">
                          ${request.actual_revenue_usd.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {request.actual_orders && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Órdenes:</span>
                        <span>{request.actual_orders}</span>
                      </div>
                    )}
                    {request.host_rating && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rating del host:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{request.host_rating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Applications tab (marketplace) */}
        <TabsContent value="applications" className="mt-6">
          <ApplicationReviewPanel requestId={request.id} />
        </TabsContent>

        {/* Negotiation tab (direct) */}
        <TabsContent value="negotiation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Negociación</CardTitle>
              <CardDescription>
                Gestiona las invitaciones y contraofertas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hosts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aún no has invitado a ningún host
                  </p>
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    Invitar Host
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {hosts.map((host) => (
                    <HostProfileCard key={host.id} host={host} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assign tab (org_managed) */}
        <TabsContent value="assign" className="mt-6">
          <OrgCreatorAssigner
            requestId={request.id}
            organizationId={organizationId || ''}
            clientId={request.client_id || undefined}
            onSuccess={loadRequest}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteHostDialog
        requestId={request.id}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadRequest}
      />
    </div>
  );
}
