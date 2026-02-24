import { useState, useMemo } from "react";
import { Search, Target, Brain } from "lucide-react";
import { UnderConstructionGuard } from "@/components/layout/UnderConstructionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrapeSearchBar } from "../components/ScrapeSearchBar";
import { ContentGrid } from "../components/ContentGrid";
import { ContentDetailDialog } from "../components/ContentDetailDialog";
import { ContentFilters } from "../components/ContentFilters";
import { TargetManager } from "../components/TargetManager";
import { useSocialScrape, useScrapeItems, useScrapeTargets, useScrapeAnalysis } from "../hooks";
import type { ScrapeItem, SocialPlatform } from "../types/social-scraper.types";

export default function SocialScraperPage() {
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedItem, setSelectedItem] = useState<ScrapeItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);

  // Filters for explore tab
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "all">("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [hasAnalysis, setHasAnalysis] = useState<"all" | "analyzed" | "not_analyzed">("all");

  // Hooks
  const { scrape, isScraping, saveTarget, isSaving, syncTarget, isSyncing } = useSocialScrape();
  const { data: itemsData, isLoading: isLoadingItems } = useScrapeItems({
    platform: platformFilter !== "all" ? platformFilter : undefined,
    contentType: contentTypeFilter !== "all" ? contentTypeFilter : undefined,
  });
  const { data: targets, isLoading: isLoadingTargets } = useScrapeTargets();
  const { analyze, isAnalyzing, batchAnalyze } = useScrapeAnalysis();

  // Filter items
  const displayItems = useMemo(() => {
    let items = itemsData?.items || [];
    if (hasAnalysis === "analyzed") items = items.filter((i) => i.ai_analysis);
    if (hasAnalysis === "not_analyzed") items = items.filter((i) => !i.ai_analysis);
    return items;
  }, [itemsData, hasAnalysis]);

  const handleViewDetail = (item: ScrapeItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleAnalyze = async (itemId: string) => {
    setAnalyzingItemId(itemId);
    try {
      await analyze(itemId);
    } finally {
      setAnalyzingItemId(null);
    }
  };

  const handleBatchAnalyze = async () => {
    const unanalyzed = displayItems.filter((i) => !i.ai_analysis).slice(0, 10);
    if (!unanalyzed.length) return;
    await batchAnalyze(unanalyzed.map((i) => i.id));
  };

  const totalItems = itemsData?.total || 0;
  const analyzedCount = (itemsData?.items || []).filter((i) => i.ai_analysis).length;
  const pendingCount = (itemsData?.items || []).filter((i) => !i.ai_analysis).length;

  return (
    <UnderConstructionGuard moduleName="Social Scraper" description="Scraping organico de contenido en Instagram, TikTok, Facebook, YouTube y X. Este modulo estara disponible pronto para todos los usuarios.">
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Social Scraper</h1>
        <p className="text-muted-foreground">
          Scraping organico de contenido — Instagram, TikTok, Facebook, YouTube, X
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="explore" className="gap-2">
            <Search className="h-4 w-4" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="targets" className="gap-2">
            <Target className="h-4 w-4" />
            Targets
            {targets?.length ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{targets.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <Brain className="h-4 w-4" />
            Analisis AI
          </TabsTrigger>
        </TabsList>

        {/* Explore tab */}
        <TabsContent value="explore" className="space-y-4">
          <ScrapeSearchBar
            onScrape={scrape}
            onSaveTarget={saveTarget}
            isScraping={isScraping}
            isSaving={isSaving}
          />

          <ContentFilters
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
            contentTypeFilter={contentTypeFilter}
            setContentTypeFilter={setContentTypeFilter}
            hasAnalysis={hasAnalysis}
            setHasAnalysis={setHasAnalysis}
            onClearFilters={() => {
              setPlatformFilter("all");
              setContentTypeFilter("all");
              setHasAnalysis("all");
            }}
            totalItems={displayItems.length}
          />

          <ContentGrid
            items={displayItems}
            isLoading={isScraping || isLoadingItems}
            onViewDetail={handleViewDetail}
            onAnalyze={handleAnalyze}
            analyzingItemId={analyzingItemId}
          />
        </TabsContent>

        {/* Targets tab */}
        <TabsContent value="targets">
          <TargetManager
            targets={targets || []}
            isLoading={isLoadingTargets}
            onSync={syncTarget}
            isSyncing={isSyncing}
          />
        </TabsContent>

        {/* AI Analysis tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Analisis AI en lote</h3>
              <p className="text-sm text-muted-foreground">
                Analiza automaticamente los contenidos sin analisis (max 10 a la vez)
              </p>
            </div>
            <Button onClick={handleBatchAnalyze} disabled={isAnalyzing}>
              <Brain className="h-4 w-4 mr-2" />
              Analizar pendientes
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total contenidos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{totalItems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Con analisis AI</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-purple-400">{analyzedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pendientes de analisis</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recently analyzed */}
          <div>
            <h4 className="text-sm font-medium mb-3">Contenidos analizados recientemente</h4>
            <ContentGrid
              items={(itemsData?.items || []).filter((i) => i.ai_analysis).slice(0, 12)}
              isLoading={isLoadingItems}
              onViewDetail={handleViewDetail}
              onAnalyze={handleAnalyze}
              analyzingItemId={analyzingItemId}
              emptyMessage="No hay contenidos analizados aun"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <ContentDetailDialog
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAnalyze={handleAnalyze}
        isAnalyzing={analyzingItemId === selectedItem?.id}
      />
    </div>
    </UnderConstructionGuard>
  );
}
