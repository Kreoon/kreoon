import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CurrencyType } from '@/components/ui/currency-input';

interface ExchangeRate {
  id: string;
  from_currency: CurrencyType;
  to_currency: CurrencyType;
  rate: number;
  created_at: string;
  is_active: boolean;
}

interface CurrencyBalance {
  id: string;
  currency: CurrencyType;
  balance: number;
  updated_at: string;
}

interface CurrencyTransfer {
  id: string;
  from_currency: CurrencyType;
  to_currency: CurrencyType;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export function useCurrency() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [transfers, setTransfers] = useState<CurrencyTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ratesRes, balancesRes, transfersRes] = await Promise.all([
        supabase
          .from('exchange_rates')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('currency_balances')
          .select('*')
          .order('currency'),
        supabase
          .from('currency_transfers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (ratesRes.error) throw ratesRes.error;
      if (balancesRes.error) throw balancesRes.error;
      if (transfersRes.error) throw transfersRes.error;

      setExchangeRates(ratesRes.data as ExchangeRate[]);
      setBalances(balancesRes.data as CurrencyBalance[]);
      setTransfers(transfersRes.data as CurrencyTransfer[]);
    } catch (error: any) {
      console.error('Error fetching currency data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de moneda",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get current exchange rate between two currencies
  const getExchangeRate = (from: CurrencyType, to: CurrencyType): number | null => {
    if (from === to) return 1;
    const rate = exchangeRates.find(r => r.from_currency === from && r.to_currency === to);
    return rate ? rate.rate : null;
  };

  // Convert amount from one currency to another
  const convert = (amount: number, from: CurrencyType, to: CurrencyType): number | null => {
    const rate = getExchangeRate(from, to);
    if (rate === null) return null;
    return amount * rate;
  };

  // Get balance for a specific currency
  const getBalance = (currency: CurrencyType): number => {
    const balance = balances.find(b => b.currency === currency);
    return balance?.balance || 0;
  };

  // Update exchange rate
  const updateExchangeRate = async (from: CurrencyType, to: CurrencyType, rate: number) => {
    try {
      // Deactivate old rate
      await supabase
        .from('exchange_rates')
        .update({ is_active: false })
        .eq('from_currency', from)
        .eq('to_currency', to)
        .eq('is_active', true);

      // Insert new rate
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: from,
          to_currency: to,
          rate: rate,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Tasa actualizada",
        description: `Nueva tasa: 1 ${from} = ${rate} ${to}`
      });

      await fetchData();
      return true;
    } catch (error: any) {
      console.error('Error updating exchange rate:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tasa de cambio",
        variant: "destructive"
      });
      return false;
    }
  };

  // Transfer between currencies
  const transferCurrency = async (
    fromCurrency: CurrencyType, 
    toCurrency: CurrencyType, 
    fromAmount: number, 
    notes?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('transfer_currency', {
        _from_currency: fromCurrency,
        _to_currency: toCurrency,
        _from_amount: fromAmount,
        _notes: notes || null
      });

      if (error) throw error;

      toast({
        title: "Transferencia exitosa",
        description: `Se transfirió ${fromAmount} ${fromCurrency} a ${toCurrency}`
      });

      await fetchData();
      return data;
    } catch (error: any) {
      console.error('Error transferring currency:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo realizar la transferencia",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update balance manually (for adjustments)
  const updateBalance = async (currency: CurrencyType, newBalance: number) => {
    try {
      const { error } = await supabase
        .from('currency_balances')
        .update({ 
          balance: newBalance, 
          updated_at: new Date().toISOString() 
        })
        .eq('currency', currency);

      if (error) throw error;

      toast({
        title: "Balance actualizado",
        description: `Nuevo balance ${currency}: ${newBalance}`
      });

      await fetchData();
      return true;
    } catch (error: any) {
      console.error('Error updating balance:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el balance",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    exchangeRates,
    balances,
    transfers,
    loading,
    getExchangeRate,
    convert,
    getBalance,
    updateExchangeRate,
    transferCurrency,
    updateBalance,
    refetch: fetchData
  };
}
