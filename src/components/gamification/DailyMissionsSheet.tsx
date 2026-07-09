import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import { DailyMissionsPanel } from './DailyMissionsPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';

interface DailyMissionsSheetProps {
  className?: string;
}

export function DailyMissionsSheet({ className }: DailyMissionsSheetProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { completedCount, total } = useDailyMissions();

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'relative flex items-center justify-center h-9 min-w-[44px] px-2.5 rounded-full border transition-colors',
        'border-kreoon-border bg-kreoon-bg-card hover:bg-kreoon-purple-500/10',
        className
      )}
      aria-label={`Misiones de hoy: ${completedCount} de ${total} completas`}
    >
      <Sparkles className="h-4 w-4 text-kreoon-purple-400" aria-hidden="true" />
      {total > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
        >
          {completedCount}/{total}
        </Badge>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85dvh] pb-[env(safe-area-inset-bottom)] bg-kreoon-bg-card border-kreoon-border">
            <DrawerHeader>
              <DrawerTitle className="text-kreoon-text-primary">Misiones de hoy</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <DailyMissionsPanel />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md bg-kreoon-bg-card border-kreoon-border">
          <DialogHeader>
            <DialogTitle className="text-kreoon-text-primary">Misiones de hoy</DialogTitle>
          </DialogHeader>
          <DailyMissionsPanel />
        </DialogContent>
      </Dialog>
    </>
  );
}
