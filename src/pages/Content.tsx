import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Film } from "lucide-react";
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { UnifiedContentModule } from "@/components/content/unified";

const Content = () => {
  const { roles } = useAuth();
  const { currentOrgId, loading: orgLoading } = useOrgOwner();
  const isAdmin = roles.includes('admin');

  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim() || !newVideoTitle.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content')
        .insert({
          title: newVideoTitle,
          video_url: newVideoUrl,
          video_urls: [newVideoUrl],
          is_published: true,
          status: 'delivered',
          organization_id: currentOrgId
        });

      if (error) throw error;

      toast.success('Video agregado al portafolio');
      setNewVideoOpen(false);
      setNewVideoUrl("");
      setNewVideoTitle("");
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Error al agregar video');
    } finally {
      setSubmitting(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <VideoPlayerProvider>
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          {/* Page Header */}
          <PageHeader
            icon={Film}
            title="Kreoon Portafolio"
            subtitle="Biblioteca de contenido • Descarga, comparte y gestiona"
            action={
              isAdmin && (
                <Dialog open={newVideoOpen} onOpenChange={setNewVideoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nueva Pieza</span>
                      <span className="sm:hidden">Nueva</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md" aria-describedby="add-portfolio-video-desc">
                    <DialogHeader>
                      <DialogTitle>Agregar Video al Portafolio</DialogTitle>
                      <DialogDescription id="add-portfolio-video-desc" className="sr-only">Agregar un video al portafolio</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título del video</Label>
                        <Input
                          id="title"
                          placeholder="Ej: Testimonial Cliente X"
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url">URL del video (Bunny)</Label>
                        <Input
                          id="url"
                          placeholder="https://iframe.mediadelivery.net/embed/..."
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Soporta URLs de Bunny Stream embed o CDN directo
                        </p>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setNewVideoOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddVideo} disabled={submitting}>
                          {submitting ? 'Agregando...' : 'Agregar y Publicar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            }
          />
        </div>

        {/* Unified Content Module */}
        <UnifiedContentModule
          key={refreshKey}
          organizationId={currentOrgId || undefined}
          mode="admin"
          showMetrics={isAdmin}
          showKreoonToggle={true}
          onContentUpdate={() => setRefreshKey(prev => prev + 1)}
        />
      </div>
    </VideoPlayerProvider>
  );
};

export default Content;
