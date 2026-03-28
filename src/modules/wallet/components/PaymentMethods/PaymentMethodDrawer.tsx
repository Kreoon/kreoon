import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Globe,
  CreditCard,
  Wallet,
  Smartphone,
  Bitcoin,
  Zap,
  Send,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePaymentMethodMutations, type PaymentMethodDisplay } from '../../hooks/usePaymentMethods';
import type { PaymentMethodType } from '../../types';
import { PAYMENT_METHOD_LABELS } from '../../types';

const METHOD_ICONS: Record<PaymentMethodType, React.ComponentType<{ className?: string }>> = {
  bank_transfer_colombia: Building2,
  bank_transfer_international: Globe,
  paypal: CreditCard,
  payoneer: Wallet,
  nequi: Smartphone,
  daviplata: Smartphone,
  crypto: Bitcoin,
  zelle: Zap,
  wise: Send,
};

const PAYMENT_METHODS: PaymentMethodType[] = [
  'bank_transfer_colombia',
  'nequi',
  'daviplata',
  'paypal',
  'payoneer',
  'wise',
  'zelle',
  'crypto',
  'bank_transfer_international',
];

const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Davivienda',
  'BBVA Colombia',
  'Banco de Bogotá',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Banco Caja Social',
  'Banco Falabella',
  'Banco Pichincha',
  'Banco GNB Sudameris',
  'Scotiabank Colpatria',
  'Citibank',
  'Itaú',
  'Otro',
];

interface PaymentMethodDrawerProps {
  open: boolean;
  onClose: () => void;
  editingMethod?: PaymentMethodDisplay | null;
}

