import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Sparkles, Wallet, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface MoreMenuItem {
  name: string;
  href: string;
  icon: typeof Sparkles;
}

interface MoreMenuSheetProps {
  /** Ruta base del dashboard (creator-dashboard o editor-dashboard) para el deep-link de Mis Cobros */
  dashboardHref: string;
  className?: string;
}

// Bottom sheet "Mas": todo lo que salio de los 5 slots principales de la nav vive aca.
// Nadie pierde acceso a nada — solo cambia de un tap directo a dos taps. Notificaciones
// NO esta aca: ya tiene su propio icono en el header (reemplazo del maletin, Frente A.3).
export function MoreMenuSheet({ dashboardHref, className }: MoreMenuSheetProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const items: MoreMenuItem[] = [
    { name: 'Academia', href: '/academia', icon: GraduationCap },
    { name: 'Kreoon IA', href: '/scripts', icon: Sparkles },
    { name: 'Mis Cobros', href: `${dashboardHref}?tab=wallet`, icon: Wallet },
    { name: 'Configuración', href: '/settings', icon: Settings },
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
