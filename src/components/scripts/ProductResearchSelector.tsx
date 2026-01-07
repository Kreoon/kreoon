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
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Cargar desde Producto con Investigación
        </Label>
        <Select
          value={selectedProduct?.id || ""}
          onValueChange={handleProductChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar producto..." />
          </SelectTrigger>
          <SelectContent>
            {products.map(product => {
              // Count avatars from multiple sources
              const avatarCount = 
                product.avatar_profiles?.profiles?.length || 
                product.market_research?.strategicAvatars?.length || 0;
              
              // Count angles from multiple sources
              const anglesCount = 
                product.sales_angles_data?.angles?.length || 
                product.market_research?.salesAngles?.length ||
                product.sales_angles?.length || 0;
              
              return (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    {product.name}
                    {avatarCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {avatarCount}
                      </Badge>
                    )}
                    {anglesCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {anglesCount}
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
        <div className="space-y-3">
          {/* Debug info - shows data availability */}
          {avatarProfiles.length === 0 && salesAngles.length === 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
              <p className="font-medium">Este producto no tiene investigación de mercado completa.</p>
              <p className="text-xs mt-1">Genera el Brief IA para obtener avatares y ángulos de venta.</p>
            </div>
          )}
          
          {/* Avatars Collapsible */}
          {avatarProfiles.length > 0 ? (
            <Collapsible open={avatarsOpen} onOpenChange={setAvatarsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Avatares Estratégicos ({avatarProfiles.length})
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${avatarsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScrollArea className="max-h-60">
                  <div className="space-y-2 p-1">
                    {avatarProfiles.map((avatar, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectAvatar(avatar)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{avatar.name || `Avatar ${idx + 1}`}</span>
                          <Badge variant="secondary" className="text-xs">
                            {avatar.awarenessLevel?.substring(0, 20) || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {avatar.situation}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAvatar(avatar);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Usar este avatar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="p-2 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
              <Users className="h-4 w-4 mx-auto mb-1 opacity-50" />
              Sin avatares disponibles
            </div>
          )}

          {/* Sales Angles Collapsible */}
          {salesAngles.length > 0 ? (
            <Collapsible open={anglesOpen} onOpenChange={setAnglesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Ángulos de Venta ({salesAngles.length})
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${anglesOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
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
                <ScrollArea className="max-h-60">
                  <div className="space-y-2 p-1">
                    {salesAngles.map((angle, idx) => (
                      <div
                        key={idx}
                        className="p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                        onClick={() => handleSelectAngle(angle)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {angle.type && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {angle.type}
                              </Badge>
                            )}
                            {angle.emotion && (
                              <Badge variant="secondary" className="text-xs">
                                {angle.emotion}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{angle.angle}</p>
                          {(angle.avatar || angle.contentType) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {angle.avatar && `Avatar: ${angle.avatar}`}
                              {angle.avatar && angle.contentType && ' • '}
                              {angle.contentType && `Formato: ${angle.contentType}`}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAngle(angle);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="p-2 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4 mx-auto mb-1 opacity-50" />
              Sin ángulos de venta disponibles
            </div>
          )}

          {/* Market Insights Collapsible */}
          {contentStrategy?.executiveSummary?.keyInsights?.length > 0 && (
            <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    Insights Clave ({contentStrategy.executiveSummary.keyInsights.length})
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${insightsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScrollArea className="max-h-40">
                  <div className="space-y-2 p-1">
                    {contentStrategy.executiveSummary.keyInsights.map((insight: any, idx: number) => (
                      <div key={idx} className="p-2 border rounded-lg text-sm">
                        <p className="font-medium">{insight.insight}</p>
                        <p className="text-xs text-muted-foreground mt-1">{insight.action}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Competition Collapsible */}
          {competitors.length > 0 && (
            <Collapsible open={competitionOpen} onOpenChange={setCompetitionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-red-500" />
                    Competencia ({competitors.length})
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${competitionOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScrollArea className="max-h-40">
                  <div className="space-y-2 p-1">
                    {competitors.map((comp: any, idx: number) => (
                      <div key={idx} className="p-2 border rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{comp.name}</span>
                          <Badge variant="outline" className="text-xs">{comp.price || 'N/A'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{comp.differentiator}</p>
                        {comp.weaknesses && (
                          <p className="text-xs text-amber-600 mt-1">
                            Debilidades: {Array.isArray(comp.weaknesses) ? comp.weaknesses.join(', ') : comp.weaknesses}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
