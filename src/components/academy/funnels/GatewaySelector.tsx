import { CreditCard, Smartphone, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

type GatewayName = 'stripe' | 'mercadopago' | 'wompi';

interface GatewayMeta {
  id: GatewayName;
  label: string;
  description: string;
  icon: any;
  availableIn: string[];
}

const GATEWAYS: GatewayMeta[] = [
  {
    id: 'stripe',
    label: 'Tarjeta internacional',
    description: 'Visa, Mastercard, Amex. En USD.',
    icon: CreditCard,
    availableIn: ['*'],
  },
  {
    id: 'mercadopago',
    label: 'Mercado Pago',
    description: 'Tarjeta local, efectivo, cuotas. En COP/MXN/BRL/ARS.',
    icon: Smartphone,
    availableIn: ['CO', 'MX', 'BR', 'AR', 'PE', 'CL'],
  },
  {
    id: 'wompi',
    label: 'Wompi · PSE/Nequi',
    description: 'PSE, Nequi, tarjeta Colombia. En COP.',
    icon: Building2,
    availableIn: ['CO'],
  },
];

interface Props {
  available: GatewayName[];
  selected: GatewayName;
  onSelect: (g: GatewayName) => void;
  userCountry?: string;
  accentColor?: string;
}

export function GatewaySelector({
  available,
  selected,
  onSelect,
  userCountry,
  accentColor = '#8B5CF6',
}: Props) {
  const visible = GATEWAYS.filter((g) => available.includes(g.id));

  if (visible.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 font-medium">Método de pago</p>
      {visible.map((g) => {
        const isSelected = selected === g.id;
        const isRecommended = userCountry && g.availableIn.includes(userCountry);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className="w-full text-left"
          >
            <Card
              className={`p-3 border ${isSelected ? 'border-2' : 'border-white/10'} bg-white/5 hover:bg-white/10 transition-colors`}
              style={isSelected ? { borderColor: accentColor } : undefined}
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accentColor + '22', color: accentColor }}
                >
                  <g.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-100">{g.label}</p>
                    {isRecommended && (
                      <span
                        className="text-[10px] font-bold rounded px-1.5 py-0.5"
                        style={{ backgroundColor: accentColor + '22', color: accentColor }}
                      >
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{g.description}</p>
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
