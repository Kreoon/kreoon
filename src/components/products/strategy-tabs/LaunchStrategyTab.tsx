import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, Clock, CheckCircle2, Mail, DollarSign, Users, BarChart3, Zap } from 'lucide-react';

interface LaunchStrategyData {
  preLaunch?: {
    duration?: string;
    objectives?: string[];
    actions?: { action?: string; week?: string; channel?: string; details?: string }[];
    contentPlan?: string[];
    checklist?: string[];
  };
  launch?: {
    dayPlan?: { time?: string; action?: string; channel?: string; details?: string }[];
    offer?: {
      description?: string;
      price?: string;
      bonuses?: string[];
      urgency?: string;
      scarcity?: string;
      guarantee?: string;
    };
    emailSequence?: { day?: string; subject?: string; preview?: string; bodyOutline?: string; cta?: string }[];
    channels?: { channel?: string; role?: string; content?: string }[];
  };
  postLaunch?: {
    retentionActions?: string[];
    postSaleContent?: string[];
    referralStrategy?: string;
    nonBuyerFollowUp?: string[];
    analysisChecklist?: string[];
  };
  budget?: {
    organic?: { item?: string; cost?: string }[];
    paid?: { item?: string; cost?: string; platform?: string }[];
    totalEstimated?: string;
  };
  timeline?: { phase?: string; week?: string; milestone?: string; deliverables?: string[] }[];
  team?: { role?: string; responsibilities?: string[]; hoursPerWeek?: string }[];
  metrics?: {
    preLaunch?: { metric?: string; target?: string }[];
    launch?: { metric?: string; target?: string }[];
    postLaunch?: { metric?: string; target?: string }[];
  };
  generatedAt?: string;
}

interface LaunchStrategyTabProps {
  launchStrategy?: LaunchStrategyData | null;
}

function safeArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  return [];
}

