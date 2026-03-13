/**
 * Tab17EmailMarketing
 * Estrategia de email marketing - Compatible con estructura backend step-17-email-marketing.ts
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Send,
  Clock,
  Target,
  Zap,
  Users,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  Heart,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Backend structure from step-17-email-marketing.ts
interface BackendEmailSequence {
  name?: string;
  trigger?: string;
  goal?: string;
  emails: Array<{
    day: number;
    subject: string;
    objective?: string;
    key_message?: string;
    approach?: string;
    type?: string;
  }>;
}

interface BackendEmailTemplate {
  name: string;
  type: string;
  subject_lines: string[];
  preview_text: string;
  body_outline: string[];
  cta: string;
  send_timing: string;
}

interface BackendEmailMarketingData {
  strategy_overview: {
    primary_goals: string[];
    email_frequency: string;
    best_send_times: string[];
    list_building_tactics: string[];
  };
  welcome_sequence: BackendEmailSequence;
  nurture_sequence: BackendEmailSequence;
  sales_sequence: BackendEmailSequence;
  broadcast_templates: BackendEmailTemplate[];
  subject_line_formulas: string[];
  segmentation_strategy: Array<{
    segment: string;
    criteria: string;
    messaging_focus: string;
  }>;
  automation_triggers: Array<{
    trigger: string;
    action: string;
  }>;
  re_engagement_sequence?: {
    trigger: string;
    emails: Array<{
      day: number;
      subject: string;
      approach: string;
    }>;
  };
  post_purchase_sequence?: {
    goal: string;
    emails: Array<{
      day: number;
      type: string;
      subject: string;
    }>;
  };
  kpis: Array<{
    metric: string;
    target: string;
  }>;
  summary?: string;
}

type EmailMarketingData = BackendEmailMarketingData;

interface Tab17EmailMarketingProps {
  data: EmailMarketingData | null | undefined;
}

function SequenceCard({ sequence, icon, color }: { sequence: BackendEmailSequence; icon?: React.ReactNode; color?: string }) {
  if (!sequence) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <CardTitle className="text-lg">{sequence.name || 'Secuencia'}</CardTitle>
              {sequence.goal && <CardDescription>{sequence.goal}</CardDescription>}
            </div>
          </div>
          {sequence.trigger && <Badge variant="outline">{sequence.trigger}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sequence.emails?.map((email, idx) => (
            <div key={idx} className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <Badge className={`${color || 'bg-blue-500/20 text-blue-400'}`}>
                  Día {email.day}
                </Badge>
                {email.objective && (
                  <span className="text-xs text-muted-foreground">{email.objective}</span>
                )}
                {email.type && (
                  <Badge variant="secondary" className="text-xs">{email.type}</Badge>
                )}
              </div>
              <p className="font-medium text-sm mb-1">{email.subject}</p>
              {email.key_message && (
                <p className="text-xs text-muted-foreground">{email.key_message}</p>
              )}
              {email.approach && (
                <p className="text-xs text-muted-foreground italic">{email.approach}</p>
              )}
              <CopyButton text={email.subject} size="sm" className="mt-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Tab17EmailMarketing({ data }: Tab17EmailMarketingProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de email</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de email marketing se generará al completar el research.
        </p>
      </div>
    );
  }

  // Fallback: Si la estructura no coincide o los tipos son incorrectos, usar GenericTabContent
  const rawData = data as Record<string, unknown>;
  const strategyOverview = rawData.strategy_overview as Record<string, unknown> | undefined;
  const hasValidStructure =
    strategyOverview &&
    typeof strategyOverview === 'object' &&
    Array.isArray(strategyOverview.primary_goals) &&
    typeof strategyOverview.email_frequency === 'string';

  if (!hasValidStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Email Marketing"
        icon={<Mail className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Strategy Overview */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Estrategia General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Frecuencia de Envío</p>
              <p className="font-medium">{data.strategy_overview?.email_frequency}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Mejores Horarios</p>
              <div className="flex flex-wrap gap-1">
                {data.strategy_overview?.best_send_times?.map((t, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Objetivos Principales</p>
            <div className="flex flex-wrap gap-2">
              {data.strategy_overview?.primary_goals?.map((g, idx) => (
                <Badge key={idx} className="bg-green-500/20 text-green-400">{g}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Tácticas de List Building</p>
            <ul className="space-y-1">
              {data.strategy_overview?.list_building_tactics?.map((t, idx) => (
                <li key={idx} className="text-sm">• {t}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Email Sequences - Main */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-500" />
          Secuencias Principales
        </h3>
        <Tabs defaultValue="welcome" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="welcome">Bienvenida</TabsTrigger>
            <TabsTrigger value="nurture">Nurturing</TabsTrigger>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
          </TabsList>
          <TabsContent value="welcome" className="pt-4">
            {data.welcome_sequence && (
              <SequenceCard
                sequence={data.welcome_sequence}
                icon={<Heart className="w-4 h-4 text-pink-500" />}
                color="bg-pink-500/20 text-pink-400"
              />
            )}
          </TabsContent>
          <TabsContent value="nurture" className="pt-4">
            {data.nurture_sequence && (
              <SequenceCard
                sequence={data.nurture_sequence}
                icon={<Users className="w-4 h-4 text-purple-500" />}
                color="bg-purple-500/20 text-purple-400"
              />
            )}
          </TabsContent>
          <TabsContent value="sales" className="pt-4">
            {data.sales_sequence && (
              <SequenceCard
                sequence={data.sales_sequence}
                icon={<Target className="w-4 h-4 text-green-500" />}
                color="bg-green-500/20 text-green-400"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Additional Sequences */}
      {(data.re_engagement_sequence || data.post_purchase_sequence) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.re_engagement_sequence && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="w-5 h-5 text-orange-500" />
                  Re-engagement
                </CardTitle>
                <CardDescription>Trigger: {data.re_engagement_sequence.trigger}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.re_engagement_sequence.emails?.map((email, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-orange-500/20 text-orange-400">
                          Día {email.day}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mb-1">{email.subject}</p>
                      <p className="text-xs text-muted-foreground italic">{email.approach}</p>
                      <CopyButton text={email.subject} size="sm" className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.post_purchase_sequence && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="w-5 h-5 text-emerald-500" />
                  Post-Compra
                </CardTitle>
                <CardDescription>Objetivo: {data.post_purchase_sequence.goal}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.post_purchase_sequence.emails?.map((email, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          Día {email.day}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{email.type}</Badge>
                      </div>
                      <p className="font-medium text-sm">{email.subject}</p>
                      <CopyButton text={email.subject} size="sm" className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Subject Line Formulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Fórmulas de Subject Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.subject_line_formulas?.map((formula, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                <p className="font-mono text-sm">{formula}</p>
                <CopyButton text={formula} size="sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Segmentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Estrategia de Segmentación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.segmentation_strategy?.map((seg, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{seg.segment}</h4>
                  <Badge variant="outline">{seg.criteria}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{seg.messaging_focus}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Triggers de Automatización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.automation_triggers?.map((trigger, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-card">
                <p className="text-sm text-orange-400 mb-1">Trigger: {trigger.trigger}</p>
                <p className="text-sm">→ {trigger.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            KPIs Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.kpis?.map((kpi, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{kpi.metric}</p>
                <p className="text-lg font-bold">{kpi.target}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
