import { ExternalLink, Calendar, DollarSign, Eye, Brain, Loader2, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_CONFIG, PUBLISHER_PLATFORM_LABELS } from "../config";
import { AdAnalysisPanel } from "./AdAnalysisPanel";
import type { AdLibraryAd } from "../types/ad-intelligence.types";

interface AdDetailDialogProps {
  ad: AdLibraryAd | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze: (adId: string) => void;
  isAnalyzing?: boolean;
}

export function AdDetailDialog({ ad, open, onOpenChange, onAnalyze, isAnalyzing }: AdDetailDialogProps) {
  const { toast } = useToast();
  if (!ad) return null;

  const platformConfig = PLATFORM_CONFIG[ad.platform];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado al portapapeles" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={`${platformConfig.bgColor} ${platformConfig.color}`}>
              {platformConfig.label}
            </Badge>
            {ad.page_name || "Anuncio"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-4">
            {/* Left column: Preview + Metadata */}
            <div className="space-y-4">
              {/* Snapshot */}
              {ad.ad_snapshot_url && (
                <div className="relative w-full aspect-[4/3] bg-muted rounded-sm overflow-hidden">
                  <iframe
                    src={ad.ad_snapshot_url}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title="Ad preview"
                  />
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {ad.publisher_platforms?.map((pp) => (
                    <Badge key={pp} variant="outline">{PUBLISHER_PLATFORM_LABELS[pp] || pp}</Badge>
                  ))}
                  {ad.is_active ? (
                    <Badge className="bg-green-500/10 text-green-400">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Inicio: {formatDate(ad.ad_delivery_start)}</span>
                  </div>
                  {ad.ad_delivery_stop && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Fin: {formatDate(ad.ad_delivery_stop)}</span>
                    </div>
                  )}
                  {(ad.spend_lower || ad.spend_upper) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>${ad.spend_lower?.toLocaleString() || "?"}-${ad.spend_upper?.toLocaleString() || "?"} {ad.currency}</span>
                    </div>
                  )}
                  {(ad.impressions_lower || ad.impressions_upper) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>{ad.impressions_lower?.toLocaleString() || "?"}-{ad.impressions_upper?.toLocaleString() || "?"}</span>
                    </div>
                  )}
                </div>

                {ad.languages?.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Idiomas: {ad.languages.join(", ")}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {ad.ad_snapshot_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en plataforma
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAnalyze(ad.id)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {ad.ai_analysis ? "Re-analizar con AI" : "Analizar con AI"}
                </Button>
              </div>
            </div>

            {/* Right column: Creative content + AI Analysis */}
            <div className="space-y-4">
              {/* Headlines */}
              {ad.ad_creative_link_titles?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Headlines</h4>
                  {ad.ad_creative_link_titles.map((title, i) => (
                    <div key={i} className="flex items-start gap-2 group/copy">
                      <p className="text-sm font-semibold flex-1">{title}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/copy:opacity-100"
                        onClick={() => copyToClipboard(title)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Body copy */}
              {ad.ad_creative_bodies?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Copy del anuncio</h4>
                  {ad.ad_creative_bodies.map((body, i) => (
                    <div key={i} className="flex items-start gap-2 group/copy">
                      <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">{body}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/copy:opacity-100 shrink-0"
                        onClick={() => copyToClipboard(body)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Descriptions */}
              {ad.ad_creative_link_descriptions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Descripciones</h4>
                  {ad.ad_creative_link_descriptions.map((desc, i) => (
                    <p key={i} className="text-sm text-muted-foreground">{desc}</p>
                  ))}
                </div>
              )}

              <Separator />

              {/* AI Analysis */}
              {ad.ai_analysis ? (
                <AdAnalysisPanel analysis={ad.ai_analysis} />
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Haz clic en "Analizar con AI" para obtener insights de este anuncio
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
