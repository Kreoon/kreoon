// ============================================
// useProductDNA - Hook for Product DNA CRUD
// Adapted to actual product_dna table schema
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProductDNARecord } from '@/components/product-dna/ProductDNADisplay';
import {
  createProductDNA,
  analyzeProductDNA,
  getProductDNA,
  updateProductDNA,
  deleteProductDNA,
  duplicateProductDNA,
  regenerateProductDNAAnalysis,
  pollProductDNAStatus,
  type CreateProductDNAInput,
  type ServiceResult,
} from '@/lib/services/product-dna.service';

// ============================================
// TYPES
// ============================================

interface UseProductDNAOptions {
  id?: string;
  autoFetch?: boolean;
  pollOnAnalyzing?: boolean;
  pollInterval?: number;
}

interface UseProductDNAReturn {
  // State
  productDNA: ProductDNARecord | null;
  isLoading: boolean;
  error: string | null;

  // Derived
  isAnalyzing: boolean;
  isReady: boolean;
  hasAnalysis: boolean;
  confidenceScore: number;

  // CRUD
  create: (data: CreateProductDNAInput) => Promise<ProductDNARecord | null>;
  fetch: (id: string) => Promise<ProductDNARecord | null>;
  update: (updates: Record<string, any>) => Promise<boolean>;
  remove: () => Promise<boolean>;
  duplicate: () => Promise<ProductDNARecord | null>;

  // Analysis
  analyze: () => Promise<boolean>;
  regenerate: () => Promise<boolean>;

  // Utils
  refresh: () => Promise<void>;
  reset: () => void;
}

// ============================================
// MAIN HOOK
// ============================================

