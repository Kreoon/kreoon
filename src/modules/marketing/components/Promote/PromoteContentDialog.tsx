import { useState } from 'react';
import { Megaphone, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAdAccounts } from '../../hooks/useAdAccounts';
import { useAdCampaigns } from '../../hooks/useAdCampaigns';
import { AdPlatformIcon } from '../common/AdPlatformIcon';
import { OBJECTIVE_LABELS } from '../../config';
import type { AdPlatform, AdObjective, PromoteContentData } from '../../types/marketing.types';
import { toast } from 'sonner';

interface PromoteContentDialogProps {
  content: PromoteContentData;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PromoteContentDialog({ content, trigger, onSuccess }: PromoteContentDialogProps) {
  const [open, setOpen] = useState(false);
  const { accounts } = useAdAccounts();
  const { promoteContent } = useAdCampaigns();

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [objective, setObjective] = useState<AdObjective>('traffic');
  const [dailyBudget, setDailyBudget] = useState(10);
  const [durationDays, setDurationDays] = useState(7);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handlePromote = async () => {
    if (!selectedAccountId || !selectedAccount) {
      toast.error('Selecciona una cuenta de ads');
      return;
    }
    try {
      await promoteContent.mutateAsync({
        contentId: content.contentId,
        platform: selectedAccount.platform,
        adAccountId: selectedAccountId,
        dailyBudget,
        durationDays,
        objective,
      });
      toast.success('Contenido promocionado exitosamente');
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Megaphone className="w-3.5 h-3.5 mr-1" /> Pautar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Pautar contenido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            {content.thumbnailUrl ? (
              <img src={content.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{content.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{content.description}</p>
            </div>
          </div>

          {/* Account select */}
          <div className="space-y-2">
            <Label className="text-xs">Cuenta de ads</Label>
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tienes cuentas conectadas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm',
                      selectedAccountId === account.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <AdPlatformIcon platform={account.platform} size="xs" />
                    <span className="truncate max-w-[120px]">{account.account_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label className="text-xs">Objetivo</Label>
            <Select value={objective} onValueChange={v => setObjective(v as AdObjective)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['traffic', 'engagement', 'video_views', 'conversions', 'leads', 'awareness'] as AdObjective[]).map(obj => (
                  <SelectItem key={obj} value={obj}>{OBJECTIVE_LABELS[obj]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Presupuesto/día (USD)</Label>
              <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(+e.target.value)} min={1} step={0.5} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Duración (días)</Label>
              <Input type="number" value={durationDays} onChange={e => setDurationDays(+e.target.value)} min={1} max={90} />
            </div>
          </div>

          {/* Estimate */}
          <div className="p-3 rounded-lg bg-muted/30 border text-center">
            <p className="text-xs text-muted-foreground">Inversión total estimada</p>
            <p className="text-xl font-bold">${(dailyBudget * durationDays).toFixed(2)}</p>
          </div>

          <Button onClick={handlePromote} disabled={promoteContent.isPending || !selectedAccountId} className="w-full">
            {promoteContent.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Megaphone className="w-4 h-4 mr-2" />
            )}
            Pautar ahora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
