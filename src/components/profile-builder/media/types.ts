export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  tags?: string[];
  source: 'portfolio_items' | 'marketplace_media';
  createdAt: string;
  aspectRatio?: string;
}

export interface MediaLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
  allowedTypes?: ('image' | 'video')[];
  multiple?: boolean;
  creatorProfileId?: string;
  userId: string;
}

export interface MediaFilters {
  type: 'image' | 'video' | 'all';
  searchQuery: string;
  source: 'portfolio_items' | 'marketplace_media' | 'all';
}
