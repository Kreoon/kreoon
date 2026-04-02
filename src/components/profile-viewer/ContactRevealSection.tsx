import { useState } from 'react';
import { Mail, Phone, MessageSquare, Loader2, Coins, Unlock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContactReveal } from '@/hooks/useContactReveal';
import { useCanViewCreatorContact } from '@/hooks/useCreatorPlanFeatures';
import type { CreatorTier } from '@/hooks/useCreatorPlanFeatures';
import { cn } from '@/lib/utils';

interface ContactData {
  email?: string;
  phone?: string;
  whatsapp?: string;
}

interface ContactRevealSectionProps {
  profileId: string;
  creatorTier: CreatorTier;
  contactData: ContactData;
  className?: string;
}

function maskText(text: string): string {
  if (text.length <= 4) return '****';
  return text.slice(0, 3) + '*'.repeat(Math.min(text.length - 3, 6));
}

function getWhatsAppUrl(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `57${digits}`;
  const message = encodeURIComponent('Hola, vi tu perfil en Kreoon y me gustaría contactarte.');
  return `https://wa.me/${digits}?text=${message}`;
}

export function ContactRevealSection({
  profileId,
  creatorTier,
  contactData,
  className,
}: ContactRevealSectionProps) {
  const { revealContact: contactVisibility } = useCanViewCreatorContact(creatorTier);
  const {
    isRevealed,
    loading,
    userTokens,
    revealCost,
    revealContact,
    expiresAt,
  } = useContactReveal(profileId);
  const [isRevealing, setIsRevealing] = useState(false);

  const daysRemaining = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  async function handleReveal() {
    setIsRevealing(true);
    await revealContact();
    setIsRevealing(false);
  }

  // Contacto NO visible (Free y Pro) - Solo Premium puede ver contacto
  if (contactVisibility === 'none') {
    return (
      <div className={cn('rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center', className)}>
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-3"
          aria-hidden="true"
        >
          <Crown className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold mb-1">Contacto Premium</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Los datos de contacto de este creador estan disponibles solo para usuarios con plan Premium
        </p>
        {loading ? (
          <Button disabled variant="outline" size="sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            Cargando...
          </Button>
        ) : isRevealed ? (
          <div className="space-y-2 text-left">
            <RevealedBadge daysRemaining={daysRemaining} />
            <ContactItems contactData={contactData} isRevealed />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Datos ocultos con blur */}
            <div className="flex flex-col gap-2">
              {contactData.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="blur-sm select-none">correo@ejemplo.com</span>
                </div>
              )}
              {contactData.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="blur-sm select-none">+57 300 *** ****</span>
                </div>
              )}
              {contactData.whatsapp && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span className="blur-sm select-none">WhatsApp disponible</span>
                </div>
              )}
            </div>
            {/* CTA de upgrade o tokens */}
            <Button
              onClick={handleReveal}
              disabled={isRevealing || userTokens < revealCost}
              size="sm"
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {isRevealing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {userTokens < revealCost
                ? 'Ver planes Premium'
                : `Desbloquear con ${revealCost} token${revealCost > 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Plan premium del creador: todo visible
  return (
    <div className={cn('space-y-3', className)}>
      <ContactItems contactData={contactData} isRevealed />
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

interface RevealedBadgeProps {
  daysRemaining: number;
}

function RevealedBadge({ daysRemaining }: RevealedBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 text-green-500 text-xs mb-2">
      <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Revelado — disponible {daysRemaining} día{daysRemaining !== 1 ? 's' : ''} más</span>
    </div>
  );
}

interface ContactItemsProps {
  contactData: ContactData;
  isRevealed: boolean;
}

function ContactItems({ contactData, isRevealed }: ContactItemsProps) {
  return (
    <>
      {contactData.email && (
        <ContactItem
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          value={isRevealed ? contactData.email : maskText(contactData.email)}
          href={isRevealed ? `mailto:${contactData.email}` : undefined}
        />
      )}
      {contactData.phone && (
        <ContactItem
          icon={<Phone className="h-4 w-4" />}
          label="Teléfono"
          value={isRevealed ? contactData.phone : maskText(contactData.phone)}
          href={isRevealed ? `tel:${contactData.phone}` : undefined}
        />
      )}
      {contactData.whatsapp && (
        <ContactItem
          icon={
            <MessageSquare className="h-4 w-4 text-green-500" />
          }
          label="WhatsApp"
          value={isRevealed ? contactData.whatsapp : maskText(contactData.whatsapp)}
          href={isRevealed ? getWhatsAppUrl(contactData.whatsapp) : undefined}
          external
        />
      )}
    </>
  );
}

interface ContactItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}

function ContactItem({ icon, label, value, href, external }: ContactItemProps) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
      <span className="text-muted-foreground flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        aria-label={`${label}: ${value}`}
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}
