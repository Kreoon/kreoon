import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useContactReveal } from '@/hooks/useContactReveal';
import { Unlock, Coins, Loader2, Instagram, Globe, Mail, Phone, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevealContactButtonProps {
  profileId: string;
  profileData: {
    instagram?: string;
    tiktok?: string;
    portfolio_url?: string;
    email?: string;
    phone?: string;
  };
  className?: string;
}

function maskText(text: string): string {
  if (text.length <= 3) return '***';
  return text.slice(0, 3) + '*'.repeat(Math.min(text.length - 3, 5));
}

export function RevealContactButton({ profileId, profileData, className }: RevealContactButtonProps) {
  const { isRevealed, loading, userTokens, revealCost, revealContact, expiresAt, expiryDays } = useContactReveal(profileId);
  const [showDialog, setShowDialog] = useState(false);
  const [revealing, setRevealing] = useState(false);

  // Calculate days remaining
  const daysRemaining = expiresAt 
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const getWhatsAppUrl = (phone: string) => {
    // Remove all non-numeric characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    const message = encodeURIComponent('Acabo de ver tu contacto en Kreoon y me gustaría trabajar contigo.');
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const hasContactInfo = profileData.instagram || profileData.tiktok || profileData.portfolio_url || profileData.email || profileData.phone;

  if (!hasContactInfo) return null;

  const handleReveal = async () => {
    setRevealing(true);
    const success = await revealContact();
    setRevealing(false);
    if (success) {
      // Keep dialog open to show revealed data
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <>
      {isRevealed ? (
        <Button 
          variant="outline" 
          className={cn("text-green-600 border-green-600/30", className)}
          onClick={() => setShowDialog(true)}
        >
          <Unlock className="h-4 w-4 mr-2" />
          Ver Contacto
          <span className="ml-2 text-xs opacity-70">({daysRemaining}d)</span>
        </Button>
      ) : (
        <Button 
          variant="outline" 
          className={cn("bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50", className)}
          onClick={() => setShowDialog(true)}
        >
          <Coins className="h-4 w-4 mr-2 text-amber-500" />
          Revelar Contacto
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md bg-social-card border-social-border">
          <DialogHeader>
            <DialogTitle className="text-social-foreground flex items-center gap-2">
              {isRevealed ? (
                <>
                  <Unlock className="h-5 w-5 text-green-500" />
                  Datos de Contacto
                </>
              ) : (
                <>
                  <Coins className="h-5 w-5 text-amber-500" />
                  Revelar Contacto
                </>
              )}
            </DialogTitle>
            {!isRevealed && (
              <DialogDescription>
                Usa {revealCost} token para ver los datos de contacto de este perfil
              </DialogDescription>
            )}
            {isRevealed && expiresAt && (
              <DialogDescription className="text-green-500/80">
                Disponible por {daysRemaining} días más
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Contact items */}
            {profileData.instagram && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-social-muted/50">
                <Instagram className="h-5 w-5 text-pink-500" />
                <div className="flex-1">
                  <p className="text-sm text-social-muted-foreground">Instagram</p>
                  <p className="font-medium text-social-foreground">
                    {isRevealed ? `@${profileData.instagram}` : `@${maskText(profileData.instagram)}`}
                  </p>
                </div>
                {isRevealed && (
                  <a 
                    href={`https://instagram.com/${profileData.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-social-muted-foreground hover:text-social-accent transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {profileData.tiktok && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-social-muted/50">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-social-muted-foreground">TikTok</p>
                  <p className="font-medium text-social-foreground">
                    {isRevealed ? `@${profileData.tiktok}` : `@${maskText(profileData.tiktok)}`}
                  </p>
                </div>
                {isRevealed && (
                  <a 
                    href={`https://tiktok.com/@${profileData.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-social-muted-foreground hover:text-social-accent transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {profileData.portfolio_url && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-social-muted/50">
                <Globe className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm text-social-muted-foreground">Portafolio</p>
                  <p className="font-medium text-social-foreground truncate">
                    {isRevealed ? profileData.portfolio_url : maskText(profileData.portfolio_url)}
                  </p>
                </div>
                {isRevealed && (
                  <a 
                    href={profileData.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-social-muted-foreground hover:text-social-accent transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {profileData.email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-social-muted/50">
                <Mail className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm text-social-muted-foreground">Email</p>
                  <p className="font-medium text-social-foreground">
                    {isRevealed ? profileData.email : maskText(profileData.email)}
                  </p>
                </div>
                {isRevealed && (
                  <a 
                    href={`mailto:${profileData.email}`}
                    className="text-social-muted-foreground hover:text-social-accent transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {profileData.phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-social-muted/50">
                <Phone className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm text-social-muted-foreground">Teléfono / WhatsApp</p>
                  <p className="font-medium text-social-foreground">
                    {isRevealed ? profileData.phone : maskText(profileData.phone)}
                  </p>
                </div>
                {isRevealed && (
                  <a 
                    href={getWhatsAppUrl(profileData.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="text-xs font-medium">WhatsApp</span>
                  </a>
                )}
              </div>
            )}

            {!isRevealed && (
              <div className="pt-4 border-t border-social-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-social-muted-foreground">Tus tokens:</span>
                  <span className="font-bold text-amber-500">{userTokens}</span>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={handleReveal}
                  disabled={revealing || userTokens < revealCost}
                >
                  {revealing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Coins className="h-4 w-4 mr-2" />
                  )}
                  {userTokens < revealCost 
                    ? 'Tokens insuficientes' 
                    : `Revelar por ${revealCost} token`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
