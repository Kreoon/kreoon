import React, { Suspense, ComponentProps } from 'react';

// Lazy import del editor TipTap (~413KB)
const RichTextEditorModule = React.lazy(() => import('./rich-text-editor'));

// Re-exportamos los tipos para que los consumidores puedan usarlos
export type { TextEditorFeatures } from './rich-text-editor';

// Skeleton que simula la toolbar y el área de edición
const EditorSkeleton = () => (
  <div className="border rounded-sm bg-card overflow-hidden animate-pulse">
    {/* Toolbar skeleton */}
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-muted/40">
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-8 w-8 bg-muted rounded" />
        ))}
        <div className="h-6 w-px bg-border mx-1" />
        {[8, 9, 10].map((i) => (
          <div key={i} className="h-8 w-8 bg-muted rounded" />
        ))}
      </div>
      <div className="h-8 w-16 bg-muted rounded" />
    </div>
    {/* Content area skeleton */}
    <div className="p-5 min-h-[220px] space-y-3">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-2/3" />
    </div>
  </div>
);

// Skeleton más simple para el viewer (solo contenido, sin toolbar)
const ViewerSkeleton = () => (
  <div className="border rounded-sm bg-card p-5 animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-3/4" />
    </div>
  </div>
);

// Tipo inferido de las props del editor
type RichTextEditorProps = ComponentProps<typeof RichTextEditorModule>;

/**
 * Lazy-loaded RichTextEditor con Suspense boundary integrado.
 * Reduce el bundle inicial en ~413KB al cargar TipTap bajo demanda.
 */
export const LazyRichTextEditor = (props: RichTextEditorProps) => (
  <Suspense fallback={<EditorSkeleton />}>
    <RichTextEditorModule {...props} />
  </Suspense>
);

// Para el viewer necesitamos acceder al named export
const RichTextViewerLazy = React.lazy(() =>
  import('./rich-text-editor').then((mod) => ({ default: mod.RichTextViewer }))
);

type RichTextViewerProps = { content: string; className?: string };

/**
 * Lazy-loaded RichTextViewer con Suspense boundary integrado.
 */
export const LazyRichTextViewer = (props: RichTextViewerProps) => (
  <Suspense fallback={<ViewerSkeleton />}>
    <RichTextViewerLazy {...props} />
  </Suspense>
);
