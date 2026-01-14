import { useUserPoints, PointTransaction } from '@/hooks/useUserPoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Flame,
  Star,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PointsHistoryProps {
  userId: string;
  maxItems?: number;
}

const TRANSACTION_ICONS: Record<string, any> = {
  early_delivery: TrendingUp,
  on_time_delivery: CheckCircle2,
  slight_delay: Clock,
  late_delivery: AlertCircle,
  very_late_delivery: AlertCircle,
  clean_approval_bonus: Star,
  issue_penalty: AlertCircle,
  issue_recovery: Sparkles,
  manual_adjustment: Zap
};

const TRANSACTION_LABELS: Record<string, string> = {
  early_delivery: 'Entrega anticipada',
  on_time_delivery: 'Entrega a tiempo',
  slight_delay: 'Ligero retraso',
  late_delivery: 'Entrega tardía',
  very_late_delivery: 'Entrega muy tardía',
  clean_approval_bonus: 'Aprobación limpia',
  issue_penalty: 'Penalización por novedad',
  issue_recovery: 'Recuperación de novedad',
  manual_adjustment: 'Ajuste manual'
};

function TransactionItem({ transaction }: { transaction: PointTransaction }) {
  const Icon = TRANSACTION_ICONS[transaction.event_type] || Zap;
  const isPositive = transaction.points > 0;
  
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <div className={cn(
        "p-2 rounded-full",
        isPositive ? "bg-success/20" : "bg-destructive/20"
      )}>
        <Icon className={cn(
          "w-4 h-4",
          isPositive ? "text-success" : "text-destructive"
        )} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {TRANSACTION_LABELS[transaction.event_type] || transaction.event_type}
        </p>
        {transaction.source && (
          <p className="text-xs text-muted-foreground truncate">
            Como {transaction.source === 'creator' ? 'Creador' : 'Editor'}
          </p>
        )}
      </div>
      
      <div className="text-right">
        <div className={cn(
          "flex items-center gap-1 font-bold",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? '+' : ''}{transaction.points}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(transaction.created_at), 'dd MMM', { locale: es })}
        </p>
      </div>
    </div>
  );
}

export function PointsHistory({ userId, maxItems = 20 }: PointsHistoryProps) {
  const { transactions, loading } = useUserPoints(userId);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Historial de Puntos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const displayTransactions = transactions.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Historial de Puntos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aún no tienes transacciones</p>
            <p className="text-xs">Completa contenido para ganar puntos</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            {displayTransactions.map(tx => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
