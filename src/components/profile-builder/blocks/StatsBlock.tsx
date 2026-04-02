import { memo } from 'react';
import { Users, Star, Briefcase, Eye, Heart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockProps } from '../types/profile-builder';

interface StatItem {
  id: string;
  label: string;
  value: string | number;
  icon: 'users' | 'star' | 'briefcase' | 'eye' | 'heart' | 'trending';
}

interface StatsConfig {
  showFollowers: boolean;
  showProjects: boolean;
  showRating: boolean;
  layout: 'row' | 'grid';
}

interface StatsContent {
  items?: StatItem[];
}

const ICON_MAP = {
  users: Users,
  star: Star,
  briefcase: Briefcase,
  eye: Eye,
  heart: Heart,
  trending: TrendingUp,
};

const DEFAULT_STATS: StatItem[] = [
  { id: '1', label: 'Seguidores', value: '10K', icon: 'users' },
  { id: '2', label: 'Proyectos', value: '50+', icon: 'briefcase' },
  { id: '3', label: 'Rating', value: '4.9', icon: 'star' },
  { id: '4', label: 'Vistas', value: '100K', icon: 'eye' },
];

function StatsBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as StatsConfig;
  const content = block.content as StatsContent;
  const styles = block.styles;
  const items = content.items || DEFAULT_STATS;

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const handleUpdateStat = (id: string, updates: Partial<StatItem>) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate({
      content: { ...content, items: newItems },
    });
  };

  return (
    <div
      className={cn(
        'rounded-lg',
        paddingClasses[styles.padding || 'md'],
        styles.backgroundColor ? '' : 'bg-card/50',
      )}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
      }}
    >
      <div
        className={cn(
          config.layout === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
            : 'flex flex-wrap justify-center gap-8 md:gap-12',
        )}
      >
        {items.map((stat) => {
          const Icon = ICON_MAP[stat.icon] || Users;
          return (
            <div
              key={stat.id}
              className={cn(
                'flex flex-col items-center text-center gap-2 p-4',
                config.layout === 'grid' && 'bg-background/50 rounded-lg',
              )}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              {isEditing && isSelected ? (
                <>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={(e) => handleUpdateStat(stat.id, { value: e.target.value })}
                    className="text-2xl md:text-3xl font-bold text-foreground bg-transparent border-none text-center w-24 focus:outline-none focus:ring-1 focus:ring-primary rounded"
                  />
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => handleUpdateStat(stat.id, { label: e.target.value })}
                    className="text-sm text-muted-foreground bg-transparent border-none text-center w-20 focus:outline-none focus:ring-1 focus:ring-primary rounded"
                  />
                </>
              ) : (
                <>
                  <span className="text-2xl md:text-3xl font-bold text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const StatsBlock = memo(StatsBlockComponent);
