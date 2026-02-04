import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export type SocialNetwork = 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'kreoon';

interface ShareOptions {
  url: string;
  title?: string;
  description?: string;
  contentId?: string;
  creatorId?: string;
  clientId?: string;
}

interface KreoonSocialSettings {
  shareOnKreoon: boolean;
  showOnCreatorProfile: boolean;
  showOnClientProfile: boolean;
  isCollaborative: boolean;
}

interface UseSocialShareReturn {
  share: (network: SocialNetwork, options: ShareOptions) => Promise<void>;
  shareToKreoon: (contentId: string, settings: KreoonSocialSettings) => Promise<void>;
  toggleKreoonShare: (contentId: string, enabled: boolean) => Promise<void>;
  getKreoonShareStatus: (contentId: string) => Promise<KreoonSocialSettings | null>;
  copyLink: (url: string) => Promise<void>;
  nativeShare: (options: ShareOptions) => Promise<boolean>;
  isSharing: boolean;
  supportedNetworks: { id: SocialNetwork; name: string; color: string }[];
}

const NETWORKS = [
  { id: 'twitter' as SocialNetwork, name: 'Twitter/X', color: 'bg-sky-500' },
  { id: 'facebook' as SocialNetwork, name: 'Facebook', color: 'bg-blue-600' },
  { id: 'linkedin' as SocialNetwork, name: 'LinkedIn', color: 'bg-blue-700' },
  { id: 'whatsapp' as SocialNetwork, name: 'WhatsApp', color: 'bg-green-500' },
  { id: 'kreoon' as SocialNetwork, name: 'Kreoon Social', color: 'bg-purple-600' },
];

export function useSocialShare(): UseSocialShareReturn {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);

  const getShareUrl = useCallback((network: SocialNetwork, options: ShareOptions): string => {
    const { url, title = 'Mira esto', description = '' } = options;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    switch (network) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
      default:
        return '';
    }
  }, []);

  const share = useCallback(async (network: SocialNetwork, options: ShareOptions) => {
    if (network === 'kreoon') {
      // Kreoon Social is handled separately
      return;
    }

    const shareUrl = getShareUrl(network, options);
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  }, [getShareUrl]);

  const shareToKreoon = useCallback(async (contentId: string, settings: KreoonSocialSettings) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para compartir en Kreoon Social');
      return;
    }

    setIsSharing(true);

    try {
      // Update the content to be shared on Kreoon Social
      const { error } = await supabase
        .from('content')
        .update({
          shared_on_kreoon: settings.shareOnKreoon,
          show_on_creator_profile: settings.showOnCreatorProfile,
          show_on_client_profile: settings.showOnClientProfile,
          is_collaborative: settings.isCollaborative,
          shared_at: settings.shareOnKreoon ? new Date().toISOString() : null
        })
        .eq('id', contentId);

      if (error) throw error;

      toast.success(
        settings.shareOnKreoon
          ? 'Contenido compartido en Kreoon Social'
          : 'Contenido removido de Kreoon Social'
      );
    } catch (error) {
      console.error('[useSocialShare] Error sharing to Kreoon:', error);
      toast.error('Error al compartir en Kreoon Social');
    } finally {
      setIsSharing(false);
    }
  }, [user?.id]);

  const toggleKreoonShare = useCallback(async (contentId: string, enabled: boolean) => {
    await shareToKreoon(contentId, {
      shareOnKreoon: enabled,
      showOnCreatorProfile: enabled,
      showOnClientProfile: enabled,
      isCollaborative: true
    });
  }, [shareToKreoon]);

  const getKreoonShareStatus = useCallback(async (contentId: string): Promise<KreoonSocialSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('shared_on_kreoon, show_on_creator_profile, show_on_client_profile, is_collaborative')
        .eq('id', contentId)
        .single();

      if (error) throw error;

      return {
        shareOnKreoon: data?.shared_on_kreoon ?? false,
        showOnCreatorProfile: data?.show_on_creator_profile ?? false,
        showOnClientProfile: data?.show_on_client_profile ?? false,
        isCollaborative: data?.is_collaborative ?? false
      };
    } catch (error) {
      console.error('[useSocialShare] Error getting Kreoon share status:', error);
      return null;
    }
  }, []);

  const copyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  }, []);

  const nativeShare = useCallback(async (options: ShareOptions): Promise<boolean> => {
    if (!navigator.share) return false;

    try {
      await navigator.share({
        title: options.title || 'Mira esto',
        text: options.description,
        url: options.url
      });
      return true;
    } catch (error) {
      // User cancelled or error
      return false;
    }
  }, []);

  return {
    share,
    shareToKreoon,
    toggleKreoonShare,
    getKreoonShareStatus,
    copyLink,
    nativeShare,
    isSharing,
    supportedNetworks: NETWORKS
  };
}
