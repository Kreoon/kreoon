import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Filter, 
  Grid, 
  Loader2, 
  Play, 
  X,
  CheckCircle2,
  Building2,
  Video as VideoIcon
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  bunny_embed_url: string | null;
  product_id: string | null;
  approved_at: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function ClientPortfolio() {
  const { clientId } = useParams<{ clientId: string }>();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  const fetchData = async () => {
    if (!clientId) return;
    setLoading(true);

    try {
      // Fetch client info
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .eq('id', clientId)
        .maybeSingle();

      if (clientData) {
        setClient(clientData);

        // Fetch approved content
        const { data: contentData } = await supabase
          .from('content')
          .select('id, title, thumbnail_url, video_url, video_urls, bunny_embed_url, product_id, approved_at, created_at')
          .eq('client_id', clientId)
          .in('status', ['approved', 'paid', 'delivered'])
          .order('approved_at', { ascending: false });

        setContent(contentData || []);

        // Fetch products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name')
          .eq('client_id', clientId)
          .order('name');

        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = useMemo(() => {
    if (selectedProduct === 'all') return content;
    return content.filter(c => c.product_id === selectedProduct);
  }, [content, selectedProduct]);

  const getVideoUrl = (item: ContentItem): string | null => {
    if (item.video_urls && item.video_urls.length > 0) return item.video_urls[0];
    if (item.video_url) return item.video_url;
    return null;
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredContent.map(c => c.id));
    setSelectedItems(allIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelecting(false);
  };

  const handleDownload = async () => {
    const itemsToDownload = filteredContent.filter(c => selectedItems.has(c.id));
    if (itemsToDownload.length === 0) {
      toast.error('Selecciona al menos un video para descargar');
      return;
    }

    setDownloading(true);

    try {
      // Download each video
      for (const item of itemsToDownload) {
        const videoUrl = getVideoUrl(item);
        if (videoUrl) {
          // For bunny CDN videos, try to use the download endpoint
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${item.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      }
      toast.success(`${itemsToDownload.length} video(s) descargado(s)`);
      clearSelection();
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Error al descargar los videos');
    } finally {
      setDownloading(false);
    }
  };

  const handleSingleDownload = async (item: ContentItem) => {
    const videoUrl = getVideoUrl(item);
    if (!videoUrl) {
      toast.error('No hay video disponible para descargar');
      return;
    }

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Video descargado');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Error al descargar el video');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <Building2 className="h-16 w-16 text-white/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Portafolio no encontrado</h2>
        <p className="text-white/50">El enlace puede estar incorrecto o el portafolio no existe.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {client.logo_url ? (
                <img 
                  src={client.logo_url} 
                  alt={client.name} 
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white/50" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-white">{client.name}</h1>
                <p className="text-xs text-white/50">{filteredContent.length} videos aprobados</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Product Filter */}
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="text-white">Todos</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selection Mode */}
              {isSelecting ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={selectAll}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Seleccionar todo
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearSelection}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleDownload}
                    disabled={selectedItems.size === 0 || downloading}
                    className="gap-2"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Descargar ({selectedItems.size})
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsSelecting(true)}
                  className="gap-2 border-white/20 text-white hover:bg-white/10"
                >
                  <Grid className="h-4 w-4" />
                  Seleccionar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filteredContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/50">
            <VideoIcon className="h-16 w-16 mb-4" />
            <p className="text-lg">No hay contenido aprobado</p>
            {selectedProduct !== 'all' && (
              <Button 
                variant="link" 
                onClick={() => setSelectedProduct('all')}
                className="text-primary mt-2"
              >
                Ver todos los productos
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer",
                  "bg-zinc-800 border-2 transition-all duration-200",
                  isSelecting && selectedItems.has(item.id) 
                    ? "border-primary ring-2 ring-primary/50" 
                    : "border-transparent hover:border-white/20"
                )}
                onClick={() => {
                  if (isSelecting) {
                    toggleSelection(item.id);
                  } else {
                    setSelectedContent(item);
                  }
                }}
              >
                {/* Thumbnail */}
                {item.thumbnail_url ? (
                  <img 
                    src={item.thumbnail_url} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <VideoIcon className="h-10 w-10 text-white/20" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Selection checkbox */}
                {isSelecting && (
                  <div className={cn(
                    "absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center transition-all",
                    selectedItems.has(item.id) 
                      ? "bg-primary text-white" 
                      : "bg-black/50 border-2 border-white/50"
                  )}>
                    {selectedItems.has(item.id) && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                )}

                {/* Play button */}
                {!isSelecting && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium line-clamp-2">{item.title}</p>
                </div>

                {/* Download button on hover */}
                {!isSelecting && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSingleDownload(item);
                    }}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <Download className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-white/10 p-0 overflow-hidden">
          {selectedContent && (
            <div className="flex flex-col">
              {/* Video */}
              <div className="relative aspect-video bg-black">
                {selectedContent.bunny_embed_url ? (
                  <iframe
                    src={`${selectedContent.bunny_embed_url}?autoplay=true`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : getVideoUrl(selectedContent) ? (
                  <video
                    src={getVideoUrl(selectedContent)!}
                    controls
                    autoPlay
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50">
                    No hay video disponible
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{selectedContent.title}</h3>
                  {selectedContent.approved_at && (
                    <p className="text-white/50 text-sm">
                      Aprobado el {new Date(selectedContent.approved_at).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={() => handleSingleDownload(selectedContent)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
