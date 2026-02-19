import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PostComposer } from '../Composer/PostComposer';
import type { QuickShareData } from '../../types/social.types';

interface QuickShareButtonProps {
  contentId: string;
  title: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function QuickShareButton({
  contentId,
  title,
  videoUrl,
  thumbnailUrl,
  caption = '',
  variant = 'icon',
  className,
}: QuickShareButtonProps) {
  const [open, setOpen] = useState(false);

  const shareData: QuickShareData = {
    contentId,
    title,
    videoUrl: videoUrl || null,
    thumbnailUrl: thumbnailUrl || null,
    caption: caption || title,
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button
          size="icon"
          variant="ghost"
          className={className}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title="Compartir en redes"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={className}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Compartir en redes
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compartir en Redes Sociales</DialogTitle>
          </DialogHeader>
          <PostComposer
            initialData={shareData}
            onSuccess={() => setOpen(false)}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
