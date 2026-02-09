import { Camera, Sparkles, Users, User, Radio, Mic, Film, Layers, Volume2, Palette, Target, Share2, MessageCircle, Code, Smartphone, Brain, GraduationCap, Presentation, Briefcase, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_ROLES_MAP } from './marketplaceRoleConfig';
import type { MarketplaceRoleId } from '../types/marketplace';

const ICON_MAP: Record<string, React.ElementType> = {
  Camera, Sparkles, Users, User, Radio, Mic, Film, Layers, Volume2, Palette,
  Target, Share2, MessageCircle, Code, Smartphone, Brain, GraduationCap,
  Presentation, Briefcase, TrendingUp,
};

interface MarketplaceRoleBadgeProps {
  roleId: MarketplaceRoleId;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function MarketplaceRoleBadge({ roleId, size = 'sm', showIcon = true }: MarketplaceRoleBadgeProps) {
  const role = MARKETPLACE_ROLES_MAP[roleId];
  if (!role) return null;

  const Icon = ICON_MAP[role.icon];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        role.bgColor, role.color,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      {showIcon && Icon && <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
      {role.label}
    </span>
  );
}
