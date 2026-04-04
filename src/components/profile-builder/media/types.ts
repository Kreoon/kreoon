export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  /** Thumbnail URL alternativo (alias de thumbnailUrl para compatibilidad) */
  thumbnail_url?: string;
  title?: string;
  tags?: string[];
  source: 'portfolio_items' | 'marketplace_media' | 'external_url';
  createdAt: string;
  aspectRatio?: string;
  /** ID del video en Bunny Stream (opcional) */
  bunnyVideoId?: string;
  /** Duración del video en segundos */
  duration?: number;
  /** Conteo de vistas */
  views_count?: number;
  /** Conteo de likes */
  likes_count?: number;
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
