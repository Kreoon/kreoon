import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { cn } from "@/lib/utils";

/**
 * Campana de notificaciones para las cabeceras MÓVILES.
 *
 * Simplificación 2026: sustituye a SocialNotificationsDropdown, que leía
 * `social_notifications` (tabla del feed, eliminada). Esta lee `user_notifications`,
 * que es la fuente real de notificaciones de la plataforma y la misma que usa
 * IntegratedNotificationHeader en escritorio.
 *
 * Se hizo un componente aparte porque IntegratedNotificationHeader es una barra
 * fija de ancho completo pensada para escritorio; en móvil hace falta un icono
 * compacto que quepa junto al avatar.
 */
export function MobileNotificationsBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useUserNotifications();

  const handleOpen = (value: boolean) => {
    setOpen(value);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : "Notificaciones"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full p-0 text-[10px] leading-none"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-sm p-0">
        <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3 space-y-0">
          <SheetTitle className="text-base">Notificaciones</SheetTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-57px)]">
          {loading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Sin novedades</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aquí te avisamos cuando algo necesite tu atención.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                    }}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      !n.is_read && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                        n.is_read ? "bg-transparent" : "bg-primary",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.message && (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </span>
                    {n.is_read && <Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
