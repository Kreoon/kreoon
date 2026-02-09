import { ImageIcon, Play, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { OrgMemberContent } from '../types/marketplace';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

interface OrgPortfolioSectionProps {
  gallery: string[];
  memberContent?: OrgMemberContent[];
  accentColor: string;
}

function resolveThumb(item: OrgMemberContent): string {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }
  return item.url;
}

export function OrgPortfolioSection({ gallery, memberContent = [], accentColor }: OrgPortfolioSectionProps) {
  const navigate = useNavigate();
  const hasGallery = gallery && gallery.length > 0;
  const hasMemberContent = memberContent.length > 0;

  if (!hasGallery && !hasMemberContent) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-500">Esta organizacion aun no ha subido contenido a su portafolio</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Member content — auto-populated from published content */}
      {hasMemberContent && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Contenido del equipo</h2>
            <span className="text-sm text-gray-500">({memberContent.length})</span>
          </div>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {memberContent.map((item, i) => {
              const size = i % 6 === 0 || i % 6 === 3 ? 'large' : 'small';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.creator_slug) {
                      navigate(`/marketplace/creator/${item.creator_slug}`);
                    }
                  }}
                  className={cn(
                    'w-full rounded-xl overflow-hidden relative group cursor-pointer break-inside-avoid',
                    size === 'large' ? 'aspect-[9/16]' : 'aspect-[3/4]',
                  )}
                >
                  <img
                    src={resolveThumb(item)}
                    alt={item.title || ''}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  {/* Video badge */}
                  {item.type === 'video' && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Play className="h-3 w-3 fill-white" />
                    </div>
                  )}
                  {/* Creator info at bottom */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                      {item.creator_avatar ? (
                        <img
                          src={item.creator_avatar}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover border border-white/30"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">
                            {item.creator_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-white text-xs font-medium truncate">
                        {item.creator_name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual gallery */}
      {hasGallery && (
        <div className="space-y-4">
          {hasMemberContent && (
            <h2 className="text-lg font-semibold text-white">Galeria</h2>
          )}
          {!hasMemberContent && (
            <h2 className="text-lg font-semibold text-white">Portafolio</h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
