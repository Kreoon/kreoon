import { useState, useMemo } from "react";
import { Search, Bookmark, FolderOpen, Brain, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { UnderConstructionGuard } from "@/components/layout/UnderConstructionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdSearchBar } from "../components/AdSearchBar";
import { AdGrid } from "../components/AdGrid";
import { AdDetailDialog } from "../components/AdDetailDialog";
import { AdFilters } from "../components/AdFilters";
import { SavedSearches } from "../components/SavedSearches";
import { CollectionManager } from "../components/CollectionManager";
import {
  useAdLibrarySearch,
  useAdLibraryAds,
  useAdLibrarySearches,
  useAdLibraryCollections,
  useAdAnalysis,
  useTokenStatus,
} from "../hooks";
import { PLATFORM_CONFIG } from "../config";
import type { AdLibraryAd, AdPlatform } from "../types/ad-intelligence.types";

export default function AdIntelligencePage() {
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedAd, setSelectedAd] = useState<AdLibraryAd | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [analyzingAdId, setAnalyzingAdId] = useState<string | null>(null);

  // Filters for explore tab
  const [platformFilter, setPlatformFilter] = useState<AdPlatform | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [hasAnalysis, setHasAnalysis] = useState<"all" | "analyzed" | "not_analyzed">("all");

  // Hooks
  const { search, isSearching, searchResult, saveSearch, isSaving, syncSearch, isSyncing } = useAdLibrarySearch();
  const { data: adsData, isLoading: isLoadingAds } = useAdLibraryAds({
    platform: platformFilter !== "all" ? platformFilter : undefined,
    isActive: activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
  });
  const { data: searches, isLoading: isLoadingSearches } = useAdLibrarySearches();
  const { collections, isLoading: isLoadingCollections, createCollection, isCreating, deleteCollection, addToCollection } = useAdLibraryCollections();
  const { analyze, isAnalyzing } = useAdAnalysis();
  const { data: tokenStatus } = useTokenStatus();

  // Combine search results with DB ads
  const displayAds = useMemo(() => {
    let ads = searchResult?.ads || adsData?.ads || [];
    if (hasAnalysis === "analyzed") ads = ads.filter(a => a.ai_analysis);
    if (hasAnalysis === "not_analyzed") ads = ads.filter(a => !a.ai_analysis);
    return ads;
  }, [searchResult, adsData, hasAnalysis]);

  const handleViewDetail = (ad: AdLibraryAd) => {
    setSelectedAd(ad);
    setDetailOpen(true);
  };

  const handleAnalyze = async (adId: string) => {
    setAnalyzingAdId(adId);
    try {
      await analyze(adId);
    } finally {
      setAnalyzingAdId(null);
    }
  };

  const handleAddToCollection = async (collectionId: string, adId: string) => {
    await addToCollection({ collectionId, adId });
  };

  const handleBatchAnalyze = async () => {
    const unanalyzed = displayAds.filter(a => !a.ai_analysis).slice(0, 10);
    for (const ad of unanalyzed) {
      setAnalyzingAdId(ad.id);
      try {
        await analyze(ad.id);
      } catch {}
    }
    setAnalyzingAdId(null);
  };

  const StatusIcon = ({ configured, valid }: { configured: boolean; valid: boolean }) => {
    if (configured && valid) return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (configured && !valid) return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  return (
    <UnderConstructionGuard moduleName="Ad Intelligence" description="Inteligencia competitiva de anuncios en Meta, TikTok y Google. Este modulo estara disponible pronto para todos los usuarios.">
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ad Intelligence</h1>
          <p className="text-muted-foreground">Inteligencia competitiva de anuncios — Meta, TikTok, Google</p>
        </div>
        {tokenStatus && (
          <div className="flex gap-3">
            {(Object.keys(tokenStatus) as AdPlatform[]).map((platform) => (
              <div key={platform} className="flex items-center gap-1.5">
                <StatusIcon configured={tokenStatus[platform].configured} valid={tokenStatus[platform].valid} />
                <span className="text-xs text-muted-foreground">{PLATFORM_CONFIG[platform].label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="explore" className="gap-2">
            <Search className="h-4 w-4" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Búsquedas Guardadas
            {searches?.length ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{searches.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Colecciones
            {collections.length ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{collections.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <Brain className="h-4 w-4" />
            Análisis AI
          </TabsTrigger>
        </TabsList>

        {/* Explore tab */}
        <TabsContent value="explore" className="space-y-4">
          <AdSearchBar
            onSearch={search}
            onSaveSearch={(name, filters) => saveSearch({ name, filters })}
            isSearching={isSearching}
            isSaving={isSaving}
          />

          <AdFilters
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            hasAnalysis={hasAnalysis}
            setHasAnalysis={setHasAnalysis}
            onClearFilters={() => {
              setPlatformFilter("all");
              setActiveFilter("all");
              setHasAnalysis("all");
            }}
            totalAds={displayAds.length}
          />

          <AdGrid
            ads={displayAds}
            collections={collections}
            isLoading={isSearching || isLoadingAds}
            onViewDetail={handleViewDetail}
            onAnalyze={handleAnalyze}
            onAddToCollection={handleAddToCollection}
            analyzingAdId={analyzingAdId}
          />
        </TabsContent>

        {/* Saved searches tab */}
        <TabsContent value="saved">
          <SavedSearches
            searches={searches || []}
            isLoading={isLoadingSearches}
            onSync={syncSearch}
            isSyncing={isSyncing}
          />
        </TabsContent>

        {/* Collections tab */}
        <TabsContent value="collections">
          <CollectionManager
            collections={collections}
            isLoading={isLoadingCollections}
            onCreateCollection={createCollection}
            onDeleteCollection={deleteCollection}
            isCreating={isCreating}
            onViewDetail={handleViewDetail}
            onAnalyze={handleAnalyze}
            onAddToCollection={handleAddToCollection}
          />
        </TabsContent>

        {/* AI Analysis tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Análisis AI en lote</h3>
              <p className="text-sm text-muted-foreground">
                Analiza automáticamente los anuncios sin análisis (máx 10 a la vez)
              </p>
            </div>
            <Button onClick={handleBatchAnalyze} disabled={isAnalyzing}>
              <Brain className="h-4 w-4 mr-2" />
              Analizar sin análisis
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total anuncios</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{adsData?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Con análisis AI</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-purple-400">
                  {(adsData?.ads || []).filter(a => a.ai_analysis).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pendientes de análisis</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-yellow-400">
                  {(adsData?.ads || []).filter(a => !a.ai_analysis).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ads with analysis */}
          <div>
            <h4 className="text-sm font-medium mb-3">Anuncios analizados recientemente</h4>
            <AdGrid
              ads={(adsData?.ads || []).filter(a => a.ai_analysis).slice(0, 12)}
              collections={collections}
              isLoading={isLoadingAds}
              onViewDetail={handleViewDetail}
              onAnalyze={handleAnalyze}
              onAddToCollection={handleAddToCollection}
              analyzingAdId={analyzingAdId}
              emptyMessage="No hay anuncios analizados aún"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <AdDetailDialog
        ad={selectedAd}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAnalyze={handleAnalyze}
        isAnalyzing={analyzingAdId === selectedAd?.id}
      />
    </div>
    </UnderConstructionGuard>
  );
}
