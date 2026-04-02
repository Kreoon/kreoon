import { useState } from "react";
import { Search, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SOCIAL_PLATFORM_CONFIG, TARGET_TYPE_OPTIONS, DEFAULT_SCRAPE_LIMIT } from "../config";
import type { SocialPlatform, TargetType, ScrapeFilters } from "../types/social-scraper.types";

interface ScrapeSearchBarProps {
  onScrape: (filters: ScrapeFilters & { target_id?: string }) => void;
  onSaveTarget: (params: { platform: string; target_type: string; target_value: string; display_name?: string }) => void;
  isScraping: boolean;
  isSaving: boolean;
}

export function ScrapeSearchBar({ onScrape, onSaveTarget, isScraping, isSaving }: ScrapeSearchBarProps) {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [targetType, setTargetType] = useState<TargetType>("profile");
  const [targetValue, setTargetValue] = useState("");
  const [limit, setLimit] = useState(DEFAULT_SCRAPE_LIMIT);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDisplayName, setSaveDisplayName] = useState("");

  const handleScrape = () => {
    if (!targetValue.trim()) return;
    onScrape({ platform, target_type: targetType, target_value: targetValue.trim(), limit });
  };

  const handleSave = () => {
    if (!targetValue.trim()) return;
    onSaveTarget({
      platform,
      target_type: targetType,
      target_value: targetValue.trim(),
      display_name: saveDisplayName.trim() || undefined,
    });
    setShowSaveDialog(false);
    setSaveDisplayName("");
  };

  const currentTargetOption = TARGET_TYPE_OPTIONS.find((t) => t.value === targetType);

  return (
    <div className="space-y-3">
      {/* Platform selector */}
      <div className="flex gap-2">
        {(Object.keys(SOCIAL_PLATFORM_CONFIG) as SocialPlatform[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
              platform === p
                ? `${SOCIAL_PLATFORM_CONFIG[p].bgColor} ${SOCIAL_PLATFORM_CONFIG[p].color} ring-1 ring-current`
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {SOCIAL_PLATFORM_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div className="flex gap-2">
        <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TARGET_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={currentTargetOption?.placeholder || "Buscar..."}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
        </div>

        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Limite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 items</SelectItem>
            <SelectItem value="30">30 items</SelectItem>
            <SelectItem value="50">50 items</SelectItem>
            <SelectItem value="100">100 items</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleScrape} disabled={isScraping || !targetValue.trim()}>
          {isScraping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Scrapear
        </Button>
        <Button variant="outline" onClick={() => setShowSaveDialog(true)} disabled={isSaving || !targetValue.trim()}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Target
        </Button>
      </div>

      {/* Active config display */}
      <div className="flex gap-1 flex-wrap">
        <Badge variant="secondary" className={SOCIAL_PLATFORM_CONFIG[platform].bgColor}>
          {SOCIAL_PLATFORM_CONFIG[platform].label}
        </Badge>
        <Badge variant="outline">{currentTargetOption?.label}</Badge>
        {targetValue && <Badge variant="outline">{targetValue}</Badge>}
      </div>

      {/* Save target dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar target de scraping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre (opcional)</Label>
              <Input
                value={saveDisplayName}
                onChange={(e) => setSaveDisplayName(e.target.value)}
                placeholder="Ej: Nike Colombia"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="flex gap-2 flex-wrap text-sm text-muted-foreground">
              <span>{SOCIAL_PLATFORM_CONFIG[platform].label}</span>
              <span>/</span>
              <span>{currentTargetOption?.label}</span>
              <span>/</span>
              <span>{targetValue}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
