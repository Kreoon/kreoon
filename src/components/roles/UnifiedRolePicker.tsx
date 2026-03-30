import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import type { AppRole } from '@/types/database';
import {
  Video, Film, Target, Palette, MessageCircle, Briefcase, X, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedRolePickerProps {
  value: AppRole | AppRole[];
  onChange: (value: AppRole | AppRole[]) => void;
  multiple?: boolean;
  showClientRoles?: boolean;
  maxRoles?: number;
  className?: string;
}

// 6 roles base para UI pública (sin admin)
const ROLE_OPTIONS: {
  id: AppRole;
  label: string;
  description: string;
  icon: typeof Video;
  colorClass: string;
  bgClass: string;
  exclusive?: boolean;
}[] = [
  {
    id: 'creator',
    label: 'Creador de Contenido',
    description: 'UGC, influencer, fotografía, video',
    icon: Video,
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20'
  },
  {
    id: 'editor',
    label: 'Editor / Producción',
    description: 'Edición de video, motion graphics, sonido',
    icon: Film,
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
  },
  {
    id: 'strategist',
    label: 'Estratega Digital',
    description: 'Social media, tráfico, SEO, growth',
    icon: Target,
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
  },
  {
    id: 'team_leader',
    label: 'Estratega Creativo',
    description: 'Dirección creativa, branding, conceptos',
    icon: Palette,
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
  },
  {
    id: 'trafficker',
    label: 'Community Manager',
    description: 'Gestión de comunidades, engagement',
    icon: MessageCircle,
    colorClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20'
  },
  {
    id: 'client',
    label: 'Cliente / Marca',
    description: 'Gerente de marca, director de marketing',
    icon: Briefcase,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
    exclusive: true
  },
];

export function UnifiedRolePicker({
  value,
  onChange,
  multiple = false,
  showClientRoles = false,
  maxRoles = 5,
  className = '',
}: UnifiedRolePickerProps) {
  const selectedRoles = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [value]);

  const isSelected = (role: AppRole) => selectedRoles.includes(role);

  // El primer rol seleccionado es el rol primario
  const primaryRole = selectedRoles[0];

  // Verificar si client está seleccionado (modo exclusivo)
  const isClientSelected = selectedRoles.includes('client');

  const toggleRole = (role: AppRole) => {
    const roleDef = ROLE_OPTIONS.find(r => r.id === role);

    if (multiple) {
      const current = [...selectedRoles];

      if (current.includes(role)) {
        // Deseleccionar rol
        onChange(current.filter(r => r !== role));
      } else {
        // Seleccionar rol
        if (roleDef?.exclusive) {
          // Si es exclusivo (client), deseleccionar todos los demás
          onChange([role]);
        } else if (isClientSelected) {
          // Si client está seleccionado, reemplazarlo con el nuevo rol
          onChange([role]);
        } else {
          // Agregar rol si no excede el máximo
          if (current.length >= maxRoles) return;
          onChange([...current, role]);
        }
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

  // Filtrar roles basado en props
  const visibleRoles = useMemo(() => {
    return ROLE_OPTIONS.filter(def => {
      if (!showClientRoles && def.id === 'client') return false;
      return true;
    });
  }, [showClientRoles]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Roles seleccionados (modo múltiple) */}
      {multiple && selectedRoles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Roles seleccionados</span>
            <span className="px-1.5 py-0.5 rounded bg-muted font-medium">
              {selectedRoles.length}/{maxRoles}
            </span>
            {isClientSelected && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px]">
                Modo exclusivo
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedRoles.map((role, index) => {
              const isPrimary = index === 0;
              return (
                <Badge
                  key={role}
                  className={cn(
                    getRoleBadgeColor(role),
                    'cursor-pointer hover:opacity-75 gap-1.5 transition-all',
                    isPrimary && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                  )}
                  onClick={() => removeRole(role)}
                >
                  {isPrimary && <Star className="h-3 w-3 fill-current" />}
                  {getRoleLabel(role)}
                  <X className="h-3 w-3" />
                </Badge>
              );
            })}
          </div>
          {selectedRoles.length > 1 && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" /> El primer rol es tu rol primario
            </p>
          )}
        </div>
      )}

      {/* Grid de roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleRoles.map(def => {
          const Icon = def.icon;
          const selected = isSelected(def.id);
          const isPrimary = primaryRole === def.id;

          // Deshabilitado si:
          // - Modo múltiple, no seleccionado, y ya alcanzó el máximo
          // - Client está seleccionado y este no es client
          const disabled = multiple && !selected && (
            selectedRoles.length >= maxRoles ||
            (isClientSelected && def.id !== 'client')
          );

          return (
            <button
              key={def.id}
              type="button"
              className={cn(
                'relative flex items-start gap-3 p-3 rounded-lg border transition-all text-left',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                selected
                  ? cn(def.bgClass, 'border-2', isPrimary && 'ring-2 ring-primary ring-offset-1 ring-offset-background')
                  : 'bg-card border-border hover:bg-accent/50',
                disabled && 'opacity-40 cursor-not-allowed'
              )}
              onClick={() => !disabled && toggleRole(def.id)}
              disabled={disabled}
            >
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                selected ? def.bgClass : 'bg-muted'
              )}>
                <Icon className={cn('h-5 w-5', def.colorClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-sm font-medium leading-tight',
                    selected && def.colorClass
                  )}>
                    {def.label}
                  </p>
                  {isPrimary && multiple && (
                    <Star className={cn('h-3.5 w-3.5 fill-current', def.colorClass)} />
                  )}
                  {def.exclusive && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">
                      Exclusivo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {def.description}
                </p>
              </div>
              {selected && (
                <div className={cn(
                  'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center',
                  def.bgClass
                )}>
                  <div className={cn('w-2 h-2 rounded-full', def.colorClass.replace('text-', 'bg-'))} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mensaje de ayuda */}
      {multiple && !isClientSelected && (
        <p className="text-xs text-muted-foreground">
          Selecciona hasta {maxRoles} roles de talento. El primero sera tu rol primario.
        </p>
      )}
    </div>
  );
}
