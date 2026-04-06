import { useState } from 'react';
import { Heart, Bookmark, Eye, Users, Crown, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Tipo local hasta que el hook exista
export interface PublicTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  author_name: string;
  author_avatar_url: string | null;
  use_count: number;
  like_count: number;
  is_official: boolean;
  min_tier_required: 'creator_free' | 'creator_pro' | 'creator_premium' | null;
  is_liked?: boolean;
  is_saved?: boolean;
}

interface TemplateCardProps {
  template: PublicTemplate;
  onSelect: (template: PublicTemplate) => void;
  onLike: (templateId: string) => void;
  onSave: (templateId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  ugc: 'bg-pink-500/15 text-pink-400',
  freelancer: 'bg-purple-500/15 text-purple-400',
  agencia: 'bg-amber-500/15 text-amber-400',
  influencer: 'bg-blue-500/15 text-blue-400',
  profesional: 'bg-emerald-500/15 text-emerald-400',
  creativo: 'bg-orange-500/15 text-orange-400',
};

const TIER_BADGE: Record<string, { label: string; className: string; icon: typeof Crown }> = {
  creator_pro: {
    label: 'PRO',
    className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: Crown,
  },
  creator_premium: {
    label: 'PREMIUM',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Crown,
  },
};

const THUMBNAIL_GRADIENTS = [
  'from-purple-900 to-slate-900',
  'from-blue-900 to-slate-900',
  'from-emerald-900 to-slate-900',
  'from-pink-900 to-slate-900',
  'from-amber-900 to-slate-900',
];

function getThumbnailGradient(id: string): string {
  const index = id.charCodeAt(0) % THUMBNAIL_GRADIENTS.length;
  return THUMBNAIL_GRADIENTS[index];
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function TemplateCard({ template, onSelect, onLike, onSave }: TemplateCardProps) {
  const [hovered, setHovered] = useState(false);

  const tierBadge = template.min_tier_required ? TIER_BADGE[template.min_tier_required] : null;
  const TierIcon = tierBadge?.icon;
  const categoryColor = CATEGORY_COLORS[template.category] ?? 'bg-gray-500/15 text-gray-400';

  return (
    <article
      className="group relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-[4/3] overflow-hidden"
        onClick={() => onSelect(template)}
      >
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={`Vista previa de ${template.name}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              'w-full h-full bg-gradient-to-br flex items-center justify-center',
              getThumbnailGradient(template.id),
            )}
          >
            <span className="text-white/20 text-5xl font-bold select-none">
              {template.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Badges sobre thumbnail */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {template.is_official && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/90 text-white backdrop-blur-sm">
              <BadgeCheck className="h-3 w-3" />
              Oficial
            </span>
          )}
          {tierBadge && TierIcon && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm',
                tierBadge.className,
              )}
            >
              <TierIcon className="h-3 w-3" />
              {tierBadge.label}
            </span>
          )}
        </div>

        {/* Overlay de hover con botones de accion */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 flex items-center justify-center gap-3 transition-opacity duration-200',
            hovered ? 'opacity-100' : 'opacity-0',
          )}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(template); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 transition-colors"
            aria-label={`Ver preview de ${template.name}`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onLike(template.id); }}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              template.is_liked
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:text-red-400 hover:border-red-500/50',
            )}
            aria-label={template.is_liked ? `Quitar like de ${template.name}` : `Dar like a ${template.name}`}
          >
            <Heart className={cn('h-4 w-4', template.is_liked && 'fill-current')} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSave(template.id); }}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              template.is_saved
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:text-purple-400 hover:border-purple-500/50',
            )}
            aria-label={template.is_saved ? `Quitar guardado de ${template.name}` : `Guardar ${template.name}`}
          >
            <Bookmark className={cn('h-4 w-4', template.is_saved && 'fill-current')} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {/* Categoria */}
        <div className="mb-2">
          <Badge
            variant="outline"
            className={cn('text-xs px-2 py-0 border-0', categoryColor)}
          >
            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
          </Badge>
        </div>

        {/* Nombre */}
        <h3 className="text-sm font-semibold text-white truncate mb-1 group-hover:text-purple-300 transition-colors">
          {template.name}
        </h3>

        {/* Footer: autor + stats */}
        <div className="flex items-center justify-between mt-2">
          {/* Autor */}
          <div className="flex items-center gap-1.5 min-w-0">
            {template.author_avatar_url ? (
              <img
                src={template.author_avatar_url}
                alt={template.author_name}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-bold">
                  {template.author_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-400 truncate">{template.author_name}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              {formatCount(template.use_count)}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Heart className="h-3 w-3" />
              {formatCount(template.like_count)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
