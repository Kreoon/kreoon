import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Flag, Map, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface AcademiaMoreMenuSheetProps {
  spaceSlug: string;
  className?: string;
}

// "Mas" especifico de un space de Academia — MoreMenuSheet (el generico de la app) no encaja
// aca dentro (mostraria "Academia" -> /academia estando ya adentro, y "Mis Cobros" no aplica).
export function AcademiaMoreMenuSheet({ spaceSlug, className }: AcademiaMoreMenuSheetProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items = [
    { name: 'Miembros', href: `/academia/${spaceSlug}/members`, icon: Users },
    { name: 'Ranking', href: `/academia/${spaceSlug}/leaderboard`, icon: Trophy },
    { name: 'Retos', href: `/academia/${spaceSlug}/retos`, icon: Flag },
    { name: 'Mapa', href: `/academia/${spaceSlug}/map`, icon: Map },
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex flex-col items-center gap-1 px-2 py-1.5 rounded-sm transition-colors min-h-[44px] text-muted-foreground',
          className
        )}
        aria-label="Más opciones"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span className="text-[10px]">Más</span>
      </button>

      <DrawerContent className="max-h-[70dvh] pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Más</DrawerTitle>
        </DrawerHeader>
        <div className="grid grid-cols-3 gap-3 px-4 pb-6">
          {items.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setOpen(false);
                navigate(item.href);
              }}
              className="flex flex-col items-center justify-center gap-2 min-h-[80px] rounded-sm border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <item.icon className="h-6 w-6 text-foreground" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground text-center px-1">{item.name}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
