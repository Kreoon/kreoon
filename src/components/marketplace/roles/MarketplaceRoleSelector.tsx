import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_ROLES, MARKETPLACE_ROLE_CATEGORIES, MAX_ROLES_PER_CREATOR } from './marketplaceRoleConfig';
import { MarketplaceRoleBadge } from './MarketplaceRoleBadge';
import type { MarketplaceRoleId, MarketplaceRoleCategory } from '../types/marketplace';

interface MarketplaceRoleSelectorProps {
  selectedRoles: MarketplaceRoleId[];
  onChange: (roles: MarketplaceRoleId[]) => void;
  maxRoles?: number;
  showCategories?: boolean;
  excludeCategories?: MarketplaceRoleCategory[];
  label?: string;
}

export function MarketplaceRoleSelector({
  selectedRoles,
  onChange,
  maxRoles = MAX_ROLES_PER_CREATOR,
  showCategories = true,
  excludeCategories,
  label,
}: MarketplaceRoleSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<MarketplaceRoleCategory>>(
    new Set(['content_creation'])
  );

  const toggleCategory = (cat: MarketplaceRoleCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleRole = (roleId: MarketplaceRoleId) => {
    if (selectedRoles.includes(roleId)) {
      onChange(selectedRoles.filter(r => r !== roleId));
    } else if (selectedRoles.length < maxRoles) {
      onChange([...selectedRoles, roleId]);
    }
  };

  const atLimit = selectedRoles.length >= maxRoles;

  const categories = (Object.entries(MARKETPLACE_ROLE_CATEGORIES) as [MarketplaceRoleCategory, typeof MARKETPLACE_ROLE_CATEGORIES[MarketplaceRoleCategory]][])
    .filter(([catId]) => !excludeCategories?.includes(catId));

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-foreground/80 text-sm font-medium">{label}</label>
          <span className={cn('text-xs', atLimit ? 'text-orange-400' : 'text-gray-500')}>
            {selectedRoles.length}/{maxRoles}
          </span>
        </div>
      )}

      {/* Selected roles preview */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRoles.map(roleId => (
            <button key={roleId} onClick={() => toggleRole(roleId)} className="group">
              <MarketplaceRoleBadge roleId={roleId} size="md" />
            </button>
          ))}
        </div>
      )}

      {showCategories ? (
        <div className="border border-white/10 rounded-sm overflow-hidden divide-y divide-white/5">
          {categories.map(([catId, catInfo]) => {
            const isExpanded = expandedCategories.has(catId);
            const catRoles = MARKETPLACE_ROLES.filter(r => r.category === catId);
            const selectedInCat = catRoles.filter(r => selectedRoles.includes(r.id)).length;

            return (
              <div key={catId}>
                <button
                  onClick={() => toggleCategory(catId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span className={cn('text-sm font-medium', catInfo.color)}>{catInfo.label}</span>
                    {selectedInCat > 0 && (
                      <span className="bg-purple-500/20 text-purple-300 text-xs px-1.5 py-0.5 rounded-full">
                        {selectedInCat}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs">{catRoles.length} roles</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catRoles.map(role => {
                      const isSelected = selectedRoles.includes(role.id);
                      const isDisabled = !isSelected && atLimit;

                      return (
                        <button
                          key={role.id}
                          onClick={() => !isDisabled && toggleRole(role.id)}
                          disabled={isDisabled}
                          className={cn(
                            'text-left p-3 rounded-sm border transition-all',
                            isSelected
                              ? 'border-purple-500/50 bg-purple-500/10'
                              : isDisabled
                              ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                              : 'border-white/10 bg-white/5 hover:border-white/20',
                          )}
                        >
                          <p className={cn('text-xs font-medium', isSelected ? 'text-white' : 'text-foreground/80')}>
                            {role.label}
                          </p>
                          <p className="text-gray-500 text-[10px] mt-0.5">{role.description}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_ROLES.filter(r => !excludeCategories?.includes(r.category)).map(role => {
            const isSelected = selectedRoles.includes(role.id);
            const isDisabled = !isSelected && atLimit;
            return (
              <button
                key={role.id}
                onClick={() => !isDisabled && toggleRole(role.id)}
                disabled={isDisabled}
                className={cn(
                  'px-3 py-1.5 rounded-sm border text-xs font-medium transition-all',
                  isSelected
                    ? 'border-purple-500/50 bg-purple-500/10 text-white'
                    : isDisabled
                    ? 'border-white/5 text-gray-600 cursor-not-allowed'
                    : 'border-white/10 text-gray-400 hover:border-white/20',
                )}
              >
                {role.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
