import { memo } from 'react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_ROLES } from './roles/marketplaceRoleConfig';
import type { MarketplaceRoleCategory, MarketplaceRoleId } from './types/marketplace';

interface RoleSubChipsProps {
  category: MarketplaceRoleCategory;
  selectedRoles: MarketplaceRoleId[];
  onToggleRole: (roleId: MarketplaceRoleId) => void;
}

export const RoleSubChips = memo(function RoleSubChips({ category, selectedRoles, onToggleRole }: RoleSubChipsProps) {
  const roles = MARKETPLACE_ROLES.filter(r => r.category === category);

  if (roles.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-1">
      {roles.map(role => {
        const isSelected = selectedRoles.includes(role.id);
        return (
          <button
            key={role.id}
            onClick={() => onToggleRole(role.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap transition-all border',
              isSelected
                ? `${role.bgColor} border-current/30 ${role.color}`
                : 'border-white/5 text-gray-500 hover:bg-white/5 hover:text-foreground',
            )}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
});
