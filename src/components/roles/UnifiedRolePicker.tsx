import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRoleLabel, getRoleBadgeColor, ORG_ASSIGNABLE_ROLES } from '@/lib/roles';
import type { AppRole } from '@/types/database';
import {
  Shield, Users, Video, Film, Target, Code, GraduationCap, Building2, X,
} from 'lucide-react';

interface UnifiedRolePickerProps {
  value: AppRole | AppRole[];
  onChange: (value: AppRole | AppRole[]) => void;
  multiple?: boolean;
  showSystemRoles?: boolean;
  showClientRoles?: boolean;
  maxRoles?: number;
  className?: string;
}

// 8 global niche roles with icons and descriptions
const GLOBAL_ROLE_DEFS: { id: AppRole; label: string; description: string; icon: typeof Shield; color: string }[] = [
  { id: 'admin', label: 'Administrador', description: 'Acceso completo al sistema', icon: Shield, color: 'text-red-400' },
  { id: 'team_leader', label: 'Líder de Equipo', description: 'Gestión de equipos y supervisión', icon: Users, color: 'text-indigo-400' },
  { id: 'creator', label: 'Creador de Contenido', description: 'Creación de contenido, UGC, influencer, fotografía', icon: Video, color: 'text-pink-400' },
  { id: 'editor', label: 'Editor / Post-Producción', description: 'Edición de video, motion graphics, sonido, color', icon: Film, color: 'text-blue-400' },
  { id: 'strategist', label: 'Estratega & Marketing', description: 'Social media, tráfico, SEO, growth, CRM', icon: Target, color: 'text-orange-400' },
  { id: 'developer', label: 'Desarrollador', description: 'Web, apps, inteligencia artificial', icon: Code, color: 'text-cyan-400' },
  { id: 'educator', label: 'Educador', description: 'Cursos online, talleres, formación', icon: GraduationCap, color: 'text-yellow-400' },
  { id: 'client', label: 'Cliente', description: 'Gerente de marca, director de marketing', icon: Building2, color: 'text-emerald-400' },
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
  const selectedRoles = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [value]);

  const isSelected = (role: AppRole) => selectedRoles.includes(role);

  const toggleRole = (role: AppRole) => {
    if (multiple) {
      const current = [...selectedRoles];
      if (current.includes(role)) {
        onChange(current.filter(r => r !== role));
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

  // Filter roles based on props
  const visibleRoles = useMemo(() => {
    return GLOBAL_ROLE_DEFS.filter(def => {
      if (!showSystemRoles && (def.id === 'admin' || def.id === 'team_leader')) return false;
      if (!showClientRoles && def.id === 'client') return false;
      return true;
    });
  }, [showSystemRoles, showClientRoles]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected roles (multiple mode) */}
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

      {/* Role grid */}
      <div className="grid grid-cols-2 gap-2">
        {visibleRoles.map(def => {
          const Icon = def.icon;
          const selected = isSelected(def.id);
          const disabled = multiple && !selected && selectedRoles.length >= maxRoles;
          return (
            <Button
              key={def.id}
              type="button"
              variant={selected ? 'default' : 'outline'}
              size="sm"
              className={`justify-start gap-2 h-auto py-2 px-3 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && toggleRole(def.id)}
              disabled={disabled}
            >
              <Icon className={`h-4 w-4 shrink-0 ${selected ? '' : def.color}`} />
              <div className="text-left">
                <p className="text-sm font-medium leading-tight">{def.label}</p>
                <p className="text-[10px] opacity-60 font-normal leading-tight">{def.description}</p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
