import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TransactionDetail } from './TransactionDetail';
import type { TransactionDisplay } from '../../types';

interface TransactionDetailDrawerProps {
  transaction: TransactionDisplay | null;
  open: boolean;
  onClose: () => void;
}

export function TransactionDetailDrawer({
  transaction,
  open,
  onClose,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Detalle de Transacción</SheetTitle>
        </SheetHeader>
        <TransactionDetail
          transaction={transaction}
          onClose={onClose}
          className="border-0 shadow-none rounded-none"
        />
      </SheetContent>
    </Sheet>
  );
}
