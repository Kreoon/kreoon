import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LazyRichTextViewer as RichTextViewer } from '@/components/ui/lazy-rich-text-editor';
import { ProductDNAWizard } from '@/components/product-dna';
import { Eye, Trash2, Package, Sparkles, FolderOpen, FileText, Target, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Product } from '@/pages/ClientDashboard';

export interface ClientProductsTabProps {
  selectedClientId: string | null;
  products: Product[];
  showCreateProductWizard: boolean;
  setShowCreateProductWizard: (v: boolean) => void;
  onProductCreated: () => void;
  onSelectProduct: (product: Product) => void;
  onDeleteProduct: (productId: string, productName: string) => void;
}

export function ClientProductsTab({
  selectedClientId, products, showCreateProductWizard, setShowCreateProductWizard,
  onProductCreated, onSelectProduct, onDeleteProduct,
}: ClientProductsTabProps) {
  return (
    <div className="space-y-6">
      {showCreateProductWizard ? (
        <ProductDNAWizard
          clientId={selectedClientId!}
          onComplete={() => {
            setShowCreateProductWizard(false);
            onProductCreated();
          }}
          onCancel={() => setShowCreateProductWizard(false)}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Mis Productos</h2>
              <p className="text-sm text-muted-foreground">
                Productos y servicios que estamos promocionando para ti
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => setShowCreateProductWizard(true)}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5" />
              Crear Nuevo Producto
            </Button>
          </div>

          {products.length === 0 ? (
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-sm-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">¡Crea tu primer producto!</h4>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Graba un audio describiendo tu producto y nuestra IA investigará tu mercado,
                  competencia y creará estrategias automáticamente.
                </p>
                <Button
                  size="lg"
                  onClick={() => setShowCreateProductWizard(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Crear Producto con IA
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => onSelectProduct(product)}
                >
                  <CardContent className="p-0">
                    <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-sm bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {(product as any).product_code && <span className="text-primary">#{(product as any).product_code}</span>}{' '}
                              {product.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Creado: {product.created_at ? format(new Date(product.created_at), "d 'de' MMM, yyyy", { locale: es }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver detalles
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProduct(product.id, product.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {product.sales_angles && product.sales_angles.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                            <Sparkles className="h-3 w-3" /> Ángulos de Venta
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {product.sales_angles.map((angle, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {angle}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {product.brief_url && (
                          <a
                            href={product.brief_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-sm"
                          >
                            <FolderOpen className="h-3 w-3" /> Brief
                          </a>
                        )}
                        {product.onboarding_url && (
                          <a
                            href={product.onboarding_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-sm"
                          >
                            <FileText className="h-3 w-3" /> Onboarding
                          </a>
                        )}
                        {product.research_url && (
                          <a
                            href={product.research_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-sm"
                          >
                            <Target className="h-3 w-3" /> Investigación
                          </a>
                        )}
                      </div>

                      {product.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          <RichTextViewer content={product.description} className="prose-sm" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
