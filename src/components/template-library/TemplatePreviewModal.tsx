import { useState } from 'react';
import { Heart, Bookmark, Eye, Users, Crown, Sparkles, ExternalLink, Monitor, Smartphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useTemplateInteraction } from './hooks';
import type { PublicTemplate } from './types/template';

interface TemplatePreviewModalProps {
  template: PublicTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ugc: 'UGC',
  freelancer: 'Freelancer',
  agency: 'Agencia',
  influencer: 'Influencer',
  portfolio: 'Portfolio',
  services: 'Servicios',
  general: 'General',
};

export function TemplatePreviewModal({
  template,
  open,
  onOpenChange,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  const { user } = useAuth();
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const { mutate: toggleInteraction, isPending } = useTemplateInteraction(template.slug);

  const handleLike = () => {
    if (!user) return;
    toggleInteraction({ templateId: template.id, interactionType: 'like' });
  };

  const handleSave = () => {
    if (!user) return;
    toggleInteraction({ templateId: template.id, interactionType: 'save' });
  };

  const accentColor = template.preview_colors?.accentColor || '#8B5CF6';
  const theme = template.preview_colors?.theme || 'dark';

  // Generar preview de bloques
  const blockPreview = template.blocks?.slice(0, 8).map((block, i) => {
    const heights: Record<string, string> = {
      hero_banner: 'h-32',
      about: 'h-16',
      portfolio: 'h-24',
      services: 'h-20',
      stats: 'h-12',
      reviews: 'h-20',
      pricing: 'h-24',
      contact: 'h-16',
    };
    const height = heights[block.type] || 'h-12';

    return (
      <div
        key={i}
        className={`${height} rounded bg-gray-800/50 border border-gray-700/50 flex items-center justify-center`}
      >
        <span className="text-xs text-gray-500 capitalize">{block.type.replace('_', ' ')}</span>
      </div>
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-950 border-gray-800">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABELS[template.category] || template.category}
                </Badge>
                {template.is_official && (
                  <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Oficial
                  </Badge>
                )}
                {template.min_tier_required === 'creator_pro' && (
                  <Badge className="bg-amber-500/20 text-amber-300 text-xs">PRO</Badge>
                )}
                {template.min_tier_required === 'creator_premium' && (
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    PREMIUM
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl text-white">{template.name}</DialogTitle>
              {template.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.description}</p>
              )}
            </div>

            {/* Author */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={template.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-800 text-gray-400 text-xs">
                  {template.author?.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm text-white">{template.author?.display_name || 'Anonimo'}</p>
                <p className="text-xs text-gray-500">Creador</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-4 mt-4">
          {/* Preview */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Device Toggle */}
            <div className="flex items-center justify-between mb-3">
              <Tabs value={previewDevice} onValueChange={(v) => setPreviewDevice(v as 'desktop' | 'mobile')}>
                <TabsList className="bg-gray-900">
                  <TabsTrigger value="desktop" className="text-xs">
                    <Monitor className="h-3.5 w-3.5 mr-1" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="text-xs">
                    <Smartphone className="h-3.5 w-3.5 mr-1" />
                    Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {template.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {template.use_count} usos
                </span>
              </div>
            </div>

            {/* Preview Frame */}
            <div
              className={`flex-1 overflow-y-auto rounded-lg border border-gray-800 ${
                theme === 'dark' ? 'bg-gray-950' : 'bg-white'
              }`}
              style={{
                maxWidth: previewDevice === 'mobile' ? '375px' : '100%',
                margin: previewDevice === 'mobile' ? '0 auto' : undefined,
              }}
            >
              <div className="p-4 space-y-3">
                {/* Accent bar */}
                <div
                  className="h-1 w-full rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                {/* Block previews */}
                {blockPreview}
                {template.blocks?.length > 8 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{template.blocks.length - 8} bloques mas
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-gray-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Blocks included */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Bloques incluidos ({template.blocks?.length || 0})</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(template.blocks?.map(b => b.type) || [])).map((type, i) => (
                  <Badge key={i} variant="outline" className="text-xs capitalize">
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Config info */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Configuracion</p>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Tema:</span>
                  <span className="text-white capitalize">{theme}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Color accent:</span>
                  <div
                    className="w-4 h-4 rounded border border-gray-700"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Fuente:</span>
                  <span className="text-white capitalize">
                    {template.builder_config?.fontHeading || 'Inter'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 mt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              disabled={!user || isPending}
              className={template.user_liked ? 'text-red-400 border-red-400/50' : ''}
            >
              <Heart className={`h-4 w-4 mr-1 ${template.user_liked ? 'fill-current' : ''}`} />
              {template.like_count}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!user || isPending}
              className={template.user_saved ? 'text-amber-400 border-amber-400/50' : ''}
            >
              <Bookmark className={`h-4 w-4 mr-1 ${template.user_saved ? 'fill-current' : ''}`} />
              Guardar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              onClick={onUseTemplate}
              className="bg-purple-600 hover:bg-purple-500"
              disabled={!user}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Usar plantilla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