export function PaymentMethodDrawer({
  open,
  onClose,
  editingMethod,
}: PaymentMethodDrawerProps) {
  const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(null);
  const { createMethod, updateMethod, isCreating, isUpdating } = usePaymentMethodMutations();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      label: '',
      is_default: false,
      // Bank Colombia
      bank_name: '',
      account_type: 'ahorro' as 'ahorro' | 'corriente',
      account_number: '',
      document_type: 'CC' as 'CC' | 'NIT' | 'CE' | 'PP',
      document_number: '',
      holder_name: '',
      // International
      swift_code: '',
      iban: '',
      routing_number: '',
      holder_address: '',
      country: '',
      // PayPal/Payoneer/Wise
      email: '',
      // Nequi/Daviplata
      phone_number: '',
      // Crypto
      network: 'usdt_trc20' as 'bitcoin' | 'ethereum' | 'usdt_trc20' | 'usdt_erc20' | 'usdc',
      wallet_address: '',
      // Zelle
      email_or_phone: '',
      // Wise
      wise_currency: 'USD',
    },
  });

  // Reset form when drawer opens/closes or editing method changes
  useEffect(() => {
    if (open) {
      if (editingMethod) {
        setSelectedType(editingMethod.method_type);
        setValue('label', editingMethod.label);
        setValue('is_default', editingMethod.is_default);
        // Set details based on method type
        const details = editingMethod.details as Record<string, any>;
        Object.keys(details).forEach(key => {
          setValue(key as any, details[key]);
        });
      } else {
        setSelectedType(null);
        reset();
      }
    }
  }, [open, editingMethod, reset, setValue]);

  const onSubmit = async (data: any) => {
    if (!selectedType) return;

    let details: any = {};

    switch (selectedType) {
      case 'bank_transfer_colombia':
        details = {
          bank_name: data.bank_name,
          account_type: data.account_type,
          account_number: data.account_number,
          document_type: data.document_type,
          document_number: data.document_number,
          holder_name: data.holder_name,
        };
        break;
      case 'bank_transfer_international':
        details = {
          bank_name: data.bank_name,
          swift_code: data.swift_code,
          iban: data.iban,
          account_number: data.account_number,
          routing_number: data.routing_number,
          holder_name: data.holder_name,
          holder_address: data.holder_address,
          country: data.country,
        };
        break;
      case 'paypal':
      case 'payoneer':
        details = { email: data.email };
        break;
      case 'nequi':
      case 'daviplata':
        details = { phone_number: data.phone_number };
        break;
      case 'crypto':
        details = {
          network: data.network,
          wallet_address: data.wallet_address,
        };
        break;
      case 'zelle':
        details = {
          email_or_phone: data.email_or_phone,
          holder_name: data.holder_name,
        };
        break;
      case 'wise':
        details = {
          email: data.email,
          currency: data.wise_currency,
        };
        break;
    }

    if (editingMethod) {
      updateMethod(
        {
          id: editingMethod.id,
          label: data.label,
          details,
          is_default: data.is_default,
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createMethod(
        {
          method_type: selectedType,
          label: data.label,
          details,
          is_default: data.is_default,
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle>
                {editingMethod ? 'Editar Método' : 'Agregar Método'}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Method type selection (only for new methods) */}
          {!editingMethod && (
            <div className="space-y-3">
              <Label>Tipo de método</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = METHOD_ICONS[method];
                  const isSelected = selectedType === method;

                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedType(method)}
                      className={cn(
                        'p-3 rounded-sm text-center transition-all',
                        'border-2',
                        isSelected
                          ? 'border-[hsl(270,100%,60%)] bg-[hsl(270,100%,60%,0.1)]'
                          : 'border-transparent bg-[hsl(270,100%,60%,0.05)] hover:bg-[hsl(270,100%,60%,0.08)]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 mx-auto mb-1',
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <p className="text-[10px] text-muted-foreground truncate">
                        {method === 'bank_transfer_colombia'
                          ? 'Banco Col'
                          : method === 'bank_transfer_international'
                            ? 'Internacional'
                            : PAYMENT_METHOD_LABELS[method].split(' ')[0]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedType && (
            <>
              {/* Label */}
              <div className="space-y-2">
                <Label htmlFor="label">Nombre del método</Label>
                <Input
                  id="label"
                  {...register('label', { required: 'Ingresa un nombre' })}
                  placeholder="Ej: Mi cuenta Bancolombia"
                />
                {errors.label && (
                  <p className="text-xs text-destructive">{String(errors.label.message)}</p>
                )}
              </div>

              {/* Dynamic fields based on method type */}
              {selectedType === 'bank_transfer_colombia' && (
                <>
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Select
                      value={watch('bank_name')}
                      onValueChange={(v) => setValue('bank_name', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOMBIAN_BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo de cuenta</Label>
                      <Select
                        value={watch('account_type')}
                        onValueChange={(v) => setValue('account_type', v as 'ahorro' | 'corriente')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ahorro">Ahorros</SelectItem>
                          <SelectItem value="corriente">Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Número de cuenta</Label>
                      <Input {...register('account_number')} placeholder="1234567890" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo de documento</Label>
                      <Select
                        value={watch('document_type')}
                        onValueChange={(v) => setValue('document_type', v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CC">Cédula</SelectItem>
                          <SelectItem value="NIT">NIT</SelectItem>
                          <SelectItem value="CE">Cédula Extranjería</SelectItem>
                          <SelectItem value="PP">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Número de documento</Label>
                      <Input {...register('document_number')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del titular</Label>
                    <Input {...register('holder_name')} placeholder="Como aparece en el banco" />
                  </div>
                </>
              )}

              {selectedType === 'bank_transfer_international' && (
                <>
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input {...register('bank_name')} placeholder="Nombre del banco" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>SWIFT/BIC</Label>
                      <Input {...register('swift_code')} placeholder="XXXXXX00" />
                    </div>
                    <div className="space-y-2">
                      <Label>IBAN (opcional)</Label>
                      <Input {...register('iban')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Número de cuenta</Label>
                      <Input {...register('account_number')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Routing (opcional)</Label>
                      <Input {...register('routing_number')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del titular</Label>
                    <Input {...register('holder_name')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección del titular</Label>
                    <Input {...register('holder_address')} />
                  </div>
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Input {...register('country')} placeholder="Estados Unidos" />
                  </div>
                </>
              )}

              {(selectedType === 'paypal' || selectedType === 'payoneer') && (
                <div className="space-y-2">
                  <Label>Email de {selectedType === 'paypal' ? 'PayPal' : 'Payoneer'}</Label>
                  <Input type="email" {...register('email')} placeholder="tu@email.com" />
                </div>
              )}

              {(selectedType === 'nequi' || selectedType === 'daviplata') && (
                <div className="space-y-2">
                  <Label>Número de celular</Label>
                  <Input {...register('phone_number')} placeholder="3001234567" />
                </div>
              )}

              {selectedType === 'crypto' && (
                <>
                  <div className="space-y-2">
                    <Label>Red/Criptomoneda</Label>
                    <Select
                      value={watch('network')}
                      onValueChange={(v) => setValue('network', v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usdt_trc20">USDT (TRC20)</SelectItem>
                        <SelectItem value="usdt_erc20">USDT (ERC20)</SelectItem>
                        <SelectItem value="usdc">USDC</SelectItem>
                        <SelectItem value="bitcoin">Bitcoin</SelectItem>
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección de wallet</Label>
                    <Input {...register('wallet_address')} placeholder="0x..." />
                  </div>
                </>
              )}

              {selectedType === 'zelle' && (
                <>
                  <div className="space-y-2">
                    <Label>Email o teléfono de Zelle</Label>
                    <Input {...register('email_or_phone')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del titular</Label>
                    <Input {...register('holder_name')} />
                  </div>
                </>
              )}

              {selectedType === 'wise' && (
                <>
                  <div className="space-y-2">
                    <Label>Email de Wise</Label>
                    <Input type="email" {...register('email')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda preferida</Label>
                    <Select
                      value={watch('wise_currency')}
                      onValueChange={(v) => setValue('wise_currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Default toggle */}
              <div className="flex items-center justify-between p-4 rounded-sm bg-[hsl(270,100%,60%,0.05)]">
                <div>
                  <Label>Establecer como predeterminado</Label>
                  <p className="text-xs text-muted-foreground">
                    Se usará automáticamente para retiros
                  </p>
                </div>
                <Switch
                  checked={watch('is_default')}
                  onCheckedChange={(checked) => setValue('is_default', checked)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading
                    ? 'Guardando...'
                    : editingMethod
                      ? 'Guardar Cambios'
                      : 'Agregar Método'}
                </Button>
              </div>
            </>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
