import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MARKETPLACE_ROLE_CATEGORIES, MARKETPLACE_ROLES } from '@/components/marketplace/roles/marketplaceRoleConfig';
import { SYSTEM_ONLY_ROLES } from '@/lib/permissionGroups';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import type { AppRole } from '@/types/database';
import type { MarketplaceRoleCategory } from '@/components/marketplace/types/marketplace';
import { Shield, Users, Search, X } from 'lucide-react';

interface UnifiedRolePickerProps {
  value: AppRole | AppRole[];
  onChange: (value: AppRole | AppRole[]) => void;
  multiple?: boolean;
  showSystemRoles?: boolean;
  showClientRoles?: boolean;
  maxRoles?: number;
  className?: string;
}

const SYSTEM_ROLE_DEFS: { id: AppRole; label: string; description: string; icon: typeof Shield }[] = [
  { id: 'admin', label: 'Administrador', description: 'Acceso completo al sistema', icon: Shield },
  { id: 'team_leader', label: 'Líder de Equipo', description: 'Gestión de equipos y supervisión', icon: Users },
];

export function UnifiedRolePicker({
  value,
  onChange,
  multiple = false,
  showSystemRoles = true,
  showClientRoles = false,
  maxRoles = 5,
  className = '',
}: UnifiedRolePickerProps) {
  const [search, setSearch] = useState('');

  const selectedRoles = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [value]);

  const isSelected = (role: AppRole) => selectedRoles.includes(role);

  const toggleRole = (role: AppRole) => {
    if (multiple) {
      const current = [...selectedRoles];
      if (current.includes(role)) {
        const next = current.filter(r => r !== role);
        onChange(next);
      } else {
        if (current.length >= maxRoles) return;
        onChange([...current, role]);
      }
    } else {
      onChange(role);
    }
  };

  const removeRole = (role: AppRole) => {
    if (multiple) {
      onChange(selectedRoles.filter(r => r !== role));
    }
  };

  // Filter marketplace roles by search
  const filteredRoles = useMemo(() => {
    if (!search.trim()) return MARKETPLACE_ROLES;
    const q = search.toLowerCase();
    return MARKETPLACE_ROLES.filter(
      r => r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.id.includes(q)
    );
  }, [search]);

  // Group by category
  const groupedRoles = useMemo(() => {
    const groups: Partial<Record<MarketplaceRoleCategory, typeof filteredRoles>> = {};
    for (const role of filteredRoles) {
      if (!showClientRoles && role.category === 'client') continue;
      if (!groups[role.category]) groups[role.category] = [];
      groups[role.category]!.push(role);
    }
    return groups;
  }, [filteredRoles, showClientRoles]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected roles */}
      {multiple && selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRoles.map(role => (
            <Badge
              key={role}
              className={`${getRoleBadgeColor(role)} cursor-pointer hover:opacity-75 gap-1`}
              onClick={() => removeRole(role)}
            >
              {getRoleLabel(role)}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground self-center ml-1">
            {selectedRoles.length}/{maxRoles}
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar rol..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <ScrollArea className="max-h-[360px]">
        <div className="space-y-4 pr-2">
          {/* System roles */}
          {showSystemRoles && !search && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Roles de Sistema
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SYSTEM_ROLE_DEFS.map(def => {
                  const Icon = def.icon;
                  const selected = isSelected(def.id);
                  return (
                    <Button
                      key={def.id}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start gap-2 h-auto py-2 px-3"
                      onClick={() => toggleRole(def.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{def.label}</p>
                        <p className="text-[11px] opacity-70 font-normal">{def.description}</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Marketplace role categories */}
          {(Object.keys(groupedRoles) as MarketplaceRoleCategory[]).map(category => {
            const categoryDef = MARKETPLACE_ROLE_CATEGORIES[category];
            const roles = groupedRoles[category]!;
            if (roles.length === 0) return null;

            return (
              <div key={category}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${categoryDef.color}`}>
                  {categoryDef.label}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {roles.map(role => {
                    const selected = isSelected(role.id as AppRole);
                    const disabled = multiple && !selected && selectedRoles.length >= maxRoles;
                    return (
                      <Button
                        key={role.id}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        size="sm"
                        className={`justify-start gap-2 h-auto py-1.5 px-2.5 text-left ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        onClick={() => !disabled && toggleRole(role.id as AppRole)}
                        disabled={disabled}
                      >
                        <div>
                          <p className="text-xs font-medium leading-tight">{role.label}</p>
                          <p className="text-[10px] opacity-60 font-normal leading-tight">{role.description}</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {Object.keys(groupedRoles).length === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron roles para "{search}"
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
