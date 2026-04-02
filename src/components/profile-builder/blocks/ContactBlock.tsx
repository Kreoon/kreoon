import { memo } from 'react';
import { Mail, MessageSquare, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';

interface ContactConfig {
  showEmail: boolean;
  showButton: boolean;
  buttonText: string;
  layout: 'centered' | 'left';
}

interface ContactContent {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  location?: string;
}

function ContactBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as ContactConfig;
  const content = block.content as ContactContent;
  const styles = block.styles;

  const handleContentUpdate = (updates: Partial<ContactContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8 md:p-12',
    xl: 'p-12 md:p-16',
  };

  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-br from-primary/10 to-primary/5',
        paddingClasses[styles.padding || 'lg'],
        config.layout === 'centered' ? 'text-center' : 'text-left',
      )}
    >
      {/* Title */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Trabajemos juntos"
          className="text-2xl md:text-3xl font-bold text-foreground bg-transparent border-none w-full mb-3 focus:outline-none focus:ring-1 focus:ring-primary rounded text-center"
        />
      ) : (
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {content.title || 'Trabajemos juntos'}
        </h2>
      )}

      {/* Subtitle */}
      {isEditing && isSelected ? (
        <textarea
          value={content.subtitle || ''}
          onChange={(e) => handleContentUpdate({ subtitle: e.target.value })}
          placeholder="Estoy disponible para proyectos freelance y colaboraciones"
          className="text-muted-foreground bg-transparent border-none w-full max-w-xl mx-auto mb-6 resize-none focus:outline-none focus:ring-1 focus:ring-primary rounded text-center"
          rows={2}
        />
      ) : (
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          {content.subtitle || 'Estoy disponible para proyectos freelance y colaboraciones'}
        </p>
      )}

      {/* Contact info */}
      <div className={cn(
        'flex flex-wrap gap-4 mb-6',
        config.layout === 'centered' ? 'justify-center' : 'justify-start',
      )}>
        {config.showEmail && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            {isEditing && isSelected ? (
              <input
                type="email"
                value={content.email || ''}
                onChange={(e) => handleContentUpdate({ email: e.target.value })}
                placeholder="tu@email.com"
                className="bg-transparent border-none text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
              />
            ) : (
              <span className="text-sm">{content.email || 'tu@email.com'}</span>
            )}
          </div>
        )}

        {content.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span className="text-sm">{content.phone}</span>
          </div>
        )}

        {content.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{content.location}</span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      {config.showButton && (
        <Button size="lg" className="gap-2">
          <MessageSquare className="h-5 w-5" />
          {config.buttonText || 'Enviar mensaje'}
        </Button>
      )}
    </div>
  );
}

export const ContactBlock = memo(ContactBlockComponent);
