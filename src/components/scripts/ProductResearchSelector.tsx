import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, ChevronDown, Users, Target, Sparkles, Brain, 
  MessageSquare, Lightbulb, CheckCircle2, Globe, Swords
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  description: string | null;
  client_id: string;
  market_research: any;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  sales_angles_data: any;
  avatar_profiles: any;
  competitor_analysis: any;
  content_strategy: any;
}

interface AvatarProfile {
  name?: string;
  age?: string;
  situation?: string;
  awarenessLevel?: string;
  drivers?: string;
  biases?: string;
  objections?: string;
  phrases?: string[];
  goals?: string;
  contentConsumption?: string;
}

interface SalesAngle {
  angle?: string;
  type?: string;
  avatar?: string;
  emotion?: string;
  contentType?: string;
}

interface ProductResearchSelectorProps {
  onSelectProduct: (product: Product | null) => void;
  onSelectAvatar: (avatar: string) => void;
  onSelectSalesAngle: (angle: string) => void;
  onSelectStrategy: (strategy: string) => void;
  onSelectMarketResearch: (research: string) => void;
  onSelectHooks: (hooks: string[]) => void;
  selectedProductId?: string;
}

export function ProductResearchSelector({
  onSelectProduct,
  onSelectAvatar,
  onSelectSalesAngle,
  onSelectStrategy,
  onSelectMarketResearch,
  onSelectHooks,
  selectedProductId,
}: ProductResearchSelectorProps) {
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Collapsible states
  const [avatarsOpen, setAvatarsOpen] = useState(false);
  const [anglesOpen, setAnglesOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [competitionOpen, setCompetitionOpen] = useState(false);

  // Fetch products with research data
  useEffect(() => {
    const fetchProducts = async () => {
      if (!organizationId) return;
      
      setLoading(true);
      try {
        // First get clients from this organization
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', organizationId);
        
        if (clientsError) throw clientsError;
        
        const clientIds = (clientsData || []).map(c => c.id);
        
        if (clientIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }
        
        // Then get products from those clients
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, description, client_id,
            market_research, ideal_avatar, sales_angles,
            sales_angles_data, avatar_profiles, competitor_analysis, content_strategy
          `)
          .in('client_id', clientIds)
          .order('name');
        
        if (error) throw error;
        
        // Filter products that have research data - check all possible locations
        const productsWithResearch = (data || []).filter(p => {
          const avatarProfiles = p.avatar_profiles as any;
          const salesAnglesData = p.sales_angles_data as any;
          return (
            p.market_research || 
            avatarProfiles?.profiles?.length > 0 || 
            salesAnglesData?.angles?.length > 0 || 
            p.content_strategy ||
            p.sales_angles?.length > 0
          );
        });
        
        console.log("[ProductResearchSelector] Products with research:", productsWithResearch.map(p => {
          const avatarProfiles = p.avatar_profiles as any;
          const salesAnglesData = p.sales_angles_data as any;
          return {
            name: p.name,
            hasMarketResearch: !!p.market_research,
            avatarProfilesCount: avatarProfiles?.profiles?.length || 0,
            salesAnglesCount: salesAnglesData?.angles?.length || 0,
            salesAnglesSimple: p.sales_angles?.length || 0,
          };
        }));
        
        setProducts(productsWithResearch as Product[]);
        
        // Auto-select if there's a selectedProductId
        if (selectedProductId) {
          const product = productsWithResearch.find(p => p.id === selectedProductId);
          if (product) {
            setSelectedProduct(product as Product);
            onSelectProduct(product as Product);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [organizationId, selectedProductId]);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId) || null;
    setSelectedProduct(product);
    onSelectProduct(product);
    
    if (product) {
      // Auto-fill strategy and market research
      if (product.content_strategy?.executiveSummary?.marketSummary) {
        onSelectStrategy(product.content_strategy.executiveSummary.marketSummary);
      }
      
      // Format market research
      if (product.market_research) {
        const mr = typeof product.market_research === 'string' 
          ? product.market_research 
          : formatMarketResearch(product.market_research);
        onSelectMarketResearch(mr);
      }
    }
  };

  const formatMarketResearch = (research: any): string => {
    if (!research) return "";
    
    let text = "";
    
    if (research.marketSize) {
      text += `Tamaño de mercado: ${research.marketSize}\n`;
    }
    if (research.growthRate) {
      text += `Tasa de crecimiento: ${research.growthRate}\n`;
    }
    if (research.trends && Array.isArray(research.trends)) {
      text += `Tendencias:\n${research.trends.map((t: any) => `- ${typeof t === 'string' ? t : t.trend || t.name}`).join('\n')}\n`;
    }
    if (research.challenges && Array.isArray(research.challenges)) {
      text += `Desafíos:\n${research.challenges.map((c: any) => `- ${typeof c === 'string' ? c : c.challenge || c.name}`).join('\n')}\n`;
    }
    if (research.opportunities && Array.isArray(research.opportunities)) {
      text += `Oportunidades:\n${research.opportunities.map((o: any) => `- ${typeof o === 'string' ? o : o.opportunity || o.name}`).join('\n')}\n`;
    }
    
    return text || JSON.stringify(research, null, 2);
  };

  // Extract avatar profiles from multiple possible locations
  const getAvatarProfiles = (): AvatarProfile[] => {
    if (!selectedProduct) return [];
    
    // Try avatar_profiles.profiles first
    if (selectedProduct.avatar_profiles?.profiles?.length > 0) {
      return selectedProduct.avatar_profiles.profiles;
    }
    
    // Try market_research.strategicAvatars
    if (selectedProduct.market_research?.strategicAvatars?.length > 0) {
      return selectedProduct.market_research.strategicAvatars.map((a: any) => ({
        name: a.name || a.avatarName,
        age: a.age,
        situation: a.situation || a.currentSituation,
        awarenessLevel: a.awarenessLevel || a.awareness,
        drivers: a.drivers || (Array.isArray(a.emotionalDrivers) ? a.emotionalDrivers.join(', ') : a.emotionalDrivers),
        biases: a.biases || (Array.isArray(a.cognitiveBiases) ? a.cognitiveBiases.join(', ') : a.cognitiveBiases),
        objections: a.objections || (Array.isArray(a.mainObjections) ? a.mainObjections.join(', ') : a.mainObjections),
        phrases: a.phrases || a.typicalPhrases,
        goals: a.goals,
        contentConsumption: a.contentConsumption,
      }));
    }
    
    return [];
  };

  // Extract sales angles from multiple possible locations
  const getSalesAngles = (): SalesAngle[] => {
    if (!selectedProduct) return [];
    
    // Try sales_angles_data.angles first
    if (selectedProduct.sales_angles_data?.angles?.length > 0) {
      return selectedProduct.sales_angles_data.angles;
    }
    
    // Try market_research.salesAngles
    if (selectedProduct.market_research?.salesAngles?.length > 0) {
      return selectedProduct.market_research.salesAngles.map((a: any) => ({
        angle: a.angle || a.salesAngle || a.name,
        type: a.type || a.category,
        avatar: a.avatar || a.targetAvatar,
        emotion: a.emotion || a.primaryEmotion,
        contentType: a.contentType || a.format,
      }));
    }
    
    // Try simple sales_angles array
    if (selectedProduct.sales_angles?.length > 0) {
      return selectedProduct.sales_angles.map((angle: string) => ({
        angle,
        type: 'general',
        avatar: '',
        emotion: '',
        contentType: 'video',
      }));
    }
    
    return [];
  };

  const avatarProfiles = getAvatarProfiles();
  const salesAngles = getSalesAngles();
  const competitors = selectedProduct?.competitor_analysis?.competitors || 
                     selectedProduct?.market_research?.competitors || [];
  const contentStrategy = selectedProduct?.content_strategy || 
                         selectedProduct?.market_research?.contentStrategy;

  const handleSelectAvatar = (avatar: AvatarProfile) => {
    const formatted = `
${avatar.name || 'Avatar'} (${avatar.age || ''})
Situación: ${avatar.situation || ''}
Nivel de consciencia: ${avatar.awarenessLevel || ''}
Drivers: ${avatar.drivers || ''}
Sesgos: ${avatar.biases || ''}
Objetivos: ${avatar.goals || ''}
Objeciones: ${avatar.objections || ''}
Consumo de contenido: ${avatar.contentConsumption || ''}
Frases: ${avatar.phrases?.join('; ') || ''}
    `.trim();
    
    onSelectAvatar(formatted);
  };

  const handleSelectAngle = (angle: SalesAngle) => {
    onSelectSalesAngle(angle.angle || '');
  };

  const extractHooksFromAngles = () => {
    const hooks = salesAngles
      .slice(0, 5)
      .map(a => a.angle || '')
      .filter(Boolean);
    onSelectHooks(hooks);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Cargando productos...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center">
        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay productos con investigación de mercado.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Genera el Brief IA en un producto para ver sus datos aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product Selector */}
      <div className="space-y-2">
        <Select
          value={selectedProduct?.id || ""}
          onValueChange={handleProductChange}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Seleccionar producto con investigación..." />
          </SelectTrigger>
          <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
            {products.map(product => {
              const avatarCount = 
                product.avatar_profiles?.profiles?.length || 
                product.market_research?.strategicAvatars?.length || 0;
              
              const anglesCount = 
                product.sales_angles_data?.angles?.length || 
                product.market_research?.salesAngles?.length ||
                product.sales_angles?.length || 0;
              
              return (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span>{product.name}</span>
                    {avatarCount > 0 && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {avatarCount} avatares
                      </Badge>
                    )}
                    {anglesCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {anglesCount} ángulos
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {selectedProduct && (
        <div className="space-y-2 pt-2 border-t">
          {/* Quick info bar */}
          {avatarProfiles.length === 0 && salesAngles.length === 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Sin investigación completa</p>
              <p className="text-xs mt-1">Genera el Brief IA en este producto.</p>
            </div>
          )}
          
          {/* Avatars Collapsible */}
          {avatarProfiles.length > 0 && (
            <Collapsible open={avatarsOpen} onOpenChange={setAvatarsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Users className="h-4 w-4 text-purple-500" />
                  Avatares Estratégicos ({avatarProfiles.length})
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${avatarsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {avatarProfiles.map((avatar, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg bg-card hover:bg-accent/30 cursor-pointer transition-colors group"
                      onClick={() => handleSelectAvatar(avatar)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{avatar.name || `Avatar ${idx + 1}`}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {avatar.awarenessLevel?.substring(0, 15) || 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {avatar.situation}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs w-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAvatar(avatar);
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Usar este avatar
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Sales Angles Collapsible */}
          {salesAngles.length > 0 && (
            <Collapsible open={anglesOpen} onOpenChange={setAnglesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Ángulos de Venta ({salesAngles.length})
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${anglesOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
                <div className="flex justify-end mb-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={extractHooksFromAngles}
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Usar primeros 5 como hooks
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {salesAngles.map((angle, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg bg-card hover:bg-accent/30 cursor-pointer transition-colors group"
                      onClick={() => handleSelectAngle(angle)}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {angle.type && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {angle.type}
                          </Badge>
                        )}
                        {angle.avatar && (
                          <Badge variant="secondary" className="text-xs">
                            {angle.avatar}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{angle.angle}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Insights Collapsible */}
          {contentStrategy?.executiveSummary?.keyInsights?.length > 0 && (
            <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Brain className="h-4 w-4 text-blue-500" />
                  Insights Clave ({contentStrategy.executiveSummary.keyInsights.length})
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${insightsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {contentStrategy.executiveSummary.keyInsights.map((insight: any, idx: number) => (
                    <div key={idx} className="p-2 border rounded-lg bg-card text-sm">
                      <p className="font-medium">{insight.insight}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.action}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Competition Collapsible */}
          {competitors.length > 0 && (
            <Collapsible open={competitionOpen} onOpenChange={setCompetitionOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Swords className="h-4 w-4 text-red-500" />
                  Competencia ({competitors.length})
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${competitionOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {competitors.map((comp: any, idx: number) => (
                    <div key={idx} className="p-2 border rounded-lg bg-card text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{comp.name}</span>
                        <Badge variant="outline" className="text-xs">{comp.price || 'N/A'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{comp.differentiator}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
