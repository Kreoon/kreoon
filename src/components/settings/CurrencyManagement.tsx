import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRightLeft, 
  DollarSign, 
  RefreshCw, 
  TrendingUp, 
  Wallet,
  History,
  Settings2,
  Save
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { CurrencyDisplay, CurrencyBadge, type CurrencyType } from '@/components/ui/currency-input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CurrencyManagement() {
  const {
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
    refetch
  } = useCurrency();

  const [newRateUSDtoCOP, setNewRateUSDtoCOP] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  // Transfer state
  const [transferFrom, setTransferFrom] = useState<CurrencyType>('USD');
  const [transferTo, setTransferTo] = useState<CurrencyType>('COP');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // Balance adjustment state
  const [adjustCurrency, setAdjustCurrency] = useState<CurrencyType>('COP');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  const handleUpdateRate = async () => {
    const rate = parseFloat(newRateUSDtoCOP);
    if (isNaN(rate) || rate <= 0) return;

    setSavingRate(true);
    await updateExchangeRate('USD', 'COP', rate);
    // Also update inverse rate
    await updateExchangeRate('COP', 'USD', 1 / rate);
    setNewRateUSDtoCOP('');
    setSavingRate(false);
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    setTransferring(true);
    const result = await transferCurrency(transferFrom, transferTo, amount, transferNotes);
    if (result) {
      setTransferAmount('');
      setTransferNotes('');
      setTransferDialogOpen(false);
    }
    setTransferring(false);
  };

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;

    await updateBalance(adjustCurrency, amount);
    setAdjustAmount('');
    setAdjustDialogOpen(false);
  };

  const currentRate = getExchangeRate('USD', 'COP');
  const estimatedTransfer = transferAmount && currentRate
    ? convert(parseFloat(transferAmount), transferFrom, transferTo)
    : null;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando datos de moneda...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balances Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="text-lg">🇨🇴</span>
              Pesos Colombianos
            </CardDescription>
            <CardTitle className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              <CurrencyDisplay value={getBalance('COP')} currency="COP" size="lg" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              Dólares Americanos
            </CardDescription>
            <CardTitle className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              <CurrencyDisplay value={getBalance('USD')} currency="USD" size="lg" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Exchange Rate & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tasa de Cambio
              </CardTitle>
              <CardDescription>
                Configura la tasa de conversión entre USD y COP
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">1 USD</p>
              <p className="text-xs text-muted-foreground">Dólar</p>
            </div>
            <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {currentRate ? currentRate.toLocaleString('es-CO') : '---'} COP
              </p>
              <p className="text-xs text-muted-foreground">Pesos</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="newRate">Nueva tasa (1 USD = ? COP)</Label>
              <Input
                id="newRate"
                type="number"
                value={newRateUSDtoCOP}
                onChange={(e) => setNewRateUSDtoCOP(e.target.value)}
                placeholder={currentRate?.toString() || "4200"}
                step="1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleUpdateRate} 
                disabled={!newRateUSDtoCOP || savingRate}
              >
                {savingRate ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Tasa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Row */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transferir entre Monedas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferencia entre Monedas</DialogTitle>
              <DialogDescription>
                Transfiere fondos de una moneda a otra usando la tasa actual
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Select value={transferFrom} onValueChange={(v) => setTransferFrom(v as CurrencyType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">🇨🇴 COP</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Balance: <CurrencyDisplay value={getBalance(transferFrom)} currency={transferFrom} size="sm" />
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>A</Label>
                  <Select value={transferTo} onValueChange={(v) => setTransferTo(v as CurrencyType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">🇨🇴 COP</SelectItem>
                      <SelectItem value="USD">🇺🇸 USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferAmount">Monto a transferir ({transferFrom})</Label>
                <Input
                  id="transferAmount"
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>

              {estimatedTransfer !== null && transferFrom !== transferTo && (
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Recibirás aproximadamente</p>
                  <p className="text-xl font-bold text-primary">
                    <CurrencyDisplay value={estimatedTransfer} currency={transferTo} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tasa: 1 {transferFrom} = {getExchangeRate(transferFrom, transferTo)?.toLocaleString('es-CO')} {transferTo}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="transferNotes">Notas (opcional)</Label>
                <Textarea
                  id="transferNotes"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Razón de la transferencia..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={!transferAmount || transferFrom === transferTo || transferring}
              >
                {transferring ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                )}
                Transferir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Ajustar Balance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajustar Balance</DialogTitle>
              <DialogDescription>
                Ajusta manualmente el balance de una moneda
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={adjustCurrency} onValueChange={(v) => setAdjustCurrency(v as CurrencyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">🇨🇴 COP - Pesos Colombianos</SelectItem>
                    <SelectItem value="USD">🇺🇸 USD - Dólares</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Balance actual: <CurrencyDisplay value={getBalance(adjustCurrency)} currency={adjustCurrency} />
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustAmount">Nuevo balance</Label>
                <Input
                  id="adjustAmount"
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdjustBalance} disabled={adjustAmount === ''}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Balance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Transferencias
          </CardTitle>
          <CardDescription>
            Últimas transferencias entre monedas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay transferencias registradas
            </p>
          ) : (
            <div className="space-y-3">
              {transfers.slice(0, 10).map((transfer) => (
                <div 
                  key={transfer.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CurrencyBadge currency={transfer.from_currency} />
                        <span className="text-muted-foreground">→</span>
                        <CurrencyBadge currency={transfer.to_currency} />
                      </div>
                      {transfer.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{transfer.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      <CurrencyDisplay value={transfer.from_amount} currency={transfer.from_currency} size="sm" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      → <CurrencyDisplay value={transfer.to_amount} currency={transfer.to_currency} size="sm" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transfer.created_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
