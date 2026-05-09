import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mic, Settings, BarChart3, Clock, AlertCircle } from "lucide-react";

interface WhatsappMessage {
  message_number?: number;
  day?: number;
  send_time?: string;
  type?: string;
  consciousness_level?: string;
  objective?: string;
  text?: string;
  audio_script?: string | null;
  if_responds?: string;
  if_no_response?: string;
  forbidden?: string[];
}

interface BranchFlow {
  trigger?: string;
  action?: string;
  response_template?: string;
}

interface WhatsappFunnel {
  funnel_type?: string;
  funnel_name?: string;
  objective?: string;
  trigger?: string;
  total_messages?: number;
  total_duration_days?: number;
  messages?: WhatsappMessage[];
  branch_flows?: BranchFlow[];
}

interface WhatsappSetup {
  account_type?: string;
  profile_optimization?: string[];
  automation_tools?: Array<{ tool?: string; use_case?: string; latam_availability?: string; approximate_cost?: string }>;
  compliance_notes?: string[];
  list_management?: { segmentation?: string[]; opt_in_strategy?: string; opt_out_handling?: string };
}

interface PerformanceBenchmarks {
  open_rate_whatsapp?: string;
  response_rate_cold?: string;
  response_rate_warm?: string;
  conversion_rate_from_sequence?: string;
  best_days?: string[];
  best_hours?: string;
}

interface WhatsappFunnelTabProps {
  funnels?: WhatsappFunnel[] | null;
  setup?: WhatsappSetup | null;
  benchmarks?: PerformanceBenchmarks | null;
}

