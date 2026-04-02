import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseVirtualCreatorListOptions {
  /** Altura estimada de cada tarjeta en px */
  estimateSize?: number;
  /** Items extra a renderizar fuera del viewport */
  overscan?: number;
  /** Número de columnas del grid */
  columns?: number;
}

interface UseVirtualCreatorListResult<T> {
  parentRef: React.RefObject<HTMLDivElement>;
  virtualRows: ReturnType<typeof useVirtualizer>['getVirtualItems'];
  totalSize: number;
  /** Items visibles aplanados para renderizar */
  getVisibleItems: () => { item: T; index: number; style: React.CSSProperties }[];
}

// ─── Hook: useVirtualCreatorList ──────────────────────────────────────────────

/**
 * Hook para virtualización de grid de creadores usando @tanstack/react-virtual.
 * Optimizado para grids responsivos con múltiples columnas.
 */
export function useVirtualCreatorList<T>(
  items: T[],
  options: UseVirtualCreatorListOptions = {}
): UseVirtualCreatorListResult<T> {
  const {
    estimateSize = 420,
    overscan = 3,
    columns = 4,
  } = options;

  const parentRef = useRef<HTMLDivElement>(null);

  // Calcular número de filas basado en items y columnas
  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Obtener items visibles con sus posiciones
  const getVisibleItems = useCallback(() => {
    const visible: { item: T; index: number; style: React.CSSProperties }[] = [];

    for (const virtualRow of virtualRows) {
      const rowIndex = virtualRow.index;
      const startIndex = rowIndex * columns;

      for (let col = 0; col < columns; col++) {
        const itemIndex = startIndex + col;
        if (itemIndex >= items.length) break;

        visible.push({
          item: items[itemIndex],
          index: itemIndex,
          style: {
            position: 'absolute',
            top: 0,
            left: `${(col / columns) * 100}%`,
            width: `${100 / columns}%`,
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`,
            padding: '0.5rem',
          },
        });
      }
    }

    return visible;
  }, [virtualRows, items, columns]);

  return {
    parentRef,
    virtualRows,
    totalSize,
    getVisibleItems,
  };
}

// ─── Hook: useInfiniteScrollTrigger ───────────────────────────────────────────

interface UseInfiniteScrollTriggerOptions {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Hook para trigger de infinite scroll usando IntersectionObserver nativo.
 * Retorna un ref para colocar en el elemento sentinel.
 */
export function useInfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 0.1,
  rootMargin = '100px',
}: UseInfiniteScrollTriggerOptions) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold, rootMargin]);

  return { loadMoreRef };
}

// ─── Hook: useResponsiveColumns ───────────────────────────────────────────────

/**
 * Hook para calcular número de columnas responsive.
 * Sincronizado con Tailwind breakpoints.
 */
export function useResponsiveColumns(): number {
  const getColumns = useCallback(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 640) return 2;  // sm
    if (width < 768) return 2;  // md
    if (width < 1024) return 3; // lg
    return 4;                   // xl+
  }, []);

  const columnsRef = useRef(getColumns());

  useEffect(() => {
    const handleResize = () => {
      columnsRef.current = getColumns();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getColumns]);

  return columnsRef.current;
}
