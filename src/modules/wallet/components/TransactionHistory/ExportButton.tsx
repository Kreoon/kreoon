import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TransactionFilters, WalletTransaction } from '../../types';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '../../types';

interface ExportButtonProps {
  walletId: string;
  filters?: TransactionFilters;
  currency?: string;
  className?: string;
}

type ExportFormat = 'csv' | 'excel';

export function ExportButton({
  walletId,
  filters,
  currency = 'USD',
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const fetchAllTransactions = async (): Promise<WalletTransaction[]> => {
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.types?.length) {
      query = query.in('transaction_type', filters.types);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59');
    }
    if (filters?.minAmount) {
      query = query.gte('amount', filters.minAmount);
    }
    if (filters?.maxAmount) {
      query = query.lte('amount', filters.maxAmount);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as WalletTransaction[];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const generateCSV = (transactions: WalletTransaction[]): string => {
    const headers = [
      'ID',
      'Fecha',
      'Tipo',
      'Estado',
      'Monto',
      'Comisión',
      'Monto Neto',
      'Balance Después',
      'Descripción',
      'Tipo Referencia',
      'ID Referencia',
    ];

    const rows = transactions.map(t => [
      t.id,
      formatDate(t.created_at),
      TRANSACTION_TYPE_LABELS[t.transaction_type],
      TRANSACTION_STATUS_LABELS[t.status],
      formatMoney(t.amount),
      formatMoney(t.fee),
      formatMoney(t.net_amount),
      formatMoney(t.balance_after),
      t.description || '',
      t.reference_type || '',
      t.reference_id || '',
    ]);

    // Escape and quote CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(String).map(escapeCSV).join(',')),
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    return '\uFEFF' + csv;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const transactions = await fetchAllTransactions();

      if (transactions.length === 0) {
        toast.info('No hay transacciones para exportar');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `transacciones_${timestamp}`;

      if (format === 'csv') {
        const csv = generateCSV(transactions);
        downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
        toast.success(`${transactions.length} transacciones exportadas`);
      } else if (format === 'excel') {
        // For Excel, we generate a TSV that Excel can open
        // Or you could use a library like xlsx for proper .xlsx files
        const csv = generateCSV(transactions);
        downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
        toast.success(`${transactions.length} transacciones exportadas (formato CSV compatible con Excel)`);
      }
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Error al exportar transacciones');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
