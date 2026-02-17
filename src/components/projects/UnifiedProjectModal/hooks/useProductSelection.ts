import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Manages product selection state for content projects.
 * Fetches product data by ID and handles product changes.
 */
export function useProductSelection(productId: string | undefined) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    } else {
      setSelectedProduct(null);
    }
  }, [productId]);

  const fetchProduct = async (id: string) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setSelectedProduct(data);
  };

  const handleProductChange = useCallback(async (newProductId: string) => {
    if (newProductId) {
      await fetchProduct(newProductId);
    } else {
      setSelectedProduct(null);
    }
  }, []);

  return { selectedProduct, handleProductChange };
}
