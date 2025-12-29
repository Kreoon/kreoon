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
  const { isRevealed, loading, userTokens, revealCost, revealContact } = useContactReveal(profileId);
  const [showDialog, setShowDialog] = useState(false);
  const [revealing, setRevealing] = useState(false);

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
                <Phone className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <p className="text-sm text-social-muted-foreground">Teléfono</p>
                  <p className="font-medium text-social-foreground">
                    {isRevealed ? profileData.phone : maskText(profileData.phone)}
                  </p>
                </div>
                {isRevealed && (
                  <a 
                    href={`tel:${profileData.phone}`}
                    className="text-social-muted-foreground hover:text-social-accent transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
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
