import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Check, Lock } from 'lucide-react';
import { ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { cn } from '@/lib/utils';
import { AppRole } from '@/types/database';

interface StatusChangeDropdownProps {
  currentStatus: ContentStatus;
  contentId: string;
  userRole: AppRole | null;
  isAssignedCreator?: boolean;
  isAssignedEditor?: boolean;
  isAssignedStrategist?: boolean;
  onStatusChange: (contentId: string, newStatus: ContentStatus) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

// Define allowed status transitions per role
// Each role can only move content to specific statuses
const ROLE_ALLOWED_STATUSES: Record<AppRole, ContentStatus[]> = {
  admin: [
    'draft', 'script_approved', 'assigned', 'recording', 'recorded',
    'editing', 'delivered', 'issue', 'corrected', 'approved', 'paid'
  ],
  strategist: [
    'draft', 'script_approved', 'assigned', 'recording', 'recorded',
    'editing', 'delivered', 'issue', 'corrected', 'approved'
  ],
  team_leader: [
    'draft', 'script_approved', 'assigned', 'recording', 'recorded',
    'editing', 'delivered', 'issue', 'corrected', 'approved'
  ],
  creator: ['recording', 'recorded', 'issue'],
  editor: ['editing', 'delivered', 'issue', 'corrected'],
  client: ['approved', 'issue'],
  trafficker: ['approved'],
  ambassador: ['recording', 'recorded', 'issue'],
};

// Define which statuses each role can move FROM
const ROLE_CAN_MOVE_FROM: Record<AppRole, ContentStatus[]> = {
  admin: [
    'draft', 'script_approved', 'assigned', 'recording', 'recorded',
    'editing', 'delivered', 'issue', 'corrected', 'approved', 'paid'
  ],
  strategist: [
    'draft', 'script_approved', 'assigned', 'recording', 'recorded',
    'editing', 'delivered', 'issue', 'corrected'
  ],
  team_leader: [
    'draft', 'script_approved', 'assigned', 'recording', 'recorded',
    'editing', 'delivered', 'issue', 'corrected'
  ],
  creator: ['assigned', 'recording', 'recorded', 'issue'],
  editor: ['recorded', 'editing', 'issue', 'corrected'],
  client: ['delivered', 'corrected'],
  trafficker: ['approved'],
  ambassador: ['assigned', 'recording', 'recorded', 'issue'],
};

export function StatusChangeDropdown({
  currentStatus,
  contentId,
  userRole,
  isAssignedCreator = false,
  isAssignedEditor = false,
  isAssignedStrategist = false,
  onStatusChange,
  disabled = false,
  size = 'default',
}: StatusChangeDropdownProps) {
  const [isChanging, setIsChanging] = useState(false);

  // Get allowed statuses for this user's role
  const getAllowedStatuses = (): ContentStatus[] => {
    if (!userRole) return [];

    const allowedToStatuses = ROLE_ALLOWED_STATUSES[userRole] || [];
    const canMoveFrom = ROLE_CAN_MOVE_FROM[userRole] || [];

    // Check if user can move from current status
    if (!canMoveFrom.includes(currentStatus) && userRole !== 'admin') {
      // Special cases for assigned users
      if (userRole === 'creator' && isAssignedCreator && ['assigned', 'recording', 'recorded', 'issue'].includes(currentStatus)) {
        // Creator can move their assigned content
      } else if (userRole === 'editor' && isAssignedEditor && ['recorded', 'editing', 'issue'].includes(currentStatus)) {
        // Editor can move their assigned content
      } else if (userRole === 'strategist' && isAssignedStrategist) {
        // Strategist assigned to this content can always move it
      } else {
        return [];
      }
    }

    // Filter out current status
    return allowedToStatuses.filter(status => status !== currentStatus);
  };

  const allowedStatuses = getAllowedStatuses();
  const canChangeStatus = allowedStatuses.length > 0 && !disabled;

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!canChangeStatus || isChanging) return;
    
    setIsChanging(true);
    try {
      await onStatusChange(contentId, newStatus);
    } finally {
      setIsChanging(false);
    }
  };

  if (!canChangeStatus) {
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          STATUS_COLORS[currentStatus],
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
        )}
      >
        {STATUS_LABELS[currentStatus]}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={isChanging}
          className={cn(
            "gap-1 font-medium",
            STATUS_COLORS[currentStatus],
            size === 'sm' ? 'h-7 text-xs px-2' : 'h-9 text-sm px-3'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_LABELS[currentStatus]}
          <ChevronDown className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Cambiar estado a:
        </div>
        <DropdownMenuSeparator />
        {allowedStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className="gap-2 cursor-pointer"
            disabled={isChanging}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'approved' && "bg-green-500",
              status === 'issue' && "bg-red-500",
              status === 'recording' && "bg-orange-500",
              status === 'recorded' && "bg-cyan-500",
              status === 'editing' && "bg-pink-500",
              status === 'delivered' && "bg-emerald-500",
              status === 'corrected' && "bg-blue-500",
              status === 'draft' && "bg-gray-500",
              status === 'script_approved' && "bg-blue-400",
              status === 'assigned' && "bg-purple-500",
              status === 'paid' && "bg-green-600",
            )} />
            {STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick action buttons for common status changes - more mobile friendly
interface QuickStatusButtonsProps {
  currentStatus: ContentStatus;
  contentId: string;
  userRole: AppRole | null;
  isAssignedCreator?: boolean;
  isAssignedEditor?: boolean;
  onStatusChange: (contentId: string, newStatus: ContentStatus) => Promise<void>;
}

export function QuickStatusButtons({
  currentStatus,
  contentId,
  userRole,
  isAssignedCreator = false,
  isAssignedEditor = false,
  onStatusChange,
}: QuickStatusButtonsProps) {
  const [isChanging, setIsChanging] = useState<ContentStatus | null>(null);

  const handleChange = async (status: ContentStatus) => {
    setIsChanging(status);
    try {
      await onStatusChange(contentId, status);
    } finally {
      setIsChanging(null);
    }
  };

  // Creator quick actions
  if (userRole === 'creator' && isAssignedCreator) {
    if (currentStatus === 'assigned') {
      return (
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleChange('recording'); }}
          disabled={!!isChanging}
          className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
        >
          {isChanging === 'recording' ? '...' : '🎬 Iniciar Grabación'}
        </Button>
      );
    }
    if (currentStatus === 'recording') {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleChange('recorded'); }}
            disabled={!!isChanging}
            className="h-8 text-xs bg-cyan-500 hover:bg-cyan-600"
          >
            {isChanging === 'recorded' ? '...' : '✅ Grabado'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleChange('issue'); }}
            disabled={!!isChanging}
            className="h-8 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
          >
            ⚠️
          </Button>
        </div>
      );
    }
  }

  // Editor quick actions
  if (userRole === 'editor' && isAssignedEditor) {
    if (currentStatus === 'recorded') {
      return (
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleChange('editing'); }}
          disabled={!!isChanging}
          className="h-8 text-xs bg-pink-500 hover:bg-pink-600"
        >
          {isChanging === 'editing' ? '...' : '✂️ Iniciar Edición'}
        </Button>
      );
    }
    if (currentStatus === 'editing') {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleChange('delivered'); }}
            disabled={!!isChanging}
            className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
          >
            {isChanging === 'delivered' ? '...' : '📤 Entregar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleChange('issue'); }}
            disabled={!!isChanging}
            className="h-8 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
          >
            ⚠️
          </Button>
        </div>
      );
    }
    // Editor can also work on corrected content or issues
    if (currentStatus === 'issue' || currentStatus === 'corrected') {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleChange('editing'); }}
            disabled={!!isChanging}
            className="h-8 text-xs bg-pink-500 hover:bg-pink-600"
          >
            {isChanging === 'editing' ? '...' : '✂️ Editar'}
          </Button>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleChange('delivered'); }}
            disabled={!!isChanging}
            className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
          >
            {isChanging === 'delivered' ? '...' : '📤 Entregar'}
          </Button>
        </div>
      );
    }
  }

  // Client quick actions
  if (userRole === 'client') {
    if (currentStatus === 'delivered' || currentStatus === 'corrected') {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleChange('approved'); }}
            disabled={!!isChanging}
            className="h-8 text-xs bg-green-500 hover:bg-green-600"
          >
            {isChanging === 'approved' ? '...' : '✅ Aprobar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleChange('issue'); }}
            disabled={!!isChanging}
            className="h-8 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
          >
            ❌ Novedad
          </Button>
        </div>
      );
    }
  }

  return null;
}
