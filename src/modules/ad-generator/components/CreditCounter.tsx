import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { canAffordAIAction, getActionCost } from '@/lib/ai/token-gate';

interface CreditCounterProps {
  organizationId: string;
  actionType?: string;
}

export function CreditCounter({ organizationId, actionType = 'ads.generate_banner' }: CreditCounterProps) {
  const [info, setInfo] = useState<{ canAfford: boolean; cost: number; available: number } | null>(null);

  useEffect(() => {
    canAffordAIAction(actionType, organizationId).then(setInfo);
  }, [actionType, organizationId]);

  const cost = getActionCost(actionType);

  if (!info) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Coins className="h-3.5 w-3.5" />
      <span>
        {info.available} coins disponibles
        <span className="text-muted-foreground/60"> ({cost} por anuncio)</span>
      </span>
      {!info.canAfford && (
        <span className="text-destructive font-medium ml-1">Coins insuficientes</span>
      )}
    </div>
  );
}