const FUNNEL_TYPE_COLORS: Record<string, string> = {
  captacion: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  cierre: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  upsell: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",
  reactivacion: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

const MESSAGE_TYPE_ICON: Record<string, string> = {
  texto: "💬",
  audio: "🎙️",
  imagen: "🖼️",
  video: "🎥",
};

export function WhatsappFunnelTab({ funnels, setup, benchmarks }: WhatsappFunnelTabProps) {
  if (!funnels || funnels.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Los funnels de WhatsApp se generan al activar el ADN Recargado.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            3 secuencias: <strong>Captación</strong> · <strong>Cierre</strong> · <strong>Reactivación</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {funnels.map((funnel, idx) => (
        <Card key={idx} className={`border ${FUNNEL_TYPE_COLORS[funnel.funnel_type || "captacion"] || ""}`}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-500" />
                  {funnel.funnel_name || `Funnel ${funnel.funnel_type}`}
                </CardTitle>
                <CardDescription className="mt-1">{funnel.objective}</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className={FUNNEL_TYPE_COLORS[funnel.funnel_type || ""]}>
                  {funnel.funnel_type?.toUpperCase()}
                </Badge>
                {funnel.total_messages && (
                  <Badge variant="outline" className="text-xs">
                    {funnel.total_messages} mensajes
                  </Badge>
                )}
                {funnel.total_duration_days && (
                  <Badge variant="outline" className="text-xs">
                    {funnel.total_duration_days} días
                  </Badge>
                )}
              </div>
            </div>
            {funnel.trigger && (
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Activador:</strong> {funnel.trigger}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {funnel.messages?.map((msg, mIdx) => (
              <div key={mIdx} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-lg">{MESSAGE_TYPE_ICON[msg.type || "texto"]}</span>
                    Mensaje {msg.message_number} — Día {msg.day}
                    {msg.send_time && <span className="text-xs text-muted-foreground">({msg.send_time})</span>}
                  </h4>
                  <div className="flex gap-1 flex-wrap">
                    {msg.consciousness_level && (
                      <Badge variant="outline" className="text-xs">
                        {msg.consciousness_level}
                      </Badge>
                    )}
                    {msg.type && (
                      <Badge variant="secondary" className="text-xs">
                        {msg.type}
                      </Badge>
                    )}
                  </div>
                </div>

                {msg.objective && (
                  <p className="text-xs text-muted-foreground mb-2 italic">→ {msg.objective}</p>
                )}

                {msg.text && (
                  <div className="bg-emerald-500/5 border-l-2 border-emerald-500 p-3 rounded mb-2">
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                )}

                {msg.audio_script && (
                  <details className="mb-2">
                    <summary className="text-xs cursor-pointer flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Mic className="h-3 w-3" /> Guión de audio (nota de voz)
                    </summary>
                    <p className="text-xs mt-2 p-2 bg-blue-500/5 rounded whitespace-pre-wrap">{msg.audio_script}</p>
                  </details>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {msg.if_responds && (
                    <div className="bg-green-500/5 p-2 rounded">
                      <strong className="text-green-600 dark:text-green-400">Si responde:</strong>
                      <p className="mt-1">{msg.if_responds}</p>
                    </div>
                  )}
                  {msg.if_no_response && (
                    <div className="bg-amber-500/5 p-2 rounded">
                      <strong className="text-amber-600 dark:text-amber-400">Si NO responde:</strong>
                      <p className="mt-1">{msg.if_no_response}</p>
                    </div>
                  )}
                </div>

                {msg.forbidden && msg.forbidden.length > 0 && (
                  <div className="mt-2 bg-red-500/5 border-l-2 border-red-500 p-2 rounded text-xs">
                    <strong className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> NUNCA hacer:
                    </strong>
                    <ul className="list-disc list-inside mt-1">
                      {msg.forbidden.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {funnel.branch_flows && funnel.branch_flows.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <h4 className="font-semibold text-sm mb-2">Ramas de respuesta (objeciones)</h4>
                <div className="space-y-2">
                  {funnel.branch_flows.map((flow, i) => (
                    <div key={i} className="border rounded p-3 bg-violet-500/5 text-sm">
                      <p className="font-medium">🔀 {flow.trigger}</p>
                      {flow.action && <p className="text-xs text-muted-foreground mt-1">{flow.action}</p>}
                      {flow.response_template && (
                        <div className="bg-card p-2 rounded mt-2 text-xs italic">"{flow.response_template}"</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {setup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-blue-500" />
              Configuración WhatsApp Business
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            {setup.account_type && (
              <p><strong>Tipo de cuenta:</strong> {setup.account_type}</p>
            )}
            {setup.profile_optimization && setup.profile_optimization.length > 0 && (
              <div>
                <strong>Optimización del perfil:</strong>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  {setup.profile_optimization.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {setup.automation_tools && setup.automation_tools.length > 0 && (
              <div>
                <strong>Herramientas de automatización:</strong>
                <div className="space-y-2 mt-1">
                  {setup.automation_tools.map((t, i) => (
                    <div key={i} className="border rounded p-2 text-xs">
                      <p className="font-medium">{t.tool} — {t.approximate_cost}</p>
                      <p className="text-muted-foreground">{t.use_case}</p>
                      <p className="text-muted-foreground">LATAM: {t.latam_availability}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {setup.list_management && (
              <div>
                <strong>Gestión de listas:</strong>
                {setup.list_management.opt_in_strategy && (
                  <p className="text-xs mt-1"><em>Opt-in:</em> {setup.list_management.opt_in_strategy}</p>
                )}
                {setup.list_management.opt_out_handling && (
                  <p className="text-xs mt-1"><em>Opt-out:</em> {setup.list_management.opt_out_handling}</p>
                )}
              </div>
            )}
            {setup.compliance_notes && setup.compliance_notes.length > 0 && (
              <div>
                <strong>Compliance:</strong>
                <ul className="list-disc list-inside text-xs mt-1">
                  {setup.compliance_notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {benchmarks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Benchmarks de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {benchmarks.open_rate_whatsapp && (
              <div className="border rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Open Rate</p>
                <p className="font-bold text-lg">{benchmarks.open_rate_whatsapp}</p>
              </div>
            )}
            {benchmarks.response_rate_cold && (
              <div className="border rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Resp. Frío</p>
                <p className="font-bold text-lg">{benchmarks.response_rate_cold}</p>
              </div>
            )}
            {benchmarks.response_rate_warm && (
              <div className="border rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Resp. Tibio</p>
                <p className="font-bold text-lg">{benchmarks.response_rate_warm}</p>
              </div>
            )}
            {benchmarks.conversion_rate_from_sequence && (
              <div className="border rounded p-3 text-center col-span-2">
                <p className="text-xs text-muted-foreground">Conversión secuencia completa</p>
                <p className="font-bold text-lg">{benchmarks.conversion_rate_from_sequence}</p>
              </div>
            )}
            {(benchmarks.best_days || benchmarks.best_hours) && (
              <div className="border rounded p-3 col-span-2 md:col-span-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Timing</p>
                {benchmarks.best_days && <p className="text-xs">Días: {benchmarks.best_days.join(", ")}</p>}
                {benchmarks.best_hours && <p className="text-xs">Horas: {benchmarks.best_hours}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
