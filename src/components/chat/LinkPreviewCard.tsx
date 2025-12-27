import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkPreview } from '@/hooks/useLinkPreview';

interface LinkPreviewCardProps {
  preview: LinkPreview;
  isOwnMessage?: boolean;
}

export function LinkPreviewCard({ preview, isOwnMessage = false }: LinkPreviewCardProps) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block mt-2 rounded-lg overflow-hidden border transition-colors',
        isOwnMessage 
          ? 'bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20' 
          : 'bg-background border-border hover:bg-accent'
      )}
    >
      {preview.image_url && (
        <div className="relative h-32 overflow-hidden">
          <img
            src={preview.image_url}
            alt={preview.title || ''}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {preview.site_name && (
              <p className={cn(
                'text-[10px] uppercase tracking-wide mb-0.5',
                isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}>
                {preview.site_name}
              </p>
            )}
            {preview.title && (
              <p className={cn(
                'text-sm font-medium line-clamp-2',
                isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
              )}>
                {preview.title}
              </p>
            )}
            {preview.description && (
              <p className={cn(
                'text-xs mt-1 line-clamp-2',
                isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {preview.description}
              </p>
            )}
          </div>
          <ExternalLink className={cn(
            'h-4 w-4 shrink-0 mt-1',
            isOwnMessage ? 'text-primary-foreground/50' : 'text-muted-foreground'
          )} />
        </div>
      </div>
    </a>
  );
}
