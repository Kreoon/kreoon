import { motion } from 'framer-motion';
import {
  Plus,
  DollarSign,
  Users,
  Target,
  Pencil,
  Sparkles,
  FileText,
  Bell,
  Video,
  Upload,
  Film,
  Scissors,
  Play,
  Download,
  Eye,
  Wallet,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RolUsuario } from '@/lib/studio-system';

interface QuickActionsProps {
  rol: RolUsuario;
  stats?: {
    pendientes?: number;
    urgentes?: number;
    nuevos?: number;
  };
  onAction: (action: string) => void;
  variant?: 'grid' | 'row';
  className?: string;
}

interface ActionConfig {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  action: string;
  statKey?: 'pendientes' | 'urgentes' | 'nuevos';
  color?: string;
}

const actionsByRole: Record<RolUsuario, ActionConfig[]> = {
  admin: [
    { label: 'Nueva Producción', icon: Plus, action: 'nueva_produccion', color: '#10b981' },
    { label: 'Ver Taquilla', icon: DollarSign, action: 'ver_finanzas', color: '#fbbf24' },
    { label: 'Gestionar Elenco', icon: Users, action: 'gestionar_equipo', color: '#8b5cf6' },
    { label: 'Metas de Temporada', icon: Target, action: 'ver_metas', color: '#3b82f6' },
  ],
  team_leader: [
    { label: 'Nueva Producción', icon: Plus, action: 'nueva_produccion', color: '#10b981' },
    { label: 'Ver Taquilla', icon: DollarSign, action: 'ver_finanzas', color: '#fbbf24' },
    { label: 'Gestionar Equipo', icon: Users, action: 'gestionar_equipo', color: '#8b5cf6' },
    { label: 'Metas de Temporada', icon: Target, action: 'ver_metas', color: '#3b82f6' },
  ],
  strategist: [
    { label: 'Escribir Guión', icon: Pencil, action: 'nuevo_guion', color: '#8b5cf6' },
    { label: 'Asistente IA', icon: Sparkles, action: 'abrir_ia', color: '#fbbf24' },
    { label: 'Mis Guiones', icon: FileText, action: 'ver_guiones', color: '#3b82f6' },
    { label: 'Hacer Casting', icon: Users, action: 'casting', color: '#10b981' },
  ],
  trafficker: [
    { label: 'Ver Campañas', icon: Target, action: 'ver_campanas', statKey: 'pendientes', color: '#8b5cf6' },
    { label: 'Gestionar Tráfico', icon: Play, action: 'gestionar_trafico', color: '#3b82f6' },
    { label: 'Métricas', icon: DollarSign, action: 'ver_metricas', color: '#fbbf24' },
    { label: 'Asistente IA', icon: Sparkles, action: 'abrir_ia', color: '#10b981' },
  ],
  creator: [
    { label: 'Ver Llamados', icon: Bell, action: 'ver_llamados', statKey: 'pendientes', color: '#f59e0b' },
    { label: 'Ir a Rodaje', icon: Video, action: 'ir_rodaje', color: '#3b82f6' },
    { label: 'Entregar Toma', icon: Upload, action: 'entregar', color: '#10b981' },
    { label: 'Mi Reel', icon: Film, action: 'ver_reel', color: '#8b5cf6' },
  ],
  editor: [
    { label: 'Post-Producción', icon: Scissors, action: 'ver_cola', statKey: 'pendientes', color: '#8b5cf6' },
    { label: 'Entrar a Corte', icon: Play, action: 'editar', color: '#3b82f6' },
    { label: 'Exportar Corte', icon: Download, action: 'exportar', color: '#10b981' },
    { label: 'Mi Reel', icon: Film, action: 'ver_reel', color: '#fbbf24' },
  ],
  client: [
    { label: 'Nueva Producción', icon: Plus, action: 'nueva_produccion', color: '#10b981' },
    { label: 'Sala de Revisión', icon: Eye, action: 'revisar', statKey: 'pendientes', color: '#f59e0b' },
    { label: 'Mi Inversión', icon: Wallet, action: 'ver_finanzas', color: '#fbbf24' },
    { label: 'Archivo', icon: Archive, action: 'ver_archivo', color: '#8b5cf6' },
  ],
};

export function QuickActions({
  rol,
  stats,
  onAction,
  variant = 'grid',
  className,
}: QuickActionsProps) {
  const actions = actionsByRole[rol] || actionsByRole.creator;

  if (variant === 'row') {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          const count = action.statKey && stats ? stats[action.statKey] : undefined;
          const hasUrgent = action.statKey === 'pendientes' && stats?.urgentes && stats.urgentes > 0;

          return (
            <motion.button
              key={action.action}
              className={cn(
                'relative flex items-center gap-2 px-3 py-2 rounded-sm',
                'bg-zinc-900/60 hover:bg-zinc-800/80',
                'border border-zinc-800/50 hover:border-zinc-700/50',
                'transition-all'
              )}
              onClick={() => onAction(action.action)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Icon className="w-4 h-4" style={{ color: action.color }} />
              <span className="text-sm text-white font-medium">{action.label}</span>

              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs font-bold',
                    hasUrgent
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-purple-500 text-white'
                  )}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Grid variant
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        const count = action.statKey && stats ? stats[action.statKey] : undefined;
        const hasUrgent = action.statKey === 'pendientes' && stats?.urgentes && stats.urgentes > 0;

        return (
          <motion.button
            key={action.action}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 p-4 rounded-sm',
              'bg-gradient-to-br from-zinc-900/80 to-zinc-900/40',
              'border border-zinc-800/50 hover:border-purple-500/30',
              'transition-all group'
            )}
            onClick={() => onAction(action.action)}
            whileHover={{
              scale: 1.02,
              boxShadow: `0 0 30px ${action.color}20`,
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Badge for counts */}
            {count !== undefined && count > 0 && (
              <motion.span
                className={cn(
                  'absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full',
                  'flex items-center justify-center',
                  'text-xs font-bold',
                  hasUrgent
                    ? 'bg-red-500 text-white'
                    : 'bg-purple-500 text-white'
                )}
                animate={hasUrgent ? { scale: [1, 1.1, 1] } : undefined}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {count}
              </motion.span>
            )}

            {/* Icon */}
            <motion.div
              className={cn(
                'w-12 h-12 rounded-sm flex items-center justify-center',
                'group-hover:scale-110 transition-transform'
              )}
              style={{
                background: `linear-gradient(135deg, ${action.color}20 0%, ${action.color}10 100%)`,
                boxShadow: `0 4px 20px ${action.color}10`,
              }}
            >
              <Icon
                className="w-6 h-6"
                style={{ color: action.color }}
              />
            </motion.div>

            {/* Label */}
            <span className="text-sm font-medium text-white text-center">
              {action.label}
            </span>

            {/* Hover glow effect */}
            <motion.div
              className="absolute inset-0 rounded-sm pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${action.color}10 0%, transparent 70%)`,
              }}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
