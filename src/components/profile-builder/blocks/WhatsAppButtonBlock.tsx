import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';
import type { BlockProps } from '../types/profile-builder';

interface WhatsAppConfig {
  phone: string;
  message: string;
  position: 'bottom-right' | 'bottom-left';
  showOnMobile: boolean;
  showOnDesktop: boolean;
  pulseAnimation: boolean;
}

function WhatsAppButtonBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as WhatsAppConfig;

  const [localPhone, setLocalPhone] = useState(config.phone || '');
  const [localMessage, setLocalMessage] = useState(
    config.message || 'Hola! Vi tu perfil en Kreoon y me gustaria contactarte'
  );

  const handleBlur = () => {
    onUpdate({
      config: {
        ...config,
        phone: localPhone,
        message: localMessage,
      },
    });
  };

  const positionClasses = {
    'bottom-right': 'right-4 bottom-4',
    'bottom-left': 'left-4 bottom-4',
  };

  // Build WhatsApp URL
  const cleanPhone = config.phone?.replace(/\D/g, '') || '';
  const encodedMessage = encodeURIComponent(config.message || '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  // In editing mode, show configuration form
  if (isEditing) {
    return (
      <div
        className={cn(
          'p-4 rounded-lg border border-border bg-muted/30',
          isSelected && 'ring-2 ring-primary/50',
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-sm">Boton de WhatsApp</h4>
            <p className="text-xs text-muted-foreground">Boton flotante para contacto directo</p>
          </div>
        </div>

        {isSelected && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Numero de telefono (con codigo de pais)
              </label>
              <input
                type="tel"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                onBlur={handleBlur}
                placeholder="573001234567"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Mensaje predeterminado
              </label>
              <textarea
                value={localMessage}
                onChange={(e) => setLocalMessage(e.target.value)}
                onBlur={handleBlur}
                placeholder="Mensaje que vera el cliente al abrir WhatsApp"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render floating button (public view)
  if (!cleanPhone) {
    return null; // Don't render if no phone configured
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'fixed z-50 w-14 h-14 rounded-full bg-green-500 shadow-lg',
        'flex items-center justify-center',
        'hover:bg-green-600 hover:scale-110 transition-all duration-300',
        positionClasses[config.position || 'bottom-right'],
        config.pulseAnimation && 'animate-pulse',
        !config.showOnMobile && 'hidden md:flex',
        !config.showOnDesktop && 'md:hidden',
      )}
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />

      {/* Pulse ring animation */}
      {config.pulseAnimation && (
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
      )}
    </a>
  );
}

export const WhatsAppButtonBlock = memo(WhatsAppButtonBlockComponent);
