import { ArrowLeft, Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateProductResearchPdf } from '@/components/products/productResearchPdfGenerator';

interface ResearchHeaderProps {
  productName: string;
  generatedAt?: string | null;
  product: any;
}

export function ResearchHeader({ productName, generatedAt, product }: ResearchHeaderProps) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Investigacion: ${productName}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleExportPdf = () => {
    generateProductResearchPdf({ product });
  };

  const handleBack = () => {
    window.history.back();
  };

  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <header className="sticky top-0 z-50 bg-black/80 border-b border-white/10">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-white truncate">
              {productName}
            </h1>
            <p className="text-[10px] md:text-xs text-white/40">
              Investigacion de Mercado
              {dateStr && <span> &middot; {dateStr}</span>}
              <span className="hidden md:inline"> &middot; Powered by Perplexity AI</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-white/60 hover:text-white hover:bg-white/10 text-xs hidden md:flex"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar Link
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="text-white/60 hover:text-white hover:bg-white/10 md:hidden"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportPdf}
            className="text-white/60 hover:text-white hover:bg-white/10 text-xs hidden md:flex"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            PDF
          </Button>
        </div>
      </div>
    </header>
  );
}