export function LaunchStrategyTab({ launchStrategy }: LaunchStrategyTabProps) {
  if (!launchStrategy || (!launchStrategy.preLaunch && !launchStrategy.launch)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver la estrategia de lanzamiento</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-rose-500/10 to-orange-500/10 rounded-lg border border-rose-500/20">
        <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-rose-500" />
          Estrategia de Lanzamiento
        </h3>
        <p className="text-sm text-muted-foreground">
          Plan completo de pre-lanzamiento, lanzamiento y post-lanzamiento con acciones, emails y presupuesto.
        </p>
      </div>

      <Tabs defaultValue="pre" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="pre" className="text-xs py-2">Pre-launch</TabsTrigger>
          <TabsTrigger value="launch" className="text-xs py-2">Lanzamiento</TabsTrigger>
          <TabsTrigger value="post" className="text-xs py-2">Post-launch</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs py-2">Presupuesto</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs py-2">Métricas</TabsTrigger>
        </TabsList>

        {/* PRE-LAUNCH */}
        <TabsContent value="pre" className="mt-4 space-y-4">
          {launchStrategy.preLaunch?.duration && (
            <Badge variant="outline" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              Duración: {launchStrategy.preLaunch.duration}
            </Badge>
          )}

          {safeArray(launchStrategy.preLaunch?.objectives).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Objetivos del Pre-Lanzamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {safeArray(launchStrategy.preLaunch?.objectives).map((obj: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold text-xs mt-0.5">{idx + 1}</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {safeArray(launchStrategy.preLaunch?.actions).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Acciones Pre-Lanzamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safeArray(launchStrategy.preLaunch?.actions).map((action: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2 mb-1">
                        {action.week && <Badge variant="outline" className="text-xs">{action.week}</Badge>}
                        {action.channel && <Badge variant="secondary" className="text-xs">{action.channel}</Badge>}
                      </div>
                      <p className="text-sm font-medium">{action.action || 'Acción'}</p>
                      {action.details && <p className="text-xs text-muted-foreground mt-1">{action.details}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {safeArray(launchStrategy.preLaunch?.checklist).length > 0 && (
            <Card className="border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Checklist Pre-Lanzamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {safeArray(launchStrategy.preLaunch?.checklist).map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-green-500/5 rounded">
                      <span className="text-green-500 mt-0.5">[ ]</span>
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* LAUNCH DAY */}
        <TabsContent value="launch" className="mt-4 space-y-4">
          {/* Day Plan */}
          {safeArray(launchStrategy.launch?.dayPlan).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Plan del Día de Lanzamiento
                </CardTitle>
                <CardDescription>Hora a hora</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safeArray(launchStrategy.launch?.dayPlan).map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-muted/50 rounded border-l-4 border-primary">
                      <div className="shrink-0 min-w-[60px]">
                        <p className="text-xs font-bold text-primary">{step.time || ''}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.action || 'Acción'}</p>
                        {step.channel && <Badge variant="outline" className="text-xs mt-1">{step.channel}</Badge>}
                        {step.details && <p className="text-xs text-muted-foreground mt-1">{step.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offer Structure */}
          {launchStrategy.launch?.offer && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estructura de Oferta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {launchStrategy.launch.offer.description && (
                  <p className="text-sm">{launchStrategy.launch.offer.description}</p>
                )}
                {launchStrategy.launch.offer.price && (
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Precio: {launchStrategy.launch.offer.price}
                  </p>
                )}
                {safeArray(launchStrategy.launch.offer.bonuses).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Bonos incluidos:</p>
                    {safeArray(launchStrategy.launch.offer.bonuses).map((bonus: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500">+</span> {bonus}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {launchStrategy.launch.offer.urgency && (
                    <div className="p-2 bg-background rounded border text-xs">
                      <p className="font-medium text-red-500">Urgencia</p>
                      <p className="text-muted-foreground">{launchStrategy.launch.offer.urgency}</p>
                    </div>
                  )}
                  {launchStrategy.launch.offer.scarcity && (
                    <div className="p-2 bg-background rounded border text-xs">
                      <p className="font-medium text-amber-500">Escasez</p>
                      <p className="text-muted-foreground">{launchStrategy.launch.offer.scarcity}</p>
                    </div>
                  )}
                  {launchStrategy.launch.offer.guarantee && (
                    <div className="p-2 bg-background rounded border text-xs">
                      <p className="font-medium text-blue-500">Garantía</p>
                      <p className="text-muted-foreground">{launchStrategy.launch.offer.guarantee}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Sequence */}
          {safeArray(launchStrategy.launch?.emailSequence).length > 0 && (
            <Card className="border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-500" />
                  Secuencia de Emails
                </CardTitle>
                <CardDescription>{safeArray(launchStrategy.launch?.emailSequence).length} emails programados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safeArray(launchStrategy.launch?.emailSequence).map((email: any, idx: number) => (
                    <div key={idx} className="p-3 bg-purple-500/5 rounded border border-purple-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{email.day || `Email ${idx + 1}`}</Badge>
                      </div>
                      <p className="text-sm font-medium">{email.subject || 'Asunto del email'}</p>
                      {email.preview && <p className="text-xs text-muted-foreground italic mt-1">{email.preview}</p>}
                      {email.bodyOutline && <p className="text-xs text-muted-foreground mt-1">{email.bodyOutline}</p>}
                      {email.cta && <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">CTA: {email.cta}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channels */}
          {safeArray(launchStrategy.launch?.channels).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Canales de Lanzamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {safeArray(launchStrategy.launch?.channels).map((ch: any, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded border text-sm">
                      <p className="font-medium">{ch.channel || 'Canal'}</p>
                      {ch.role && <p className="text-xs text-muted-foreground">Rol: {ch.role}</p>}
                      {ch.content && <p className="text-xs text-muted-foreground">{ch.content}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* POST-LAUNCH */}
        <TabsContent value="post" className="mt-4 space-y-4">
          {safeArray(launchStrategy.postLaunch?.retentionActions).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Acciones de Retención</CardTitle>
                <CardDescription>Para compradores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {safeArray(launchStrategy.postLaunch?.retentionActions).map((action: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                      <span className="text-green-500 font-bold text-xs mt-0.5">{idx + 1}</span>
                      {action}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {safeArray(launchStrategy.postLaunch?.postSaleContent).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Contenido Post-Venta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {safeArray(launchStrategy.postLaunch?.postSaleContent).map((content: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                      <span className="text-blue-500 font-bold text-xs mt-0.5">{idx + 1}</span>
                      {content}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {launchStrategy.postLaunch?.referralStrategy && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Estrategia de Referidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{launchStrategy.postLaunch.referralStrategy}</p>
              </CardContent>
            </Card>
          )}

          {safeArray(launchStrategy.postLaunch?.nonBuyerFollowUp).length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Follow-Up No Compradores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {safeArray(launchStrategy.postLaunch?.nonBuyerFollowUp).map((action: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-red-500/5 rounded">
                      <span className="text-red-500 font-bold text-xs mt-0.5">{idx + 1}</span>
                      {action}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* BUDGET */}
        <TabsContent value="budget" className="mt-4 space-y-4">
          {/* Timeline */}
          {safeArray(launchStrategy.timeline).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safeArray(launchStrategy.timeline).map((t: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-muted/50 rounded border-l-4 border-primary/50">
                      <div className="shrink-0 min-w-[80px]">
                        <Badge variant="outline" className="text-xs">{t.week || ''}</Badge>
                        {t.phase && <p className="text-xs text-muted-foreground mt-1">{t.phase}</p>}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.milestone || 'Hito'}</p>
                        {safeArray(t.deliverables).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {safeArray(t.deliverables).map((d: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget */}
          {launchStrategy.budget && (
            <Card className="border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Presupuesto Estimado
                </CardTitle>
                {launchStrategy.budget.totalEstimated && (
                  <CardDescription className="text-lg font-bold text-green-600 dark:text-green-400">
                    Total: {launchStrategy.budget.totalEstimated}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {safeArray(launchStrategy.budget.organic).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Orgánico</p>
                    <div className="space-y-1">
                      {safeArray(launchStrategy.budget.organic).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                          <span>{item.item || 'Item'}</span>
                          <span className="font-medium">{item.cost || '$0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {safeArray(launchStrategy.budget.paid).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Pauta/Pagado</p>
                    <div className="space-y-1">
                      {safeArray(launchStrategy.budget.paid).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                          <div>
                            <span>{item.item || 'Item'}</span>
                            {item.platform && <Badge variant="outline" className="text-xs ml-2">{item.platform}</Badge>}
                          </div>
                          <span className="font-medium">{item.cost || '$0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Team */}
          {safeArray(launchStrategy.team).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipo Necesario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {safeArray(launchStrategy.team).map((member: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded border">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-medium">{member.role || 'Rol'}</p>
                        {member.hoursPerWeek && <Badge variant="outline" className="text-xs">{member.hoursPerWeek}/sem</Badge>}
                      </div>
                      {safeArray(member.responsibilities).length > 0 && (
                        <ul className="space-y-1 mt-2">
                          {safeArray(member.responsibilities).map((r: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="text-primary">-</span> {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* METRICS */}
        <TabsContent value="metrics" className="mt-4 space-y-4">
          {launchStrategy.metrics && (
            <>
              {[
                { key: 'preLaunch', label: 'Pre-Lanzamiento', color: 'blue' },
                { key: 'launch', label: 'Lanzamiento', color: 'green' },
                { key: 'postLaunch', label: 'Post-Lanzamiento', color: 'purple' },
              ].map(({ key, label, color }) => {
                const metricsArr = safeArray((launchStrategy.metrics as any)?.[key]);
                if (metricsArr.length === 0) return null;
                return (
                  <Card key={key} className={`border-${color}-500/20`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Métricas: {label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {metricsArr.map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                            <span>{m.metric || 'Métrica'}</span>
                            <Badge variant="outline">{m.target || 'N/A'}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
