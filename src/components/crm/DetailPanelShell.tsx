import type { ReactNode } from 'react';
import { X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DetailPanelShellProps {
  onClose: () => void;
  avatar: ReactNode;
  name: string;
  subtitle?: string;
  badges?: ReactNode;
  menuItems?: ReactNode;
  children: ReactNode;
}

export function DetailPanelShell({
  onClose,
  avatar,
  name,
  subtitle,
  badges,
  menuItems,
  children,
}: DetailPanelShellProps) {
  return (
    <div
      className="w-full md:w-[440px] h-full flex flex-col overflow-hidden border-l animate-in slide-in-from-right duration-200"
      style={{
        background: 'var(--nova-glass-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderColor: 'var(--nova-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-start gap-3 border-b"
        style={{ borderColor: 'var(--nova-border-subtle)' }}
      >
        <div className="flex-shrink-0">{avatar}</div>

        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-semibold truncate">{name || 'Sin nombre'}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
          {badges && <div className="flex items-center gap-1.5 mt-1 flex-wrap">{badges}</div>}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {menuItems && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 bg-popover border-primary/30"
              >
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">{children}</div>
      </div>
    </div>
  );
}
