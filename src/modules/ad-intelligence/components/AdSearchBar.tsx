import { useState } from "react";
import { Search, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { COUNTRY_OPTIONS, MEDIA_TYPE_OPTIONS, AD_STATUS_OPTIONS, TIKTOK_PERIOD_OPTIONS, PLATFORM_CONFIG, DEFAULT_SEARCH_LIMIT } from "../config";
import type { AdPlatform, AdSearchFilters } from "../types/ad-intelligence.types";

interface AdSearchBarProps {
  onSearch: (filters: AdSearchFilters) => void;
  onSaveSearch: (name: string, filters: AdSearchFilters) => void;
  isSearching: boolean;
  isSaving: boolean;
}

export function AdSearchBar({ onSearch, onSaveSearch, isSearching, isSaving }: AdSearchBarProps) {
  const [platform, setPlatform] = useState<AdPlatform>("meta");
  const [searchTerms, setSearchTerms] = useState("");
  const [countries, setCountries] = useState<string[]>(["ALL"]);
  const [mediaType, setMediaType] = useState("ALL");
  const [adStatus, setAdStatus] = useState("ALL");
  const [dateMin, setDateMin] = useState("");
  const [dateMax, setDateMax] = useState("");
  const [tiktokPeriod, setTiktokPeriod] = useState(30);
  const [limit, setLimit] = useState(DEFAULT_SEARCH_LIMIT);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  const buildFilters = (): AdSearchFilters => {
    const filters: AdSearchFilters = { platform, limit };
    if (searchTerms) filters.search_terms = searchTerms;
    if (mediaType !== "ALL") filters.media_type = mediaType;

    if (platform === "meta") {
      if (countries.length && !countries.includes("ALL")) filters.countries = countries;
      if (adStatus !== "ALL") filters.ad_active_status = adStatus;
      if (dateMin) filters.date_min = dateMin;
      if (dateMax) filters.date_max = dateMax;
    } else if (platform === "tiktok") {
      filters.period = tiktokPeriod;
      filters.country_code = countries[0] === "ALL" ? "CO" : countries[0];
    } else if (platform === "google") {
      filters.region = countries[0] === "ALL" ? "CO" : countries[0];
      if (dateMin) filters.date_min = dateMin;
      if (dateMax) filters.date_max = dateMax;
    }

    return filters;
  };

  const handleSearch = () => {
    if (!searchTerms.trim() && platform === "meta") return;
    onSearch(buildFilters());
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSaveSearch(saveName, buildFilters());
    setShowSaveDialog(false);
    setSaveName("");
  };

  return (
    <div className="space-y-3">
      {/* Platform selector */}
      <div className="flex gap-2">
        {(Object.keys(PLATFORM_CONFIG) as AdPlatform[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
              platform === p
                ? `${PLATFORM_CONFIG[p].bgColor} ${PLATFORM_CONFIG[p].color} ring-1 ring-current`
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {PLATFORM_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              platform === "meta"
                ? "Buscar por keyword o Page ID..."
                : platform === "tiktok"
                ? "Buscar anuncios en TikTok..."
                : "Buscar anunciante o keyword..."
            }
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Buscar
        </Button>
        <Button variant="outline" onClick={() => setShowSaveDialog(true)} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <Select value={countries[0] || "ALL"} onValueChange={(v) => setCountries([v])}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mediaType} onValueChange={setMediaType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            {MEDIA_TYPE_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {platform === "meta" && (
          <Select value={adStatus} onValueChange={setAdStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {AD_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {platform === "tiktok" && (
          <Select value={String(tiktokPeriod)} onValueChange={(v) => setTiktokPeriod(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {TIKTOK_PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {platform !== "tiktok" && (
          <>
            <Input
              type="date"
              value={dateMin}
              onChange={(e) => setDateMin(e.target.value)}
              className="w-[150px]"
              placeholder="Desde"
            />
            <Input
              type="date"
              value={dateMax}
              onChange={(e) => setDateMax(e.target.value)}
              className="w-[150px]"
              placeholder="Hasta"
            />
          </>
        )}

        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Límite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 ads</SelectItem>
            <SelectItem value="50">50 ads</SelectItem>
            <SelectItem value="100">100 ads</SelectItem>
            <SelectItem value="200">200 ads</SelectItem>
            <SelectItem value="500">500 ads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active filters display */}
      <div className="flex gap-1 flex-wrap">
        <Badge variant="secondary" className={PLATFORM_CONFIG[platform].bgColor}>
          {PLATFORM_CONFIG[platform].label}
        </Badge>
        {countries[0] && countries[0] !== "ALL" && (
          <Badge variant="outline">{COUNTRY_OPTIONS.find(c => c.value === countries[0])?.label}</Badge>
        )}
        {mediaType !== "ALL" && (
          <Badge variant="outline">{MEDIA_TYPE_OPTIONS.find(m => m.value === mediaType)?.label}</Badge>
        )}
      </div>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar búsqueda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la búsqueda</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Ej: Competidores Nike CO"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!saveName.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
