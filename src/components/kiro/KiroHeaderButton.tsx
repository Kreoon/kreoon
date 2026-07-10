import { Sparkles } from 'lucide-react';
import { useKiro } from '@/contexts/KiroContext';
import { kiroSounds } from './sounds/KiroSounds';

// Reemplaza al boton flotante draggable en movil (quedaba "perdido" sobre el video del feed,
// sobrepuesto a los botones de accion) — entrada fija a KIRO en el header, junto a
// notificaciones/avatar, igual que el resto de los iconos de la app.
export function KiroHeaderButton({ className }: { className?: string }) {
  const { setIsOpen, unreadCount } = useKiro();

  return (
    <button
      onClick={() => {
        kiroSounds.play('panel_open');
        setIsOpen(true);
      }}
      className={`relative h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors ${className ?? ''}`}
      aria-label="Abrir KIRO"
    >
      <Sparkles className="h-4 w-4 text-primary" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
