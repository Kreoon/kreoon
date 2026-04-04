import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Star, Heart, Zap, Shield, Award, Target, Clock, Users, Sparkles } from 'lucide-react';
import type { BlockProps } from '../types/profile-builder';
import { getBlockStyleObject } from './blockStyles';

interface IconListItem {
  id: string;
  icon: string;
  text: string;
}

interface IconListConfig {
  items: IconListItem[];
  iconColor: string;
  layout: 'vertical' | 'horizontal' | 'grid';
  columns: 1 | 2 | 3;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Check,
  Star,
  Heart,
  Zap,
  Shield,
  Award,
  Target,
  Clock,
  Users,
  Sparkles,
};

function IconListBlockComponent({ block, isEditing, isSelected }: BlockProps) {
  const config = block.config as IconListConfig;
  const styles = block.styles;

  const items = config.items || [
    { id: '1', icon: 'Check', text: 'Beneficio 1' },
    { id: '2', icon: 'Check', text: 'Beneficio 2' },
    { id: '3', icon: 'Check', text: 'Beneficio 3' },
  ];

  const layoutClasses = {
    vertical: 'flex flex-col gap-3',
    horizontal: 'flex flex-wrap gap-4',
    grid: cn(
      'grid gap-4',
      config.columns === 1 && 'grid-cols-1',
      config.columns === 2 && 'grid-cols-1 md:grid-cols-2',
      config.columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    ),
  };

  return (
    <div
      className={cn(
        isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
      )}
      style={getBlockStyleObject(styles)}
    >
      <ul className={layoutClasses[config.layout || 'vertical']}>
        {items.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || Check;
          return (
            <li key={item.id} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                style={{
                  backgroundColor: `${config.iconColor || '#8B5CF6'}20`,
                  color: config.iconColor || '#8B5CF6',
                }}
              >
                <IconComponent className="h-4 w-4" />
              </span>
              <span className="text-foreground leading-relaxed">{item.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const IconListBlock = memo(IconListBlockComponent);
