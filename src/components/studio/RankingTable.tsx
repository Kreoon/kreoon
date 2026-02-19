import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowUp, ArrowDown, Minus, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMensajeVacio, type RolUsuario } from '@/lib/studio-system';
import { LevelBadge } from './LevelBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RankingUser {
  id: string;
  nombre: string;
  avatar?: string;
  rol: RolUsuario;
  nivel: number;
  creditos: number;
  rating: number;
  piezasCompletadas: number;
  posicion: number;
  posicionAnterior?: number;
  esUsuarioActual?: boolean;
}

interface RankingTableProps {
  usuarios: RankingUser[];
  periodo?: 'semana' | 'mes' | 'temporada' | 'total';
  maxItems?: number;
  showFilters?: boolean;
  currentUserId?: string;
  className?: string;
  onPeriodoChange?: (periodo: string) => void;
}

const periodoLabels = {
  semana: 'Esta Semana',
  mes: 'Este Mes',
  temporada: 'Temporada',
  total: 'Histórico',
};

const rolLabels: Record<string, string> = {
  todos: 'Todos',
  creator: 'Creadores',
  editor: 'Editores',
  strategist: 'Estrategas',
};

const getMedalStyle = (position: number) => {
  switch (position) {
    case 1:
      return {
        bg: 'bg-gradient-to-br from-amber-400/20 to-amber-600/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        shadow: '0 0 20px rgba(245, 158, 11, 0.2)',
      };
    case 2:
      return {
        bg: 'bg-gradient-to-br from-slate-300/20 to-slate-500/10',
        border: 'border-slate-400/30',
        text: 'text-foreground/80',
        shadow: '0 0 20px rgba(148, 163, 184, 0.15)',
      };
    case 3:
      return {
        bg: 'bg-gradient-to-br from-orange-400/20 to-orange-600/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        shadow: '0 0 20px rgba(249, 115, 22, 0.15)',
      };
    default:
      return null;
  }
};

export function RankingTable({
  usuarios,
  periodo = 'mes',
  maxItems = 10,
  showFilters = true,
  currentUserId,
  className,
  onPeriodoChange,
}: RankingTableProps) {
  const [selectedPeriodo, setSelectedPeriodo] = useState(periodo);
  const [selectedRol, setSelectedRol] = useState('todos');

  const handlePeriodoChange = (value: string) => {
    setSelectedPeriodo(value as typeof periodo);
    onPeriodoChange?.(value);
  };

  // Filter users by role
  const filteredUsers = selectedRol === 'todos'
    ? usuarios
    : usuarios.filter(u => u.rol === selectedRol);

  // Get display users (max items)
  const displayUsers = filteredUsers.slice(0, maxItems);

  // Find current user if not in display list
  const currentUser = currentUserId
    ? usuarios.find(u => u.id === currentUserId)
    : usuarios.find(u => u.esUsuarioActual);

  const currentUserInList = displayUsers.some(u => u.id === currentUser?.id);

  if (usuarios.length === 0) {
    const emptyMessage = getMensajeVacio('ranking');
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Trophy className="w-12 h-12 text-zinc-600 mb-4" />
        <h3 className="text-lg font-semibold text-zinc-400">{emptyMessage.titulo}</h3>
        <p className="text-sm text-zinc-500">{emptyMessage.descripcion}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-lg">Ranking del Estudio</h3>
        </div>

        {showFilters && (
          <div className="flex items-center gap-2">
            <Select value={selectedRol} onValueChange={setSelectedRol}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-zinc-900/50 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(rolLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriodo} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-zinc-900/50 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodoLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Ranking List */}
      <div className="flex flex-col gap-2">
        {displayUsers.map((user, index) => (
          <RankingRow key={user.id} user={user} index={index} />
        ))}

        {/* Current user if not in list */}
        {currentUser && !currentUserInList && (
          <>
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 border-t border-dashed border-zinc-700" />
              <span className="text-xs text-zinc-500">Tu posición</span>
              <div className="flex-1 border-t border-dashed border-zinc-700" />
            </div>
            <RankingRow user={{ ...currentUser, esUsuarioActual: true }} index={currentUser.posicion - 1} />
          </>
        )}
      </div>
    </div>
  );
}

function RankingRow({ user, index }: { user: RankingUser; index: number }) {
  const medalStyle = getMedalStyle(user.posicion);
  const positionChange = user.posicionAnterior !== undefined
    ? user.posicionAnterior - user.posicion
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'transition-all duration-200',
        medalStyle
          ? `${medalStyle.bg} border ${medalStyle.border}`
          : 'bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-800/40',
        user.esUsuarioActual && 'ring-2 ring-purple-500/50 bg-purple-500/10'
      )}
      style={{ boxShadow: medalStyle?.shadow }}
    >
      {/* Position */}
      <div className="w-8 flex items-center justify-center">
        {user.posicion === 1 ? (
          <Crown className={cn('w-6 h-6', medalStyle?.text || 'text-amber-400')} />
        ) : (
          <span
            className={cn(
              'font-bold text-lg',
              medalStyle?.text || 'text-zinc-400'
            )}
          >
            #{user.posicion}
          </span>
        )}
      </div>

      {/* Position change indicator */}
      <div className="w-5 flex items-center justify-center">
        {positionChange > 0 ? (
          <div className="flex items-center text-emerald-400">
            <ArrowUp className="w-3 h-3" />
            <span className="text-xs">{positionChange}</span>
          </div>
        ) : positionChange < 0 ? (
          <div className="flex items-center text-red-400">
            <ArrowDown className="w-3 h-3" />
            <span className="text-xs">{Math.abs(positionChange)}</span>
          </div>
        ) : (
          <Minus className="w-3 h-3 text-zinc-600" />
        )}
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar className="w-8 h-8 border border-zinc-700">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
            {user.nombre.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-white text-sm truncate">
            {user.nombre}
            {user.esUsuarioActual && (
              <span className="ml-1 text-xs text-purple-400">(Tú)</span>
            )}
          </span>
          <span className="text-xs text-zinc-500 capitalize">
            {user.rol.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Level Badge */}
      <div className="hidden sm:block">
        <LevelBadge nivel={user.nivel} size="sm" showTooltip={false} />
      </div>

      {/* Credits */}
      <div className="flex flex-col items-end">
        <span className="font-bold text-white text-sm tabular-nums">
          {user.creditos.toLocaleString()}
        </span>
        <span className="text-xs text-zinc-500">CR</span>
      </div>

      {/* Rating */}
      <div className="hidden md:flex items-center gap-1">
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span className="text-sm text-white tabular-nums">
          {user.rating.toFixed(1)}
        </span>
      </div>

      {/* Pieces */}
      <div className="hidden lg:flex flex-col items-end">
        <span className="text-sm text-white tabular-nums">
          {user.piezasCompletadas}
        </span>
        <span className="text-xs text-zinc-500">piezas</span>
      </div>
    </motion.div>
  );
}
