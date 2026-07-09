import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PortfolioVisibility } from '@/types/database';

export interface ExistingPortfolioItem {
  id: string;
  is_public: boolean;
  visibility: string;
  client_approved_showcase: boolean;
  title: string | null;
}

export interface PublishToPortfolioInput {
  contentId: string;
  creatorProfileId: string;
  organizationId?: string | null;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  visibility: PortfolioVisibility;
  clientApprovedShowcase: boolean;
}

interface UsePublishToPortfolioReturn {
  checking: boolean;
  publishing: boolean;
  existingItem: ExistingPortfolioItem | null;
  checkPublished: (contentId: string, creatorProfileId: string) => Promise<ExistingPortfolioItem | null>;
  publish: (input: PublishToPortfolioInput) => Promise<boolean>;
}

// El contenido aprobado ya tiene una fila privada auto-creada por el trigger
// sync_approved_content_to_portfolio (source_type='organization_content', is_public=false).
// "Publicar" entonces es casi siempre un UPDATE que la hace publica, no un INSERT.
export function usePublishToPortfolio(): UsePublishToPortfolioReturn {
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [existingItem, setExistingItem] = useState<ExistingPortfolioItem | null>(null);

  const checkPublished = useCallback(async (contentId: string, creatorProfileId: string) => {
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('id, is_public, visibility, client_approved_showcase, title')
        .eq('content_id', contentId)
        .eq('creator_id', creatorProfileId)
        .maybeSingle();

      if (error) throw error;

      const item = data as ExistingPortfolioItem | null;
      setExistingItem(item);
      return item;
    } catch (error) {
      console.error('[usePublishToPortfolio] Error checking:', error);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  const publish = useCallback(async (input: PublishToPortfolioInput): Promise<boolean> => {
    if (existingItem?.is_public) {
      toast.error('Este contenido ya está publicado en tu portafolio');
      return false;
    }

    setPublishing(true);
    try {
      if (existingItem?.id) {
        // Ya existe la fila (auto-sync desde content aprobado) — la hacemos publica
        const { error } = await supabase
          .from('portfolio_items')
          .update({
            title: input.title,
            visibility: input.visibility,
            client_approved_showcase: input.clientApprovedShowcase,
            is_public: input.visibility === 'public',
          })
          .eq('id', existingItem.id);

        if (error) throw error;

        setExistingItem({
          ...existingItem,
          is_public: input.visibility === 'public',
          visibility: input.visibility,
          client_approved_showcase: input.clientApprovedShowcase,
          title: input.title,
        });
      } else {
        const { data, error } = await supabase
          .from('portfolio_items')
          .insert({
            creator_id: input.creatorProfileId,
            organization_id: input.organizationId || null,
            content_id: input.contentId,
            source_type: 'content_delivery',
            title: input.title,
            media_type: 'video',
            media_url: input.mediaUrl,
            thumbnail_url: input.thumbnailUrl || null,
            visibility: input.visibility,
            client_approved_showcase: input.clientApprovedShowcase,
            is_public: input.visibility === 'public',
          })
          .select('id, is_public, visibility, client_approved_showcase, title')
          .single();

        if (error) {
          if ((error as { code?: string }).code === '23505') {
            // Carrera: otra pestaña ya creo la fila entre el check y el insert
            toast.error('Este contenido ya fue publicado en tu portafolio');
            return false;
          }
          throw error;
        }

        setExistingItem(data as ExistingPortfolioItem);
      }

      toast.success('Publicado en tu portafolio');
      return true;
    } catch (error) {
      console.error('[usePublishToPortfolio] Error publishing:', error);
      toast.error('Error al publicar en el portafolio');
      return false;
    } finally {
      setPublishing(false);
    }
  }, [existingItem]);

  return { checking, publishing, existingItem, checkPublished, publish };
}
