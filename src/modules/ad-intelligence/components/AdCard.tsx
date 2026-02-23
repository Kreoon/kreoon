import { useState } from "react";
import { ExternalLink, Bookmark, Brain, Calendar, DollarSign, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PLATFORM_CONFIG, PUBLISHER_PLATFORM_LABELS } from "../config";
import type { AdLibraryAd, AdLibraryCollection } from "../types/ad-intelligence.types";

interface AdCardProps {
  ad: AdLibraryAd;
  collections?: AdLibraryCollection[];
  onViewDetail: (ad: AdLibraryAd) => void;
  onAnalyze: (adId: string) => void;
  onAddToCollection: (collectionId: string, adId: string) => void;
  isAnalyzing?: boolean;
}

export function AdCard({ ad, collections = [], onViewDetail, onAnalyze, onAddToCollection, isAnalyzing }: AdCardProps) {
  const platformConfig = PLATFORM_CONFIG[ad.platform];
  const copyText = ad.ad_creative_bodies?.[0] || "";
  const headline = ad.ad_creative_link_titles?.[0] || "";
  const isRunning = ad.is_active;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formatSpend = () => {
    if (!ad.spend_lower && !ad.spend_upper) return null;
    const currency = ad.currency || "USD";
    if (ad.spend_lower && ad.spend_upper) {
      return `$${ad.spend_lower.toLocaleString()}-$${ad.spend_upper.toLocaleString()} ${currency}`;
    }
    return ad.spend_lower ? `>$${ad.spend_lower.toLocaleString()} ${currency}` : null;
  };

  return (
    <Card
      className="group hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer overflow-hidden"
      onClick={() => onViewDetail(ad)}
    >
      {/* Snapshot preview */}
      {ad.ad_snapshot_url && (
        <div className="relative w-full h-48 bg-muted overflow-hidden">
          <iframe
            src={ad.ad_snapshot_url}
            className="w-full h-full border-0 pointer-events-none scale-75 origin-top-left"
            style={{ width: "133%", height: "133%" }}
            sandbox="allow-scripts allow-same-origin"
            title="Ad preview"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {!ad.ad_snapshot_url && (
        <div className="w-full h-32 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Sin preview</span>
        </div>
      )}

      <CardContent className="p-3 space-y-2">
        {/* Platform badges + page name */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className={`text-xs ${platformConfig.bgColor} ${platformConfig.color}`}>
            {platformConfig.label}
          </Badge>
          {ad.publisher_platforms?.map((pp) => (
            <Badge key={pp} variant="outline" className="text-xs">
              {PUBLISHER_PLATFORM_LABELS[pp] || pp}
            </Badge>
          ))}
          {isRunning && (
            <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">Activo</Badge>
          )}
          {ad.ai_analysis && (
            <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">AI</Badge>
          )}
        </div>

        {/* Advertiser name */}
        {ad.page_name && (
          <p className="text-sm font-medium truncate">{ad.page_name}</p>
        )}

        {/* Headline */}
        {headline && (
          <p className="text-sm font-semibold line-clamp-1">{headline}</p>
        )}

        {/* Copy preview */}
        {copyText && (
          <p className="text-xs text-muted-foreground line-clamp-3">{copyText}</p>
        )}

        {/* Stats row */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {ad.ad_delivery_start && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(ad.ad_delivery_start)}
            </span>
          )}
          {formatSpend() && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatSpend()}
            </span>
          )}
          {ad.impressions_lower && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {ad.impressions_lower.toLocaleString()}+
            </span>
          )}
        </div>

        {/* AI score */}
        {ad.ai_analysis?.analysis?.effectiveness_score && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Efectividad:</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(ad.ai_analysis.analysis.effectiveness_score / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium">{ad.ai_analysis.analysis.effectiveness_score}/10</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          {ad.ad_snapshot_url && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onAnalyze(ad.id)}
            disabled={isAnalyzing}
          >
            <Brain className="h-3 w-3 mr-1" />
            {ad.ai_analysis ? "Re-analizar" : "Analizar"}
          </Button>
          {collections.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Bookmark className="h-3 w-3 mr-1" />
                  Guardar
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {collections.map((col) => (
                  <DropdownMenuItem key={col.id} onClick={() => onAddToCollection(col.id, ad.id)}>
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: col.color }} />
                    {col.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