export function useProductDNA(options: UseProductDNAOptions = {}): UseProductDNAReturn {
  const {
    id: initialId,
    autoFetch = true,
    pollOnAnalyzing = true,
    pollInterval = 3000,
  } = options;

  const { toast } = useToast();

  const [productDNA, setProductDNA] = useState<ProductDNARecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(initialId || null);

  // ---- Derived state ----

  const isAnalyzing = useMemo(() => productDNA?.status === 'analyzing', [productDNA?.status]);

  const isReady = useMemo(() => productDNA?.status === 'ready', [productDNA?.status]);

  const hasAnalysis = useMemo(
    () => !!(productDNA?.market_research || productDNA?.competitor_analysis ||
             productDNA?.strategy_recommendations || productDNA?.content_brief),
    [productDNA?.market_research, productDNA?.competitor_analysis,
     productDNA?.strategy_recommendations, productDNA?.content_brief],
  );

  const confidenceScore = useMemo(
    () => productDNA?.ai_confidence_score ?? 0,
    [productDNA?.ai_confidence_score],
  );

  // ---- CRUD ----

  const create = useCallback(async (data: CreateProductDNAInput): Promise<ProductDNARecord | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createProductDNA(data);
      if (result.success && result.data) {
        setProductDNA(result.data);
        setCurrentId(result.data.id);
        toast({ title: 'Product DNA creado', description: 'El análisis está siendo procesado...' });
        return result.data;
      }
      throw new Error(result.error || 'Error desconocido');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear Product DNA';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetch = useCallback(async (id: string): Promise<ProductDNARecord | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProductDNA(id);
      if (result) {
        setProductDNA(result);
        setCurrentId(id);
        return result;
      }
      throw new Error('Product DNA no encontrado');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar Product DNA';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = useCallback(async (updates: Record<string, any>): Promise<boolean> => {
    if (!currentId) { setError('No hay Product DNA seleccionado'); return false; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateProductDNA(currentId, updates);
      if (result.success && result.data) {
        setProductDNA(result.data);
        toast({ title: 'Actualizado', description: 'Los cambios se han guardado.' });
        return true;
      }
      throw new Error(result.error || 'Error al actualizar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!currentId) { setError('No hay Product DNA seleccionado'); return false; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteProductDNA(currentId);
      if (result.success) {
        setProductDNA(null);
        setCurrentId(null);
        toast({ title: 'Eliminado', description: 'El Product DNA ha sido eliminado.' });
        return true;
      }
      throw new Error(result.error || 'Error al eliminar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast]);

  const duplicateDNA = useCallback(async (): Promise<ProductDNARecord | null> => {
    if (!currentId) { setError('No hay Product DNA seleccionado'); return null; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await duplicateProductDNA(currentId);
      if (result.success && result.data) {
        toast({ title: 'Duplicado', description: 'Se ha creado una copia del Product DNA.' });
        return result.data;
      }
      throw new Error(result.error || 'Error al duplicar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al duplicar';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast]);

  // ---- Analysis ----

  const analyze = useCallback(async (): Promise<boolean> => {
    if (!currentId) { setError('No hay Product DNA seleccionado'); return false; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeProductDNA(currentId);
      if (result.success) {
        setProductDNA((prev) => prev ? { ...prev, status: 'analyzing' } : null);
        toast({ title: 'Analizando', description: 'KIRO está procesando tu información...' });
        return true;
      }
      throw new Error(result.error || 'Error al iniciar análisis');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al analizar';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast]);

  const regenerate = useCallback(async (): Promise<boolean> => {
    if (!currentId) { setError('No hay Product DNA seleccionado'); return false; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await regenerateProductDNAAnalysis(currentId);
      if (result.success) {
        setProductDNA((prev) =>
          prev ? { ...prev, status: 'analyzing', version: (prev.version || 0) + 1 } : null,
        );
        toast({ title: 'Regenerando', description: 'KIRO está creando un nuevo análisis...' });
        return true;
      }
      throw new Error(result.error || 'Error al regenerar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al regenerar';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentId, toast]);

  // ---- Utils ----

  const refresh = useCallback(async () => {
    if (currentId) await fetch(currentId);
  }, [currentId, fetch]);

  const reset = useCallback(() => {
    setProductDNA(null);
    setCurrentId(null);
    setError(null);
  }, []);

  // ---- Effects ----

  // Auto-fetch on mount
  useEffect(() => {
    if (initialId && autoFetch) fetch(initialId);
  }, [initialId, autoFetch, fetch]);

  // Poll while analyzing
  useEffect(() => {
    if (!currentId || !pollOnAnalyzing || !isAnalyzing) return;

    const cancel = pollProductDNAStatus(
      currentId,
      (status, data) => {
        if (data) setProductDNA(data);
        if (status === 'ready') {
          toast({ title: 'Análisis completado', description: 'KIRO ha terminado de analizar tu información.' });
        }
      },
      pollInterval,
      40, // ~2 min max at 3s interval
    );

    return cancel;
  }, [currentId, pollOnAnalyzing, isAnalyzing, pollInterval, toast]);

  // Realtime subscription
  useEffect(() => {
    if (!currentId) return;

    const channel = supabase
      .channel(`product_dna:${currentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_dna',
          filter: `id=eq.${currentId}`,
        },
        (payload: any) => {
          const newData = payload.new as ProductDNARecord;
          setProductDNA(newData);
          if (newData.status === 'ready' && !hasAnalysis) {
            toast({ title: 'Análisis completado', description: 'KIRO ha terminado de analizar tu información.' });
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentId, hasAnalysis, toast]);

  return {
    productDNA,
    isLoading,
    error,
    isAnalyzing,
    isReady,
    hasAnalysis,
    confidenceScore,
    create,
    fetch,
    update,
    remove,
    duplicate: duplicateDNA,
    analyze,
    regenerate,
    refresh,
    reset,
  };
}

// ============================================
// useProductDNAList - List hook with pagination
// ============================================

interface UseProductDNAListOptions {
  clientId?: string;
  status?: string;
  serviceGroup?: string;
  page?: number;
  pageSize?: number;
  autoFetch?: boolean;
}

interface UseProductDNAListReturn {
  items: ProductDNARecord[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<UseProductDNAListOptions>) => void;
  refresh: () => Promise<void>;
  removeItem: (id: string) => Promise<boolean>;
}

export function useProductDNAList(options: UseProductDNAListOptions = {}): UseProductDNAListReturn {
  const { toast } = useToast();
  const sb = supabase as any;

  const [items, setItems] = useState<ProductDNARecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(options.page || 1);
  const [pageSize, setPageSizeState] = useState(options.pageSize || 10);
  const [filters, setFiltersState] = useState({
    clientId: options.clientId,
    status: options.status,
    serviceGroup: options.serviceGroup,
  });

  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = sb
        .from('product_dna')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters.clientId) query = query.eq('client_id', filters.clientId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.serviceGroup) query = query.eq('service_group', filters.serviceGroup);

      const { data, error: qErr, count } = await query;
      if (qErr) throw qErr;

      setItems(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar lista';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters, sb]);

  const nextPage = useCallback(() => { if (page < totalPages) setPage((p) => p + 1); }, [page, totalPages]);
  const prevPage = useCallback(() => { if (page > 1) setPage((p) => p - 1); }, [page]);
  const goToPage = useCallback((n: number) => { if (n >= 1 && n <= totalPages) setPage(n); }, [totalPages]);
  const setPageSize = useCallback((s: number) => { setPageSizeState(s); setPage(1); }, []);

  const setFilters = useCallback((f: Partial<UseProductDNAListOptions>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
    setPage(1);
  }, []);

  const removeItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await deleteProductDNA(id);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setTotalCount((prev) => prev - 1);
        toast({ title: 'Eliminado', description: 'El Product DNA ha sido eliminado.' });
        return true;
      }
      throw new Error(result.error || 'Error al eliminar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    if (options.autoFetch !== false) fetchList();
  }, [options.autoFetch, fetchList]);

  return {
    items,
    totalCount,
    isLoading,
    error,
    page,
    pageSize,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    setFilters,
    refresh: fetchList,
    removeItem,
  };
}

export default useProductDNA;
