import { Video, Image, Star } from 'lucide-react';
import { DetailSection } from '@/components/crm/DetailSection';

interface PortfolioItem {
  id: string;
  title: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  category: string | null;
  is_featured: boolean;
}

interface PortfolioSectionProps {
  portfolio: PortfolioItem[];
}

export function PortfolioSection({ portfolio }: PortfolioSectionProps) {
  if (portfolio.length === 0) return null;

  return (
    <DetailSection title="Portafolio">
      <div className="grid grid-cols-3 gap-2">
        {portfolio.map((item) => (
          <div key={item.id} className="relative group">
            <div className="aspect-video rounded-lg bg-white/5 overflow-hidden">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {item.media_type === 'video' ? (
                    <Video className="h-5 w-5 text-white/20" />
                  ) : (
                    <Image className="h-5 w-5 text-white/20" />
                  )}
                </div>
              )}
            </div>
            {item.is_featured && (
              <div className="absolute top-1 right-1 bg-amber-500/90 rounded-full p-0.5">
                <Star className="h-2.5 w-2.5 text-white fill-white" />
              </div>
            )}
            {item.title && (
              <p className="text-[10px] text-white/50 truncate mt-1">{item.title}</p>
            )}
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
