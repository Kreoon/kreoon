import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { KreoonGlassCard } from "@/components/ui/kreoon/KreoonGlassCard";
import {
  Sparkles,
  Settings2,
  FileText,
  Play,
  ClipboardCheck,
  Target,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EventData {
  clientName?: string;
  productName?: string;
  productDescription?: string;
  productPrice?: number;
  discountPercent?: number;
  eventDate?: string;
  eventDuration?: number;
  platform?: string;
  eventType?: string;
  targetAudience?: string;
}

interface FullLiveContent {
  event_title?: string;
  event_description?: string;
  promotional_content?: {
    teaser_post?: string;
    reminder_post?: string;
    countdown_story?: string;
    hashtags?: string[];
  };
  script_outline?: Record<
    string,
    {
      duration_minutes?: number;
      talking_points?: string[];
      hook?: string;
      interaction_prompts?: string[];
      urgency_elements?: string[];
      cta?: string;
      prepared_questions?: string[];
      objection_handlers?: string[];
      final_cta?: string;
      next_steps?: string;
    }
  >;
  interaction_elements?: {
    polls?: Array<{ question: string; options: string[] }>;
    giveaway_mechanic?: string;
    comment_triggers?: string[];
  };
  technical_checklist?: string[];
  kpis_target?: Record<string, string>;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
];

const EVENT_TYPES = [
  { value: "launch", label: "Lanzamiento" },
  { value: "flash_sale", label: "Venta relámpago" },
  { value: "demo", label: "Demo" },
  { value: "qa", label: "Q&A" },
  { value: "collab", label: "Colaboración" },
];

export function LiveContentGenerator() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [useTrendResearch, setUseTrendResearch] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    platform: "instagram",
    eventType: "demo",
    eventDuration: 30,
  });
  const [content, setContent] = useState<FullLiveContent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setContent(null);
    try {
      const { data, error } = await supabaseLovable.functions.invoke("streaming-ai-generate", {
        body: {
          action: "generate_full",
          organizationId: profile?.current_organization_id,
          eventData,
          usePerplexity: useTrendResearch,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setContent((data as FullLiveContent) || {});
      toast.success("Contenido generado correctamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar contenido. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scriptPhases = content?.script_outline
    ? Object.entries(content.script_outline).map(([key, val]) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        ...val,
      }))
    : [];

  return (
    <div className="space-y-6">
      <KreoonGlassCard className="p-6" intensity="medium">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-kreoon-purple-400" />
          Generador de contenido Live Shopping
        </h2>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-5 gap-1 rounded-xl border border-kreoon-border bg-kreoon-bg-secondary/50 p-1">
            <TabsTrigger
              value="config"
              className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Config
            </TabsTrigger>
            <TabsTrigger
              value="promo"
              className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
            >
              <FileText className="mr-2 h-4 w-4" />
              Promocional
            </TabsTrigger>
            <TabsTrigger
              value="script"
              className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
            >
              <Play className="mr-2 h-4 w-4" />
              Guión
            </TabsTrigger>
            <TabsTrigger
              value="checklist"
              className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger
              value="kpis"
              className="rounded-lg data-[state=active]:bg-kreoon-purple-500/20 data-[state=active]:text-kreoon-purple-400"
            >
              <Target className="mr-2 h-4 w-4" />
              KPIs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-kreoon-text-secondary">Cliente / Marca</Label>
                <Input
                  placeholder="Ej: Mi Marca"
                  value={eventData.clientName ?? ""}
                  onChange={(e) => setEventData((p) => ({ ...p, clientName: e.target.value }))}
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Producto</Label>
                <Input
                  placeholder="Ej: Crema hidratante X"
                  value={eventData.productName ?? ""}
                  onChange={(e) => setEventData((p) => ({ ...p, productName: e.target.value }))}
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-kreoon-text-secondary">Descripción del producto</Label>
                <Textarea
                  placeholder="Breve descripción del producto a promocionar"
                  value={eventData.productDescription ?? ""}
                  onChange={(e) => setEventData((p) => ({ ...p, productDescription: e.target.value }))}
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Precio ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={eventData.productPrice ?? ""}
                  onChange={(e) =>
                    setEventData((p) => ({ ...p, productPrice: Number(e.target.value) || undefined }))
                  }
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Descuento (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={eventData.discountPercent ?? ""}
                  onChange={(e) =>
                    setEventData((p) => ({
                      ...p,
                      discountPercent: Number(e.target.value) || undefined,
                    }))
                  }
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Fecha del evento</Label>
                <Input
                  type="datetime-local"
                  value={eventData.eventDate ?? ""}
                  onChange={(e) => setEventData((p) => ({ ...p, eventDate: e.target.value }))}
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Duración (min)</Label>
                <Input
                  type="number"
                  value={eventData.eventDuration ?? 30}
                  onChange={(e) =>
                    setEventData((p) => ({ ...p, eventDuration: Number(e.target.value) || 30 }))
                  }
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Plataforma</Label>
                <select
                  value={eventData.platform ?? "instagram"}
                  onChange={(e) => setEventData((p) => ({ ...p, platform: e.target.value }))}
                  className="mt-1 flex h-10 w-full rounded-md border border-kreoon-border bg-kreoon-bg-secondary/50 px-3 py-2 text-sm text-white"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-kreoon-text-secondary">Tipo de evento</Label>
                <select
                  value={eventData.eventType ?? "demo"}
                  onChange={(e) => setEventData((p) => ({ ...p, eventType: e.target.value }))}
                  className="mt-1 flex h-10 w-full rounded-md border border-kreoon-border bg-kreoon-bg-secondary/50 px-3 py-2 text-sm text-white"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-kreoon-text-secondary">Audiencia objetivo</Label>
                <Input
                  placeholder="Ej: Mujeres 25-40, interés en skincare"
                  value={eventData.targetAudience ?? ""}
                  onChange={(e) => setEventData((p) => ({ ...p, targetAudience: e.target.value }))}
                  className="mt-1 border-kreoon-border bg-kreoon-bg-secondary/50"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={useTrendResearch}
                  onCheckedChange={setUseTrendResearch}
                />
                <Label className="text-kreoon-text-secondary">
                  Incluir investigación de tendencias (Perplexity)
                </Label>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-6 bg-gradient-to-r from-kreoon-purple-500 to-kreoon-purple-700 text-white hover:from-kreoon-purple-600 hover:to-kreoon-purple-800"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar paquete completo
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="promo" className="mt-4">
            {!content ? (
              <p className="rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-4 text-sm text-kreoon-text-muted">
                Configura el evento y genera contenido para ver el preview promocional.
              </p>
            ) : (
              <div className="space-y-4">
                <KreoonGlassCard className="p-4" intensity="light">
                  <h3 className="mb-2 text-sm font-medium text-kreoon-purple-400">
                    {content.event_title}
                  </h3>
                  <p className="text-sm text-kreoon-text-secondary">
                    {content.event_description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-kreoon-purple-400 hover:text-kreoon-purple-300"
                    onClick={() =>
                      copyToClipboard(
                        `${content.event_title}\n${content.event_description}`,
                        "event"
                      )
                    }
                  >
                    {copiedId === "event" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </KreoonGlassCard>
                {content.promotional_content?.teaser_post && (
                  <KreoonGlassCard className="p-4" intensity="light">
                    <h4 className="mb-2 text-xs font-medium text-kreoon-text-muted">
                      Post de anuncio (3 días antes)
                    </h4>
                    <p className="text-sm text-kreoon-text-secondary">
                      {content.promotional_content.teaser_post}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        copyToClipboard(content.promotional_content!.teaser_post!, "teaser")
                      }
                    >
                      {copiedId === "teaser" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </KreoonGlassCard>
                )}
                {content.promotional_content?.reminder_post && (
                  <KreoonGlassCard className="p-4" intensity="light">
                    <h4 className="mb-2 text-xs font-medium text-kreoon-text-muted">
                      Recordatorio (1 día antes)
                    </h4>
                    <p className="text-sm text-kreoon-text-secondary">
                      {content.promotional_content.reminder_post}
                    </p>
                  </KreoonGlassCard>
                )}
                {content.promotional_content?.hashtags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {content.promotional_content.hashtags.map((h) => (
                      <span
                        key={h}
                        className="rounded-full bg-kreoon-purple-500/20 px-3 py-1 text-xs text-kreoon-purple-400"
                      >
                        #{h.replace("#", "")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="script" className="mt-4">
            {!content?.script_outline ? (
              <p className="rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-4 text-sm text-kreoon-text-muted">
                Genera contenido para ver el guión del Live.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-kreoon-purple-500/50 via-kreoon-purple-400/30 to-transparent" />
                <div className="space-y-6 pl-10">
                  {scriptPhases.map((phase, i) => (
                    <KreoonGlassCard key={phase.key} className="relative p-4" intensity="light">
                      <div className="absolute -left-7 top-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-kreoon-purple-500 bg-kreoon-bg-primary text-xs font-bold text-kreoon-purple-400">
                        {i + 1}
                      </div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-kreoon-purple-400">{phase.label}</h4>
                        {phase.duration_minutes && (
                          <span className="rounded bg-kreoon-purple-500/20 px-2 py-0.5 text-xs text-kreoon-purple-400">
                            {phase.duration_minutes} min
                          </span>
                        )}
                      </div>
                      {phase.hook && (
                        <p className="mb-2 rounded border-l-2 border-kreoon-purple-500/50 bg-kreoon-bg-secondary/50 py-1 pl-3 text-sm italic">
                          {phase.hook}
                        </p>
                      )}
                      {phase.talking_points?.length ? (
                        <ul className="mb-2 list-inside list-disc text-sm text-kreoon-text-secondary">
                          {phase.talking_points.map((p, j) => (
                            <li key={j}>{p}</li>
                          ))}
                        </ul>
                      ) : null}
                      {phase.cta && (
                        <p className="text-sm text-kreoon-purple-300/80">CTA: {phase.cta}</p>
                      )}
                    </KreoonGlassCard>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            {!content?.technical_checklist?.length ? (
              <p className="rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-4 text-sm text-kreoon-text-muted">
                Genera contenido para ver el checklist técnico.
              </p>
            ) : (
              <ul className="space-y-2">
                {content.technical_checklist.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-3"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-kreoon-purple-500/50" />
                    <span className="text-sm text-kreoon-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="kpis" className="mt-4">
            {!content?.kpis_target ? (
              <p className="rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-4 text-sm text-kreoon-text-muted">
                Genera contenido para ver los KPIs objetivo.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(content.kpis_target).map(([key, value]) => (
                  <KreoonGlassCard key={key} className="p-4" intensity="light">
                    <p className="text-xs font-medium uppercase tracking-wider text-kreoon-text-muted">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-kreoon-purple-400">{value}</p>
                  </KreoonGlassCard>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </KreoonGlassCard>
    </div>
  );
}
