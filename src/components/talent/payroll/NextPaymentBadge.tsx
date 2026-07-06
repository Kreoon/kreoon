import { format, addMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, DollarSign } from 'lucide-react';

export function NextPaymentBadge() {
  const today = new Date();
  const day = today.getDate();
  // Si estamos antes del día 20 de este mes, el próximo cierre es el 20 de este mes
  // Si ya pasó, el próximo es el 20 del mes que viene
  const nextClose = day < 20
    ? new Date(today.getFullYear(), today.getMonth(), 20)
    : new Date(today.getFullYear(), today.getMonth() + 1, 20);
  const nextPay = startOfMonth(addMonths(nextClose, 1));

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-primary" />
        Próximo cierre: <strong className="text-foreground">{format(nextClose, "d 'de' MMMM", { locale: es })}</strong>
      </span>
      <span className="text-border">·</span>
      <span className="flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5 text-green-500" />
        Pago previsto: <strong className="text-foreground">1-5 de {format(nextPay, 'MMMM yyyy', { locale: es })}</strong>
      </span>
    </div>
  );
}
