import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, FileText, Video, BarChart3, Brain, Palette, Calendar,
  Scroll, RefreshCw 
} from "lucide-react";
import { MedievalBanner } from "@/components/layout/MedievalBanner";
import { ScriptBlockCard } from "@/components/scripts/ScriptBlockCard";
import { ScriptDetailPanel } from "@/components/scripts/ScriptDetailPanel";
import { cn } from "@/lib/utils";
import { useOrgOwner } from "@/hooks/useOrgOwner";

type BlockType = 'creator' | 'editor' | 'trafficker' | 'strategist' | 'designer' | 'admin';

const tabConfig: { id: BlockType; label: string; icon: typeof FileText; shortLabel: string }[] = [
  { id: 'creator', label: 'Creador', shortLabel: 'Creador', icon: FileText },
  { id: 'editor', label: 'Editor', shortLabel: 'Editor', icon: Video },
  { id: 'trafficker', label: 'Trafficker', shortLabel: 'Traffic', icon: BarChart3 },
  { id: 'strategist', label: 'Estratega', shortLabel: 'Estrat.', icon: Brain },
  { id: 'designer', label: 'Diseñador', shortLabel: 'Diseño', icon: Palette },
  { id: 'admin', label: 'Admin / PM', shortLabel: 'Admin', icon: Calendar },
];

const Scripts = () => {
  const { currentOrgId, loading: orgLoading } = useOrgOwner();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<BlockType>('creator');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // Fetch content with scripts – wait for org context
  const { data: contents, isLoading, refetch } = useQuery({
    queryKey: ['scripts-content', currentOrgId, orgLoading],
    queryFn: async () => {
      // Guard: ensure org ready
      if (orgLoading || !currentOrgId) return [];

      let query = supabase
        .from('content')
        .select(`
          id,
          title,
          status,
          created_at,
          script,
          editor_guidelines,
          strategist_guidelines,
          trafficker_guidelines,
          designer_guidelines,
          admin_guidelines,
          organization_id,
          client:clients(name, logo_url),
          product:products(name)
        `)
        .eq('organization_id', currentOrgId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !orgLoading,
  });

  // Filter contents based on search
  const filteredContents = useMemo(() => {
    if (!contents) return [];
    
    const term = searchTerm.toLowerCase();
    return contents.filter(content => 
      content.title.toLowerCase().includes(term) ||
      content.client?.name?.toLowerCase().includes(term) ||
      content.product?.name?.toLowerCase().includes(term)
    );
  }, [contents, searchTerm]);

  // Get selected content
  const selectedContent = useMemo(() => {
    if (!selectedContentId || !contents) return null;
    return contents.find(c => c.id === selectedContentId) || null;
  }, [selectedContentId, contents]);

  // Get field based on block type
  const getBlockField = (blockType: BlockType): string => {
    switch (blockType) {
      case 'creator': return 'script';
      case 'editor': return 'editor_guidelines';
      case 'trafficker': return 'trafficker_guidelines';
      case 'strategist': return 'strategist_guidelines';
      case 'designer': return 'designer_guidelines';
      case 'admin': return 'admin_guidelines';
    }
  };

  // Filter contents that have content for current tab
  const contentsWithBlock = useMemo(() => {
    const field = getBlockField(activeTab);
    return filteredContents.filter(c => !!(c as any)[field]);
  }, [filteredContents, activeTab]);

  const contentsWithoutBlock = useMemo(() => {
    const field = getBlockField(activeTab);
    return filteredContents.filter(c => !(c as any)[field]);
  }, [filteredContents, activeTab]);

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <MedievalBanner
          icon={Scroll}
          title="KREOON IA"
          subtitle="Gestiona guiones, instrucciones y automatizaciones IA"
          action={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          }
        />

        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="text"
            placeholder="Buscar por título, cliente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BlockType)} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1 bg-muted/50">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex-1 min-w-[80px] gap-1.5 data-[state=active]:shadow-sm py-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.shortLabel}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Content area - List + Detail panel */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: '600px' }}>
            {/* Left: Content list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {contentsWithBlock.length + contentsWithoutBlock.length} contenidos
                </h3>
              </div>

              <ScrollArea className="h-[550px] pr-2">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredContents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No se encontraron contenidos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Contents with block generated */}
                    {contentsWithBlock.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Con bloque generado ({contentsWithBlock.length})
                        </p>
                        {contentsWithBlock.map((content) => (
                          <ScriptBlockCard
                            key={content.id}
                            content={content as any}
                            blockType={activeTab}
                            onClick={() => setSelectedContentId(content.id)}
                            isSelected={selectedContentId === content.id}
                          />
                        ))}
                      </>
                    )}

                    {/* Separator */}
                    {contentsWithBlock.length > 0 && contentsWithoutBlock.length > 0 && (
                      <div className="py-2" />
                    )}

                    {/* Contents without block */}
                    {contentsWithoutBlock.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Sin bloque ({contentsWithoutBlock.length})
                        </p>
                        {contentsWithoutBlock.map((content) => (
                          <ScriptBlockCard
                            key={content.id}
                            content={content as any}
                            blockType={activeTab}
                            onClick={() => setSelectedContentId(content.id)}
                            isSelected={selectedContentId === content.id}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right: Detail panel */}
            <div className="hidden lg:block h-[600px]">
              <ScriptDetailPanel
                content={selectedContent as any}
                blockType={activeTab}
                onClose={() => setSelectedContentId(null)}
              />
            </div>
          </div>
        </Tabs>

        {/* Mobile detail panel (full screen modal) */}
        {selectedContentId && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background p-4">
            <div className="h-full">
              <ScriptDetailPanel
                content={selectedContent as any}
                blockType={activeTab}
                onClose={() => setSelectedContentId(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scripts;