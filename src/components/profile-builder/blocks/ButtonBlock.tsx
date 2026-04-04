import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, ChevronRight, Send, MessageCircle, Mail, Phone } from 'lucide-react';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface ButtonConfig {
  text: string;
  url: string;
  target: '_self' | '_blank';
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  icon: string | null;
  iconPosition: 'left' | 'right';
  fullWidth: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Send,
  MessageCircle,
  Mail,
  Phone,
};

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
} as const;

const sizeMap = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
} as const;

function ButtonBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as ButtonConfig;
  const styles = block.styles;
  const [localText, setLocalText] = useState(config.text || 'Click aqui');
  const [localUrl, setLocalUrl] = useState(config.url || '#');

  const handleBlur = () => {
    if (localText !== config.text || localUrl !== config.url) {
      onUpdate({
        config: { ...config, text: localText, url: localUrl },
      });
    }
  };

  const textAlignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const IconComponent = config.icon ? ICON_MAP[config.icon] : null;

  const buttonContent = (
    <>
      {IconComponent && config.iconPosition === 'left' && (
        <IconComponent className="h-4 w-4 mr-2" />
      )}
      {config.text || 'Click aqui'}
      {IconComponent && config.iconPosition === 'right' && (
        <IconComponent className="h-4 w-4 ml-2" />
      )}
    </>
  );

  return (
    <div
      className={cn(
        'flex',
        textAlignClasses[styles.textAlign || 'center'],
      )}
      style={getBlockStyleObject(styles)}
    >
      {isEditing && isSelected ? (
        <div className="flex flex-col gap-2 w-full max-w-md">
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            placeholder="Texto del boton"
            className="px-4 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="text"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onBlur={handleBlur}
            placeholder="URL de destino"
            className="px-4 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      ) : (
        <Button
          variant={variantMap[config.variant || 'primary']}
          size={sizeMap[config.size || 'md']}
          className={cn(config.fullWidth && 'w-full')}
          asChild
        >
          <a
            href={config.url || '#'}
            target={config.target || '_self'}
            rel={config.target === '_blank' ? 'noopener noreferrer' : undefined}
          >
            {buttonContent}
          </a>
        </Button>
      )}
    </div>
  );
}

export const ButtonBlock = memo(ButtonBlockComponent);
