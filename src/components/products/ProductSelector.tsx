import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  client_id: string;
}

interface ProductSelectorProps {
  clientId: string | null;
  value: string;
  onChange: (productId: string) => void;
  onCreateNew?: () => void;
}

export function ProductSelector({ clientId, value, onChange, onCreateNew }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [clientId]);

  const fetchProducts = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, client_id')
      .eq('client_id', clientId)
      .order('name');
    setProducts(data || []);
    setLoading(false);
  };

  if (!clientId) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Primero selecciona un cliente" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={loading ? "Cargando..." : "Seleccionar producto"} />
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
          {products.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No hay productos para este cliente
            </div>
          )}
        </SelectContent>
      </Select>
      {onCreateNew && (
        <Button type="button" variant="outline" size="icon" onClick={onCreateNew}>
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
