import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Play, Eye, Heart, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Highlight {
  id: string;
  content_id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  views_count: number;
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
}

interface PortfolioHighlightsProps {
  userId: string;
  isOwner?: boolean;
  onAddHighlight?: () => void;
}

export function PortfolioHighlights({ userId, isOwner = false, onAddHighlight }: PortfolioHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchHighlights();
  }, [userId]);

  const fetchHighlights = async () => {
    setLoading(true);
    try {
      // Fetch content that is portfolio public and has video
      const { data } = await supabase
        .from('content')
        .select(`
          id,
          title,
          thumbnail_url,
          video_url,
          views_count,
          likes_count,
          is_portfolio_public,
          created_at
        `)
        .eq('creator_id', userId)
        .eq('is_portfolio_public', true)
        .not('video_url', 'is', null)
        .order('likes_count', { ascending: false })
        .limit(10);

      if (data) {
        setHighlights(data.map(c => ({
          id: c.id,
          content_id: c.id,
          title: c.title,
          thumbnail_url: c.thumbnail_url,
          video_url: c.video_url,
          views_count: c.views_count || 0,
          likes_count: c.likes_count || 0,
          is_pinned: true,
          created_at: c.created_at
        })));
      }
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (index: number) => {
    setSelectedIndex(index);
    setViewerOpen(true);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    if (direction === 'prev' && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (direction === 'next' && selectedIndex < highlights.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto py-2 px-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const currentHighlight = selectedIndex !== null ? highlights[selectedIndex] : null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-hide">
        {/* Add button for owner */}
        {isOwner && (
          <button
            onClick={onAddHighlight}
            className="flex-shrink-0 w-16 h-16 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 hover:bg-muted transition-colors"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        {/* Highlights */}
        {highlights.map((highlight, index) => (
          <button
            key={highlight.id}
            onClick={() => openViewer(index)}
            className="flex-shrink-0 relative group"
          >
            <div className="w-16 h-16 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background overflow-hidden">
              {highlight.thumbnail_url ? (
                <img 
                  src={highlight.thumbnail_url} 
                  alt={highlight.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-zinc-900/60 dark:bg-[#0a0a0f]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="h-5 w-5 text-zinc-100" />
            </div>
          </button>
        ))}

        {/* Empty state */}
        {highlights.length === 0 && !isOwner && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            No hay contenido destacado
          </div>
        )}
      </div>

      {/* Highlight Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 bg-white dark:bg-[#0a0a0f]/95 border border-zinc-200 dark:border-transparent">
          <DialogHeader className="absolute top-4 left-4 right-4 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-zinc-100 text-sm font-medium truncate pr-8">
                {currentHighlight?.title}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-100 hover:bg-zinc-800/50"
                onClick={() => setViewerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
            {highlights.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  i === selectedIndex ? 'bg-white' : i < (selectedIndex || 0) ? 'bg-white/80' : 'bg-white/30'
                )}
              />
            ))}
          </div>

          {/* Video Content */}
          <div className="relative aspect-[9/16] max-h-[80vh]">
            {currentHighlight?.video_url ? (
              <video
                key={currentHighlight.id}
                src={currentHighlight.video_url}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              </div>
            )}

            {/* Navigation Arrows */}
            {(selectedIndex || 0) > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-100 hover:bg-zinc-800/50"
                onClick={() => navigate('prev')}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {selectedIndex !== null && selectedIndex < highlights.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-100 hover:bg-zinc-800/50"
                onClick={() => navigate('next')}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}

            {/* Stats */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 text-zinc-300">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="text-sm">{currentHighlight?.views_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span className="text-sm">{currentHighlight?.likes_count || 0}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
