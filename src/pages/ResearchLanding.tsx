import { useParams } from 'react-router-dom';
import { useProductResearch } from '@/components/research-landing/hooks/useProductResearch';
import { ResearchLandingLayout } from '@/components/research-landing/ResearchLandingLayout';
import { Loader2 } from 'lucide-react';

export default function ResearchLanding() {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading, error } = useProductResearch(productId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Cargando investigacion...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-muted-foreground text-lg font-semibold mb-2">Investigacion no encontrada</p>
          <p className="text-muted-foreground/60 text-sm mb-4">
            No se pudo cargar la investigacion de mercado. Verifica que el producto exista y tenga investigacion generada.
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-purple-400 hover:text-purple-300 text-sm underline"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return <ResearchLandingLayout product={product} />;
}
