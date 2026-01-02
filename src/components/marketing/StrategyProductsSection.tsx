import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  client_id: string;
  client_name?: string;
}

interface StrategyProductsSectionProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function StrategyProductsSection({
  organizationId,
  selectedClientId,
  selectedProductIds,
  onSelectionChange,
}: StrategyProductsSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
    }
  }, [organizationId, selectedClientId]);

  const fetchProducts = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          strategy,
          market_research,
          ideal_avatar,
          client_id,
          clients(id, name)
        `)
        .order('name');

      // If we have a selected client, filter by it
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      } else {
        // Otherwise get products from all marketing clients
        const { data: marketingClients } = await supabase
          .from('marketing_clients')
          .select('client_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (marketingClients && marketingClients.length > 0) {
          const clientIds = marketingClients.map(mc => mc.client_id);
          query = query.in('client_id', clientIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedProducts: Product[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        strategy: p.strategy,
        market_research: p.market_research,
        ideal_avatar: p.ideal_avatar,
        client_id: p.client_id,
        client_name: (p.clients as any)?.name || null,
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      onSelectionChange(selectedProductIds.filter(id => id !== productId));
    } else {
      onSelectionChange([...selectedProductIds, productId]);
    }
  };

  const toggleExpanded = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Sin productos disponibles</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedClientId 
              ? 'Este cliente no tiene productos registrados'
              : 'Los clientes de marketing no tienen productos'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Productos Asociados</h3>
          <p className="text-sm text-muted-foreground">
            {selectedProductIds.length} de {products.length} productos seleccionados
          </p>
        </div>
        <Badge variant="secondary">
          {selectedProductIds.length} seleccionados
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {products.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            const isExpanded = expandedProduct === product.id;

            return (
              <Card 
                key={product.id} 
                className={`transition-all ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProduct(product.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        {product.strategy && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Estrategia
                          </Badge>
                        )}
                      </div>
                      {product.client_name && !selectedClientId && (
                        <CardDescription className="text-xs">
                          {product.client_name}
                        </CardDescription>
                      )}
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(product.id)}
                    >
                      {isExpanded ? 'Ocultar' : 'Ver más'}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {product.strategy && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Estrategia</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {product.strategy}
                        </p>
                      </div>
                    )}
                    {product.market_research && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Investigación de Mercado</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {product.market_research}
                        </p>
                      </div>
                    )}
                    {product.ideal_avatar && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Avatar Ideal</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {product.ideal_avatar}
                        </p>
                      </div>
                    )}
                    {!product.strategy && !product.market_research && !product.ideal_avatar && (
                      <p className="text-sm text-muted-foreground italic">
                        Este producto no tiene información estratégica adicional
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
