import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Copy,
  Check,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Sparkles,
  Users,
  User,
  Building2,
  Loader2
} from 'lucide-react';
import { useSocialShare } from '@/hooks/unified/useSocialShare';

interface SocialSharePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  description?: string;
  contentId?: string;
  creatorId?: string;
  clientId?: string;
  allowKreoonShare?: boolean;
}

export function SocialSharePanel({
  open,
  onOpenChange,
  url,
  title = 'Mira esto',
  description = '',
  contentId,
  creatorId,
  clientId,
  allowKreoonShare = false
}: SocialSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [loadingKreoonSettings, setLoadingKreoonSettings] = useState(false);
  const [kreoonSettings, setKreoonSettings] = useState({
    shareOnKreoon: false,
    showOnCreatorProfile: true,
    showOnClientProfile: true,
    isCollaborative: true
  });

  const {
    share,
    shareToKreoon,
    getKreoonShareStatus,
    copyLink,
    nativeShare,
    isSharing,
    supportedNetworks
  } = useSocialShare();

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  // Load existing Kreoon share settings
  useEffect(() => {
    if (open && contentId && allowKreoonShare) {
      setLoadingKreoonSettings(true);
      getKreoonShareStatus(contentId)
        .then(settings => {
          if (settings) {
            setKreoonSettings(settings);
          }
        })
        .finally(() => setLoadingKreoonSettings(false));
    }
  }, [open, contentId, allowKreoonShare, getKreoonShareStatus]);

  const handleCopy = async () => {
    await copyLink(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    await nativeShare({ url: fullUrl, title, description });
  };

  const handleSocialShare = (networkId: string) => {
    if (networkId === 'kreoon') return; // Handled separately
    share(networkId as any, { url: fullUrl, title, description });
  };

  const handleKreoonToggle = async (enabled: boolean) => {
    if (!contentId) return;

    const newSettings = { ...kreoonSettings, shareOnKreoon: enabled };
    setKreoonSettings(newSettings);

    await shareToKreoon(contentId, newSettings);
  };

  const handleKreoonSettingChange = async (
    key: 'showOnCreatorProfile' | 'showOnClientProfile' | 'isCollaborative',
    value: boolean
  ) => {
    if (!contentId) return;

    const newSettings = { ...kreoonSettings, [key]: value };
    setKreoonSettings(newSettings);

    // Only save if already sharing on Kreoon
    if (kreoonSettings.shareOnKreoon) {
      await shareToKreoon(contentId, newSettings);
    }
  };

  const socialLinks = [
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: Twitter,
      color: 'hover:bg-sky-500 hover:text-white',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:bg-blue-600 hover:text-white',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'hover:bg-blue-700 hover:text-white',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:bg-green-500 hover:text-white',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Kreoon Social Section */}
          {allowKreoonShare && contentId && (
            <>
              <div className="space-y-4 p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Kreoon Social</h4>
                      <p className="text-xs text-muted-foreground">
                        Publicar como contenido colaborativo
                      </p>
                    </div>
                  </div>
                  {loadingKreoonSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={kreoonSettings.shareOnKreoon}
                      onCheckedChange={handleKreoonToggle}
                      disabled={isSharing}
                    />
                  )}
                </div>

                {kreoonSettings.shareOnKreoon && (
                  <div className="space-y-3 pt-2 border-t border-purple-500/20">
                    {/* Show on creator profile */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="creator-profile" className="text-sm cursor-pointer">
                          Mostrar en perfil del creador
                        </Label>
                      </div>
                      <Switch
                        id="creator-profile"
                        checked={kreoonSettings.showOnCreatorProfile}
                        onCheckedChange={(v) => handleKreoonSettingChange('showOnCreatorProfile', v)}
                        disabled={isSharing}
                      />
                    </div>

                    {/* Show on client profile */}
                    {clientId && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <Label htmlFor="client-profile" className="text-sm cursor-pointer">
                            Mostrar en perfil del cliente
                          </Label>
                        </div>
                        <Switch
                          id="client-profile"
                          checked={kreoonSettings.showOnClientProfile}
                          onCheckedChange={(v) => handleKreoonSettingChange('showOnClientProfile', v)}
                          disabled={isSharing}
                        />
                      </div>
                    )}

                    {/* Collaborative badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="collaborative" className="text-sm cursor-pointer">
                          Marcar como colaboración
                        </Label>
                      </div>
                      <Switch
                        id="collaborative"
                        checked={kreoonSettings.isCollaborative}
                        onCheckedChange={(v) => handleKreoonSettingChange('isCollaborative', v)}
                        disabled={isSharing}
                      />
                    </div>

                    {kreoonSettings.isCollaborative && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        Este contenido aparecerá como una colaboración entre el creador
                        {clientId && ' y el cliente'}, visible para sus seguidores.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Separator />
            </>
          )}

          {/* Native share button (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleNativeShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartir...
            </Button>
          )}

          {/* External social networks */}
          <div>
            <h4 className="text-sm font-medium mb-3">Redes sociales externas</h4>
            <div className="grid grid-cols-4 gap-2">
              {socialLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleSocialShare(link.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border transition-colors",
                    link.color
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="text-xs mt-1">{link.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy link */}
          <div>
            <h4 className="text-sm font-medium mb-2">Copiar enlace</h4>
            <div className="flex gap-2">
              <Input
                value={fullUrl}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
