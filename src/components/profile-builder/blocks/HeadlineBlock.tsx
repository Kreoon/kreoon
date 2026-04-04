import { memo } from 'react';
import { Pencil } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';
import { getBlockStyleObject } from './blockStyles';

interface HeadlineConfig {
  text: string;
  size: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  tag: 'h1' | 'h2' | 'h3';
  gradient: boolean;
  gradientColors: [string, string];
}

const sizeClasses = {
  sm: 'text-xl md:text-2xl',
  md: 'text-2xl md:text-3xl',
  lg: 'text-3xl md:text-4xl',
  xl: 'text-4xl md:text-5xl',
  '2xl': 'text-5xl md:text-6xl',
};

const animationClasses: Record<string, string> = {
  none: '',
  'fade-in': 'animate-in fade-in duration-700',
  'slide-up': 'animate-in slide-in-from-bottom-4 duration-700',
  'slide-down': 'animate-in slide-in-from-top-4 duration-700',
  'scale-in': 'animate-in zoom-in-95 duration-500',
  bounce: 'animate-bounce',
};

// Renderiza HTML sanitizado
function SafeHtml({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'p', 'br'],
    ALLOWED_ATTR: ['style', 'class'],
  });
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

const textAlignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function HeadlineBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as HeadlineConfig;
  const styles = block.styles;

  const {
    isOpen,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleSave = (newContent: string) => {
    onUpdate({
      config: { ...config, text: newContent },
    });
    closeEditor();
  };

  const Tag = config.tag || 'h2';

  // El gradiente de texto del headline usa -webkit-background-clip,
  // por eso se aplica como estilo separado sobre el elemento de texto.
  const gradientTextStyle: React.CSSProperties = config.gradient
    ? {
        background: `linear-gradient(135deg, ${config.gradientColors?.[0] || '#8B5CF6'}, ${config.gradientColors?.[1] || '#EC4899'})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : {};

  const containerStyle: React.CSSProperties = {
    ...getBlockStyleObject(styles),
    animationDelay: styles.animationDelay ? `${styles.animationDelay}ms` : undefined,
  };

  return (
    <div
      className={cn(
        textAlignClasses[styles.textAlign || 'center'],
        animationClasses[styles.animation || 'none'],
      )}
      style={containerStyle}
    >
      {/* Headline - Editable */}
      <div
        className={cn(
          'group relative',
          isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md py-1 transition-colors'
        )}
        onClick={() => isEditing && isSelected && openEditor('text', config.text || 'Tu titulo aqui')}
      >
        {isHtml(config.text || '') ? (
          <SafeHtml
            html={config.text || 'Tu titulo aqui'}
            className={cn('font-bold leading-tight tracking-tight', sizeClasses[config.size || 'xl'])}
            style={gradientTextStyle}
          />
        ) : (
          <Tag
            className={cn('font-bold leading-tight tracking-tight', sizeClasses[config.size || 'xl'])}
            style={gradientTextStyle}
          >
            {config.text || 'Tu titulo aqui'}
          </Tag>
        )}
        {isEditing && isSelected && (
          <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Editor Popup */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => !open && closeEditor()}
        initialContent={editingContent}
        onSave={handleSave}
        title="Editar titulo"
        placeholder="Escribe tu titulo..."
        mode="inline"
      />
    </div>
  );
}

export const HeadlineBlock = memo(HeadlineBlockComponent);
